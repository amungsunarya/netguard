import { create } from 'zustand';
import { apiAuth, type Device, type Alert, type LogEntry, type Overview, type Metric } from '../../lib/api/client';

interface OverviewState {
  overview: Overview | null;
  devices: Device[];
  alerts: Alert[];
  logs: LogEntry[];
  metrics: Metric[];
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
}

export const useOverview = create<OverviewState>((set) => ({
  overview: null,
  devices: [],
  alerts: [],
  logs: [],
  metrics: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [overview, devices, alerts, logs, metrics] = await Promise.all([
        apiAuth.overview(),
        apiAuth.devices(),
        apiAuth.alerts(),
        apiAuth.logs(),
        apiAuth.metrics(),
      ]);
      set({
        overview,
        devices: devices.data,
        alerts: alerts.data,
        logs: logs.data,
        metrics: metrics.data,
        loading: false,
      });
    } catch (e: any) {
      if (e.message === 'UNAUTHORIZED') {
        localStorage.removeItem('netguard_token');
        localStorage.removeItem('netguard_user');
        window.location.href = '/login';
        return;
      }
      set({ error: e.message, loading: false });
    }
  },
}));