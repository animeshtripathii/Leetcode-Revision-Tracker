# 🎯 LeetTrack - Advanced LeetCode & Task Tracker

A full-stack MERN application for tracking LeetCode problems and managing daily tasks with automated email reminders. Features modern UI, secure authentication, and intelligent conflict detection for overlapping tasks and revisions.

![LeetTrack](https://img.shields.io/badge/Stack-MERN-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

### 🔐 Authentication & Security
- **Secure Registration/Login**: JWT-based authentication with bcrypt password hashing
- **Protected Routes**: Token-based API protection
- **Session Management**: 7-day token expiration

### 📊 Problem Tracker
- **Add LeetCode Problems**: Track title, difficulty, category, URL, and notes
- **Mark as Solved**: Toggle solved status with automatic date tracking
- **Revision System**: Set custom revision dates for spaced repetition
- **Auto Revision Scheduling**: Default 3-day first revision, 7-day intervals after
- **Email Reminders**: Automatic notifications when revision time arrives
- **Visual Feedback**: Color-coded difficulty levels (Easy/Medium/Hard)
- **Rich Notes**: Add approach hints, time complexity, and learning points

### ✅ Task Manager
- **Daily Task Scheduling**: Set specific date and time for tasks
- **Email Notifications**: Automatic reminders when task time arrives
- **Conflict Detection**: Warns about overlapping tasks and revision times
- **Task Description**: Add detailed descriptions for context
- **Completion Tracking**: Mark tasks as done with visual indicators
- **Status Monitoring**: Track email delivery status

### 📧 Smart Email System
- **Revision Reminders**: Beautiful HTML emails with problem details
- **Task Notifications**: Timely alerts for scheduled tasks
- **Conflict Warnings**: Highlighted conflicts in email notifications
- **Rich Formatting**: Color-coded, visually appealing email templates
- **One-time Delivery**: Prevents duplicate email sends

### 🎨 Modern UI/UX
- **Distinctive Design**: Bold typography with Space Mono and Outfit fonts
- **Dark Theme**: Eye-friendly navy palette with vibrant accents
- **Smooth Animations**: Cubic-bezier transitions and hover effects
- **Responsive Layout**: Mobile-first design that works on all devices
- **Real-time Updates**: Instant feedback on all actions
- **Intuitive Navigation**: Clear separation between Problems and Tasks

## 🛠️ Tech Stack

### Backend
- **Node.js & Express**: RESTful API server
- **MongoDB & Mongoose**: NoSQL database with ODM
- **JWT**: Secure authentication tokens
- **bcryptjs**: Password hashing
- **Nodemailer**: Email delivery service
- **node-cron**: Task scheduling for automated reminders

### Frontend
- **React 18**: Modern component-based UI
- **Vite**: Lightning-fast build tool
- **Axios**: HTTP client for API calls
- **CSS3**: Custom styling with CSS variables

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Gmail account with App Password (for email notifications)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd leetcode-tracker
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:

```env
MONGODB_URI=mongodb://localhost:27017/leetcode-tracker
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
PORT=5000
```

**Gmail App Password Setup:**
1. Go to [Google Account Settings](https://myaccount.google.com/) > Security
2. Enable 2-Step Verification if not already enabled
3. Go to "App Passwords" (search for it in settings)
4. Generate a new app password for "Mail"
5. Copy the 16-character password to `EMAIL_PASS`

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

## 🚀 Usage Guide

### Getting Started
1. **Register**: Create an account with name, email, and password
2. **Login**: Sign in to access your dashboard

### Managing Problems
1. Click on "📊 Problems" tab
2. Fill in the form:
   - **Title**: Name of the LeetCode problem
   - **Difficulty**: Easy, Medium, or Hard
   - **Category**: Arrays, DP, Graphs, etc.
   - **URL**: Link to the problem
   - **Notes**: Your approach, hints, or complexity analysis
   - **Solved**: Check if you've solved it
   - **Next Revision**: Set custom revision date (optional)
3. Click "Add Problem" to save
4. **Toggle Solved**: Click the circle button to mark solved/unsolved
5. **Edit/Delete**: Use action buttons in the table

### Managing Tasks
1. Click on "✓ Tasks" tab
2. Fill in the form:
   - **Title**: Task name
   - **Description**: Additional details (optional)
   - **Date**: When the task should be done
   - **Time**: Specific time for the task
3. Click "Add Task" to save
4. **Toggle Complete**: Click the circle button to mark done
5. **Edit/Delete**: Use action buttons in the table

### Email Reminders
Emails are sent automatically when:
- **Problem Revision**: Time reaches the "Next Revision" date
- **Task Reminder**: Date and time match the scheduled task time

**Email Features:**
- Problems get auto-scheduled for revision (3 days after solving, then 7-day intervals)
- Conflict detection warns about overlapping schedules
- Beautiful HTML formatting with color-coded information
- One-time delivery (won't spam you)

## 🏗️ Project Structure

```
leetcode-tracker/
├── server/
│   ├── server.js          # Express server with routes and cron jobs
│   ├── package.json       # Backend dependencies
│   └── .env.example       # Environment variables template
│
├── client/
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   ├── App.css        # Distinctive modern styling
│   │   └── main.jsx       # React entry point
│   ├── index.html         # HTML template
│   ├── vite.config.js     # Vite configuration
│   └── package.json       # Frontend dependencies
│
└── README.md              # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login to account

### Problems
- `GET /api/problems` - Get all user problems
- `POST /api/problems` - Create new problem
- `PUT /api/problems/:id` - Update problem
- `DELETE /api/problems/:id` - Delete problem

### Tasks
- `GET /api/tasks` - Get all user tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## 🎨 Design Philosophy

Following modern frontend design principles:
- **Bold Typography**: Space Mono for code/data, Outfit for UI
- **Vibrant Accents**: Teal and coral against dark navy
- **Intentional Animations**: Smooth cubic-bezier transitions
- **Asymmetric Layouts**: Breaking grid conventions where appropriate
- **Generous Spacing**: Breathing room for content
- **Distinctive Aesthetic**: Avoiding generic AI design patterns

## 📧 Email Template Example

Revision reminder emails include:
- Problem title and difficulty
- Color-coded difficulty badge
- Link to the problem
- Your saved notes
- Styled with dark theme matching the app

Task reminder emails include:
- Task title and description
- Date and time
- Conflict warnings (if any overlap detected)
- Clean, professional formatting

## 🔒 Security Features

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens with 7-day expiration
- Protected API routes requiring authentication
- CORS configuration for cross-origin requests
- Environment variables for sensitive data

## 🐛 Troubleshooting

**Emails not sending?**
- Verify Gmail App Password is correct
- Check that 2-Step Verification is enabled
- Ensure EMAIL_USER and EMAIL_PASS are in .env
- Check server console for error messages

**MongoDB connection issues?**
- Ensure MongoDB is running locally (`mongod`)
- Or use MongoDB Atlas connection string
- Check MONGODB_URI in .env file

**Frontend not connecting to backend?**
- Verify backend is running on port 5000
- Check Vite proxy configuration
- Look for CORS errors in browser console

## 🚀 Future Enhancements

- [ ] LeetCode API integration for auto-importing problems
- [ ] Statistics dashboard with charts
- [ ] Mobile app version
- [ ] Problem tags and filtering
- [ ] Collaborative problem sharing
- [ ] Custom email templates
- [ ] SMS notifications option
- [ ] Calendar integration
- [ ] Progress streaks and achievements

## 📝 License

MIT License - feel free to use this project for learning or personal use.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 💡 Tips for Best Results

1. **Set Realistic Revision Dates**: Use spaced repetition (3 days, 7 days, 14 days, etc.)
2. **Add Detailed Notes**: Include time complexity, approach, and edge cases
3. **Use Categories**: Organize problems by type for better tracking
4. **Schedule Tasks Wisely**: Avoid overlapping times when possible
5. **Check Email Regularly**: Don't miss important reminders

## 🌟 Acknowledgments

Built with modern web technologies and following best practices in:
- Full-stack development
- User authentication
- Email automation
- Responsive design
- Code organization

---

**Happy Coding! 🚀**

For issues or questions, please open an issue in the repository.
