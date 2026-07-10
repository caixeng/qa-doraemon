import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** User profile from Supabase */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'staff' | 'parent';
  phone: string | null;
  avatar_url: string | null;
  job_title: string | null;
  is_active: boolean;
  school_id: string;
  /** Bắt đổi mật khẩu ở lần đăng nhập kế tiếp (tài khoản mới cấp) */
  must_change_password?: boolean;
}

interface AuthState {
  /** Current authenticated user profile */
  user: UserProfile | null;
  /** Supabase session token */
  accessToken: string | null;
  /** Whether auth state is being loaded */
  isLoading: boolean;
  /** Auth error message */
  error: string | null;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setAccessToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  /** Check if user has a specific role */
  hasRole: (role: 'admin' | 'teacher' | 'staff') => boolean;
  /** Check if user is admin */
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: true,
      error: null,

      setUser: (user) => set({ user, error: null }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          isLoading: false,
          error: null,
        }),

      hasRole: (role) => get().user?.role === role,
      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'doraemon-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    }
  )
);
