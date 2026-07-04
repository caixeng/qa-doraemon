import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  /** Whether sidebar is collapsed (desktop: mini mode, mobile: hidden) */
  sidebarCollapsed: boolean;
  /** Whether the mobile "Quản lý" bottom sheet is open */
  mobileMoreOpen: boolean;
  /** Current page title for topbar */
  pageTitle: string;
  /** Global search query */
  searchQuery: string;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMoreOpen: (open: boolean) => void;
  setPageTitle: (title: string) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileMoreOpen: false,
      pageTitle: 'Dashboard',
      searchQuery: '',

      toggleSidebar: () =>
        set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setMobileMoreOpen: (mobileMoreOpen) => set({ mobileMoreOpen }),
      setPageTitle: (pageTitle) => set({ pageTitle }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
    }),
    {
      name: 'doraemon-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
