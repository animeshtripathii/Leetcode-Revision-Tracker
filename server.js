const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const cron = require('node-cron');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic health route for cron-job.org pings
app.get('/', (req, res) => {
  res.status(200).send('Backend is alive! 🚀');
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Resend Setup
const resend = new Resend(process.env.RESEND_API_KEY);

// Models
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
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);
const Problem = mongoose.model('Problem', ProblemSchema);
const Task = mongoose.model('Task', TaskSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Send Email Function
const sendEmail = async (to, subject, html) => {
  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: to,
      subject: subject,
      html: html,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
app.get('/api/auth/user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test Email Endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'tripathianimesh456@gmail.com',
      subject: 'Test Email Server',
      html: '<p>Your Resend integration is officially working! 🎉</p>'
    });
    if (error) {
      return res.status(400).json({ success: false, error });
    }
    res.json({ success: true, message: 'Email forcefully sent via Resend API!', data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update user profile (name & email)
app.put('/api/auth/user', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Check if the new email is taken by another user
    const existing = await User.findOne({ email, _id: { $ne: req.user.id } });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use by another account' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change password
app.put('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// LeetCode Public Problems Proxy
app.get('/api/leetcode/problems', authenticateToken, async (req, res) => {
  try {
    const https = require('https');
    const url = 'https://leetcode.com/api/problems/all/';

    const data = await new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://leetcode.com/',
        },
      };
      https.get(url, options, (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse LeetCode response'));
          }
        });
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
      acceptanceRate: item.stat.total_submitted > 0
        ? ((item.stat.total_acs / item.stat.total_submitted) * 100).toFixed(1)
        : '0.0',
    }));

    // Sort by problem ID ascending
    problems.sort((a, b) => a.id - b.id);

    res.json(problems);
  } catch (error) {
    console.error('LeetCode proxy error:', error.message);
    res.status(500).json({ message: 'Failed to fetch LeetCode problems', error: error.message });
  }
});

// Problem Routes
app.get('/api/problems', authenticateToken, async (req, res) => {
  try {
    const problems = await Problem.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/problems', authenticateToken, async (req, res) => {
  try {
    const problem = new Problem({
      ...req.body,
      userId: req.user.id,
    });
    await problem.save();
    res.status(201).json(problem);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/problems/:id', authenticateToken, async (req, res) => {
  try {
    const problem = await Problem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/problems/:id', authenticateToken, async (req, res) => {
  try {
    const problem = await Problem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    res.json({ message: 'Problem deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Task Routes
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id }).sort({ date: 1, time: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const task = new Task({
      ...req.body,
      userId: req.user.id,
    });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cron Job - Check every minute for reminders and tasks
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  try {
    // Check for problem revisions
    const problemsToRevise = await Problem.find({
      nextRevision: { $lte: now },
      solved: true,
    }).populate('userId');

    for (const problem of problemsToRevise) {
      const user = problem.userId;
      const emailSubject = `🔔 Time to Revise: ${problem.title}`;
      const emailBody = `
        <div style="font-family: 'JetBrains Mono', monospace; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee;">
          <h2 style="color: #ff6b6b;">Revision Reminder</h2>
          <p>It's time to revise this problem:</p>
          <div style="background: #16213e; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #4ecca3; margin: 0 0 10px 0;">${problem.title}</h3>
            <p style="margin: 5px 0;"><strong>Difficulty:</strong> <span style="color: ${
              problem.difficulty === 'Easy' ? '#4ecca3' : problem.difficulty === 'Medium' ? '#ff9f43' : '#ff6b6b'
            }">${problem.difficulty}</span></p>
            ${problem.url ? `<p style="margin: 5px 0;"><a href="${problem.url}" style="color: #4ecca3;">View Problem</a></p>` : ''}
            ${problem.notes ? `<p style="margin: 10px 0 0 0;"><strong>Your Notes:</strong><br/>${problem.notes}</p>` : ''}
          </div>
          <p style="color: #888;">Good luck with your revision! 💪</p>
        </div>
      `;

      await sendEmail(user.email, emailSubject, emailBody);

      // Update next revision date (e.g., 7 days from now)
      problem.revisionDates.push(now);
      problem.nextRevision = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      await problem.save();
    }

    // Check for tasks
    const tasksToNotify = await Task.find({
      date: { $lte: now },
      emailSent: false,
      completed: false,
    }).populate('userId');

    for (const task of tasksToNotify) {
      const taskDateTime = new Date(`${task.date.toISOString().split('T')[0]}T${task.time}`);
      
      if (taskDateTime <= now) {
        const user = task.userId;
        
        // Check for conflicts
        const conflicts = await Task.find({
          userId: user._id,
          date: task.date,
          time: task.time,
          _id: { $ne: task._id },
        });

        const revisionConflicts = await Problem.find({
          userId: user._id,
          nextRevision: {
            $gte: new Date(taskDateTime.getTime() - 30 * 60 * 1000), // 30 min before
            $lte: new Date(taskDateTime.getTime() + 30 * 60 * 1000), // 30 min after
          },
        });

        let conflictText = '';
        if (conflicts.length > 0 || revisionConflicts.length > 0) {
          conflictText = '<div style="background: #ff6b6b; padding: 10px; border-radius: 5px; margin: 15px 0;"><strong>⚠️ Scheduling Conflicts:</strong><ul>';
          
          conflicts.forEach(c => {
            conflictText += `<li>Task: ${c.title}</li>`;
          });
          
          revisionConflicts.forEach(p => {
            conflictText += `<li>Problem Revision: ${p.title}</li>`;
          });
          
          conflictText += '</ul></div>';
        }

        const emailSubject = `⏰ Task Reminder: ${task.title}`;
        const emailBody = `
          <div style="font-family: 'JetBrains Mono', monospace; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee;">
            <h2 style="color: #4ecca3;">Task Reminder</h2>
            <div style="background: #16213e; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #ff9f43; margin: 0 0 10px 0;">${task.title}</h3>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(task.date).toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${task.time}</p>
              ${task.description ? `<p style="margin: 10px 0 0 0;"><strong>Description:</strong><br/>${task.description}</p>` : ''}
            </div>
            ${conflictText}
            <p style="color: #888;">Time to get started! 🚀</p>
          </div>
        `;

        await sendEmail(user.email, emailSubject, emailBody);

        task.emailSent = true;
        await task.save();
      }
    }
  } catch (error) {
    console.error('Cron job error:', error);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
