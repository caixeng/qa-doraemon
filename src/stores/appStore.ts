import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  selectedAcademicYearId: string | null;
  selectedClassId: string | null;
  
  setSelectedAcademicYearId: (id: string | null) => void;
  setSelectedClassId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedAcademicYearId: null,
      selectedClassId: null,

      setSelectedAcademicYearId: (selectedAcademicYearId) => set({ selectedAcademicYearId }),
      setSelectedClassId: (selectedClassId) => set({ selectedClassId }),
    }),
    {
      name: 'doraemon-app-prefs',
      partialize: (state) => ({
        selectedAcademicYearId: state.selectedAcademicYearId,
        selectedClassId: state.selectedClassId,
      }),
    }
  )
);
