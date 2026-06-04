import React, { useEffect, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MdDashboard, MdInbox, MdPlaylistAddCheck, MdBarChart, MdSettings,
  MdNotifications, MdOutlineSync, MdAddCircleOutline, 
  MdMenu, MdClose, MdCheckCircle, MdError, MdWarning, MdInfo
} from 'react-icons/md';
import { useAuthStore } from '../store/authStore';
import { useEmailStore } from '../store/emailStore';
import { useTaskStore } from '../store/taskStore';
import { useAnalyticsStore } from '../store/analyticsStore';
import { useNotificationStore } from '../store/notificationStore';
import { useTheme } from '../hooks/useTheme';
import { API_BASE_URL } from '../services/api';

const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme, isDark } = useTheme();
  const { config, fetchStatus } = useAuthStore();
  const { triggerSync, fetching } = useEmailStore();
  const { fetchTasks, addTaskLocally, updateTaskLocally, removeTaskLocally } = useTaskStore();
  const { fetchAnalytics } = useAnalyticsStore();
  const { notifications, unreadCount, addNotification, markAllAsRead, clearAll } = useNotificationStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Manual Email Form State
  const [manualSubject, setManualSubject] = useState('');
  const [manualSenderName, setManualSenderName] = useState('');
  const [manualSenderAddress, setManualSenderAddress] = useState('');
  const [manualBody, setManualBody] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const { processManualEmail } = useEmailStore();

  // Load baseline on mount
  useEffect(() => {
    fetchStatus();
    fetchTasks();
    fetchAnalytics();
  }, []);

  // WebSocket Connection
  useEffect(() => {
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws';
    let socket: WebSocket | null = null;
    let reconnectTimeout: number | null = null;

    const connect = () => {
      console.log('Connecting to WebSocket at:', wsUrl);
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket Connected');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WS Message Received:', data);

          if (data.type === 'NEW_EMAILS') {
            // Add notification
            addNotification(data.message, 'new_email');
            showToastMessage(data.message, 'success');
            // Refresh stores
            useEmailStore.getState().fetchEmails();
            fetchAnalytics();
            fetchTasks();
          } else if (data.type === 'TASK_UPDATED') {
            updateTaskLocally(data.task);
            fetchAnalytics();
          } else if (data.type === 'TASK_DELETED') {
            removeTaskLocally(data.task_id);
            fetchAnalytics();
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket Connection Closed. Attempting reconnect...');
        reconnectTimeout = window.setTimeout(connect, 5000); // Reconnect in 5s
      };

      socket.onerror = (err) => {
        console.error('WebSocket encountered an error:', err);
      };
    };

    connect();

    return () => {
      if (socket) {
        socket.onclose = null; // Prevent reconnect loop
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const showToastMessage = (message: string, type: 'success' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSync = async () => {
    try {
      showToastMessage('Initiating email sync...', 'info');
      const res = await triggerSync(10);
      showToastMessage(
        res.new_processed > 0 
          ? `Sync Complete! Fetched ${res.new_processed} new email(s).` 
          : 'Sync Complete. No new emails found.',
        'success'
      );
      fetchAnalytics();
    } catch (err: any) {
      showToastMessage(`Sync failed: ${err.message}`, 'info');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSubject || !manualSenderAddress || !manualBody) {
      setManualError('Subject, Sender Email, and Body are required.');
      return;
    }
    setSubmittingManual(true);
    setManualError(null);
    try {
      await processManualEmail({
        subject: manualSubject,
        sender_name: manualSenderName || 'Manual Submission',
        sender_address: manualSenderAddress,
        body: manualBody
      });
      showToastMessage('Email processed and added successfully!', 'success');
      setShowManualModal(false);
      // Reset form
      setManualSubject('');
      setManualSenderName('');
      setManualSenderAddress('');
      setManualBody('');
      fetchAnalytics();
    } catch (err: any) {
      setManualError(err.message);
    } finally {
      setSubmittingManual(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <MdDashboard size={20} /> },
    { name: 'Inbox', path: '/inbox', icon: <MdInbox size={20} /> },
    { name: 'Task Board', path: '/tasks', icon: <MdPlaylistAddCheck size={22} /> },
    { name: 'Analytics', path: '/analytics', icon: <MdBarChart size={22} /> },
    { name: 'Settings', path: '/settings', icon: <MdSettings size={20} /> },
  ];

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 20, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-lg border ${
              toast.type === 'success' 
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
                : 'bg-brand-950/80 text-brand-300 border-brand-800'
            }`}
          >
            {toast.type === 'success' ? <MdCheckCircle className="text-emerald-400" size={20} /> : <MdInfo className="text-brand-400" size={20} />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        animate={{ width: sidebarOpen ? '260px' : '72px' }}
        className={`glass-panel h-screen sticky top-0 left-0 flex flex-col justify-between py-4 ${sidebarOpen ? 'px-4' : 'px-2'} z-40 rounded-none border-r border-y-0 border-l-0`}
      >
        <div>
          {/* Logo (Material Design 3 Stitch style) */}
          <div className={`flex items-center border-l-4 border-transparent border-b border-slate-800/40 ${sidebarOpen ? 'px-2 gap-3 py-3.5 mb-6' : 'justify-center px-0 py-3.5 mb-6'}`}>
            <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center shrink-0 text-white font-bold shadow-sm">
              <MdInbox size={18} />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <h1 className="font-semibold text-sm text-slate-100 light:text-slate-800 tracking-tight leading-none mb-0.5">Aether AI</h1>
                <p className="text-[10px] text-slate-500">Enterprise Agent</p>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link to={item.path} key={item.name}>
                  <div className={`flex items-center transition-all duration-150 ease-in-out cursor-pointer ${
                    sidebarOpen ? 'gap-4 px-4 py-2.5' : 'justify-center py-2.5 px-0'
                  } ${
                    active 
                      ? 'bg-slate-800 text-brand-500 border-l-4 border-brand-500 rounded-r-md' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border-l-4 border-transparent rounded-r-md light:text-slate-600 light:hover:bg-slate-100'
                  }`}>
                    <div className="flex-shrink-0">{item.icon}</div>
                    {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        {sidebarOpen && config && (
          <div className="p-3 bg-slate-900/60 border border-slate-800/40 rounded-md text-[11px] text-slate-500 light:bg-slate-100 light:border-slate-200">
            <p className="font-semibold text-slate-400 mb-0.5">Database Mode</p>
            <p className="mb-2 text-brand-500 font-medium">{config.database_mode}</p>
            <p className="font-semibold text-slate-400 mb-0.5">App Connection</p>
            <p className={`font-medium ${config.demo_mode ? 'text-amber-500' : 'text-emerald-500'}`}>
              {config.demo_mode ? 'Demo Simulator' : 'Live IMAP Sync'}
            </p>
          </div>
        )}
      </motion.aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="px-6 py-3.5 flex items-center justify-between border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 light:hover:bg-slate-200 light:text-slate-600 transition"
            >
              <MdMenu size={18} />
            </button>
            <h1 className="text-base font-semibold text-slate-100 light:text-slate-800">
              {navItems.find(i => i.path === location.pathname)?.name || 'Email Intel'}
            </h1>
          </div>

          {/* Search Bar (Material Design 3 style) */}
          <div className="hidden md:flex items-center flex-1 max-w-xs mx-6">
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input 
                className="w-full bg-slate-950/40 border border-slate-800 rounded-md py-1 px-8 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors" 
                placeholder="Search insights, tasks, or emails..." 
                type="text"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Manual Email Process Button */}
            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 rounded-md light:bg-white light:border-slate-300 light:text-slate-700 transition"
            >
              <MdAddCircleOutline size={15} />
              <span>Input Email</span>
            </button>

            {/* Sync Mailbox Button */}
            <button
              onClick={handleSync}
              disabled={fetching}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-xs font-semibold text-white rounded-md active:scale-[0.98] transition ${
                fetching ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <MdOutlineSync className={fetching ? 'animate-spin' : ''} size={15} />
              <span>{fetching ? 'Syncing...' : 'Sync Mailbox'}</span>
            </button>



            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-md text-slate-400 light:bg-white light:border-slate-300 light:text-slate-600 transition"
            >
              <MdNotifications size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-slate-900">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Dynamic Outlet */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/10 dark:bg-slate-900/5">
          <Outlet />
        </main>
      </div>

      {/* Notifications Drawer Overlay */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-80 h-full glass-panel z-50 p-6 rounded-none flex flex-col justify-between border-l border-y-0 border-r-0"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4 light:border-slate-200">
                  <div className="flex items-center gap-2">
                    <MdNotifications size={20} className="text-brand-500" />
                    <h2 className="font-bold text-lg text-slate-100 light:text-slate-800">Notification Center</h2>
                  </div>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-1 hover:bg-slate-800 light:hover:bg-slate-100 rounded-lg text-slate-400"
                  >
                    <MdClose size={20} />
                  </button>
                </div>

                {/* Notifications Lists */}
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[75vh] pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">
                      No notifications logged.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div 
                        key={item.id} 
                        className={`p-3.5 rounded-lg border text-xs flex flex-col gap-1.5 ${
                          item.type === 'new_email' 
                            ? 'bg-brand-950/20 border-brand-900/40 text-brand-300 light:bg-brand-50 light:border-brand-100 light:text-brand-800' 
                            : 'bg-slate-900/40 border-slate-800/80 text-slate-400 light:bg-slate-100 light:border-slate-200 light:text-slate-600'
                        }`}
                      >
                        <p className="font-semibold">{item.message}</p>
                        <span className="text-[10px] text-slate-500">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {notifications.length > 0 && (
                <div className="flex gap-2 border-t border-slate-800/80 pt-4 light:border-slate-200">
                  <button
                    onClick={markAllAsRead}
                    className="flex-1 text-[11px] font-bold text-center py-2 border border-slate-800 hover:bg-slate-800/50 rounded-lg text-slate-400 hover:text-slate-200 light:border-slate-300 light:hover:bg-slate-100"
                  >
                    Clear Unread badge
                  </button>
                  <button
                    onClick={clearAll}
                    className="flex-1 text-[11px] font-bold text-center py-2 bg-slate-850 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded-lg"
                  >
                    Clear History
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Manual Input Email Modal */}
      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManualModal(false)}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-xl p-6 relative z-50"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 light:border-slate-200 mb-4">
                <h3 className="text-lg font-bold text-slate-100 light:text-slate-800">Manually Process Custom Email</h3>
                <button 
                  onClick={() => setShowManualModal(false)}
                  className="p-1 hover:bg-slate-800 light:hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  <MdClose size={20} />
                </button>
              </div>

              {manualError && (
                <div className="p-3 bg-rose-950/30 border border-rose-900 rounded-lg text-xs text-rose-400 mb-4 flex items-center gap-2">
                  <MdError size={16} />
                  <span>{manualError}</span>
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">Sender Name</label>
                    <input
                      type="text"
                      className="glass-input text-sm"
                      placeholder="e.g. John Doe"
                      value={manualSenderName}
                      onChange={(e) => setManualSenderName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">Sender Email *</label>
                    <input
                      type="email"
                      required
                      className="glass-input text-sm"
                      placeholder="e.g. john@domain.com"
                      value={manualSenderAddress}
                      onChange={(e) => setManualSenderAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Subject *</label>
                  <input
                    type="text"
                    required
                    className="glass-input text-sm"
                    placeholder="e.g. Feedback report due Friday"
                    value={manualSubject}
                    onChange={(e) => setManualSubject(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Email Body / Raw Content *</label>
                  <textarea
                    required
                    rows={6}
                    className="glass-input text-sm resize-none font-sans"
                    placeholder="Type or paste the email contents here..."
                    value={manualBody}
                    onChange={(e) => setManualBody(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-800 light:border-slate-200 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="glass-btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingManual}
                    className="glass-btn-primary text-sm flex items-center gap-2"
                  >
                    {submittingManual ? 'Processing Pipeline...' : 'Process Email'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
