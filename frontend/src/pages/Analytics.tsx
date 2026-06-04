import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { MdOutlineFileDownload, MdTrendingUp, MdLeaderboard, MdFace } from 'react-icons/md';
import { useEmailStore } from '../store/emailStore';
import { useAnalyticsStore } from '../store/analyticsStore';

const Analytics: React.FC = () => {
  const { emails, fetchEmails } = useEmailStore();
  const { analytics, fetchAnalytics } = useAnalyticsStore();

  useEffect(() => {
    fetchEmails();
    fetchAnalytics();
  }, []);

  // 1. Group emails by Date for Volume Trends Area Chart
  const emailVolumeData = useMemo(() => {
    const dailyCounts: Record<string, number> = {};
    emails.forEach(e => {
      try {
        const date = new Date(e.received_at);
        // Format as e.g. "May 28"
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyCounts[label] = (dailyCounts[label] || 0) + 1;
      } catch (err) {
        // Fallback
      }
    });

    // Convert to sorting formats (reverse chronological since emails are fetched newest first)
    return Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .reverse(); // Standard chron order
  }, [emails]);

  // 2. Aggregate Top Senders Table
  const topSenders = useMemo(() => {
    const senderCounts: Record<string, { name: string; count: number; address: string }> = {};
    emails.forEach(e => {
      const emailAddr = e.sender.address;
      if (!senderCounts[emailAddr]) {
        senderCounts[emailAddr] = {
          name: e.sender.name || 'Unknown',
          address: emailAddr,
          count: 0
        };
      }
      senderCounts[emailAddr].count += 1;
    });

    return Object.values(senderCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Take top 5
  }, [emails]);

  // 3. Prepare Sentiment Pie Chart Data
  const sentimentData = useMemo(() => {
    if (!analytics?.sentiment_counts) return [];
    return Object.entries(analytics.sentiment_counts)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [analytics]);

  const SENTIMENT_COLORS = {
    Positive: '#10b981', // emerald
    Neutral: '#64748b',  // slate
    Negative: '#f43f5e'  // rose
  };

  // 4. Download CSV Export Utility
  const handleExportCSV = () => {
    if (emails.length === 0) {
      alert('No email data available to export.');
      return;
    }

    // Build headers
    const headers = ['Email ID', 'Date Received', 'Sender Name', 'Sender Email', 'Subject', 'Category', 'Priority', 'Sentiment', 'Summary'];
    
    // Build rows
    const rows = emails.map(e => [
      e.email_id,
      new Date(e.received_at).toISOString(),
      e.sender.name.replace(/"/g, '""'), // Escape quotes
      e.sender.address,
      e.subject.replace(/"/g, '""'),
      e.category,
      e.priority,
      e.sentiment,
      (e.summary || '').replace(/"/g, '""')
    ]);

    // Join elements
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download element
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Email_Intelligence_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      
      {/* Top action header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 light:text-slate-800">Operational Dashboard & Trends</h2>
          <p className="text-xs text-slate-500 font-semibold">Consolidated analytical reports compiled from active AI extractions.</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="glass-btn-primary text-xs font-bold flex items-center gap-2"
        >
          <MdOutlineFileDownload size={18} />
          <span>Export Analytics CSV</span>
        </button>
      </div>

      {/* Primary Analytics Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Email Volume Trend (Area) */}
        <motion.div variants={itemVariants} className="lg:col-span-8 glass-panel p-5 flex flex-col h-[340px]">
          <div className="flex items-center gap-2 mb-4">
            <MdTrendingUp size={18} className="text-brand-400" />
            <h3 className="text-sm font-bold text-slate-300 light:text-slate-700 uppercase tracking-wider">Email Volume Trends</h3>
          </div>
          {emailVolumeData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              No historical data mapped.
            </div>
          ) : (
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={emailVolumeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '11px'
                    }} 
                  />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Sentiment Distribution (Pie) */}
        <motion.div variants={itemVariants} className="lg:col-span-4 glass-panel p-5 flex flex-col h-[340px]">
          <div className="flex items-center gap-2 mb-4">
            <MdFace size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-300 light:text-slate-700 uppercase tracking-wider">Tone & Sentiment</h3>
          </div>
          {sentimentData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              No sentiment data available.
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sentimentData.map((entry) => (
                        <Cell 
                          key={`cell-${entry.name}`} 
                          fill={SENTIMENT_COLORS[entry.name as keyof typeof SENTIMENT_COLORS] || '#64748b'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '11px'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends list */}
              <div className="flex justify-center gap-4 text-xs font-semibold text-slate-400 mt-2">
                {sentimentData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: SENTIMENT_COLORS[entry.name as keyof typeof SENTIMENT_COLORS] }} 
                    />
                    <span>{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

      </div>

      {/* Leaderboard panel: Top Senders */}
      <motion.div variants={itemVariants} className="glass-panel p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800/80 light:border-slate-200">
          <MdOutlineFileDownload size={18} className="text-amber-400" />
          <h3 className="text-sm font-bold text-slate-300 light:text-slate-700 uppercase tracking-wider">Top Senders Leaderboard</h3>
        </div>

        {topSenders.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            No contacts logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300 light:text-slate-700">
              <thead className="text-[10px] text-slate-500 uppercase font-bold border-b border-slate-800/60 light:border-slate-200">
                <tr>
                  <th scope="col" className="py-2.5 px-3">Sender Name</th>
                  <th scope="col" className="py-2.5 px-3">Sender Address</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Processed Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 light:divide-slate-200">
                {topSenders.map((sender, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/10 light:hover:bg-slate-100">
                    <td className="py-3 px-3 font-semibold text-slate-200 light:text-slate-800">{sender.name}</td>
                    <td className="py-3 px-3 text-slate-400 light:text-slate-500">{sender.address}</td>
                    <td className="py-3 px-3 text-right font-bold text-brand-400">{sender.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

    </motion.div>
  );
};

export default Analytics;
