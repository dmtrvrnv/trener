import { useSyncExternalStore } from 'react';
import { exerciseById } from '../data/exercises';
import { program } from '../data/program';
import type { Block, WorkoutDay } from '../data/types';

export type Level = 'easy' | 'normal' | 'hard';

export interface Session {
  date: string;          // YYYY-MM-DD, локальная дата
  workoutId: string;
  finishedAt: number;    // ms
  seconds: number;       // чистое время тренировки
  blocksDone: number;
  blocksTotal: number;
}

export interface AppState {
  version: 1;
  startDate: string;     // день старта программы, от него считаются недели
  level: Level;
  visits: string[];      // дни, когда приложение открывали (отсортированы)
  sessions: Record<string, Session>; // по дате, последняя тренировка за день
  sound: boolean;
  voice: boolean;        // голосовые команды
}

const KEY = 'trener.state.v1';

export const dateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
export const parseKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayDiff = (a: Date, b: Date) => Math.round((parseKey(dateKey(b)).getTime() - parseKey(dateKey(a)).getTime()) / 86400000);
/** понедельник = 0 */
export const weekday = (d: Date) => (d.getDay() + 6) % 7;

function fresh(): AppState {
  return { version: 1, startDate: dateKey(), level: 'normal', visits: [], sessions: {}, sound: true, voice: false };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    return { ...fresh(), ...(JSON.parse(raw) as Partial<AppState>) };
  } catch {
    return fresh();
  }
}

let state: AppState = loadState();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function save(next: AppState) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* квота или приватный режим */ }
  emit();
}

// другое окно (виджет ↔ основное) поменяло данные
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { state = loadState(); emit(); }
  });
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
export const getState = () => state;
export function useAppState() {
  return useSyncExternalStore(subscribe, getState);
}

export function update(fn: (s: AppState) => AppState) {
  save(fn(state));
}

/** Отметить заход сегодня. Зовёт только основное окно. */
export function markVisit(d = new Date()) {
  const k = dateKey(d);
  if (state.visits.includes(k)) return;
  save({ ...state, visits: [...state.visits, k].sort() });
}

export function recordSession(s: Omit<Session, 'date' | 'finishedAt'>, d = new Date()) {
  const k = dateKey(d);
  const prev = state.sessions[k];
  // зачтённую сегодня тренировку не затираем более слабой попыткой
  if (credited(prev) && !credited(s as Session)) return;
  save({ ...state, sessions: { ...state.sessions, [k]: { ...s, date: k, finishedAt: Date.now() } } });
}

export const setLevel = (level: Level) => update((s) => ({ ...s, level }));
export const setSound = (sound: boolean) => update((s) => ({ ...s, sound }));
export const setVoice = (voice: boolean) => update((s) => ({ ...s, voice }));
export const restartProgram = () => update((s) => ({ ...s, startDate: dateKey() }));

// ——— программа ———

/** Номер недели программы (0…), по кругу. */
export function weekIndex(d = new Date(), s = state) {
  const start = parseKey(s.startDate);
  const startMonday = addDays(start, -weekday(start));
  const w = Math.max(0, Math.floor(dayDiff(startMonday, d) / 7));
  return w % program.weeks.length;
}

export function workoutFor(d = new Date(), s = state): WorkoutDay {
  const week = program.weeks[weekIndex(d, s)];
  return week[weekday(d)] ?? week[0];
}
export const todayWorkout = () => workoutFor(new Date());

const LEVEL_K: Record<Level, number> = { easy: 0.75, normal: 1, hard: 1.3 };
/** Блок с поправкой на уровень пользователя. */
export function scaleBlock(b: Block, level: Level = state.level): Block {
  const k = LEVEL_K[level];
  return {
    ...b,
    reps: b.reps ? Math.max(3, Math.round(b.reps * k)) : undefined,
    seconds: b.seconds ? Math.max(10, Math.round((b.seconds * k) / 5) * 5) : undefined,
    sets: level === 'hard' && b.sets >= 2 ? b.sets + 1 : b.sets,
  };
}

/** Длительность тренировки с учётом уровня: одна формула для «Сегодня», плеера и виджета. */
export function blockSeconds(b: Block) {
  const sides = exerciseById[b.exerciseId]?.perSide ? 2 : 1;
  return b.sets * ((b.seconds ?? (b.reps ?? 0) * 4) * sides + b.restSec);
}
export function workoutMinutes(w: WorkoutDay, level: Level = state.level) {
  const all = [...w.warmup, ...w.main, ...w.cooldown].map((b) => scaleBlock(b, level));
  return Math.ceil(all.reduce((a, b) => a + blockSeconds(b), 0) / 60);
}

// ——— трекер ———

/** Тренировка засчитывается, если выполнено от 60% подходов (пропуски стрелкой не считаются). */
export const CREDIT = 0.6;
export const credited = (x?: Session) => Boolean(x && x.blocksTotal > 0 && x.blocksDone / x.blocksTotal >= CREDIT);

export type DayMark = 'done' | 'visit' | 'none';
export function markFor(k: string, s = state): DayMark {
  if (credited(s.sessions[k])) return 'done';
  if (s.visits.includes(k)) return 'visit';
  return 'none';
}

export const isDoneToday = (s = state) => credited(s.sessions[dateKey()]);

/** День идёт в серию: засчитанная тренировка или день отдыха по программе, в который заходил. */
function countsForStreak(d: Date, s: AppState) {
  const k = dateKey(d);
  if (credited(s.sessions[k])) return true;
  return Boolean(workoutFor(d, s).rest && s.visits.includes(k));
}

/**
 * Серия дней подряд с тренировкой (дни отдыха с заходом её не рвут).
 * Сегодня ещё не потрачено: если сегодня не тренировался, серия считается до вчера.
 */
export function streak(s = state): number {
  let d = new Date();
  if (!countsForStreak(d, s)) d = addDays(d, -1);
  let n = 0;
  while (countsForStreak(d, s) && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}

/** Серия заходов в приложение подряд. */
export function visitStreak(s = state): number {
  const set = new Set(s.visits);
  let d = new Date();
  if (!set.has(dateKey(d))) d = addDays(d, -1);
  let n = 0;
  while (set.has(dateKey(d))) { n++; d = addDays(d, -1); }
  return n;
}

export function bestStreak(s = state): number {
  const keys = [...Object.keys(s.sessions), ...s.visits].sort();
  if (!keys.length) return 0;
  const today = parseKey(dateKey());
  let best = 0, cur = 0;
  for (let d = parseKey(keys[0]); d <= today; d = addDays(d, 1)) {
    cur = countsForStreak(d, s) ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

export function totals(s = state) {
  const list = Object.values(s.sessions).filter((x) => credited(x));
  return {
    workouts: list.length,
    minutes: Math.round(list.reduce((a, x) => a + x.seconds, 0) / 60),
    visits: s.visits.length,
  };
}

/** Последние 7 дней (пн–вс текущей недели) для ленты. */
export function thisWeek(s = state) {
  const now = new Date();
  const monday = addDays(now, -weekday(now));
  const names = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
  return names.map((label, i) => {
    const d = addDays(monday, i);
    const k = dateKey(d);
    return { label, key: k, state: markFor(k, s), today: k === dateKey(now), workout: workoutFor(d, s) };
  });
}
