import { useEffect, useState } from 'react';
import { calculate, foods, localDate, totals } from './model';
import type { FoodEntry, Profile } from './model';
import { Button, Stat } from '../../ui';
import { CALORIES_KEY, readCalories, writeCalories } from './storage';
import './calories.css';

export default function CaloriesScreen() {
  const [saved] = useState(() => readCalories());
  const [profile, setProfile] = useState<Profile>(saved.profile);
  const [entries, setEntries] = useState<FoodEntry[]>(saved.entries);
  const [date, setDate] = useState(localDate());
  const [foodId, setFoodId] = useState(foods[0].id);
  const [grams, setGrams] = useState('100');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const result = calculate(profile);
  const todayEntries = entries.filter(entry => entry.date === date);
  const eaten = totals(todayEntries);
  useEffect(() => { try { writeCalories({ profile, entries }); setError(''); } catch { setError('Не удалось сохранить данные на устройстве.'); } }, [profile, entries]);
  useEffect(() => { const sync = (event: StorageEvent) => { if (event.key === CALORIES_KEY) { const next = readCalories(); setProfile(next.profile); setEntries(next.entries); } }; window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync); }, []);
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile(previous => ({ ...previous, [key]: value }));
  const visibleFoods = foods.filter(food => food.name.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')));
  return <section className="screen calories-screen">
    <header className="screen__head"><h1 className="display screen__title">Калории</h1></header>
    <div className="cal-layout"><section className="cal-panel"><h2>Ваш ориентир</h2><div className="cal-fields">
      <label>Пол для формулы<select value={profile.sex} onChange={e => update('sex', e.target.value as Profile['sex'])}><option value="male">Мужской</option><option value="female">Женский</option></select></label>
      {(['age', 'height', 'weight'] as const).map(key => <label key={key}>{({ age: 'Возраст, лет', height: 'Рост, см', weight: 'Вес, кг' })[key]}<input type="number" inputMode="decimal" min={key === 'age' ? 18 : key === 'height' ? 100 : 35} max={key === 'age' ? 100 : key === 'height' ? 250 : 300} step={key === 'weight' ? 0.1 : 1} value={Number.isNaN(profile[key]) ? '' : profile[key]} onChange={e => update(key, e.target.value === '' ? NaN : Number(e.target.value))} /></label>)}
      <label className="cal-wide">Активность<select value={profile.activity} onChange={e => update('activity', Number(e.target.value))}><option value={1.2}>Сидячий день, мало движения</option><option value={1.375}>Лёгкая: 1–3 тренировки в неделю</option><option value={1.55}>Средняя: 3–5 тренировок</option><option value={1.725}>Высокая: 6–7 тренировок</option><option value={1.9}>Очень высокая, физическая работа</option></select></label>
      <label className="cal-wide">Цель<select value={profile.goal} onChange={e => update('goal', e.target.value as Profile['goal'])}><option value="lose">Снижение веса · −15%</option><option value="maintain">Поддержание веса</option><option value="gain">Набор веса · +10%</option></select></label>
    </div>{result ? <><div className="cal-target"><strong className="dot">{result.target}</strong><span>ккал / день</span></div><div className="cal-macros">{[['Белки', result.protein], ['Жиры', result.fat], ['Углеводы', result.carbs]].map(([label, value]) => <div key={label}><strong>{value} г</strong><span>{label}</span></div>)}</div><p className="cal-note">В покое ≈ {result.bmr} · с активностью ≈ {result.tdee} ккал. БЖУ: 25 / 30 / 45%.</p></> : <p role="alert">Введите возраст 18–100 лет, рост 100–250 см и вес 35–300 кг.</p>}
    <p className="cal-note">Оценка для взрослых; не для беременности или лечебного питания. <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noreferrer">Mifflin–St Jeor ↗</a></p></section>
    <section className="cal-panel"><div className="cal-diary-heading"><h2>Дневник еды</h2><label>Дата<input aria-label="Дата дневника" type="date" value={date} onChange={e => { if (e.target.value) setDate(e.target.value); }} /></label></div>
      <div className="cal-consumed"><strong>{Math.round(eaten.kcal)}</strong><span>ккал записано</span>{result && <span>{eaten.kcal <= result.target ? `Осталось ${Math.round(result.target - eaten.kcal)}` : `Выше ориентира на ${Math.round(eaten.kcal - result.target)}`} ккал</span>}</div>
      <progress aria-label="Записанные калории относительно ориентира" max={result?.target ?? 2000} value={Math.min(eaten.kcal, result?.target ?? 2000)} />
      <div className="cal-diary-macros"><Stat label="Белки" value={Math.round(eaten.protein)} unit="г" /><Stat label="Жиры" value={Math.round(eaten.fat)} unit="г" /><Stat label="Углеводы" value={Math.round(eaten.carbs)} unit="г" /></div>
      <form onSubmit={e => { e.preventDefault(); const food = foods.find(item => item.id === foodId); const amount = Number(grams.replace(',', '.')); if (!food || !Number.isFinite(amount) || amount < 1 || amount > 5000) { setError('Выберите продукт и массу от 1 до 5000 г.'); return; } setEntries(previous => [...previous, { id: crypto.randomUUID(), date, food, grams: amount }]); }}>
        <label>Найти продукт<input type="search" value={query} placeholder="Например, творог" onChange={e => { setQuery(e.target.value); const match = foods.find(food => food.name.toLocaleLowerCase('ru').includes(e.target.value.toLocaleLowerCase('ru'))); if (match) setFoodId(match.id); }} /></label>
        <label>Продукт<select value={foodId} onChange={e => setFoodId(e.target.value)}>{visibleFoods.map(food => <option key={food.id} value={food.id}>{food.name} · {food.kcal} ккал/100 г</option>)}</select></label>
        <div className="cal-add"><label>Масса, г<input inputMode="decimal" value={grams} onChange={e => setGrams(e.target.value)} /></label><Button variant="primary" type="submit" disabled={!visibleFoods.length}>Добавить</Button></div>
      </form>{error && <p role="alert">{error}</p>}
      {todayEntries.length ? <ul className="cal-food-list">{todayEntries.map(entry => <li key={entry.id}><div><strong>{entry.food.name}</strong><span>{entry.grams} г · {Math.round(entry.food.kcal * entry.grams / 100)} ккал</span></div><button type="button" aria-label={`Удалить ${entry.food.name}`} onClick={() => setEntries(previous => previous.filter(item => item.id !== entry.id))}>×</button></li>)}</ul> : <p className="cal-empty">Пока пусто. Добавьте первый приём пищи.</p>}
      <p className="cal-note">Значения продуктов приблизительные. Масса круп указана для состояния в названии; масло и соусы учитывайте отдельно.</p>
    </section></div>
  </section>;
}
