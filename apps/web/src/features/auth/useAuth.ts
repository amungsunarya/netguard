import { create } from 'zustand';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'analyst' | 'viewer';
}

interface AuthState {
  token: string | null;
  user: User | null;
  isReady: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  isReady: false,

  login: async (username, password) => {
    const res = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login gagal');
    }
    const data = await res.json();
    localStorage.setItem('netguard_token', data.token);
    localStorage.setItem('netguard_user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user, isReady: true });
  },

  logout: () => {
    localStorage.removeItem('netguard_token');
    localStorage.removeItem('netguard_user');
    set({ token: null, user: null, isReady: true });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('netguard_token');
    const userStr = localStorage.getItem('netguard_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user, isReady: true });
        return;
      } catch {}
    }
    set({ isReady: true });
  },
}));