import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Reusable Pagination Component ───────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange, totalItems, pageSize }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const delta = 2; // pages around current
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="pagination-wrapper">
      <span className="pagination-info">
        Showing {from}–{to} of {totalItems}
      </span>
      <div className="pagination">
        <button
          className="pg-btn pg-arrow"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >‹</button>

        {getPageNumbers().map((page, idx) =>
          page === '...'
            ? <span key={`ellipsis-${idx}`} className="pg-ellipsis">…</span>
            : <button
                key={page}
                className={`pg-btn ${currentPage === page ? 'pg-active' : ''}`}
                onClick={() => onPageChange(page)}
              >{page}</button>
        )}

        <button
          className="pg-btn pg-arrow"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >›</button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentView, setCurrentView] = useState('browse');

  // Auth
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });

  // My Problems
  const [myProblems, setMyProblems] = useState([]);
  const [problemForm, setProblemForm] = useState({
    title: '', difficulty: 'Easy', category: '', url: '', notes: '', solved: false, nextRevision: '',
  });
  const [editingProblem, setEditingProblem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [myPage, setMyPage] = useState(1);
  const [mySearch, setMySearch] = useState('');
  const [myDiff, setMyDiff] = useState('All');
  const [mySolved, setMySolved] = useState('All'); // All | Solved | Unsolved
  const MY_PAGE_SIZE = 15;

  // Browse
  const [allLCProblems, setAllLCProblems] = useState([]);
  const [lcLoading, setLcLoading] = useState(false);
  const [lcError, setLcError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [browsePage, setBrowsePage] = useState(1);
  const [addingId, setAddingId] = useState(null);
  const BROWSE_PAGE_SIZE = 50;

  // Tasks
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', date: '', time: '', linkedProblems: [] });
  const [editingTask, setEditingTask] = useState(null);
  const [taskPage, setTaskPage] = useState(1);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatus, setTaskStatus] = useState('All'); // All | Pending | Completed
  const TASK_PAGE_SIZE = 10;

  // Revision Lists
  const [revisionLists, setRevisionLists] = useState([]);
  const [showRevListForm, setShowRevListForm] = useState(false);
  const [editingRevList, setEditingRevList] = useState(null);
  const [revListForm, setRevListForm] = useState({ name: '', reminderDate: '' });
  const [expandedRevList, setExpandedRevList] = useState(null);
  const [showRevProbForm, setShowRevProbForm] = useState(false);
  const [addingToRevListId, setAddingToRevListId] = useState(null);
  const [revProbForm, setRevProbForm] = useState({ title: '', url: '', difficulty: 'Medium', notes: '', problemRef: '' });

  // Profile
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [showAuthPass, setShowAuthPass] = useState(false);
  const [showCurrPass, setShowCurrPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // ── Effects ──
  useEffect(() => { if (token) fetchUserData(); }, [token]);
  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name, email: user.email });
      fetchMyProblems();
      fetchRevisionLists();
      if (currentView === 'browse') fetchLCProblems();
      if (currentView === 'tasks') fetchTasks();
    }
  }, [user, currentView]);

  // Reset pages when filters change
  useEffect(() => { setBrowsePage(1); }, [searchQuery, difficultyFilter, statusFilter]);
  useEffect(() => { setMyPage(1); }, [mySearch, myDiff, mySolved]);
  useEffect(() => { setTaskPage(1); }, [taskSearch, taskStatus]);

  // ── Fetch helpers ──
  const fetchUserData = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/user`, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data);
    } catch { logout(); }
  };
  const fetchMyProblems = async () => {
    try {
      const res = await axios.get(`${API_URL}/problems`, { headers: { Authorization: `Bearer ${token}` } });
      setMyProblems(res.data);
    } catch (e) { console.error(e); }
  };
  const fetchLCProblems = async () => {
    if (allLCProblems.length > 0) return;
    setLcLoading(true); setLcError('');
    try {
      const res = await axios.get(`${API_URL}/leetcode/problems`, { headers: { Authorization: `Bearer ${token}` } });
      setAllLCProblems(res.data);
    } catch (err) {
      setLcError(err.response?.data?.message || 'Failed to load LeetCode problems.');
    } finally { setLcLoading(false); }
  };
  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(res.data);
    } catch (e) { console.error(e); }
  };
  const fetchRevisionLists = async () => {
    try {
      const res = await axios.get(`${API_URL}/revision-lists`, { headers: { Authorization: `Bearer ${token}` } });
      setRevisionLists(res.data);
    } catch (e) { console.error(e); }
  };

  const logout = () => { setToken(null); setUser(null); localStorage.removeItem('token'); };

  // ── Derived data ──
  const addedUrls = useMemo(() => new Set(myProblems.map(p => p.url)), [myProblems]);

  // Browse: filter + paginate
  const filteredBrowse = useMemo(() => {
    let list = allLCProblems;
    if (difficultyFilter !== 'All') list = list.filter(p => p.difficulty === difficultyFilter);
    if (statusFilter === 'Added') list = list.filter(p => addedUrls.has(p.url));
    if (statusFilter === 'Not Added') list = list.filter(p => !addedUrls.has(p.url));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || String(p.id).includes(q));
    }
    return list;
  }, [allLCProblems, difficultyFilter, statusFilter, searchQuery, addedUrls]);
  const browseTotalPages = Math.max(1, Math.ceil(filteredBrowse.length / BROWSE_PAGE_SIZE));
  const browsePageItems = filteredBrowse.slice((browsePage - 1) * BROWSE_PAGE_SIZE, browsePage * BROWSE_PAGE_SIZE);

  // My Problems: filter + paginate
  const filteredMy = useMemo(() => {
    let list = myProblems;
    if (myDiff !== 'All') list = list.filter(p => p.difficulty === myDiff);
    if (mySolved === 'Solved') list = list.filter(p => p.solved);
    if (mySolved === 'Unsolved') list = list.filter(p => !p.solved);
    if (mySearch.trim()) {
      const q = mySearch.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    }
    return list;
  }, [myProblems, myDiff, mySolved, mySearch]);
  const myTotalPages = Math.max(1, Math.ceil(filteredMy.length / MY_PAGE_SIZE));
  const myPageItems = filteredMy.slice((myPage - 1) * MY_PAGE_SIZE, myPage * MY_PAGE_SIZE);

  // Tasks: filter + paginate
  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (taskStatus === 'Completed') list = list.filter(t => t.completed);
    if (taskStatus === 'Pending') list = list.filter(t => !t.completed);
    if (taskSearch.trim()) {
      const q = taskSearch.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
    }
    return list;
  }, [tasks, taskStatus, taskSearch]);
  const taskTotalPages = Math.max(1, Math.ceil(filteredTasks.length / TASK_PAGE_SIZE));
  const taskPageItems = filteredTasks.slice((taskPage - 1) * TASK_PAGE_SIZE, taskPage * TASK_PAGE_SIZE);

  // ── Handlers ──
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const res = await axios.post(`${API_URL}${endpoint}`, authForm);
      setToken(res.data.token); setUser(res.data.user);
      localStorage.setItem('token', res.data.token);
      setAuthForm({ name: '', email: '', password: '' });
    } catch (err) { alert(err.response?.data?.message || 'Authentication failed'); }
  };

  const addFromBrowse = async (lcProblem) => {
    setAddingId(lcProblem.id);
    try {
      await axios.post(`${API_URL}/problems`,
        { title: lcProblem.title, difficulty: lcProblem.difficulty, url: lcProblem.url, category: '', notes: '', solved: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchMyProblems();
    } catch { alert('Error adding problem'); }
    finally { setAddingId(null); }
  };

  const handleProblemSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProblem) {
        await axios.put(`${API_URL}/problems/${editingProblem._id}`, problemForm, { headers: { Authorization: `Bearer ${token}` } });
        setEditingProblem(null);
      } else {
        await axios.post(`${API_URL}/problems`, problemForm, { headers: { Authorization: `Bearer ${token}` } });
      }
      setProblemForm({ title: '', difficulty: 'Easy', category: '', url: '', notes: '', solved: false, nextRevision: '' });
      setShowAddForm(false); fetchMyProblems();
    } catch { alert('Error saving problem'); }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await axios.put(`${API_URL}/tasks/${editingTask._id}`, taskForm, { headers: { Authorization: `Bearer ${token}` } });
        setEditingTask(null);
      } else {
        await axios.post(`${API_URL}/tasks`, taskForm, { headers: { Authorization: `Bearer ${token}` } });
      }
      setTaskForm({ title: '', description: '', date: '', time: '', linkedProblems: [] }); fetchTasks();
    } catch { alert('Error saving task'); }
  };

  const handleRevListSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRevList) {
        await axios.put(`${API_URL}/revision-lists/${editingRevList._id}`, revListForm, { headers: { Authorization: `Bearer ${token}` } });
        setEditingRevList(null);
      } else {
        await axios.post(`${API_URL}/revision-lists`, revListForm, { headers: { Authorization: `Bearer ${token}` } });
      }
      setRevListForm({ name: '', reminderDate: '' }); setShowRevListForm(false); fetchRevisionLists();
    } catch { alert('Error saving revision list'); }
  };

  const deleteRevList = async (id) => {
    if (!window.confirm('Delete this revision list?')) return;
    try { await axios.delete(`${API_URL}/revision-lists/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchRevisionLists(); }
    catch { alert('Error deleting'); }
  };

  const handleRevProbSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/revision-lists/${addingToRevListId}/problems`, revProbForm, { headers: { Authorization: `Bearer ${token}` } });
      setRevProbForm({ title: '', url: '', difficulty: 'Medium', notes: '', problemRef: '' });
      setShowRevProbForm(false); setAddingToRevListId(null); fetchRevisionLists();
    } catch { alert('Error adding problem to list'); }
  };

  const deleteRevProb = async (listId, probIdx) => {
    if (!window.confirm('Remove this problem from the list?')) return;
    try { await axios.delete(`${API_URL}/revision-lists/${listId}/problems/${probIdx}`, { headers: { Authorization: `Bearer ${token}` } }); fetchRevisionLists(); }
    catch { alert('Error removing problem'); }
  };

  const deleteProblem = async (id) => {
    if (!window.confirm('Delete this problem?')) return;
    try { await axios.delete(`${API_URL}/problems/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchMyProblems(); }
    catch { alert('Error deleting'); }
  };
  const deleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try { await axios.delete(`${API_URL}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchTasks(); }
    catch { alert('Error deleting'); }
  };
  const toggleProblemSolved = async (problem) => {
    try {
      const updates = { solved: !problem.solved, solvedDate: !problem.solved ? new Date() : null };
      if (!problem.solved && !problem.nextRevision) { const d = new Date(); d.setDate(d.getDate() + 3); updates.nextRevision = d; }
      await axios.put(`${API_URL}/problems/${problem._id}`, updates, { headers: { Authorization: `Bearer ${token}` } });
      fetchMyProblems();
    } catch { alert('Error updating'); }
  };
  const toggleTaskCompleted = async (task) => {
    try {
      await axios.put(`${API_URL}/tasks/${task._id}`, { completed: !task.completed }, { headers: { Authorization: `Bearer ${token}` } });
      fetchTasks();
    } catch { alert('Error updating'); }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    try {
      const res = await axios.put(`${API_URL}/auth/user`, profileForm, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data);
      setProfileForm({ name: res.data.name, email: res.data.email });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Error updating profile' });
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });
    try {
      await axios.put(`${API_URL}/auth/password`, passwordForm, { headers: { Authorization: `Bearer ${token}` } });
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.message || 'Error updating password' });
    }
  };

  // ─── AUTH SCREEN ───
  if (!user) return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="brand">LeetTrack</h1>
          <p className="tagline">Master problems, track progress, never forget</p>
        </div>
        <div className="auth-toggle">
          <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Login</button>
          <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Register</button>
        </div>
        <form onSubmit={handleAuth} className="auth-form">
          {authMode === 'register' && <input type="text" placeholder="Full Name" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} required />}
          <input type="email" placeholder="Email Address" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} required />
          <div className="password-input">
            <input type={showAuthPass ? "text" : "password"} placeholder="Password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} required />
            <button type="button" className="toggle-pass" onClick={() => setShowAuthPass(!showAuthPass)}>
              {showAuthPass ? '🙈' : '👁️'}
            </button>
          </div>
          <button type="submit" className="submit-btn">{authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
        </form>
      </div>
    </div>
  );

  // ─── MAIN APP ───
  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <h1>LeetTrack</h1>
          <span className="user-info">👋 {user.name}</span>
        </div>
        <div className="nav-menu">
          <button className={currentView === 'browse' ? 'active' : ''} onClick={() => setCurrentView('browse')}>
            <span className="icon">🌐</span> Browse Problems
          </button>
          <button className={currentView === 'problems' ? 'active' : ''} onClick={() => setCurrentView('problems')}>
            <span className="icon">📊</span> My List ({myProblems.length})
          </button>
          <button className={currentView === 'revision-lists' ? 'active' : ''} onClick={() => setCurrentView('revision-lists')}>
            <span className="icon">📋</span> Revision Lists
          </button>
          <button className={currentView === 'tasks' ? 'active' : ''} onClick={() => setCurrentView('tasks')}>
            <span className="icon">✓</span> Tasks
          </button>
          <button className={currentView === 'profile' ? 'active' : ''} onClick={() => setCurrentView('profile')}>
            <span className="icon">👤</span> Profile
          </button>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </nav>

      <main className="main-content">

        {/* ══════════ BROWSE ══════════ */}
        {currentView === 'browse' && (
          <div className="browse-view">
            <div className="view-header">
              <h2>Browse LeetCode Problems</h2>
              <div className="stats">
                <div className="stat"><span className="stat-value">{allLCProblems.length}</span><span className="stat-label">Total</span></div>
                <div className="stat"><span className="stat-value">{allLCProblems.filter(p => p.difficulty === 'Easy').length}</span><span className="stat-label easy-color">Easy</span></div>
                <div className="stat"><span className="stat-value">{allLCProblems.filter(p => p.difficulty === 'Medium').length}</span><span className="stat-label medium-color">Medium</span></div>
                <div className="stat"><span className="stat-value">{allLCProblems.filter(p => p.difficulty === 'Hard').length}</span><span className="stat-label hard-color">Hard</span></div>
              </div>
            </div>

            <div className="browse-filters">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input type="text" placeholder="Search by title or problem #..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)} />
                {searchQuery && <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>}
              </div>
              <div className="filter-group">
                <label>Difficulty</label>
                <div className="filter-pills">
                  {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                    <button key={d} className={`pill ${difficultyFilter === d ? 'active' : ''} ${d.toLowerCase()}-pill`}
                      onClick={() => setDifficultyFilter(d)}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <label>Status</label>
                <div className="filter-pills">
                  {['All', 'Added', 'Not Added'].map(s => (
                    <button key={s} className={`pill ${statusFilter === s ? 'active' : ''}`}
                      onClick={() => setStatusFilter(s)}>{s}</button>
                  ))}
                </div>
              </div>
            </div>

            {lcLoading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading problems from LeetCode&hellip;</p>
              </div>
            )}
            {lcError && (
              <div className="error-state">
                <p>⚠️ {lcError}</p>
                <button className="btn-primary" onClick={() => { setAllLCProblems([]); fetchLCProblems(); }}>Retry</button>
              </div>
            )}
            {!lcLoading && !lcError && allLCProblems.length === 0 && (
              <div className="empty-state">
                <p>No problems loaded yet.</p>
                <button className="btn-primary" onClick={fetchLCProblems}>Load Problems</button>
              </div>
            )}

            {!lcLoading && allLCProblems.length > 0 && (
              <div className="table-card">
                <div className="table-container">
                  <table className="data-table browse-table">
                    <thead>
                      <tr><th>#</th><th>Title</th><th>Difficulty</th><th>Acceptance</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {browsePageItems.map(problem => {
                        const isAdded = addedUrls.has(problem.url);
                        return (
                          <tr key={problem.id} className={isAdded ? 'row-added' : ''}>
                            <td className="problem-num">{problem.id}</td>
                            <td>
                              <a href={problem.url} target="_blank" rel="noopener noreferrer" className="problem-link">{problem.title}</a>
                              {problem.isPaid && <span className="paid-badge">💰</span>}
                            </td>
                            <td><span className={`difficulty ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span></td>
                            <td className="acceptance-rate">{problem.acceptanceRate}%</td>
                            <td>
                              {isAdded
                                ? <span className="added-badge">✓ Added</span>
                                : <button className="btn-add-sm" onClick={() => addFromBrowse(problem)} disabled={addingId === problem.id}>
                                    {addingId === problem.id ? '…' : '+ Add'}
                                  </button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={browsePage}
                  totalPages={browseTotalPages}
                  onPageChange={p => { setBrowsePage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  totalItems={filteredBrowse.length}
                  pageSize={BROWSE_PAGE_SIZE}
                />
              </div>
            )}
          </div>
        )}

        {/* ══════════ MY PROBLEMS ══════════ */}
        {currentView === 'problems' && (
          <div className="problems-view">
            <div className="view-header">
              <h2>My Problem List</h2>
              <div className="header-right">
                <div className="stats">
                  <div className="stat"><span className="stat-value">{myProblems.filter(p => p.solved).length}</span><span className="stat-label">Solved</span></div>
                  <div className="stat"><span className="stat-value">{myProblems.length}</span><span className="stat-label">Total</span></div>
                </div>
                <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                  {showAddForm ? '✕ Close' : '+ Add Manually'}
                </button>
              </div>
            </div>

            {showAddForm && (
              <div className="form-card slide-in">
                <h3>{editingProblem ? 'Edit Problem' : 'Add Problem Manually'}</h3>
                <form onSubmit={handleProblemSubmit}>
                  <input type="text" placeholder="Problem Title" value={problemForm.title}
                    onChange={e => setProblemForm({ ...problemForm, title: e.target.value })} required />
                  <select value={problemForm.difficulty} onChange={e => setProblemForm({ ...problemForm, difficulty: e.target.value })}>
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                  <input type="text" placeholder="Category (e.g., Arrays, DP)" value={problemForm.category}
                    onChange={e => setProblemForm({ ...problemForm, category: e.target.value })} />
                  <input type="url" placeholder="LeetCode URL" value={problemForm.url}
                    onChange={e => setProblemForm({ ...problemForm, url: e.target.value })} />
                  <textarea placeholder="Notes" value={problemForm.notes}
                    onChange={e => setProblemForm({ ...problemForm, notes: e.target.value })} rows="3" />
                  <div className="form-row">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={problemForm.solved}
                        onChange={e => setProblemForm({ ...problemForm, solved: e.target.checked })} />
                      <span>Mark as solved</span>
                    </label>
                    {problemForm.solved && (
                      <input type="datetime-local" value={problemForm.nextRevision}
                        onChange={e => setProblemForm({ ...problemForm, nextRevision: e.target.value })} />
                    )}
                  </div>
                  <div className="button-group">
                    <button type="submit" className="btn-primary">{editingProblem ? 'Update' : 'Add'} Problem</button>
                    {editingProblem && (
                      <button type="button" className="btn-secondary" onClick={() => {
                        setEditingProblem(null);
                        setProblemForm({ title: '', difficulty: 'Easy', category: '', url: '', notes: '', solved: false, nextRevision: '' });
                      }}>Cancel</button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* My Problems Filters */}
            <div className="browse-filters" style={{ marginBottom: '1rem' }}>
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input type="text" placeholder="Search title or category..." value={mySearch}
                  onChange={e => setMySearch(e.target.value)} />
                {mySearch && <button className="clear-search" onClick={() => setMySearch('')}>✕</button>}
              </div>
              <div className="filter-group">
                <label>Difficulty</label>
                <div className="filter-pills">
                  {['All', 'Easy', 'Medium', 'Hard'].map(d => (
                    <button key={d} className={`pill ${myDiff === d ? 'active' : ''} ${d.toLowerCase()}-pill`}
                      onClick={() => setMyDiff(d)}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="filter-group">
                <label>Status</label>
                <div className="filter-pills">
                  {['All', 'Solved', 'Unsolved'].map(s => (
                    <button key={s} className={`pill ${mySolved === s ? 'active' : ''}`}
                      onClick={() => setMySolved(s)}>{s}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="table-card">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>✓</th><th>Title</th><th>Difficulty</th><th>Category</th><th>Next Revision</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {myPageItems.map(problem => (
                      <tr key={problem._id} className={problem.solved ? 'solved' : ''}>
                        <td>
                          <button className="check-btn" onClick={() => toggleProblemSolved(problem)}>
                            {problem.solved ? '✓' : '○'}
                          </button>
                        </td>
                        <td>{problem.url ? <a href={problem.url} target="_blank" rel="noopener noreferrer">{problem.title}</a> : problem.title}</td>
                        <td><span className={`difficulty ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span></td>
                        <td>{problem.category || '—'}</td>
                        <td>{problem.nextRevision ? new Date(problem.nextRevision).toLocaleDateString() : '—'}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-edit" onClick={() => {
                              setEditingProblem(problem);
                              setProblemForm({
                                title: problem.title, difficulty: problem.difficulty,
                                category: problem.category || '', url: problem.url || '',
                                notes: problem.notes || '', solved: problem.solved,
                                nextRevision: problem.nextRevision ? new Date(problem.nextRevision).toISOString().slice(0, 16) : '',
                              });
                              setShowAddForm(true);
                            }}>Edit</button>
                            <button className="btn-delete" onClick={() => deleteProblem(problem._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredMy.length === 0 && (
                  <div className="empty-state">
                    <p>{myProblems.length === 0 ? 'No problems yet. Browse LeetCode to add some!' : 'No problems match your filters.'}</p>
                  </div>
                )}
              </div>
              <Pagination
                currentPage={myPage}
                totalPages={myTotalPages}
                onPageChange={setMyPage}
                totalItems={filteredMy.length}
                pageSize={MY_PAGE_SIZE}
              />
            </div>
          </div>
        )}

        {/* ══════════ TASKS ══════════ */}
        {currentView === 'tasks' && (
          <div className="tasks-view">
            <div className="view-header">
              <h2>Task Manager</h2>
              <div className="stats">
                <div className="stat"><span className="stat-value">{tasks.filter(t => t.completed).length}</span><span className="stat-label">Completed</span></div>
                <div className="stat"><span className="stat-value">{tasks.filter(t => !t.completed).length}</span><span className="stat-label">Pending</span></div>
                <div className="stat"><span className="stat-value">{tasks.length}</span><span className="stat-label">Total</span></div>
              </div>
            </div>

            <div className="content-grid">
              {/* Add/Edit form */}
              <div className="form-card">
                <h3>{editingTask ? 'Edit Task' : 'Add Task'}</h3>
                <form onSubmit={handleTaskSubmit}>
                  <input type="text" placeholder="Task Title" value={taskForm.title}
                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
                  <textarea placeholder="Description (optional)" value={taskForm.description}
                    onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} rows="2" />
                  <div className="form-row">
                    <input type="date" value={taskForm.date}
                      onChange={e => setTaskForm({ ...taskForm, date: e.target.value })} required />
                    <input type="time" value={taskForm.time}
                      onChange={e => setTaskForm({ ...taskForm, time: e.target.value })} required />
                  </div>
                  
                  {/* Link problems section */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Link Revision Problems</label>
                    <select
                      className="link-problem-select"
                      style={{ width: '100%', padding: '0.6rem', marginTop: '0.3rem', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '2px solid transparent' }}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const [listId, probIdx] = e.target.value.split('-');
                        const list = revisionLists.find(l => l._id === listId);
                        if (list) {
                          const prob = list.problems[probIdx];
                          if (prob && !taskForm.linkedProblems.some(p => p.title === prob.title)) {
                            setTaskForm({ ...taskForm, linkedProblems: [...(taskForm.linkedProblems || []), { title: prob.title, url: prob.url, difficulty: prob.difficulty }] });
                          }
                        }
                        e.target.value = '';
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>+ Select a problem from Revision Lists...</option>
                      {revisionLists.map(list => (
                        <optgroup key={list._id} label={list.name}>
                          {list.problems.map((p, idx) => (
                            <option key={`${list._id}-${idx}`} value={`${list._id}-${idx}`}>{p.title} ({p.difficulty})</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {taskForm.linkedProblems && taskForm.linkedProblems.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {taskForm.linkedProblems.map((p, idx) => (
                          <div key={idx} className="problem-chip" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', background: 'var(--bg-tertiary)', borderRadius: '15px', fontSize: '0.8rem' }}>
                            <span style={{ color: p.difficulty === 'Easy' ? 'var(--easy-color)' : p.difficulty === 'Medium' ? 'var(--medium-color)' : 'var(--hard-color)' }}>•</span>
                            {p.title}
                            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent-coral)', cursor: 'pointer', marginLeft: '0.2rem' }}
                              onClick={() => setTaskForm({ ...taskForm, linkedProblems: taskForm.linkedProblems.filter((_, i) => i !== idx) })}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="button-group">
                    <button type="submit" className="btn-primary">{editingTask ? 'Update' : 'Add'} Task</button>
                    {editingTask && (
                      <button type="button" className="btn-secondary" onClick={() => {
                        setEditingTask(null);
                        setTaskForm({ title: '', description: '', date: '', time: '' });
                      }}>Cancel</button>
                    )}
                  </div>
                </form>
              </div>

              {/* Tasks table */}
              <div>
                {/* Task filters */}
                <div className="browse-filters" style={{ marginBottom: '1rem' }}>
                  <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input type="text" placeholder="Search tasks..." value={taskSearch}
                      onChange={e => setTaskSearch(e.target.value)} />
                    {taskSearch && <button className="clear-search" onClick={() => setTaskSearch('')}>✕</button>}
                  </div>
                  <div className="filter-group">
                    <label>Status</label>
                    <div className="filter-pills">
                      {['All', 'Pending', 'Completed'].map(s => (
                        <button key={s} className={`pill ${taskStatus === s ? 'active' : ''}`}
                          onClick={() => setTaskStatus(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="table-card">
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr><th>✓</th><th>Task</th><th>Date</th><th>Time</th><th>Email</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {taskPageItems.map(task => (
                          <tr key={task._id} className={task.completed ? 'completed' : ''}>
                            <td><button className="check-btn" onClick={() => toggleTaskCompleted(task)}>{task.completed ? '✓' : '○'}</button></td>
                            <td>
                              <strong>{task.title}</strong>
                              {task.description && <p className="task-description">{task.description}</p>}
                              {task.linkedProblems && task.linkedProblems.length > 0 && (
                                <div style={{ marginTop: '0.5rem' }}>
                                  <span style={{ fontSize: '0.75rem', background: 'rgba(78, 236, 163, 0.1)', color: 'var(--accent-teal)', padding: '0.2rem 0.5rem', borderRadius: '12px', cursor: 'pointer' }}
                                        onClick={(e) => { e.currentTarget.nextElementSibling.style.display = e.currentTarget.nextElementSibling.style.display === 'none' ? 'block' : 'none'; }}>
                                    📎 {task.linkedProblems.length} problem{task.linkedProblems.length > 1 ? 's' : ''}
                                  </span>
                                  <div style={{ display: 'none', marginTop: '0.4rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--accent-teal)' }}>
                                    {task.linkedProblems.map((p, i) => (
                                      <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>{p.title}</a> : p.title} 
                                        <span style={{ fontSize: '0.7rem', marginLeft: '0.3rem', color: p.difficulty === 'Easy' ? 'var(--easy-color)' : p.difficulty === 'Medium' ? 'var(--medium-color)' : 'var(--hard-color)' }}>({p.difficulty})</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td>{new Date(task.date).toLocaleDateString()}</td>
                            <td>{task.time}</td>
                            <td><span className={`status ${task.emailSent ? 'sent' : 'pending'}`}>{task.emailSent ? 'Sent' : 'Pending'}</span></td>
                            <td>
                              <div className="action-buttons">
                                <button className="btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }} onClick={() => {
                                  setEditingTask(null);
                                  setTaskForm({ title: task.title, description: task.description || '', date: '', time: task.time, linkedProblems: task.linkedProblems || [] });
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }} title="Repeat task on a different day">🔁 Repeat</button>
                                <button className="btn-edit" onClick={() => {
                                  setEditingTask(task);
                                  setTaskForm({ title: task.title, description: task.description || '', date: new Date(task.date).toISOString().split('T')[0], time: task.time, linkedProblems: task.linkedProblems || [] });
                                }}>Edit</button>
                                <button className="btn-delete" onClick={() => deleteTask(task._id)}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredTasks.length === 0 && (
                      <div className="empty-state">
                        <p>{tasks.length === 0 ? 'No tasks yet. Schedule your first one!' : 'No tasks match your filters.'}</p>
                      </div>
                    )}
                  </div>
                  <Pagination
                    currentPage={taskPage}
                    totalPages={taskTotalPages}
                    onPageChange={setTaskPage}
                    totalItems={filteredTasks.length}
                    pageSize={TASK_PAGE_SIZE}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ REVISION LISTS ══════════ */}
        {currentView === 'revision-lists' && (
          <div className="revision-lists-view" style={{ animation: 'fadeIn 0.4s ease' }}>
            <div className="view-header">
              <h2>Revision Lists</h2>
              <button className="btn-primary" onClick={() => setShowRevListForm(!showRevListForm)}>
                {showRevListForm ? '✕ Close' : '+ New List'}
              </button>
            </div>
            
            {showRevListForm && (
              <div className="form-card slide-in" style={{ marginBottom: '2rem' }}>
                <h3>{editingRevList ? 'Edit Revision List' : 'Create Revision List'}</h3>
                <form onSubmit={handleRevListSubmit}>
                  <input type="text" placeholder="List Name (e.g. 'DP Problems', 'Week 1')" value={revListForm.name}
                    onChange={e => setRevListForm({ ...revListForm, name: e.target.value })} required />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reminder Date/Time (Defaults to 3 days from now at 9:00 AM)</label>
                    <input type="datetime-local" value={revListForm.reminderDate}
                      onChange={e => setRevListForm({ ...revListForm, reminderDate: e.target.value })} />
                  </div>
                  <div className="button-group">
                    <button type="submit" className="btn-primary">{editingRevList ? 'Update' : 'Create'} List</button>
                    {editingRevList && (
                      <button type="button" className="btn-secondary" onClick={() => {
                        setEditingRevList(null);
                        setRevListForm({ name: '', reminderDate: '' });
                      }}>Cancel</button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Modal for adding a problem to a revision list */}
            {showRevProbForm && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                <div className="form-card slide-in" style={{ width: '100%', maxWidth: '500px', margin: 0 }}>
                  <h3>Add Problem to List</h3>
                  <form onSubmit={handleRevProbSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Pick from My Problems</label>
                      <select style={{ width: '100%', padding: '0.875rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '2px solid transparent', borderRadius: '10px' }}
                        onChange={e => {
                          if (!e.target.value) return;
                          const p = myProblems.find(x => x._id === e.target.value);
                          if (p) setRevProbForm({ ...revProbForm, title: p.title, url: p.url, difficulty: p.difficulty, problemRef: p._id });
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Select a problem...</option>
                        {myProblems.map(p => <option key={p._id} value={p._id}>{p.title} ({p.difficulty})</option>)}
                      </select>
                    </div>
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>— OR enter manually —</div>
                    <input type="text" placeholder="Problem Title" value={revProbForm.title}
                      onChange={e => setRevProbForm({ ...revProbForm, title: e.target.value })} required />
                    <input type="url" placeholder="Problem URL (optional)" value={revProbForm.url}
                      onChange={e => setRevProbForm({ ...revProbForm, url: e.target.value })} />
                    <select value={revProbForm.difficulty} onChange={e => setRevProbForm({ ...revProbForm, difficulty: e.target.value })}>
                      <option>Easy</option><option>Medium</option><option>Hard</option>
                    </select>
                    <textarea placeholder="Notes (optional)" value={revProbForm.notes} rows="2"
                      onChange={e => setRevProbForm({ ...revProbForm, notes: e.target.value })} />
                    <div className="button-group">
                      <button type="submit" className="btn-primary">Add Problem</button>
                      <button type="button" className="btn-secondary" onClick={() => { setShowRevProbForm(false); setAddingToRevListId(null); setRevProbForm({ title: '', url: '', difficulty: 'Medium', notes: '', problemRef: '' }); }}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {revisionLists.length === 0 ? (
                <div className="empty-state" style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                  <p>You haven't created any revision lists yet.</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Create a list to group problems and get email reminders!</p>
                </div>
              ) : (
                revisionLists.map(list => (
                  <div key={list._id} className="table-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 style={{ padding: 0, margin: '0 0 0.5rem 0', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          📁 {list.name}
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                          <span><strong>Reminder:</strong> {new Date(list.reminderDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          <span className={`status ${list.emailSent ? 'sent' : 'pending'}`}>{list.emailSent ? 'Email Sent' : 'Pending Email'}</span>
                          <span><strong>Problems:</strong> {list.problems.length}</span>
                        </div>
                      </div>
                      <div className="action-buttons">
                        <button className="btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }} onClick={() => {
                          setAddingToRevListId(list._id); setShowRevProbForm(true);
                        }}>+ Add Problem</button>
                        <button className="btn-edit" onClick={() => {
                          setEditingRevList(list);
                          setRevListForm({ name: list.name, reminderDate: new Date(list.reminderDate).toISOString().slice(0, 16) });
                          setShowRevListForm(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}>Edit</button>
                        <button className="btn-delete" onClick={() => deleteRevList(list._id)}>Delete</button>
                      </div>
                    </div>
                    
                    {list.problems.length > 0 && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}
                                onClick={() => setExpandedRevList(expandedRevList === list._id ? null : list._id)}>
                          {expandedRevList === list._id ? '▼ Hide Problems' : '▶ Show Problems'}
                        </button>
                        
                        {expandedRevList === list._id && (
                          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1rem', marginTop: '0.5rem' }}>
                            {list.problems.map((p, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: idx < list.problems.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                <div>
                                  {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', fontWeight: '600', textDecoration: 'none' }}>{p.title}</a> : <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{p.title}</span>}
                                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '6px', marginLeft: '0.5rem', background: p.difficulty === 'Easy' ? 'rgba(78,236,163,0.1)' : p.difficulty === 'Medium' ? 'rgba(255,217,61,0.1)' : 'rgba(255,107,107,0.1)', color: p.difficulty === 'Easy' ? 'var(--easy-color)' : p.difficulty === 'Medium' ? 'var(--medium-color)' : 'var(--hard-color)' }}>{p.difficulty}</span>
                                  {p.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{p.notes}</p>}
                                </div>
                                <button style={{ background: 'none', border: 'none', color: 'var(--accent-coral)', cursor: 'pointer', padding: '0.3rem', borderRadius: '4px' }} onClick={() => deleteRevProb(list._id, idx)} title="Remove problem">✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══════════ PROFILE ══════════ */}
        {currentView === 'profile' && (
          <div className="profile-view" style={{ animation: 'fadeIn 0.4s ease' }}>
            <div className="view-header">
              <h2>My Profile</h2>
            </div>
            <div className="content-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <div className="form-card">
                <h3>Update Details</h3>
                <form onSubmit={handleProfileUpdate}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
                    <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                    <input type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} required />
                  </div>
                  {profileMsg.text && (
                    <div className={`msg-banner ${profileMsg.type}`}>{profileMsg.text}</div>
                  )}
                  <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Save Changes</button>
                </form>
              </div>

              <div className="form-card">
                <h3>Change Password</h3>
                <form onSubmit={handlePasswordUpdate}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Password</label>
                    <div className="password-input">
                      <input type={showCurrPass ? "text" : "password"} value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                      <button type="button" className="toggle-pass" onClick={() => setShowCurrPass(!showCurrPass)}>
                        {showCurrPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label>
                    <div className="password-input">
                      <input type={showNewPass ? "text" : "password"} value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} minLength="6" required />
                      <button type="button" className="toggle-pass" onClick={() => setShowNewPass(!showNewPass)}>
                        {showNewPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                  {passwordMsg.text && (
                    <div className={`msg-banner ${passwordMsg.type}`}>{passwordMsg.text}</div>
                  )}
                  <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Update Password</button>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
