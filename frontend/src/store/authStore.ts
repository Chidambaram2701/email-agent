import { create } from 'zustand';
import api from '../services/api';

interface AuthConfig {
  is_authenticated: boolean;
  imap_email: string;
  imap_server: string;
  imap_port: number;
  demo_mode: boolean;
  ai_mode: string;
  database_mode: string;
}

interface AuthState {
  config: AuthConfig | null;
  loading: boolean;
  error: string | null;
  fetchStatus: () => Promise<void>;
  updateConfig: (newConfig: any) => Promise<boolean>;
  testImap: (testConfig: any) => Promise<{ status: string; message: string }>;
}

export const useAuthStore = create<AuthState>((set) => ({
  config: null,
  loading: false,
  error: null,

  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/auth/status');
      set({ config: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  updateConfig: async (newConfig) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/config', newConfig);
      if (res.data.status === 'success') {
        // Refresh full status from backend
        const statusRes = await api.get('/auth/status');
        set({ config: statusRes.data, loading: false });
        return true;
      }
      set({ loading: false });
      return false;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  testImap: async (testConfig) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/test-imap', testConfig);
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      set({ loading: false });
      throw err;
    }
  }
}));
