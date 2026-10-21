import { create } from 'zustand';
import { apiAuth, type Metric } from '../../lib/api/client';

interface MetricsState {
  metrics: Metric[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
}

export const useMetrics = create<MetricsState>((set) => ({
  metrics: [],
  loading: false,
  error: null,
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiAuth.metrics();
      set({ metrics: res.data, loading: false });
    } catch (e: any) {
      if (e.message === 'UNAUTHORIZED') {
        localStorage.removeItem('netguard_token');
        window.location.href = '/login';
        return;
      }
      set({ error: e.message, loading: false });
    }
  },
}));