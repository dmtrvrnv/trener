export interface Profile { sex: 'male' | 'female'; age: number; height: number; weight: number; activity: number; goal: 'lose' | 'maintain' | 'gain' }
export const defaultProfile: Profile = { sex: 'male', age: 30, height: 175, weight: 75, activity: 1.375, goal: 'maintain' };
export function calculate(profile: Profile) {
  if (!['male', 'female'].includes(profile.sex) || !['lose', 'maintain', 'gain'].includes(profile.goal)) return null;
  if (![profile.age, profile.height, profile.weight, profile.activity].every(Number.isFinite) || profile.age < 18 || profile.age > 100 || profile.height < 100 || profile.height > 250 || profile.weight < 35 || profile.weight > 300 || ![1.2, 1.375, 1.55, 1.725, 1.9].includes(profile.activity)) return null;
  const bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + (profile.sex === 'male' ? 5 : -161);
  const tdee = bmr * profile.activity;
  const target = Math.round(tdee * (profile.goal === 'lose' ? 0.85 : profile.goal === 'gain' ? 1.1 : 1));
  const protein = Math.round(target * 0.25 / 4);
  const fat = Math.round(target * 0.3 / 9);
  const carbs = Math.round((target - protein * 4 - fat * 9) / 4);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), target, protein, fat, carbs };
}
export interface Food { id: string; name: string; kcal: number; protein: number; fat: number; carbs: number }
// Приблизительно на 100 г съедобной части. Для точного учёта сверяйтесь с упаковкой.
export const foods: Food[] = [
  { id: 'oats', name: 'Овсяные хлопья, сухие', kcal: 370, protein: 13, fat: 7, carbs: 62 },
  { id: 'rice', name: 'Рис, варёный', kcal: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  { id: 'buckwheat', name: 'Гречка, варёная', kcal: 110, protein: 4.2, fat: 1.1, carbs: 21 },
  { id: 'chicken', name: 'Куриная грудка, приготовленная', kcal: 165, protein: 31, fat: 3.6, carbs: 0 },
  { id: 'egg', name: 'Яйцо, варёное', kcal: 155, protein: 13, fat: 11, carbs: 1.1 },
  { id: 'curd', name: 'Творог 5%', kcal: 121, protein: 17, fat: 5, carbs: 1.8 },
  { id: 'yogurt', name: 'Йогурт натуральный 2%', kcal: 60, protein: 4, fat: 2, carbs: 6 },
  { id: 'apple', name: 'Яблоко', kcal: 52, protein: 0.3, fat: 0.2, carbs: 14 },
  { id: 'banana', name: 'Банан', kcal: 89, protein: 1.1, fat: 0.3, carbs: 23 },
  { id: 'tomato', name: 'Помидор', kcal: 18, protein: 0.9, fat: 0.2, carbs: 3.9 },
  { id: 'potato', name: 'Картофель, варёный', kcal: 87, protein: 1.9, fat: 0.1, carbs: 20 },
  { id: 'bread', name: 'Хлеб цельнозерновой', kcal: 247, protein: 13, fat: 4.2, carbs: 41 },
  { id: 'oil', name: 'Оливковое масло', kcal: 884, protein: 0, fat: 100, carbs: 0 },
  { id: 'almond', name: 'Миндаль', kcal: 579, protein: 21, fat: 50, carbs: 22 },
];
export interface FoodEntry { id: string; date: string; food: Food; grams: number }
export function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function totals(entries: FoodEntry[]) { return entries.reduce((sum, entry) => ({ kcal: sum.kcal + entry.food.kcal * entry.grams / 100, protein: sum.protein + entry.food.protein * entry.grams / 100, fat: sum.fat + entry.food.fat * entry.grams / 100, carbs: sum.carbs + entry.food.carbs * entry.grams / 100 }), { kcal: 0, protein: 0, fat: 0, carbs: 0 }); }
