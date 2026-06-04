import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MdSearch, MdFilterList, MdSort, MdChevronLeft, MdChevronRight, 
  MdMailOutline, MdPriorityHigh, MdInfoOutline, MdWarningAmber,
  MdDrafts
} from 'react-icons/md';
import { useEmailStore } from '../store/emailStore';

const CATEGORIES = ["All", "Work", "Meeting", "HR", "Finance", "Personal", "Spam"];
const PRIORITIES = ["All", "High", "Medium", "Low"];

const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const { emails, fetchEmails, markEmailAsRead, loading } = useEmailStore();
  
  // Seen / Unseen Active Tab
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');

  // Search & Filters State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [sortBy, setSortBy] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchEmails();
  }, []);

  // Compute Seen / Unseen Absolute Counts
  const unreadEmailsCount = useMemo(() => emails.filter(e => !e.is_read).length, [emails]);
  const readEmailsCount = useMemo(() => emails.filter(e => e.is_read).length, [emails]);

  // Filter & Search Logic
  const filteredEmails = useMemo(() => {
    let result = [...emails];

    // Tab filtering (Seen vs Unseen)
    result = result.filter(e => activeTab === 'unread' ? !e.is_read : e.is_read);

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e => 
        e.subject.toLowerCase().includes(q) || 
        e.sender.name.toLowerCase().includes(q) || 
        e.sender.address.toLowerCase().includes(q) ||
        (e.body && e.body.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter(e => e.category === selectedCategory);
    }

    // Priority filter
    if (selectedPriority !== 'All') {
      result = result.filter(e => e.priority === selectedPriority);
    }

    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.received_at).getTime();
      const dateB = new Date(b.received_at).getTime();
      return sortBy === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [emails, activeTab, search, selectedCategory, selectedPriority, sortBy]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, selectedCategory, selectedPriority, sortBy]);

  // Paginated Emails
  const paginatedEmails = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredEmails.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredEmails, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / itemsPerPage));

  // Date formatter helper
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'High': return 'badge-high';
      case 'Medium': return 'badge-medium';
      case 'Low': return 'badge-low';
      default: return 'badge-low';
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Work': return 'badge-work';
      case 'Meeting': return 'badge-meeting';
      case 'HR': return 'badge-hr';
      case 'Finance': return 'badge-finance';
      case 'Personal': return 'badge-personal';
      case 'Spam': return 'badge-spam';
      default: return 'badge-work';
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return '😊';
      case 'Negative': return '⚠️';
      default: return '😐';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      
      {/* Search and Filters panel */}
      <div className="glass-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MdSearch size={20} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            className="glass-input pl-10 pr-4 py-2 w-full text-sm placeholder:text-slate-500"
            placeholder="Search email subject, sender, or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters and Sorting selectors */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-semibold">Category:</span>
            <select
              className="glass-input py-1.5 px-3 bg-slate-900 border-slate-800 text-xs text-slate-200 cursor-pointer"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-semibold">Priority:</span>
            <select
              className="glass-input py-1.5 px-3 bg-slate-900 border-slate-800 text-xs text-slate-200 cursor-pointer"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              {PRIORITIES.map(pri => (
                <option key={pri} value={pri}>{pri}</option>
              ))}
            </select>
          </div>

          {/* Sorting Order Toggle */}
          <button
            onClick={() => setSortBy(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs border border-slate-800 bg-slate-950/20 hover:bg-slate-900 rounded-lg text-slate-300 font-semibold transition"
          >
            <MdSort size={16} />
            <span>Date: {sortBy === 'desc' ? 'Newest' : 'Oldest'}</span>
          </button>

        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-800/80 light:border-slate-200">
        <button
          onClick={() => setActiveTab('unread')}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all relative ${
            activeTab === 'unread' 
              ? 'text-brand-400 border-b-2 border-brand-500 font-extrabold' 
              : 'text-slate-400 hover:text-slate-200 font-semibold'
          }`}
        >
          Unseen ({unreadEmailsCount})
        </button>
        <button
          onClick={() => setActiveTab('read')}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all relative ${
            activeTab === 'read' 
              ? 'text-brand-400 border-b-2 border-brand-500' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Seen ({readEmailsCount})
        </button>
      </div>

      {/* Emails Table / Card List */}
      <div className="flex-1 min-h-[400px]">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-3">
            <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-600 rounded-full animate-spin" />
            <span className="text-sm font-semibold">Running AI Processing Pipeline...</span>
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="h-96 glass-panel flex flex-col items-center justify-center text-slate-500 gap-2">
            <MdMailOutline size={48} className="text-slate-700" />
            <p className="font-bold text-slate-400">No Emails Mapped</p>
            <span className="text-xs">Adjust your filters or sync your mailbox.</span>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-2.5"
          >
            {paginatedEmails.map((email) => (
              <motion.div
                variants={itemVariants}
                key={email.email_id}
                onClick={() => {
                  markEmailAsRead(email.email_id, true);
                  navigate(`/emails/${email.email_id}`);
                }}
                className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/30 transition-all border-l-4 border-l-transparent hover:border-l-brand-500"
              >
                
                {/* Left Side: Mark as Read & Sender/Subject info */}
                <div className="flex items-center gap-3 w-full md:w-[60%] truncate">
                  
                  {/* Mark as Read/Unread Icon Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Stop click propagating to the card row navigation
                      markEmailAsRead(email.email_id, !email.is_read);
                    }}
                    className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-500 hover:text-brand-400 transition-colors flex-shrink-0"
                    title={email.is_read ? "Mark as Unseen" : "Mark as Seen"}
                  >
                    {email.is_read ? <MdDrafts size={18} /> : <MdMailOutline size={18} />}
                  </button>

                  <div className="flex flex-col gap-1 truncate w-full">
                    <div className="flex items-center gap-2">
                      {/* Pulse dot indicator for unread emails */}
                      {!email.is_read && (
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shadow-md shadow-brand-500/50 flex-shrink-0 animate-pulse" />
                      )}
                      
                      <span className="text-sm" title={`Sentiment: ${email.sentiment}`}>
                        {getSentimentEmoji(email.sentiment)}
                      </span>
                      
                      <h3 className={`text-sm truncate tracking-wide ${
                        email.is_read ? 'text-slate-400 font-normal' : 'text-slate-100 font-extrabold'
                      }`}>
                        {email.subject}
                      </h3>
                    </div>
                    
                    <p className="text-xs text-slate-500 light:text-slate-500 truncate pl-6">
                      From: <span className="font-semibold text-slate-300 light:text-slate-700">{email.sender.name}</span> &lt;{email.sender.address}&gt;
                    </p>
                  </div>
                </div>

                {/* Right Side: Category, Priority, Received Date */}
                <div className="flex items-center justify-between md:justify-end gap-4 flex-shrink-0 pl-9 md:pl-0">
                  <span className={getCategoryBadgeClass(email.category)}>
                    {email.category}
                  </span>
                  
                  <span className={getPriorityBadgeClass(email.priority)}>
                    {email.priority}
                  </span>

                  <span className="text-xs text-slate-500 font-semibold w-28 text-right flex-shrink-0">
                    {formatDate(email.received_at)}
                  </span>
                </div>

              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Pagination Footer */}
      {filteredEmails.length > 0 && (
        <div className="glass-panel p-3.5 flex items-center justify-between text-xs text-slate-400 mt-auto">
          <span>
            Showing <strong className="text-slate-200">{Math.min(filteredEmails.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredEmails.length, currentPage * itemsPerPage)}</strong> of <strong className="text-slate-200">{filteredEmails.length}</strong> email(s)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-800 hover:bg-slate-900 rounded disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            >
              <MdChevronLeft size={18} />
            </button>
            <span className="font-bold px-2">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-800 hover:bg-slate-900 rounded disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            >
              <MdChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inbox;
