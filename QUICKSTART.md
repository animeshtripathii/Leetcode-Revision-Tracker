# 🚀 Quick Start Guide - LeetTrack

## ⚡ Super Fast Setup (3 minutes)

### Step 1: Install Dependencies
**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```cmd
setup.bat
```

### Step 2: Configure Email
Edit `server/.env` file:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

**Get Gmail App Password:**
1. Google Account → Security → 2-Step Verification (enable it)
2. Search "App Passwords" in Google Account settings
3. Generate password for "Mail"
4. Copy 16-character password

### Step 3: Start MongoDB
**Mac (Homebrew):**
```bash
brew services start mongodb-community
```

**Windows:**
- MongoDB runs as service (starts automatically)
- Or run `mongod` in terminal

**Linux:**
```bash
sudo systemctl start mongod
```

### Step 4: Launch Application

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

### Step 5: Open Browser
Navigate to: **http://localhost:3000**

---

## 🎯 First Time Usage

1. **Register** - Create your account
2. **Add a Problem** - Try adding "Two Sum" from LeetCode
3. **Mark it Solved** - Click the circle, set revision for tomorrow
4. **Create a Task** - Schedule something for 1 minute from now
5. **Wait for Email** - Check your inbox!

---

## 📧 Email Test

To test emails immediately:

1. Add a problem and mark as solved
2. Set "Next Revision" to current time (or 1 minute from now)
3. Wait for the cron job (runs every minute)
4. Check your email inbox!

---

## 🔥 Common Issues

**Emails not working?**
- Double-check EMAIL_USER and EMAIL_PASS in .env
- Make sure 2-Step Verification is ON in Google
- Generate a NEW App Password
- Restart the backend server

**Port already in use?**
- Backend: Change PORT in server/.env
- Frontend: Change port in client/vite.config.js

**MongoDB connection failed?**
- Check if MongoDB is running: `ps aux | grep mongod`
- Or use MongoDB Atlas (cloud): Update MONGODB_URI in .env

---

## 💡 Pro Tips

- **Set reminders 1 minute ahead** when testing
- **Use categories** like "Arrays", "DP", "Graphs" for organization
- **Add notes** with time complexity and approach
- **Avoid overlapping times** for tasks and revisions
- **Check spam folder** if emails don't appear in inbox

---

## 🆘 Need Help?

1. Check the full README.md for detailed documentation
2. Look at server console for error messages
3. Check browser console (F12) for frontend errors
4. Verify all dependencies are installed: `npm list`

---

**You're all set! Happy coding! 🎉**
