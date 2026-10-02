import { exerciseById } from '../data/exercises';
import type { Block, WorkoutDay } from '../data/types';
import { scaleBlock, type Level } from './store';

export type Phase = 'warmup' | 'main' | 'cooldown';

export interface WorkStep {
  type: 'work';
  phase: Phase;
  exerciseId: string;
  set: number;        // 1…
  sets: number;
  reps?: number;
  seconds?: number;
  side?: 'left' | 'right';
}
export interface RestStep { type: 'rest'; seconds: number; phase: Phase }
export type Step = WorkStep | RestStep;

/** Раскладывает тренировку на шаги: подход → отдых → подход… */
export function buildSteps(w: WorkoutDay, level: Level): Step[] {
  const out: Step[] = [];
  const add = (blocks: Block[], phase: Phase) => {
    blocks.forEach((raw, bi) => {
      const b = scaleBlock(raw, level);
      const e = exerciseById[b.exerciseId];
      for (let set = 1; set <= b.sets; set++) {
        const sides: (WorkStep['side'] | undefined)[] = e?.perSide ? ['right', 'left'] : [undefined];
        for (const side of sides) {
          out.push({ type: 'work', phase, exerciseId: b.exerciseId, set, sets: b.sets, reps: b.reps, seconds: b.seconds, side });
          // при упражнении на две стороны короткая пауза на смену стороны
          if (side === 'right') out.push({ type: 'rest', seconds: 5, phase });
        }
        const lastOfAll = phase === 'cooldown' && bi === blocks.length - 1 && set === b.sets;
        if (!lastOfAll && b.restSec > 0) out.push({ type: 'rest', seconds: b.restSec, phase });
      }
    });
  };
  add(w.warmup, 'warmup');
  add(w.main, 'main');
  add(w.cooldown, 'cooldown');
  // хвостовой отдых не нужен
  while (out.length && out[out.length - 1].type === 'rest') out.pop();
  return out;
}

export const PHASE_RU: Record<Phase, string> = { warmup: 'Разминка', main: 'Основная часть', cooldown: 'Заминка' };
