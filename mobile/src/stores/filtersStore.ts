import { create } from "zustand";

interface FiltersState {
  radiusKm: number;
  fitnessLevels: string[];
  setRadiusKm: (v: number) => void;
  toggleFitnessLevel: (level: string) => void;
}

export const useFiltersStore = create<FiltersState>((set) => ({
  radiusKm: 25,
  fitnessLevels: [],
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  toggleFitnessLevel: (level) =>
    set((s) => ({
      fitnessLevels: s.fitnessLevels.includes(level)
        ? s.fitnessLevels.filter((l) => l !== level)
        : [...s.fitnessLevels, level],
    })),
}));
