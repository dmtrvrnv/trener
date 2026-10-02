/**
 * Скелет персонажа: прямая кинематика по абсолютным углам.
 * Угол a: 0 — вниз, 90 — вперёд (вправо), 180 — вверх, 270/-90 — назад. dir(a) = (sin a, cos a), y вниз.
 */

export type Vec = [number, number];
export type View = 'side' | 'front';

export interface Pose {
  s1: number;               // поясница: таз → середина спины
  s2: number;               // грудной отдел: середина → шея
  head: number;
  aN: [number, number];     // ближняя рука: плечо, предплечье (во фронте — правая для зрителя)
  aF: [number, number];     // дальняя рука
  lN: [number, number, number]; // ближняя нога: бедро, голень, стопа
  lF: [number, number, number];
  lift?: number;            // подъём над полом (прыжок)
  dx?: number;              // сдвиг по горизонтали
}

export const L = {
  s1: 25, s2: 27, neck: 7, headR: 11,
  upper: 29, fore: 27, hand: 0,
  thigh: 43, shin: 41, foot: 13,
  shoulderW: 17, hipW: 10,
};

export type JointName =
  | 'pelvis' | 'mid' | 'neck' | 'head'
  | 'shoulderN' | 'elbowN' | 'wristN' | 'shoulderF' | 'elbowF' | 'wristF'
  | 'hipN' | 'kneeN' | 'ankleN' | 'toeN' | 'hipF' | 'kneeF' | 'ankleF' | 'toeF';

export type Joints = Record<JointName, Vec>;

const rad = (d: number) => (d * Math.PI) / 180;
const dir = (a: number): Vec => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p: Vec, a: number, len: number): Vec => {
  const d = dir(a);
  return [p[0] + d[0] * len, p[1] + d[1] * len];
};

/** Повернуть позу целиком (все абсолютные углы) на delta градусов. */
export function rotatePose(p: Pose, delta: number): Pose {
  const r = (x: number) => x + delta;
  return {
    ...p,
    s1: r(p.s1), s2: r(p.s2), head: r(p.head),
    aN: [r(p.aN[0]), r(p.aN[1])], aF: [r(p.aF[0]), r(p.aF[1])],
    lN: [r(p.lN[0]), r(p.lN[1]), r(p.lN[2])], lF: [r(p.lF[0]), r(p.lF[1]), r(p.lF[2])],
  };
}

export function fk(p: Pose, view: View): Joints {
  const pelvis: Vec = [0, 0];
  const mid = add(pelvis, p.s1, L.s1);
  const neck = add(mid, p.s2, L.s2);
  const head = add(neck, p.head, L.neck + L.headR);
  let shoulderN: Vec, shoulderF: Vec, hipN: Vec, hipF: Vec;
  if (view === 'front') {
    const sBase = add(neck, p.s2 + 180, 3);
    shoulderN = add(sBase, p.s2 - 90, L.shoulderW);
    shoulderF = add(sBase, p.s2 + 90, L.shoulderW);
    hipN = add(pelvis, p.s1 - 90, L.hipW);
    hipF = add(pelvis, p.s1 + 90, L.hipW);
  } else {
    shoulderN = shoulderF = add(neck, p.s2 + 180, 3);
    hipN = hipF = pelvis;
  }
  const elbowN = add(shoulderN, p.aN[0], L.upper);
  const wristN = add(elbowN, p.aN[1], L.fore);
  const elbowF = add(shoulderF, p.aF[0], L.upper);
  const wristF = add(elbowF, p.aF[1], L.fore);
  const kneeN = add(hipN, p.lN[0], L.thigh);
  const ankleN = add(kneeN, p.lN[1], L.shin);
  const toeN = add(ankleN, p.lN[2], L.foot);
  const kneeF = add(hipF, p.lF[0], L.thigh);
  const ankleF = add(kneeF, p.lF[1], L.shin);
  const toeF = add(ankleF, p.lF[2], L.foot);
  return { pelvis, mid, neck, head, shoulderN, elbowN, wristN, shoulderF, elbowF, wristF, hipN, kneeN, ankleN, toeN, hipF, kneeF, ankleF, toeF };
}

export const ALL_JOINTS = Object.keys(fk({
  s1: 180, s2: 180, head: 180, aN: [0, 0], aF: [0, 0], lN: [0, 0, 90], lF: [0, 0, 90],
}, 'side')) as JointName[];

// ——— интерполяция ———

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function mixPose(a: Pose, b: Pose, t: number): Pose {
  return {
    s1: lerp(a.s1, b.s1, t), s2: lerp(a.s2, b.s2, t), head: lerp(a.head, b.head, t),
    aN: [lerp(a.aN[0], b.aN[0], t), lerp(a.aN[1], b.aN[1], t)],
    aF: [lerp(a.aF[0], b.aF[0], t), lerp(a.aF[1], b.aF[1], t)],
    lN: [lerp(a.lN[0], b.lN[0], t), lerp(a.lN[1], b.lN[1], t), lerp(a.lN[2], b.lN[2], t)],
    lF: [lerp(a.lF[0], b.lF[0], t), lerp(a.lF[1], b.lF[1], t), lerp(a.lF[2], b.lF[2], t)],
    lift: lerp(a.lift ?? 0, b.lift ?? 0, t),
    dx: lerp(a.dx ?? 0, b.dx ?? 0, t),
  };
}

export type Ease = 'io' | 'linear' | 'out' | 'in';
const EASE: Record<Ease, (t: number) => number> = {
  io: (t) => 0.5 - Math.cos(Math.PI * t) / 2,
  linear: (t) => t,
  out: (t) => 1 - (1 - t) * (1 - t),
  in: (t) => t * t,
};

export interface Key { t: number; pose: Pose; ease?: Ease }

export interface Move {
  id: string;
  view: View;
  period: number;            // секунд на один цикл
  keys: Key[];               // t от 0 до 1, первый и последний обычно совпадают
  contacts: JointName[];     // какие точки стоят на полу (по ним ставим на пол)
  anchor?: JointName;        // какая точка не уезжает по горизонтали
  level?: [JointName, JointName]; // повернуть фигуру так, чтобы обе точки были на одной высоте
  traces?: JointName[];      // траектории для хронографа
  prop?: 'chair' | 'wall' | 'mat';
  propAt?: { joint: JointName; dx: number; side: 'left' | 'right' }; // где стоит стена/стул (по позе в начале цикла)
  mirror?: boolean;          // второй полупериод — то же другой стороной (ноги/руки меняются)
}

export function samplePose(m: Move, phase: number): Pose {
  const ks = m.keys;
  let ph = ((phase % 1) + 1) % 1;
  let swap = false;
  if (m.mirror) {
    ph *= 2;
    if (ph >= 1) { ph -= 1; swap = true; }
  }
  let i = 0;
  while (i < ks.length - 2 && ph > ks[i + 1].t) i++;
  const a = ks[i], b = ks[i + 1] ?? ks[i];
  const span = b.t - a.t || 1;
  const local = Math.max(0, Math.min(1, (ph - a.t) / span));
  const p = mixPose(a.pose, b.pose, EASE[b.ease ?? 'io'](local));
  return swap ? swapSides(p, m.view) : p;
}

export function swapSides(p: Pose, view: View): Pose {
  if (view === 'front') {
    const mir = (x: number) => -x;
    return {
      ...p,
      s1: 360 - p.s1, s2: 360 - p.s2, head: 360 - p.head,
      aN: [mir(p.aF[0]), mir(p.aF[1])], aF: [mir(p.aN[0]), mir(p.aN[1])],
      lN: [mir(p.lF[0]), mir(p.lF[1]), mir(p.lF[2])], lF: [mir(p.lN[0]), mir(p.lN[1]), mir(p.lN[2])],
      dx: -(p.dx ?? 0),
    };
  }
  return { ...p, aN: p.aF, aF: p.aN, lN: p.lF, lF: p.lN };
}

const yOf = (p: Pose, view: View, j: JointName) => fk(p, view)[j][1];

/** Поворачивает позу так, чтобы две точки опоры оказались на одном уровне. */
export function levelPose(p: Pose, view: View, a: JointName, b: JointName): Pose {
  const f = (d: number) => {
    const q = rotatePose(p, d);
    return yOf(q, view, a) - yOf(q, view, b);
  };
  let best = 0, bestV = Math.abs(f(0));
  for (let d = -40; d <= 40; d += 2) {
    const v = Math.abs(f(d));
    if (v < bestV) { bestV = v; best = d; }
  }
  let lo = best - 2, hi = best + 2;
  for (let i = 0; i < 24; i++) {
    const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
    if (Math.abs(f(m1)) < Math.abs(f(m2))) hi = m2; else lo = m1;
  }
  return rotatePose(p, (lo + hi) / 2);
}

export interface Placed { joints: Joints; pose: Pose }

/** Готовые координаты: пол на y = 0, якорь на x = 0. */
export function place(m: Move, phase: number): Placed {
  let pose = samplePose(m, phase);
  if (m.level) pose = levelPose(pose, m.view, m.level[0], m.level[1]);
  const j = fk(pose, m.view);
  const groundY = Math.max(...m.contacts.map((c) => j[c][1]));
  const ax = m.anchor ? j[m.anchor][0] : 0;
  const ox = -ax + (pose.dx ?? 0);
  const oy = -groundY - (pose.lift ?? 0);
  const out = {} as Joints;
  for (const k of Object.keys(j) as JointName[]) out[k] = [j[k][0] + ox, j[k][1] + oy];
  return { joints: out, pose };
}

/** Габариты движения за весь цикл — чтобы вписать в кадр. */
export function bounds(m: Move, samples = 48) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < samples; i++) {
    const { joints } = place(m, i / samples);
    for (const k of ALL_JOINTS) {
      const [x, y] = joints[k];
      const r = k === 'head' ? L.headR : 4;
      x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r);
      y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r);
    }
  }
  return { x0, x1, y0, y1: Math.max(y1, 0) };
}

// ——— обратная кинематика для авторинга поз ———

const deg = (r: number) => (r * 180) / Math.PI;

/** Двухзвенник: из начала в точку (dx, dy). bend = 1 — сустав «вперёд» (колено), -1 — «назад» (локоть). */
export function ik2(dx: number, dy: number, l1: number, l2: number, bend: 1 | -1): [number, number] {
  let d = Math.hypot(dx, dy);
  d = Math.min(d, l1 + l2 - 0.01);
  d = Math.max(d, Math.abs(l1 - l2) + 0.01);
  const th = deg(Math.atan2(dx, dy));
  const c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const al = deg(Math.acos(Math.max(-1, Math.min(1, c))));
  const a1 = th + bend * al;
  const jx = l1 * Math.sin(rad(a1));
  const jy = l1 * Math.cos(rad(a1));
  return [a1, deg(Math.atan2(dx - jx, dy - jy))];
}

/** Дотянуть конечность до точки (координаты fk: таз в 0,0, y вниз). */
export function reach(p: Pose, view: View, limb: 'aN' | 'aF' | 'lN' | 'lF', target: Vec, bend: 1 | -1): Pose {
  const j = fk(p, view);
  const base = limb === 'aN' ? j.shoulderN : limb === 'aF' ? j.shoulderF : limb === 'lN' ? j.hipN : j.hipF;
  const arm = limb[0] === 'a';
  const [a1, a2] = ik2(target[0] - base[0], target[1] - base[1], arm ? L.upper : L.thigh, arm ? L.fore : L.shin, bend);
  if (arm) return { ...p, [limb]: [a1, a2] };
  const foot = (p[limb as 'lN' | 'lF'])[2];
  return { ...p, [limb]: [a1, a2, foot] };
}

/** Повернуть позу заранее, чтобы y(a) - y(b) = dy (обе опоры на полу при dy = 0). */
export function leveled(p: Pose, view: View, a: JointName, b: JointName): Pose {
  return levelPose(p, view, a, b);
}
