export type Muscle =
  | 'chest' | 'back' | 'shoulders' | 'triceps' | 'biceps' | 'core'
  | 'glutes' | 'quads' | 'hamstrings' | 'calves' | 'cardio' | 'mobility';

export type ExerciseKind = 'reps' | 'time';

export interface Exercise {
  id: string;
  name: string;
  short: string;
  muscles: Muscle[];
  level: 1 | 2 | 3;
  kind: ExerciseKind;
  steps: string[];
  mistakes: string[];
  breathing: string;
  easier?: string;
  harder?: string;
  equipment?: 'chair' | 'wall' | 'mat';
  perSide?: boolean;
}

export interface Block {
  exerciseId: string;
  sets: number;
  reps?: number;
  seconds?: number;
  restSec: number;
}

export interface WorkoutDay {
  id: string;
  title: string;
  focus: Muscle[];
  minutes: number;
  rest?: boolean;
  warmup: Block[];
  main: Block[];
  cooldown: Block[];
}

export interface Program {
  id: string;
  name: string;
  weeks: WorkoutDay[][];
}
