import { create } from 'zustand';
import type { TimeFilter } from '@/events/discovery';

type Origin = { latitude: number; longitude: number; label: string };

type SearchState = {
  origin: Origin | null;
  radiusMeters: number;
  categories: string[];
  timeFilter: TimeFilter;
  setOrigin: (origin: Origin) => void;
  setRadiusMeters: (radiusMeters: number) => void;
  toggleCategory: (category: string) => void;
  setTimeFilter: (timeFilter: TimeFilter) => void;
};

// This store is intentionally not persisted: device location is only used for
// the active discovery query and never retained as location history.
export const useEventSearch = create<SearchState>((set) => ({
  origin: null,
  radiusMeters: 3000,
  categories: [],
  timeFilter: 'any',
  setOrigin: (origin) => set({ origin }),
  setRadiusMeters: (radiusMeters) => set({ radiusMeters }),
  toggleCategory: (category) =>
    set((state) => ({
      categories: state.categories.includes(category)
        ? state.categories.filter((value) => value !== category)
        : [...state.categories, category],
    })),
  setTimeFilter: (timeFilter) => set({ timeFilter }),
}));
