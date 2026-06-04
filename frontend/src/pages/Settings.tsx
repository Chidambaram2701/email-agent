import React, { useState, useEffect } from 'react';
import { 
  MdSettings, MdOutlineSync, MdOutlineLock, MdOutlineSettingsInputHdmi,
  MdInfoOutline, MdWarningAmber, MdDoneOutline, MdOutlinePriorityHigh
} from 'react-icons/md';
import { useAuthStore } from '../store/authStore';
import { useEmailStore } from '../store/emailStore';
import { useTaskStore } from '../store/taskStore';
import { useAnalyticsStore } from '../store/analyticsStore';

const Settings: React.FC = () => {
  const { config, fetchStatus, updateConfig, testImap, loading, error } = useAuthStore();
  const { fetchEmails } = useEmailStore();
  const { fetchTasks } = useTaskStore();
  const { fetchAnalytics } = useAnalyticsStore();

  // Form states
  const [demoMode, setDemoMode] = useState(true);
  const [imapServer, setImapServer] = useState('outlook.office365.com');
  const [imapPort, setImapPort] = useState(993);
  const [imapEmail, setImapEmail] = useState('');
  const [imapPassword, setImapPassword] = useState('');

  // Visual status indicators
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clearingDb, setClearingDb] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleEmailChange = (val: string) => {
    setImapEmail(val);
    const lowerVal = val.toLowerCase();
    if (lowerVal.endsWith('@gmail.com')) {
      setImapServer('imap.gmail.com');
      setImapPort(993);
    } else if (
      lowerVal.endsWith('@outlook.com') ||
      lowerVal.endsWith('@hotmail.com') ||
      lowerVal.endsWith('@live.com') ||
      lowerVal.endsWith('@msn.com')
    ) {
      setImapServer('outlook.office365.com');
      setImapPort(993);
    } else if (lowerVal.endsWith('@yahoo.com')) {
      setImapServer('imap.mail.yahoo.com');
      setImapPort(993);
    }
  };

  // Sync form inputs with config once fetched
  useEffect(() => {
    if (config) {
      setDemoMode(config.demo_mode);
      
      const email = config.imap_email || '';
      setImapEmail(email);
      
      let server = config.imap_server || 'outlook.office365.com';
      if (email.toLowerCase().endsWith('@gmail.com') && server === 'outlook.office365.com') {
        server = 'imap.gmail.com';
      }
      setImapServer(server);
      setImapPort(config.imap_port || 993);
    }
  }, [config]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    
    const payload = {
      imap_server: imapServer,
      imap_port: Number(imapPort),
      imap_email: imapEmail,
      imap_password: imapPassword,
      demo_mode: demoMode
    };

    const success = await updateConfig(payload);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Clear password field for safety
      setImapPassword('');
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    setTesting(true);
    try {
      const payload = {
        imap_server: imapServer,
        imap_port: Number(imapPort),
        imap_email: imapEmail,
        imap_password: imapPassword,
        demo_mode: demoMode
      };
      const res = await testImap(payload);
      setTestResult({ status: 'success', message: res.message });
    } catch (err: any) {
      setTestResult({ status: 'error', message: err.message || 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const handleClearDatabase = async () => {
    if (window.confirm('WARNING: This will delete all parsed emails, summaries, replies, and task board items. Are you sure you want to proceed?')) {
      setClearingDb(true);
      try {
        const api = (await import('../services/api')).default;
        const res = await api.post('/auth/clear-database');
        alert(res.data.message);
        
        // Refresh local stores to empty state
        fetchStatus();
        fetchEmails();
        fetchTasks();
        fetchAnalytics();
      } catch (err: any) {
        alert(`Failed to clear database: ${err.message}`);
      } finally {
        setClearingDb(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      
      {/* Configuration Status Card */}
      {config && (
        <div className="glass-panel p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="flex flex-col gap-1 p-4 bg-slate-900/40 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase">AI Processing Engine</span>
            <p className="text-sm font-bold text-slate-200">{config.ai_mode}</p>
            <span className="text-[9px] text-slate-500 mt-1 leading-normal">
              {config.ai_mode === 'PRODUCTION' 
                ? 'Running BART & Flan-T5 models locally on CPU.' 
                : 'Running fast keyword density heuristics (zero RAM overhead).'}
            </span>
          </div>

          <div className="flex flex-col gap-1 p-4 bg-slate-900/40 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Active Database</span>
            <p className="text-sm font-bold text-slate-200">{config.database_mode}</p>
            <span className="text-[9px] text-slate-500 mt-1 leading-normal">
              {config.database_mode === 'AWS DynamoDB' 
                ? 'Connected to live cloud DynamoDB tables.' 
                : 'Using local thread-safe JSON file for caching (bypasses AWS credential checks).'}
            </span>
          </div>

          <div className="flex flex-col gap-1 p-4 bg-slate-900/40 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Mail Sync Method</span>
            <p className="text-sm font-bold text-slate-200">
              {config.demo_mode ? 'Demo Mode (Simulation)' : 'Live IMAP Protocol'}
            </p>
            <span className="text-[9px] text-slate-500 mt-1 leading-normal">
              {config.demo_mode 
                ? 'Generates high-fidelity mock data on sync.' 
                : `Active inbox polling for ${config.imap_email}`}
            </span>
          </div>
        </div>
      )}

      {/* Main Settings Editor */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Form Panel */}
        <form onSubmit={handleSaveConfig} className="md:col-span-8 glass-panel p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 light:border-slate-200 mb-2">
            <MdSettings className="text-brand-500" size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Connection & Simulator Setup</h3>
          </div>

          {/* Mode Switcher */}
          <div className="flex flex-col gap-1.5 p-4 bg-slate-950/20 border border-slate-850 rounded-xl light:bg-slate-100 light:border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-200 light:text-slate-800">Enable Demo / Simulation Mode</label>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                  Toggle on to test the full pipeline using synthetic emails immediately without setting up a live mail account.
                </p>
              </div>
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
              />
            </div>
          </div>

          {/* IMAP details (only if demo mode is off, or showing as configuration defaults) */}
          <div className={`flex flex-col gap-4 transition-all duration-300 ${demoMode ? 'opacity-50 pointer-events-none' : ''}`}>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">IMAP Server Address</label>
                <input
                  type="text"
                  required={!demoMode}
                  className="glass-input text-xs"
                  value={imapServer}
                  onChange={(e) => setImapServer(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Port</label>
                <input
                  type="number"
                  required={!demoMode}
                  className="glass-input text-xs"
                  value={imapPort}
                  onChange={(e) => setImapPort(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">IMAP Email Address</label>
              <input
                type="email"
                required={!demoMode}
                className="glass-input text-xs"
                placeholder="e.g. workspace@company.com"
                value={imapEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-400">Password / App Password</label>
                <span className="text-[9px] text-slate-500 font-semibold flex items-center gap-0.5">
                  <MdOutlineLock size={12} />
                  <span>Encrypted locally</span>
                </span>
              </div>
              <input
                type="password"
                required={!demoMode && !config?.imap_email}
                className="glass-input text-xs"
                placeholder={config?.imap_email ? '••••••••••••••••' : 'Enter account or app-specific password'}
                value={imapPassword}
                onChange={(e) => setImapPassword(e.target.value)}
              />
            </div>

          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 bg-rose-950/30 border border-rose-900 rounded-lg text-[10px] text-rose-400 flex items-center gap-2">
              <MdOutlinePriorityHigh size={16} />
              <span>Configuration failed: {error}</span>
            </div>
          )}

          {/* Test results banner */}
          {testResult && (
            <div className={`p-3.5 border rounded-lg text-xs flex items-center gap-2.5 ${
              testResult.status === 'success' 
                ? 'bg-emerald-950/30 border-emerald-900 text-emerald-400' 
                : 'bg-rose-950/30 border-rose-900 text-rose-400'
            }`}>
              {testResult.status === 'success' ? <MdDoneOutline size={16} /> : <MdWarningAmber size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="border-t border-slate-850 light:border-slate-200 pt-4 flex gap-3 justify-end items-center mt-2">
            {!demoMode && (
              <button
                type="button"
                disabled={testing}
                onClick={handleTestConnection}
                className="glass-btn-secondary text-xs py-2"
              >
                {testing ? 'Testing link...' : 'Test Connection'}
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="glass-btn-primary text-xs py-2"
            >
              {loading ? 'Saving configs...' : saveSuccess ? 'Saved successfully ✓' : 'Save Configurations'}
            </button>
          </div>
        </form>

        {/* Sidebar Info & Wipe Controls */}
        <div className="md:col-span-4 flex flex-col gap-5">
          
          {/* Info Card */}
          <div className="glass-panel p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <MdInfoOutline size={18} className="text-slate-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Settings Guide</h4>
            </div>
            
            <div className="text-[10px] text-slate-500 flex flex-col gap-2.5 leading-normal">
              <p>
                <strong>Demo Mode:</strong> Best for offline testing. Feeds randomized mock templates regarding business tasks, HR announcements, and personal catch-ups into the AI parser.
              </p>
              <p>
                <strong>IMAP Integration:</strong> Connects to Outlook, Gmail, or custom IMAP servers. Note that accounts with Multi-Factor Authentication (MFA) require generating an <strong>App Password</strong> in your email provider's security settings (e.g., Google Account or Microsoft Security settings) first. For Gmail, also ensure IMAP is enabled in your Gmail Web settings.
              </p>
            </div>
          </div>

          {/* Wipe Database Card */}
          <div className="glass-panel p-5 border border-rose-500/20 bg-rose-500/[0.02]">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-3">
              <MdWarningAmber size={18} className="text-rose-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">System Actions</h4>
            </div>
            
            <p className="text-[10px] text-slate-500 leading-normal mb-4">
              Wipes the dynamic database clean (deletes all cached emails, summaries, Auto-Reply logs, and tasks). This cannot be undone.
            </p>

            <button
              onClick={handleClearDatabase}
              disabled={clearingDb}
              className="w-full bg-rose-950/20 hover:bg-rose-950/60 border border-rose-900 text-rose-400 hover:text-rose-300 text-xs font-bold py-2 rounded-lg transition"
            >
              {clearingDb ? 'Wiping Database...' : 'Force-Clear Database'}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Settings;
