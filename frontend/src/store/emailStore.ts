import { create } from 'zustand';
import api from '../services/api';

export interface EmailSender {
  name: string;
  address: string;
}

export interface EmailRecipient {
  name: string;
  address: string;
}

export interface Email {
  email_id: string;
  subject: string;
  sender: EmailSender;
  recipients: EmailRecipient[];
  body: string;
  cleaned_body: string;
  category: string;
  category_confidence: number;
  priority: string;
  priority_score: number;
  sentiment: string;
  sentiment_score: number;
  summary: string;
  auto_reply_draft: string;
  received_at: string;
  processed_at: string;
  is_read: boolean;
}

interface SelectedEmailDetails {
  email: Email;
  tasks: any[];
}

interface EmailState {
  emails: Email[];
  selectedEmail: SelectedEmailDetails | null;
  loading: boolean;
  fetching: boolean;
  error: string | null;
  
  fetchEmails: () => Promise<void>;
  fetchEmailDetails: (emailId: string) => Promise<void>;
  markEmailAsRead: (emailId: string, isRead: boolean) => Promise<void>;
  triggerSync: (limit?: number) => Promise<any>;
  processManualEmail: (payload: any) => Promise<Email>;
  setSelectedEmail: (details: SelectedEmailDetails | null) => void;
}

export const useEmailStore = create<EmailState>((set, get) => ({
  emails: [],
  selectedEmail: null,
  loading: false,
  fetching: false,
  error: null,

  fetchEmails: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/emails');
      set({ emails: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchEmailDetails: async (emailId) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(`/emails/${emailId}`);
      set({ selectedEmail: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  markEmailAsRead: async (emailId, isRead) => {
    try {
      // Optimistically update locally
      set((state) => {
        const updatedEmails = state.emails.map((e) =>
          e.email_id === emailId ? { ...e, is_read: isRead } : e
        );
        const updatedSelected = state.selectedEmail && state.selectedEmail.email.email_id === emailId
          ? { ...state.selectedEmail, email: { ...state.selectedEmail.email, is_read: isRead } }
          : state.selectedEmail;
        return { emails: updatedEmails, selectedEmail: updatedSelected };
      });
      
      // Save read status to backend
      await api.patch(`/emails/${emailId}/read`, { is_read: isRead });
    } catch (err: any) {
      console.error('Failed to update email read status:', err);
      // Reload in case of failure to maintain sync with database
      get().fetchEmails();
    }
  },

  triggerSync: async (limit = 10) => {
    set({ fetching: true, error: null });
    try {
      const res = await api.post(`/emails/fetch?limit=${limit}`);
      // Refresh local emails list
      await get().fetchEmails();
      set({ fetching: false });
      return res.data;
    } catch (err: any) {
      set({ error: err.message, fetching: false });
      throw err;
    }
  },

  processManualEmail: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/emails/process-email', payload);
      // Refresh emails list
      await get().fetchEmails();
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  setSelectedEmail: (details) => {
    set({ selectedEmail: details });
  }
}));
export type { SelectedEmailDetails };
