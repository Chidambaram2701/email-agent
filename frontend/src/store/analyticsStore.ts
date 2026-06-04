import { create } from 'zustand';
import api from '../services/api';

export interface AnalyticsData {
  total_emails: number;
  priority_counts: Record<string, number>;
  category_counts: Record<string, number>;
  sentiment_counts: Record<string, number>;
  task_statistics: {
    total: number;
    Pending: number;
    'In Progress': number;
    Completed: number;
  };
  task_completion_rate: number;
  updated_at: string;
}

interface AnalyticsState {
  analytics: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  fetchAnalytics: () => Promise<void>;
  updateAnalyticsLocally: (data: Partial<AnalyticsData>) => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  analytics: null,
  loading: false,
  error: null,

  fetchAnalytics: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get('/analytics');
      set({ analytics: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  updateAnalyticsLocally: (data) => {
    set((state) => ({
      analytics: state.analytics ? { ...state.analytics, ...data } : null,
    }));
  }
}));
