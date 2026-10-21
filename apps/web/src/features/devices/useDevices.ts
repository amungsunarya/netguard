import { create } from 'zustand';
import { apiAuth, type Device } from '../../lib/api/client';

interface DevicesState {
  devices: Device[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  addDevice: (d: Device) => void;
  updateDevice: (id: number, patch: Partial<Device>) => void;
  removeDevice: (id: number) => void;
}

export const useDevices = create<DevicesState>((set) => ({
  devices: [],
  loading: false,
  error: null,
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiAuth.devices();
      set({ devices: res.data, loading: false });
    } catch (e: any) {
      if (e.message === 'UNAUTHORIZED') {
        localStorage.removeItem('netguard_token');
        window.location.href = '/login';
        return;
      }
      set({ error: e.message, loading: false });
    }
  },
  addDevice: (d) => set((s) => ({ devices: [...s.devices.filter((x) => x.id !== d.id), d] })),
  updateDevice: (id, patch) =>
    set((s) => ({ devices: s.devices.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  removeDevice: (id) => set((s) => ({ devices: s.devices.filter((x) => x.id !== id) })),
}));