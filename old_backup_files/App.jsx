import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentView, setCurrentView] = useState('problems');
  
  // Auth states
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  
  // Problem states
  const [problems, setProblems] = useState([]);
  const [problemForm, setProblemForm] = useState({
    title: '',
    difficulty: 'Easy',
    category: '',
    url: '',
    notes: '',
    solved: false,
    nextRevision: '',
  });
  const [editingProblem, setEditingProblem] = useState(null);
  
  // Task states
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
  });
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    if (token) {
      fetchUserData();
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      if (currentView === 'problems') {
        fetchProblems();
      } else if (currentView === 'tasks') {
        fetchTasks();
      }
    }
  }, [user, currentView]);

  const fetchUserData = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  const fetchProblems = async () => {
    try {
      const res = await axios.get(`${API_URL}/problems`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProblems(res.data);
    } catch (error) {
      console.error('Error fetching problems:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_URL}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(res.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const res = await axios.post(`${API_URL}${endpoint}`, authForm);
      
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('token', res.data.token);
      setAuthForm({ name: '', email: '', password: '' });
    } catch (error) {
      alert(error.response?.data?.message || 'Authentication failed');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const handleProblemSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProblem) {
        await axios.put(
          `${API_URL}/problems/${editingProblem._id}`,
          problemForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEditingProblem(null);
      } else {
        await axios.post(`${API_URL}/problems`, problemForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      
      setProblemForm({
        title: '',
        difficulty: 'Easy',
        category: '',
        url: '',
        notes: '',
        solved: false,
        nextRevision: '',
      });
      fetchProblems();
    } catch (error) {
      alert('Error saving problem');
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await axios.put(
          `${API_URL}/tasks/${editingTask._id}`,
          taskForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setEditingTask(null);
      } else {
        await axios.post(`${API_URL}/tasks`, taskForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      
      setTaskForm({ title: '', description: '', date: '', time: '' });
      fetchTasks();
    } catch (error) {
      alert('Error saving task');
    }
  };

  const deleteProblem = async (id) => {
    if (window.confirm('Delete this problem?')) {
      try {
        await axios.delete(`${API_URL}/problems/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchProblems();
      } catch (error) {
        alert('Error deleting problem');
      }
    }
  };

  const deleteTask = async (id) => {
    if (window.confirm('Delete this task?')) {
      try {
        await axios.delete(`${API_URL}/tasks/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchTasks();
      } catch (error) {
        alert('Error deleting task');
      }
    }
  };

  const toggleProblemSolved = async (problem) => {
    try {
      const updates = {
        solved: !problem.solved,
        solvedDate: !problem.solved ? new Date() : null,
      };
      
      if (!problem.solved && !problem.nextRevision) {
        // Set next revision to 3 days from now if just marked as solved
        const nextRev = new Date();
        nextRev.setDate(nextRev.getDate() + 3);
        updates.nextRevision = nextRev;
      }
      
      await axios.put(`${API_URL}/problems/${problem._id}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProblems();
    } catch (error) {
      alert('Error updating problem');
    }
  };

  const toggleTaskCompleted = async (task) => {
    try {
      await axios.put(
        `${API_URL}/tasks/${task._id}`,
        { completed: !task.completed },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTasks();
    } catch (error) {
      alert('Error updating task');
    }
  };

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="brand">LeetTrack</h1>
            <p className="tagline">Master problems, track progress, never forget</p>
          </div>

          <div className="auth-toggle">
            <button
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {authMode === 'register' && (
              <input
                type="text"
                placeholder="Full Name"
                value={authForm.name}
                onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                required
              />
            )}
            <input
              type="email"
              placeholder="Email Address"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              required
            />
            <button type="submit" className="submit-btn">
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <h1>LeetTrack</h1>
          <span className="user-info">👋 {user.name}</span>
        </div>
        <div className="nav-menu">
          <button
            className={currentView === 'problems' ? 'active' : ''}
            onClick={() => setCurrentView('problems')}
          >
            <span className="icon">📊</span> Problems
          </button>
          <button
            className={currentView === 'tasks' ? 'active' : ''}
            onClick={() => setCurrentView('tasks')}
          >
            <span className="icon">✓</span> Tasks
          </button>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </nav>

      <main className="main-content">
        {currentView === 'problems' ? (
          <div className="problems-view">
            <div className="view-header">
              <h2>Problem Tracker</h2>
              <div className="stats">
                <div className="stat">
                  <span className="stat-value">{problems.filter(p => p.solved).length}</span>
                  <span className="stat-label">Solved</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{problems.length}</span>
                  <span className="stat-label">Total</span>
                </div>
              </div>
            </div>

            <div className="content-grid">
              <div className="form-card">
                <h3>{editingProblem ? 'Edit Problem' : 'Add Problem'}</h3>
                <form onSubmit={handleProblemSubmit}>
                  <input
                    type="text"
                    placeholder="Problem Title"
                    value={problemForm.title}
                    onChange={(e) => setProblemForm({ ...problemForm, title: e.target.value })}
                    required
                  />
                  
                  <select
                    value={problemForm.difficulty}
                    onChange={(e) => setProblemForm({ ...problemForm, difficulty: e.target.value })}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Category (e.g., Arrays, DP)"
                    value={problemForm.category}
                    onChange={(e) => setProblemForm({ ...problemForm, category: e.target.value })}
                  />

                  <input
                    type="url"
                    placeholder="LeetCode URL"
                    value={problemForm.url}
                    onChange={(e) => setProblemForm({ ...problemForm, url: e.target.value })}
                  />

                  <textarea
                    placeholder="Notes (approach, hints, etc.)"
                    value={problemForm.notes}
                    onChange={(e) => setProblemForm({ ...problemForm, notes: e.target.value })}
                    rows="3"
                  />

                  <div className="form-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={problemForm.solved}
                        onChange={(e) => setProblemForm({ ...problemForm, solved: e.target.checked })}
                      />
                      <span>Mark as solved</span>
                    </label>

                    {problemForm.solved && (
                      <input
                        type="datetime-local"
                        placeholder="Next Revision"
                        value={problemForm.nextRevision}
                        onChange={(e) => setProblemForm({ ...problemForm, nextRevision: e.target.value })}
                      />
                    )}
                  </div>

                  <div className="button-group">
                    <button type="submit" className="btn-primary">
                      {editingProblem ? 'Update' : 'Add'} Problem
                    </button>
                    {editingProblem && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProblem(null);
                          setProblemForm({
                            title: '',
                            difficulty: 'Easy',
                            category: '',
                            url: '',
                            notes: '',
                            solved: false,
                            nextRevision: '',
                          });
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="table-card">
                <h3>Your Problems</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>✓</th>
                        <th>Title</th>
                        <th>Difficulty</th>
                        <th>Category</th>
                        <th>Next Revision</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.map((problem) => (
                        <tr key={problem._id} className={problem.solved ? 'solved' : ''}>
                          <td>
                            <button
                              className="check-btn"
                              onClick={() => toggleProblemSolved(problem)}
                            >
                              {problem.solved ? '✓' : '○'}
                            </button>
                          </td>
                          <td>
                            {problem.url ? (
                              <a href={problem.url} target="_blank" rel="noopener noreferrer">
                                {problem.title}
                              </a>
                            ) : (
                              problem.title
                            )}
                          </td>
                          <td>
                            <span className={`difficulty ${problem.difficulty.toLowerCase()}`}>
                              {problem.difficulty}
                            </span>
                          </td>
                          <td>{problem.category || '-'}</td>
                          <td>
                            {problem.nextRevision
                              ? new Date(problem.nextRevision).toLocaleDateString()
                              : '-'}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                onClick={() => {
                                  setEditingProblem(problem);
                                  setProblemForm({
                                    title: problem.title,
                                    difficulty: problem.difficulty,
                                    category: problem.category || '',
                                    url: problem.url || '',
                                    notes: problem.notes || '',
                                    solved: problem.solved,
                                    nextRevision: problem.nextRevision
                                      ? new Date(problem.nextRevision).toISOString().slice(0, 16)
                                      : '',
                                  });
                                }}
                                className="btn-edit"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteProblem(problem._id)}
                                className="btn-delete"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {problems.length === 0 && (
                    <div className="empty-state">
                      <p>No problems yet. Add your first one!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="tasks-view">
            <div className="view-header">
              <h2>Task Manager</h2>
              <div className="stats">
                <div className="stat">
                  <span className="stat-value">{tasks.filter(t => t.completed).length}</span>
                  <span className="stat-label">Completed</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{tasks.filter(t => !t.completed).length}</span>
                  <span className="stat-label">Pending</span>
                </div>
              </div>
            </div>

            <div className="content-grid">
              <div className="form-card">
                <h3>{editingTask ? 'Edit Task' : 'Add Task'}</h3>
                <form onSubmit={handleTaskSubmit}>
                  <input
                    type="text"
                    placeholder="Task Title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    required
                  />

                  <textarea
                    placeholder="Description (optional)"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    rows="2"
                  />

                  <div className="form-row">
                    <input
                      type="date"
                      value={taskForm.date}
                      onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                      required
                    />

                    <input
                      type="time"
                      value={taskForm.time}
                      onChange={(e) => setTaskForm({ ...taskForm, time: e.target.value })}
                      required
                    />
                  </div>

                  <div className="button-group">
                    <button type="submit" className="btn-primary">
                      {editingTask ? 'Update' : 'Add'} Task
                    </button>
                    {editingTask && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask(null);
                          setTaskForm({ title: '', description: '', date: '', time: '' });
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="table-card">
                <h3>Your Tasks</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>✓</th>
                        <th>Task</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task._id} className={task.completed ? 'completed' : ''}>
                          <td>
                            <button
                              className="check-btn"
                              onClick={() => toggleTaskCompleted(task)}
                            >
                              {task.completed ? '✓' : '○'}
                            </button>
                          </td>
                          <td>
                            <div>
                              <strong>{task.title}</strong>
                              {task.description && (
                                <p className="task-description">{task.description}</p>
                              )}
                            </div>
                          </td>
                          <td>{new Date(task.date).toLocaleDateString()}</td>
                          <td>{task.time}</td>
                          <td>
                            <span className={`status ${task.emailSent ? 'sent' : 'pending'}`}>
                              {task.emailSent ? 'Email Sent' : 'Pending'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                onClick={() => {
                                  setEditingTask(task);
                                  setTaskForm({
                                    title: task.title,
                                    description: task.description || '',
                                    date: new Date(task.date).toISOString().split('T')[0],
                                    time: task.time,
                                  });
                                }}
                                className="btn-edit"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteTask(task._id)}
                                className="btn-delete"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tasks.length === 0 && (
                    <div className="empty-state">
                      <p>No tasks yet. Schedule your first one!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
