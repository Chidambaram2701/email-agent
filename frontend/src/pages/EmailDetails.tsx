import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MdArrowBack, MdContentCopy, MdOutlineMail, MdAddTask, MdDeleteOutline, 
  MdCalendarToday, MdOutlinePerson, MdCheckCircle, MdFormatQuote
} from 'react-icons/md';
import { useEmailStore } from '../store/emailStore';
import { useTaskStore } from '../store/taskStore';
import { useAnalyticsStore } from '../store/analyticsStore';

const EmailDetails: React.FC = () => {
  const { emailId } = useParams<{ emailId: string }>();
  const navigate = useNavigate();

  const { selectedEmail, fetchEmailDetails, loading, setSelectedEmail } = useEmailStore();
  const { updateTask, deleteTask, fetchTasks } = useTaskStore();
  const { fetchAnalytics } = useAnalyticsStore();

  const [activeTab, setActiveTab] = useState<'summary' | 'original' | 'cleaned'>('summary');
  const [copied, setCopied] = useState(false);
  
  // Custom Task Insertion State
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('No Deadline');
  const [newTaskOwner, setNewTaskOwner] = useState('Me');
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    if (emailId) {
      fetchEmailDetails(emailId);
    }
    return () => {
      // Clear selection on unmount
      setSelectedEmail(null);
    };
  }, [emailId]);

  if (loading || !selectedEmail) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-600 rounded-full animate-spin" />
        <span className="text-sm font-semibold">Retrieving email telemetry...</span>
      </div>
    );
  }

  const { email, tasks } = selectedEmail;

  const handleCopyReply = () => {
    if (email.auto_reply_draft) {
      navigator.clipboard.writeText(email.auto_reply_draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      await updateTask(taskId, { status: nextStatus });
      // Refresh current email details to fetch updated tasks list
      if (emailId) fetchEmailDetails(emailId);
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
        if (emailId) fetchEmailDetails(emailId);
        fetchAnalytics();
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  const handleAddCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskDesc.trim()) return;
    setAddingTask(true);
    try {
      // Post to backend database tasks directly
      const api = (await import('../services/api')).default;
      await api.post('/tasks', {
        email_id: email.email_id,
        task: newTaskDesc,
        due_date: newTaskDue,
        owner: newTaskOwner,
        status: 'Pending'
      });
      // Reset form & reload
      setNewTaskDesc('');
      setNewTaskDue('No Deadline');
      setNewTaskOwner('Me');
      if (emailId) fetchEmailDetails(emailId);
      fetchTasks();
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to add custom task:', err);
    } finally {
      setAddingTask(false);
    }
  };

  // Safe renderer for raw email body (handling basic linebreaks or raw HTML securely)
  const renderEmailBody = (bodyContent: string) => {
    if (!bodyContent) return '';
    // If it looks like HTML, render it in a safe iframe or text block, else as lines
    const isHtml = /<[a-z][\s\S]*>/i.test(bodyContent);
    if (isHtml) {
      return (
        <iframe
          srcDoc={`
            <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: #f8fafc; background-color: transparent; margin: 0; padding: 4px; }
                  a { color: #8b5cf6; text-decoration: underline; }
                  p { margin: 0 0 1em 0; }
                  strong { font-weight: 600; }
                  /* Light theme styling inside frame */
                  @media (prefers-color-scheme: light) {
                    body { color: #0f172a; }
                  }
                </style>
              </head>
              <body>
                ${bodyContent}
              </body>
            </html>
          `}
          className="w-full min-h-[300px] bg-transparent border-0"
          title="Email Body Frame"
        />
      );
    }
    return <p className="whitespace-pre-line text-sm text-slate-300 light:text-slate-700">{bodyContent}</p>;
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'High': return 'badge-high';
      case 'Medium': return 'badge-medium';
      default: return 'badge-low';
    }
  };

  const getCategoryClass = (category: string) => {
    switch (category) {
      case 'Work': return 'badge-work';
      case 'Meeting': return 'badge-meeting';
      case 'HR': return 'badge-hr';
      case 'Finance': return 'badge-finance';
      case 'Personal': return 'badge-personal';
      default: return 'badge-spam';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Back button */}
      <div>
        <Link 
          to="/inbox" 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition"
        >
          <MdArrowBack size={16} />
          <span>Return to Inbox</span>
        </Link>
      </div>

      {/* Main Splitscreen Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Email Content Details */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          
          {/* Header Card */}
          <div className="glass-panel p-5 flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className={getCategoryClass(email.category)}>{email.category}</span>
                <span className={getPriorityClass(email.priority)}>{email.priority}</span>
                <span className="text-xs px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded font-semibold light:bg-slate-200 light:border-slate-300 light:text-slate-800">
                  Sentiment: {email.sentiment === 'Positive' ? '😊 Positive' : email.sentiment === 'Negative' ? '⚠️ Negative' : '😐 Neutral'}
                </span>
              </div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-100 light:text-slate-800">{email.subject}</h2>
            </div>

            <div className="text-xs text-slate-400 light:text-slate-500 flex flex-col gap-1 border-t border-slate-800/60 light:border-slate-200 pt-3">
              <p>From: <span className="font-semibold text-slate-200 light:text-slate-800">{email.sender.name}</span> &lt;{email.sender.address}&gt;</p>
              {email.recipients && email.recipients.length > 0 && (
                <p>To: {email.recipients.map(r => r.name || r.address).join(', ')}</p>
              )}
              <p className="mt-1">Received at: {new Date(email.received_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Body Tabs Card */}
          <div className="glass-panel p-5 flex flex-col gap-4">
            
            {/* Tab selection */}
            <div className="flex border-b border-slate-800 light:border-slate-200 gap-4 text-xs font-bold text-slate-500 pb-0.5">
              <button
                onClick={() => setActiveTab('summary')}
                className={`pb-2 border-b-2 transition ${activeTab === 'summary' ? 'border-brand-500 text-brand-400' : 'border-transparent hover:text-slate-300'}`}
              >
                AI Summary (TL;DR)
              </button>
              <button
                onClick={() => setActiveTab('original')}
                className={`pb-2 border-b-2 transition ${activeTab === 'original' ? 'border-brand-500 text-brand-400' : 'border-transparent hover:text-slate-300'}`}
              >
                Original Email
              </button>
              <button
                onClick={() => setActiveTab('cleaned')}
                className={`pb-2 border-b-2 transition ${activeTab === 'cleaned' ? 'border-brand-500 text-brand-400' : 'border-transparent hover:text-slate-300'}`}
              >
                Cleaned AI Inputs
              </button>
            </div>

            {/* Content box */}
            <div className="min-h-[220px] bg-slate-950/20 border border-slate-800/40 rounded-xl p-4 light:bg-slate-100/50 light:border-slate-200">
              {activeTab === 'summary' && (
                <div className="flex gap-3">
                  <MdFormatQuote size={28} className="text-brand-500 flex-shrink-0 opacity-50" />
                  <p className="text-sm text-slate-200 light:text-slate-800 italic leading-relaxed">
                    {email.summary || 'Summary could not be generated.'}
                  </p>
                </div>
              )}

              {activeTab === 'original' && renderEmailBody(email.body)}

              {activeTab === 'cleaned' && (
                <p className="whitespace-pre-line text-xs font-mono text-slate-400 light:text-slate-600 leading-relaxed">
                  {email.cleaned_body || 'Clean text inputs missing.'}
                </p>
              )}
            </div>
          </div>

          {/* AI Auto-Reply Draft Card */}
          <div className="glass-panel p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Suggested Auto-Reply Draft</h3>
              <button
                onClick={handleCopyReply}
                className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-bold transition"
              >
                <MdContentCopy size={16} />
                <span>{copied ? 'Copied!' : 'Copy Draft'}</span>
              </button>
            </div>

            <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 font-mono text-[11px] text-slate-300 light:bg-slate-100 light:border-slate-200 light:text-slate-700 whitespace-pre-wrap leading-relaxed">
              {email.auto_reply_draft || 'No reply suggested.'}
            </div>
          </div>

        </div>

        {/* Right Side: Extracted Checklists */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="glass-panel p-5 flex flex-col min-h-[380px]">
            <h3 className="text-sm font-bold text-slate-300 light:text-slate-700 pb-3 border-b border-slate-800 light:border-slate-200 mb-4 uppercase tracking-wider">
              Extracted Action Items
            </h3>

            {/* Checklist items */}
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[350px] mb-4 pr-1">
              {tasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs py-10">
                  <MdOutlineMail size={24} className="text-slate-600 mb-2" />
                  <span>No tasks extracted from this email.</span>
                </div>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.task_id} 
                    className={`p-3 border rounded-xl flex items-start gap-3 transition-colors ${
                      task.status === 'Completed' 
                        ? 'bg-slate-900/10 border-slate-800/40 text-slate-500 light:bg-slate-50 light:border-slate-200' 
                        : 'bg-slate-900/30 border-slate-800 hover:border-brand-500/20 text-slate-200 light:bg-white light:border-slate-200 light:text-slate-800'
                    }`}
                  >
                    {/* Toggle Status Check */}
                    <button
                      onClick={() => handleToggleTaskStatus(task.task_id, task.status)}
                      className={`p-0.5 mt-0.5 rounded-full border transition ${
                        task.status === 'Completed' 
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                          : 'border-slate-600 hover:border-brand-500 text-transparent'
                      }`}
                    >
                      <MdCheckCircle size={16} className={task.status === 'Completed' ? 'opacity-100' : 'opacity-0'} />
                    </button>

                    <div className="flex-1 flex flex-col gap-1">
                      <p className={`text-xs font-semibold ${task.status === 'Completed' ? 'line-through' : ''}`}>
                        {task.task}
                      </p>
                      
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold mt-1">
                        <span className="flex items-center gap-1">
                          <MdOutlinePerson size={13} />
                          <span>Owner: {task.owner}</span>
                        </span>
                        <span className="flex items-center gap-1 text-amber-500">
                          <MdCalendarToday size={12} />
                          <span>Due: {task.due_date}</span>
                        </span>
                      </div>
                    </div>

                    {/* Delete Task */}
                    <button
                      onClick={() => handleDeleteTask(task.task_id)}
                      className="p-1 hover:bg-slate-800 hover:text-rose-400 rounded transition"
                      title="Delete action item"
                    >
                      <MdDeleteOutline size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Custom Task Box */}
            <form onSubmit={handleAddCustomTask} className="border-t border-slate-850 light:border-slate-200 pt-4 flex flex-col gap-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Append Action Item</p>
              
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  required
                  placeholder="Task description..."
                  className="glass-input py-1.5 px-3 text-xs w-full"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Deadline: e.g. Friday"
                    className="glass-input py-1.5 px-3 text-xs"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Owner: e.g. David"
                    className="glass-input py-1.5 px-3 text-xs"
                    value={newTaskOwner}
                    onChange={(e) => setNewTaskOwner(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={addingTask}
                className="glass-btn-primary py-1.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <MdAddTask size={15} />
                <span>{addingTask ? 'Creating...' : 'Add Action Item'}</span>
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
};

export default EmailDetails;
