import { calculate, defaultProfile } from './model';
import type { FoodEntry, Profile } from './model';
export const CALORIES_KEY = 'trener.calories.v1';
export interface CaloriesState { profile: Profile; entries: FoodEntry[] }
export function readCalories(storage: Pick<Storage, 'getItem'> = localStorage): CaloriesState {
  try {
    const value = JSON.parse(storage.getItem(CALORIES_KEY) ?? 'null');
    return { profile: value?.profile && calculate(value.profile) ? value.profile : defaultProfile,
      entries: Array.isArray(value?.entries) ? value.entries.filter((e: FoodEntry) => e && typeof e.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && Number.isFinite(e.grams) && e.grams > 0 && e.grams <= 5000 && e.food && typeof e.food.name === 'string' && [e.food.kcal, e.food.protein, e.food.fat, e.food.carbs].every(n => Number.isFinite(n) && n >= 0)) : [] };
  } catch { return { profile: defaultProfile, entries: [] }; }
}
export function writeCalories(state: CaloriesState, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(CALORIES_KEY, JSON.stringify(state));
}
