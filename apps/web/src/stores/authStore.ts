import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setAuth: (accessToken: string, user: User) => void;
  clearAuth: () => void;
  setInitializing: (isInitializing: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      setAuth: (accessToken, user) =>
        set({
          accessToken,
          user,
          isAuthenticated: true,
          isInitializing: false,
        }),
      clearAuth: () =>
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
          isInitializing: false,
        }),
      setInitializing: (isInitializing) => set({ isInitializing }),
    }),
    {
      name: 'workbench_auth_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
