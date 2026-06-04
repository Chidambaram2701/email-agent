import { create } from 'zustand';
import api from '../services/api';

export interface Task {
  task_id: string;
  email_id: string;
  task: string;
  due_date: string;
  owner: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  created_at: string;
}

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  
  fetchTasks: (emailId?: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  addTaskLocally: (task: Task) => void;
  removeTaskLocally: (taskId: string) => void;
  updateTaskLocally: (task: Task) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async (emailId) => {
    set({ loading: true, error: null });
    try {
      const url = emailId ? `/tasks?email_id=${emailId}` : '/tasks';
      const res = await api.get(url);
      set({ tasks: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  updateTask: async (taskId, updates) => {
    try {
      const res = await api.patch(`/tasks/${taskId}`, updates);
      const updated = res.data;
      
      // Update local state immediately
      set((state) => ({
        tasks: state.tasks.map((t) => (t.task_id === taskId ? { ...t, ...updated } : t)),
      }));
      
      return updated;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteTask: async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      
      // Filter out deleted task immediately
      set((state) => ({
        tasks: state.tasks.filter((t) => t.task_id !== taskId),
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  addTaskLocally: (task) => {
    set((state) => {
      // Check if task already exists in state
      if (state.tasks.some((t) => t.task_id === task.task_id)) {
        return state;
      }
      return { tasks: [task, ...state.tasks] };
    });
  },

  removeTaskLocally: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.task_id !== taskId),
    }));
  },

  updateTaskLocally: (task) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.task_id === task.task_id ? task : t)),
    }));
  }
}));
