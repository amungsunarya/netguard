import { create } from 'zustand';
import { apiAuth, type Alert } from '../../lib/api/client';

interface AlertsState {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  filter: { severity?: string; status?: string };
  fetch: (filter?: { severity?: string; status?: string }) => Promise<void>;
  setFilter: (filter: { severity?: string; status?: string }) => Promise<void>;
  addAlert: (alert: Alert) => void;
  updateAlert: (id: string, patch: Partial<Alert>) => void;
  removeAlert: (id: string) => void;
}

export const useAlerts = create<AlertsState>((set, get) => ({
  alerts: [],
  loading: false,
  error: null,
  filter: {},
  fetch: async (filter) => {
    const f = filter ?? get().filter;
    set({ loading: true, error: null, filter: f });
    try {
      const res = await apiAuth.alerts(f);
      set({ alerts: res.data, loading: false });
    } catch (e: any) {
      if (e.message === 'UNAUTHORIZED') {
        localStorage.removeItem('netguard_token');
        window.location.href = '/login';
        return;
      }
      set({ error: e.message, loading: false });
    }
  },
  setFilter: async (filter) => {
    set({ filter });
    await get().fetch(filter);
  },
  addAlert: (alert) =>
    set((s) => ({ alerts: [alert, ...s.alerts.filter((a) => a.id !== alert.id)] })),
  updateAlert: (id, patch) =>
    set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
  removeAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
}));