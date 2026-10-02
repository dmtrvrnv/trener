import type { Block, Muscle, Program, WorkoutDay } from './types';
import { exerciseById } from './exercises';

const timed = (exerciseId: string, seconds: number, sets = 1, restSec = 15): Block => ({ exerciseId, seconds, sets, restSec });
const reps = (exerciseId: string, count: number, sets = 2, restSec = 40): Block => ({ exerciseId, reps: count, sets, restSec });
const warmup = (): Block[] => [timed('jumping-jacks', 40), timed('arm-circles', 30), timed('hip-circles', 30), timed('cat-cow', 40), timed('leg-swings', 20), reps('inchworm', 4, 1, 15)];
const cooldown = (): Block[] => [timed('childs-pose', 35, 1, 5), timed('hamstring-stretch', 25, 1, 5), timed('quad-stretch', 25, 1, 5)];

const templates: Array<{ title: string; focus: Muscle[]; main: Block[]; rest?: boolean }> = [
  { title: 'Ноги и ягодицы', focus: ['quads', 'glutes'], main: [reps('squat', 10), reps('glute-bridge', 12), reps('calf-raise', 12), timed('wall-sit', 20, 2, 40)] },
  { title: 'Верх и осанка', focus: ['chest', 'back', 'shoulders'], main: [reps('incline-pushup', 10), reps('bird-dog', 6), reps('superman', 8), timed('plank', 20, 2, 40)] },
  { title: 'Кардио и кор', focus: ['cardio', 'core'], main: [timed('high-knees', 40, 3, 30), timed('skater-jumps', 30, 3, 30), reps('dead-bug', 8, 3), reps('crunch', 10, 3), timed('plank', 25, 3, 40)] },
  { title: 'Всё тело', focus: ['glutes', 'chest', 'core'], main: [reps('sumo-squat', 10), reps('incline-pushup', 10), reps('glute-bridge', 12), reps('dead-bug', 6)] },
  { title: 'Верх и кор', focus: ['chest', 'core'], main: [reps('knee-pushup', 8), reps('bird-dog', 8), reps('crunch', 10), reps('dead-bug', 8), timed('plank', 25, 2, 40)] },
  { title: 'Движение в ритме', focus: ['cardio', 'glutes'], main: [timed('jumping-jacks', 35, 3, 30), reps('squat', 10), timed('high-knees', 40, 3, 30), timed('skater-jumps', 30, 3, 30), reps('glute-bridge', 12)] },
  { title: 'Спокойное воскресенье', focus: ['mobility'], rest: true, main: [timed('cat-cow', 60), timed('hamstring-stretch', 40), timed('cobra-stretch', 25), timed('childs-pose', 60)] },
];

function duration(blocks: Block[]): number {
  return blocks.reduce((total, block) => {
    const sides = exerciseById[block.exerciseId]?.perSide ? 2 : 1;
    return total + block.sets * ((block.seconds ?? (block.reps ?? 0) * 4) * sides + block.restSec);
  }, 0);
}

function progress(block: Block, week: number, day: number): Block {
  let next = { ...block };
  const replace = (id: string, count?: number) => { next.exerciseId = id; if (count !== undefined) next.reps = count; };
  if (week >= 2) {
    if (block.exerciseId === 'incline-pushup') replace(week >= 5 ? 'pushup' : 'knee-pushup', week >= 5 ? 8 : 10);
    if (block.exerciseId === 'squat' && day === 0) replace('reverse-lunge', 8);
    if (block.exerciseId === 'crunch') replace('bicycle-crunch', 8);
    if (block.exerciseId === 'plank' && day === 2) { replace('side-plank'); next.seconds = 20; }
    if (block.exerciseId === 'dead-bug' && day === 4) replace('leg-raises', 8);
  }
  if (week >= 5) {
    if (block.exerciseId === 'knee-pushup') replace('pike-pushup', 5);
    if (block.exerciseId === 'bird-dog' && day === 4) replace('chair-dips', 6);
    if (block.exerciseId === 'squat' && day === 5) replace('squat-jump', 6);
    if (block.exerciseId === 'glute-bridge' && day === 5) replace('burpee', 5);
    if (block.exerciseId === 'high-knees' && day === 5) replace('mountain-climbers');
  }
  return next;
}
// Восемь недель; четвёртая и восьмая уменьшают объём. Сложность можно снизить в каталоге.
export const program: Program = {
  id: 'home-foundation', name: 'Движение каждый день',
  weeks: Array.from({ length: 8 }, (_, week) => templates.map((template, day): WorkoutDay => {
    const deload = week === 3 || week === 7;
    const factor = template.rest ? 1 : deload ? 0.8 : 1 + (week % 4) * 0.1;
    const base = template.rest ? template.main : [...template.main, ...(template.main.length < 5 ? [reps(day === 0 ? 'sumo-squat' : day === 1 ? 'dead-bug' : 'calf-raise', 10)] : [])];
    const main = base.map(block => {
      const next = template.rest ? { ...block } : progress(block, deload ? Math.max(0, week - 2) : week, day);
      return { ...next, sets: template.rest ? next.sets : deload ? 2 : 3,
        ...(next.reps !== undefined ? { reps: Math.max(1, Math.round(next.reps * factor)) } : {}),
        ...(next.seconds !== undefined ? { seconds: Math.round(next.seconds * factor / 5) * 5 } : {}) };
    });
    const start = template.rest ? [] : warmup();
    const finish = template.rest ? [] : cooldown();
    return { id: `w${week + 1}d${day + 1}`, title: template.title, focus: [...template.focus], rest: template.rest,
      minutes: Math.ceil(duration([...start, ...main, ...finish]) / 60), warmup: start, main, cooldown: finish };
  })),
};

export const defaultProgram = program;
export const programs = [program];
export default program;
