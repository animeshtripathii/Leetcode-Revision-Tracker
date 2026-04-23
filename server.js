const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.status(200).send('Backend is alive! 🚀'));

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const resend = new Resend(process.env.RESEND_API_KEY || 're_123');

// ── Schemas ───────────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ProblemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  category: String,
  url: String,
  solved: { type: Boolean, default: false },
  solvedDate: Date,
  notes: String,
  revisionDates: [Date],
  nextRevision: Date,
  createdAt: { type: Date, default: Date.now },
});

const TaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  date: { type: Date, required: true },
  time: { type: String, required: true },
  completed: { type: Boolean, default: false },
  emailSent: { type: Boolean, default: false },
  linkedProblems: [
    {
      title: String,
      url: String,
      difficulty: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const RevisionListProblemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: String,
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  notes: String,
  problemRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', default: null },
});

const RevisionListSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  problems: [RevisionListProblemSchema],
  reminderDate: { type: Date, required: true },
  emailSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);
const Problem = mongoose.model('Problem', ProblemSchema);
const Task = mongoose.model('Task', TaskSchema);
const RevisionList = mongoose.model('RevisionList', RevisionListSchema);

// ── Auth Middleware ────────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// ── Email Helper ──────────────────────────────────────────────────────────────
const sendEmail = async (to, subject, html) => {
  try {
    await resend.emails.send({ from: 'onboarding@resend.dev', to, subject, html });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// ── Auth Routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ message: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

app.get('/api/auth/user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

app.put('/api/auth/user', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });
    if (await User.findOne({ email, _id: { $ne: req.user.id } }))
      return res.status(400).json({ message: 'Email already in use by another account' });
    const user = await User.findByIdAndUpdate(req.user.id, { name, email }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

app.put('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(400).json({ message: 'Current password is incorrect' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// ── LeetCode Proxy ────────────────────────────────────────────────────────────
app.get('/api/leetcode/problems', authenticateToken, async (req, res) => {
  try {
    const https = require('https');
    const data = await new Promise((resolve, reject) => {
      https.get('https://leetcode.com/api/problems/all/', {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Referer': 'https://leetcode.com/' },
      }, (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('Failed to parse')); } });
      }).on('error', reject);
    });
    const problems = (data.stat_status_pairs || []).map((item) => ({
      id: item.stat.frontend_question_id,
      title: item.stat.question__title,
      slug: item.stat.question__title_slug,
      url: `https://leetcode.com/problems/${item.stat.question__title_slug}/`,
      difficulty: item.difficulty.level === 1 ? 'Easy' : item.difficulty.level === 2 ? 'Medium' : 'Hard',
      isPaid: item.paid_only,
      totalAccepted: item.stat.total_acs,
      totalSubmitted: item.stat.total_submitted,
      acceptanceRate: item.stat.total_submitted > 0 ? ((item.stat.total_acs / item.stat.total_submitted) * 100).toFixed(1) : '0.0',
    }));
    problems.sort((a, b) => a.id - b.id);
    res.json(problems);
  } catch (error) { res.status(500).json({ message: 'Failed to fetch LeetCode problems', error: error.message }); }
});

// ── Problem Routes ────────────────────────────────────────────────────────────
app.get('/api/problems', authenticateToken, async (req, res) => {
  try { res.json(await Problem.find({ userId: req.user.id }).sort({ createdAt: -1 })); }
  catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

app.post('/api/problems', authenticateToken, async (req, res) => {
  try {
    const problem = new Problem({ ...req.body, userId: req.user.id });
    await problem.save();
    res.status(201).json(problem);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

app.put('/api/problems/:id', authenticateToken, async (req, res) => {
  try {
    const problem = await Problem.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true });
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    res.json(problem);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

app.delete('/api/problems/:id', authenticateToken, async (req, res) => {
  try {
    const problem = await Problem.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    res.json({ message: 'Problem deleted' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// ── Task Routes ───────────────────────────────────────────────────────────────
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try { res.json(await Task.find({ userId: req.user.id }).sort({ date: 1, time: 1 })); }
  catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const task = new Task({ ...req.body, userId: req.user.id });
    await task.save();
    res.status(201).json(task);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// ── Revision List Routes ──────────────────────────────────────────────────────
app.get('/api/revision-lists', authenticateToken, async (req, res) => {
  try { res.json(await RevisionList.find({ userId: req.user.id }).sort({ createdAt: -1 })); }
  catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

app.post('/api/revision-lists', authenticateToken, async (req, res) => {
  try {
    const { name, reminderDate } = req.body;
    if (!name) return res.status(400).json({ message: 'List name is required' });
    // Default: 3 days from now at 9:00 AM IST
    let reminder = reminderDate ? new Date(reminderDate) : (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      d.setHours(9, 0, 0, 0);
      return d;
    })();
    const list = new RevisionList({ userId: req.user.id, name, reminderDate: reminder, problems: [], emailSent: false });
    await list.save();
    res.status(201).json(list);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

app.put('/api/revision-lists/:id', authenticateToken, async (req, res) => {
  try {
    const { name, reminderDate, emailSent } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (reminderDate !== undefined) updates.reminderDate = new Date(reminderDate);
    if (emailSent !== undefined) updates.emailSent = emailSent;
    const list = await RevisionList.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, updates, { new: true });
    if (!list) return res.status(404).json({ message: 'List not found' });
    res.json(list);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

app.delete('/api/revision-lists/:id', authenticateToken, async (req, res) => {
  try {
    const list = await RevisionList.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!list) return res.status(404).json({ message: 'List not found' });
    res.json({ message: 'List deleted' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// Add problem to revision list
app.post('/api/revision-lists/:id/problems', authenticateToken, async (req, res) => {
  try {
    const list = await RevisionList.findOne({ _id: req.params.id, userId: req.user.id });
    if (!list) return res.status(404).json({ message: 'List not found' });
    const { title, url, difficulty, notes, problemRef } = req.body;
    if (!title) return res.status(400).json({ message: 'Problem title is required' });
    list.problems.push({ title, url: url || '', difficulty: difficulty || 'Medium', notes: notes || '', problemRef: problemRef || null });
    await list.save();
    res.json(list);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// Remove problem from revision list
app.delete('/api/revision-lists/:id/problems/:problemIdx', authenticateToken, async (req, res) => {
  try {
    const list = await RevisionList.findOne({ _id: req.params.id, userId: req.user.id });
    if (!list) return res.status(404).json({ message: 'List not found' });
    const idx = parseInt(req.params.problemIdx);
    if (idx < 0 || idx >= list.problems.length) return res.status(400).json({ message: 'Invalid problem index' });
    list.problems.splice(idx, 1);
    await list.save();
    res.json(list);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// ── Cron Job ──────────────────────────────────────────────────────────────────
cron.schedule('* * * * *', async () => {
  const now = new Date();
  try {
    // Problem revisions
    const problemsToRevise = await Problem.find({ nextRevision: { $lte: now }, solved: true }).populate('userId');
    for (const problem of problemsToRevise) {
      const user = problem.userId;
      const emailBody = `
        <div style="font-family:'Outfit',sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0e27;color:#e8eaed;border-radius:16px;">
          <h2 style="color:#ff6b6b;margin-bottom:8px;">🔔 Revision Reminder</h2>
          <p style="color:#9ba3b4;">Time to revise this problem:</p>
          <div style="background:#1a2142;padding:20px;border-radius:12px;margin:20px 0;border:1px solid rgba(255,255,255,0.1);">
            <h3 style="color:#4ecca3;margin:0 0 10px 0;">${problem.title}</h3>
            <p style="margin:5px 0;"><strong>Difficulty:</strong> <span style="color:${problem.difficulty==='Easy'?'#4ecca3':problem.difficulty==='Medium'?'#ffd93d':'#ff6b6b'}">${problem.difficulty}</span></p>
            ${problem.url ? `<p style="margin:5px 0;"><a href="${problem.url}" style="color:#4ecca3;">View Problem →</a></p>` : ''}
            ${problem.notes ? `<p style="margin:10px 0 0 0;color:#9ba3b4;"><strong>Notes:</strong> ${problem.notes}</p>` : ''}
          </div>
          <p style="color:#6b7280;">Good luck! 💪</p>
        </div>`;
      await sendEmail(user.email, `🔔 Time to Revise: ${problem.title}`, emailBody);
      problem.revisionDates.push(now);
      problem.nextRevision = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      await problem.save();
    }

    // Task reminders
    const tasksToNotify = await Task.find({ emailSent: false, completed: false }).populate('userId');
    for (const task of tasksToNotify) {
      const taskDateTime = new Date(`${task.date.toISOString().split('T')[0]}T${task.time}`);
      if (taskDateTime <= now) {
        const user = task.userId;
        const linkedHTML = task.linkedProblems?.length
          ? `<div style="margin-top:16px;"><strong>Linked Problems:</strong><ul style="padding-left:1.2rem;margin-top:8px;">${task.linkedProblems.map(p=>`<li><a href="${p.url||'#'}" style="color:#4ecca3;">${p.title}</a> <span style="color:${p.difficulty==='Easy'?'#4ecca3':p.difficulty==='Medium'?'#ffd93d':'#ff6b6b'}">(${p.difficulty})</span></li>`).join('')}</ul></div>`
          : '';
        const emailBody = `
          <div style="font-family:'Outfit',sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0e27;color:#e8eaed;border-radius:16px;">
            <h2 style="color:#4ecca3;margin-bottom:8px;">⏰ Task Reminder</h2>
            <div style="background:#1a2142;padding:20px;border-radius:12px;margin:20px 0;border:1px solid rgba(255,255,255,0.1);">
              <h3 style="color:#ffd93d;margin:0 0 10px 0;">${task.title}</h3>
              <p style="margin:5px 0;"><strong>Date:</strong> ${new Date(task.date).toLocaleDateString()}</p>
              <p style="margin:5px 0;"><strong>Time:</strong> ${task.time}</p>
              ${task.description ? `<p style="margin:10px 0 0 0;color:#9ba3b4;"><strong>Description:</strong> ${task.description}</p>` : ''}
              ${linkedHTML}
            </div>
            <p style="color:#6b7280;">Time to get started! 🚀</p>
          </div>`;
        await sendEmail(user.email, `⏰ Task Reminder: ${task.title}`, emailBody);
        task.emailSent = true;
        await task.save();
      }
    }

    // Revision list email reminders
    const listsToNotify = await RevisionList.find({ reminderDate: { $lte: now }, emailSent: false }).populate('userId');
    for (const list of listsToNotify) {
      const user = list.userId;
      const problemsHTML = list.problems.length
        ? list.problems.map((p, i) => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.07);font-weight:600;">${i + 1}. ${p.url ? `<a href="${p.url}" style="color:#4ecca3;text-decoration:none;">${p.title}</a>` : p.title}</td>
            <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.07);"><span style="padding:3px 10px;border-radius:6px;font-size:12px;background:${p.difficulty==='Easy'?'rgba(78,204,163,0.15)':p.difficulty==='Medium'?'rgba(255,217,61,0.15)':'rgba(255,107,107,0.15)'};color:${p.difficulty==='Easy'?'#4ecca3':p.difficulty==='Medium'?'#ffd93d':'#ff6b6b'}">${p.difficulty}</span></td>
          </tr>`).join('')
        : '<tr><td colspan="2" style="padding:16px;color:#6b7280;">No problems in this list.</td></tr>';
      const emailBody = `
        <div style="font-family:'Outfit',sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0e27;color:#e8eaed;border-radius:16px;">
          <h2 style="color:#a78bfa;margin-bottom:4px;">📋 Revision List Reminder</h2>
          <p style="color:#9ba3b4;margin-bottom:20px;">Time to revise your list: <strong style="color:#e8eaed;">${list.name}</strong></p>
          <div style="background:#1a2142;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#151b3d;">
                  <th style="padding:12px;text-align:left;color:#4ecca3;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Problem</th>
                  <th style="padding:12px;text-align:left;color:#4ecca3;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Difficulty</th>
                </tr>
              </thead>
              <tbody>${problemsHTML}</tbody>
            </table>
          </div>
          <p style="color:#6b7280;margin-top:20px;">Keep grinding! 💪</p>
        </div>`;
      await sendEmail(user.email, `📋 Revision List: "${list.name}" — Time to Review!`, emailBody);
      list.emailSent = true;
      await list.save();
    }
  } catch (error) { console.error('Cron job error:', error); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
