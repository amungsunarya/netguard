import { create } from 'zustand';

interface ToastState {
  message: string | null;
  type: 'success' | 'error' | 'info';
  show: (msg: string, type?: 'success' | 'error' | 'info') => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  show: (msg, type = 'info') => {
    set({ message: msg, type });
    setTimeout(() => set({ message: null }), 3000);
  },
  hide: () => set({ message: null }),
}));

export function Toast() {
  const { message, type } = useToast();
  if (!message) return null;

  const colors = {
    success: { bg: 'rgba(34,197,94,.15)', border: '#22C55E', color: '#22C55E', icon: '✅' },
    error: { bg: 'rgba(239,68,68,.15)', border: '#EF4444', color: '#EF4444', icon: '❌' },
    info: { bg: 'rgba(6,182,212,.15)', border: '#06B6D4', color: '#06B6D4', icon: 'ℹ️' },
  };
  const c = colors[type];

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: c.bg, border: `1px solid ${c.border}`,
      borderLeft: `4px solid ${c.border}`, color: c.color,
      padding: '12px 20px', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,.5)',
      fontSize: 13, fontWeight: 500, minWidth: 250,
    }}>
      {c.icon} {message}
    </div>
  );
}