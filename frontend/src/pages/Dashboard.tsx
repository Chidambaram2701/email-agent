import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MdOutlineMail, MdErrorOutline, MdAssignmentLate, MdCheckCircleOutline, 
  MdKeyboardArrowRight, MdAssignment, MdPendingActions, MdTaskAlt,
  MdAdd, MdTrendingUp, MdFlag, MdSchedule, MdOpenInNew
} from 'react-icons/md';
import { useEmailStore } from '../store/emailStore';
import { useTaskStore } from '../store/taskStore';
import { useAnalyticsStore } from '../store/analyticsStore';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { emails, fetchEmails } = useEmailStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { analytics, fetchAnalytics } = useAnalyticsStore();

  useEffect(() => {
    fetchEmails();
    fetchTasks();
    fetchAnalytics();
  }, []);

  const statsCards = [
    {
      title: 'Total Emails',
      value: analytics?.total_emails ?? 0,
      icon: <MdOutlineMail size={20} className="text-brand-500" />,
      badge: '+12%',
      trendUp: true,
      desc: 'Synced via IMAP'
    },
    {
      title: 'High Priority',
      value: analytics?.priority_counts?.High ?? 0,
      icon: <MdErrorOutline size={20} className="text-rose-500" />,
      badge: 'Action Required',
      trendUp: false,
      desc: 'Urgent attention needed'
    },
    {
      title: 'Pending Actions',
      value: analytics?.task_statistics?.Pending ?? 0,
      icon: <MdPendingActions size={20} className="text-amber-500" />,
      badge: 'Active',
      trendUp: true,
      desc: 'Extracted checklists'
    },
    {
      title: 'Task Completion',
      value: `${analytics?.task_completion_rate ?? 0}%`,
      icon: <MdTaskAlt size={20} className="text-emerald-500" />,
      badge: '+2.4%',
      trendUp: true,
      desc: `${analytics?.task_statistics?.Completed ?? 0} of ${analytics?.task_statistics?.total ?? 0} resolved`
    }
  ];

  // Category display configurations
  const categoryColors: Record<string, string> = {
    Work: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Meeting: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    HR: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    Finance: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    Personal: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    Spam: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  };

  // Filter lists for dashboard layout columns
  const highPriorityEmails = emails
    .filter(e => e.priority === 'High')
    .slice(0, 4);

  const todoTasks = tasks.filter(t => t.status === 'Pending').slice(0, 3);
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').slice(0, 3);
  const completedTasks = tasks.filter(t => t.status === 'Completed').slice(0, 3);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Page Title Area */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-light text-slate-100 dark:text-slate-100 light:text-slate-800 mb-1">Command Center</h2>
          <p className="text-xs text-slate-400">Real-time overview of AI operations and task throughput.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/tasks">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-brand-500 hover:bg-slate-800 text-xs font-semibold transition">
              <MdAdd size={14} />
              <span>New Task</span>
            </button>
          </Link>
        </div>
      </div>
      
      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, i) => (
          <motion.div 
            variants={itemVariants} 
            key={i}
            className="bg-slate-900 border border-slate-800 rounded-md p-4 hover:bg-[#232323] transition-colors relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-brand-500/5 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div className="p-1.5 bg-slate-950/40 rounded border border-slate-800/80 text-slate-400 group-hover:text-brand-500 transition-colors">
                {card.icon}
              </div>
              <span className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                card.title === 'High Priority'
                  ? 'bg-rose-500/10 text-rose-500'
                  : card.trendUp 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-slate-800 text-slate-400'
              }`}>
                {card.trendUp && <MdTrendingUp size={10} className="mr-0.5" />}
                {card.badge}
              </span>
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{card.title}</p>
              <h3 className="text-2xl font-bold text-slate-100 light:text-slate-900 leading-none mb-1">{card.value}</h3>
              <span className="text-[10px] text-slate-500">{card.desc}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: High-Priority Inbox */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-md flex flex-col h-[580px]">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0 z-10">
            <h3 className="text-sm font-semibold text-slate-100 light:text-slate-800 flex items-center gap-1.5">
              <MdErrorOutline className="text-rose-500" size={16} />
              <span>High-Priority Inbox</span>
            </h3>
            <Link to="/inbox" className="text-xs font-bold text-brand-500 hover:text-brand-600 flex items-center gap-0.5">
              <span>View All</span>
              <MdKeyboardArrowRight size={14} />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {highPriorityEmails.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10 text-xs">
                <MdOutlineMail size={28} className="text-slate-600 mb-2" />
                <span>All caught up! No active High Priority emails.</span>
              </div>
            ) : (
              highPriorityEmails.map((email) => (
                <div 
                  key={email.email_id} 
                  onClick={() => {
                    useEmailStore.getState().markEmailAsRead(email.email_id, true);
                    navigate(`/emails/${email.email_id}`);
                  }}
                  className="p-3 bg-slate-950/40 border border-slate-800 hover:border-brand-500/30 rounded-md transition duration-150 cursor-pointer flex gap-3 items-start relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                  
                  {/* Avatar Initials */}
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 font-bold text-xs text-slate-200">
                    {email.sender.name ? email.sender.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'EM'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className={`text-xs truncate pr-2 ${email.is_read ? 'text-slate-400 font-normal' : 'text-slate-200 font-bold'}`}>
                        {email.sender.name || email.sender.address}
                      </h4>
                      <span className="text-[10px] text-slate-500 shrink-0">10:42 AM</span>
                    </div>
                    <p className={`text-xs text-slate-200 truncate mb-1 ${email.is_read ? 'font-normal text-slate-400' : 'font-semibold'}`}>
                      {email.subject}
                    </p>
                    <p className="text-[10px] text-slate-400 light:text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                      {email.body.replace(/<[^>]*>/g, '').slice(0, 140)}...
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-semibold">
                        High Priority
                      </span>
                      {email.category && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-semibold border ${
                          categoryColors[email.category] || 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {email.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Tasks Kanban Preview */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-md flex flex-col h-[580px] overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0 z-10">
            <h3 className="text-sm font-semibold text-slate-100 light:text-slate-800 flex items-center gap-1.5">
              <MdAssignment className="text-brand-500" size={16} />
              <span>Active Tasks Workflow</span>
            </h3>
            <Link to="/tasks" className="text-xs font-bold text-brand-500 hover:text-brand-600 flex items-center gap-0.5">
              <span>Full Board</span>
              <MdOpenInNew size={12} className="ml-0.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto p-4 custom-scrollbar">
            <div className="flex gap-3 h-full min-w-[640px]">
              
              {/* Column: To Do */}
              <div className="flex-1 bg-slate-950/20 border border-slate-800/80 rounded-md flex flex-col">
                <div className="p-2.5 border-b border-slate-800/60 flex items-center justify-between">
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    To Do 
                    <span className="bg-slate-850 text-slate-300 px-1.5 py-0.5 rounded-sm ml-2 text-[9px] font-bold">
                      {todoTasks.length}
                    </span>
                  </h4>
                </div>
                <div className="p-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                  {todoTasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-[10px]">No tasks</div>
                  ) : (
                    todoTasks.map(task => (
                      <div 
                        key={task.task_id}
                        onClick={() => navigate('/tasks')}
                        className="bg-slate-900 border border-slate-850 p-2.5 rounded-md hover:border-brand-500/20 transition duration-150 cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="bg-amber-500/10 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-sm border border-amber-500/20">Pending</span>
                        </div>
                        <p className="text-xs font-medium text-slate-200 mb-2 leading-tight">{task.task}</p>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-850/60">
                          <span className="text-[10px] text-slate-500">Assignee: {task.owner.split(' ')[0]}</span>
                          <span className="flex items-center text-[10px] text-slate-400"><MdSchedule size={10} className="mr-0.5" /> {task.due_date}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column: In Progress */}
              <div className="flex-1 bg-slate-950/20 border border-slate-800/80 rounded-md flex flex-col">
                <div className="p-2.5 border-b border-slate-800/60 flex items-center justify-between">
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    In Progress 
                    <span className="bg-slate-850 text-slate-300 px-1.5 py-0.5 rounded-sm ml-2 text-[9px] font-bold">
                      {inProgressTasks.length}
                    </span>
                  </h4>
                </div>
                <div className="p-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                  {inProgressTasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-[10px]">No tasks active</div>
                  ) : (
                    inProgressTasks.map(task => (
                      <div 
                        key={task.task_id}
                        onClick={() => navigate('/tasks')}
                        className="bg-slate-900 border-l-2 border-l-brand-500 border-y border-r border-slate-850 p-2.5 rounded-md hover:border-brand-500/20 transition duration-150 cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="bg-brand-500/10 text-brand-400 text-[9px] font-bold px-1.5 py-0.5 rounded-sm border border-brand-500/20">Running</span>
                        </div>
                        <p className="text-xs font-medium text-slate-200 mb-2 leading-tight">{task.task}</p>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-850/60">
                          <span className="text-[10px] text-slate-500">{task.owner.split(' ')[0]}</span>
                          <span className="text-[10px] text-brand-400 font-semibold">{task.due_date}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column: Done */}
              <div className="flex-1 bg-slate-950/20 border border-slate-800/80 rounded-md flex flex-col opacity-85">
                <div className="p-2.5 border-b border-slate-800/60 flex items-center justify-between">
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Done 
                    <span className="bg-slate-850 text-slate-300 px-1.5 py-0.5 rounded-sm ml-2 text-[9px] font-bold">
                      {completedTasks.length}
                    </span>
                  </h4>
                </div>
                <div className="p-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                  {completedTasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-[10px]">No completed tasks</div>
                  ) : (
                    completedTasks.map(task => (
                      <div 
                        key={task.task_id}
                        onClick={() => navigate('/tasks')}
                        className="bg-slate-900 border border-slate-850 p-2.5 rounded-md opacity-60"
                      >
                        <p className="text-xs font-medium text-slate-400 line-through leading-tight mb-2">{task.task}</p>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-850/60 text-[9px] text-slate-500">
                          <span>{task.owner.split(' ')[0]}</span>
                          <span className="text-emerald-500 flex items-center"><MdCheckCircleOutline size={10} className="mr-0.5" /> Done</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default Dashboard;
