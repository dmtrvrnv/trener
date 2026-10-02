import type { Muscle } from '../data/types';

export const MUSCLE_RU: Record<Muscle, string> = {
  chest: 'грудь', back: 'спина', shoulders: 'плечи', triceps: 'трицепс', biceps: 'бицепс', core: 'пресс и кор',
  glutes: 'ягодицы', quads: 'бёдра', hamstrings: 'задняя поверхность бедра', calves: 'икры', cardio: 'кардио', mobility: 'подвижность',
};

export const LEVEL_RU = { 1: 'новичок', 2: 'средний', 3: 'продвинутый' } as const;
export const EQUIP_RU = { chair: 'нужен стул', wall: 'у стены', mat: 'коврик' } as const;

export const GROUPS = [
  { id: 'warmup', label: 'Разминка', ids: ['jumping-jacks', 'arm-circles', 'hip-circles', 'high-knees', 'cat-cow', 'inchworm', 'leg-swings'] },
  { id: 'legs', label: 'Ноги', ids: ['squat', 'sumo-squat', 'reverse-lunge', 'glute-bridge', 'wall-sit', 'calf-raise', 'squat-jump'] },
  { id: 'upper', label: 'Верх', ids: ['pushup', 'knee-pushup', 'incline-pushup', 'pike-pushup', 'chair-dips', 'superman'] },
  { id: 'core', label: 'Кор', ids: ['plank', 'side-plank', 'mountain-climbers', 'crunch', 'bicycle-crunch', 'leg-raises', 'dead-bug', 'bird-dog'] },
  { id: 'cardio', label: 'Кардио', ids: ['burpee', 'skater-jumps'] },
  { id: 'cool', label: 'Заминка', ids: ['childs-pose', 'cobra-stretch', 'hamstring-stretch', 'quad-stretch'] },
] as const;

export const groupOf = (id: string) => GROUPS.find((g) => (g.ids as readonly string[]).includes(id))?.id ?? 'other';

export const plural = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
};

export const fmtTime = (sec: number) => {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};
