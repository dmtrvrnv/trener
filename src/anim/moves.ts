import { fk, L, leveled, reach, swapSides, type JointName, type Key, type Move, type Pose, type Vec } from './rig';

// Углы: 0 вниз, 90 вперёд (персонаж смотрит вправо), 180 вверх, 270 назад.
// Во фронтальном виде N — правая для зрителя сторона, положительные углы уводят её наружу.

const STAND: Pose = { s1: 180, s2: 180, head: 180, aN: [6, 10], aF: [-6, -2], lN: [2, -2, 90], lF: [-2, -4, 90] };
const STAND_F: Pose = { s1: 180, s2: 180, head: 180, aN: [8, 5], aF: [-8, -5], lN: [4, 0, 90], lF: [-4, 0, -90] };
// на четвереньках: ладони под плечами, колени под тазом
const FOURS: Pose = { s1: 105, s2: 105, head: 100, aN: [0, 0], aF: [2, 2], lN: [0, -90, -90], lF: [2, -88, -90] };
// высокая планка (верх отжимания)
const PLANK_HI: Pose = leveled({ s1: 115, s2: 115, head: 118, aN: [0, 0], aF: [2, 2], lN: [-65, -65, -10], lF: [-65, -65, -10] }, 'side', 'wristN', 'toeN');
// лёжа на спине, колени согнуты, стопы на полу (голова слева)
const SUPINE_KNEES: Pose = { s1: 270, s2: 270, head: 238, aN: [90, 90], aF: [90, 90], lN: [135, 42, 90], lF: [133, 40, 90] };

const P = (base: Pose, o: Partial<Pose>): Pose => ({ ...base, ...o });
const FEET: JointName[] = ['ankleN', 'toeN', 'ankleF', 'toeF'];
const k = (t: number, pose: Pose, ease?: Key['ease']): Key => ({ t, pose, ease });
/** туда-обратно с задержкой в крайней точке */
const there = (a: Pose, b: Pose, hold = 0.1): Key[] => [k(0, a), k(0.5 - hold / 2, b), k(0.5 + hold / 2, b), k(1, a)];
/** То же, но поза считается функцией на каждом ключе (IK держит опору и в промежутке). */
const thereFn = (f: (u: number) => Pose, hold = 0.1, n = 8): Key[] => {
  const ease = (x: number) => 0.5 - Math.cos(Math.PI * x) / 2;
  const half = 0.5 - hold / 2;
  const out: Key[] = [];
  for (let i = 0; i <= n; i++) out.push(k((i / n) * half, f(ease(i / n)), 'linear'));
  for (let i = 0; i <= n; i++) out.push(k(0.5 + hold / 2 + (i / n) * half, f(ease(1 - i / n)), 'linear'));
  return out;
};

const list: Move[] = [];
const def = (m: Move) => list.push(m);

// ═════════ Разминка ═════════

{ // Прыжки с разведением рук
  const mid = P(STAND_F, { aN: [90, 96], aF: [-90, -96], lN: [10, 8, 90], lF: [-10, -8, -90], lift: 14 });
  const open = P(STAND_F, { aN: [158, 172], aF: [-158, -172], lN: [17, 15, 90], lF: [-17, -15, -90] });
  def({ id: 'jumping-jacks', view: 'front', period: 1.4, contacts: FEET, anchor: 'pelvis', traces: ['wristN', 'wristF'],
    keys: [k(0, STAND_F), k(0.25, mid, 'out'), k(0.5, open, 'in'), k(0.75, mid, 'out'), k(1, STAND_F, 'in')] });
}

{ // Круги руками: руки в стороны, кисти описывают небольшие круги
  const keys: Key[] = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const u = 92 + Math.sin(a) * 9, f = 92 + Math.sin(a + 0.9) * 16;
    keys.push(k(i / n, P(STAND_F, { aN: [u, f], aF: [-u, -f] }), 'linear'));
  }
  def({ id: 'arm-circles', view: 'front', period: 1.6, contacts: FEET, anchor: 'pelvis', traces: ['wristN', 'wristF'], keys });
}

{ // Круги тазом: стопы на месте, таз ходит по кругу, руки на поясе
  const base = P(STAND_F, { aN: [25, -40], aF: [-25, 40] });
  const j0 = fk(base, 'front');
  const keys: Key[] = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ox = Math.cos(a) * 8;
    const oy = Math.sin(a) * 1.5 + 1; // колени чуть мягкие
    let p = P(base, { s1: 180 + ox * 0.9, s2: 180 - ox * 0.5, head: 180 - ox * 0.3 });
    p = reach(p, 'front', 'lN', [j0.ankleN[0] - ox, j0.ankleN[1] - oy], 1);
    p = reach(p, 'front', 'lF', [j0.ankleF[0] - ox, j0.ankleF[1] - oy], -1);
    keys.push(k(i / n, p, 'linear'));
  }
  def({ id: 'hip-circles', view: 'front', period: 3.2, contacts: FEET, anchor: 'ankleN', traces: ['pelvis'], keys });
}

{ // Подъём коленей: бег/шаг на месте
  const a = P(STAND, { aN: [0, 90], aF: [0, 90], lN: [0, -5, 90], lF: [0, -5, 90] });
  const b = P(STAND, { s1: 176, aN: [-35, 55], aF: [40, 130], lN: [95, 5, 110], lF: [2, -2, 90] });
  def({ id: 'high-knees', view: 'side', period: 1.1, contacts: FEET, anchor: 'pelvis', traces: ['kneeN'], mirror: true,
    keys: [k(0, a), k(0.5, b), k(1, a)] });
}

{ // Кошка-корова
  const cat = P(FOURS, { s1: 125, s2: 85, head: 40 });
  const cow = P(FOURS, { s1: 92, s2: 120, head: 145 });
  def({ id: 'cat-cow', view: 'side', period: 5, contacts: ['wristN', 'kneeN', 'ankleN'], anchor: 'kneeN', traces: ['mid'], prop: 'mat',
    keys: [k(0, cat), k(0.4, cow), k(0.6, cow), k(1, cat)] });
}

{ // Шагающая планка
  let fold: Pose = { s1: 40, s2: 20, head: 15, aN: [20, 20], aF: [22, 22], lN: [12, -8, 90], lF: [12, -8, 90] };
  {
    const j = fk(fold, 'side');
    fold = reach(fold, 'side', 'aN', [j.ankleN[0] + 24, j.ankleN[1]], 1);
    fold = reach(fold, 'side', 'aF', [j.ankleN[0] + 26, j.ankleN[1]], 1);
  }
  def({ id: 'inchworm', view: 'side', period: 6.5, contacts: [...FEET, 'wristN'], anchor: 'ankleN', traces: ['wristN', 'pelvis'], prop: 'mat',
    keys: [k(0, STAND), k(0.2, fold), k(0.45, PLANK_HI), k(0.58, PLANK_HI), k(0.82, fold), k(1, STAND)] });
}

{ // Махи ногой: опора на дальней ноге, рука держится за опору
  const back = P(STAND, { s1: 182, aN: [75, 85], lN: [-30, -24, 70], lF: [4, -6, 90] });
  const fwd = P(STAND, { s1: 176, aN: [75, 85], lN: [62, 55, 110], lF: [4, -6, 90] });
  def({ id: 'leg-swings', view: 'side', period: 1.8, contacts: ['ankleF', 'toeF'], anchor: 'ankleF', traces: ['ankleN'],
    keys: [k(0, back), k(0.5, fwd), k(1, back)] });
}

// ═════════ Ноги ═════════

{ // Приседания
  const top = P(STAND, { aN: [30, 40], aF: [26, 36] });
  const bottom = P(STAND, { s1: 140, s2: 148, head: 160, aN: [95, 92], aF: [92, 90], lN: [78, -28, 90], lF: [80, -26, 90] });
  def({ id: 'squat', view: 'side', period: 3.2, contacts: FEET, anchor: 'ankleN', traces: ['pelvis', 'kneeN'], keys: there(top, bottom) });
}

{ // Приседания сумо: широкая стойка, руки у груди
  const arms = { aN: [15, -126] as [number, number], aF: [-15, 126] as [number, number] };
  const top = P(STAND_F, { ...arms, lN: [25, 22, 90], lF: [-25, -22, -90] });
  const bottom = P(STAND_F, { ...arms, lN: [62, -8, 90], lF: [-62, 8, -90] });
  def({ id: 'sumo-squat', view: 'front', period: 3.2, contacts: FEET, anchor: 'pelvis', traces: ['pelvis', 'kneeN'], keys: there(top, bottom) });
}

{ // Выпады назад
  const hands = { aN: [-25, 40] as [number, number], aF: [-20, 45] as [number, number] };
  const top = P(STAND, hands);
  const bottom = P(STAND, { ...hands, s1: 178, lN: [85, 0, 90], lF: [-25, -95, 40] });
  def({ id: 'reverse-lunge', view: 'side', period: 3.4, contacts: ['ankleN', 'toeN'], anchor: 'ankleN', traces: ['kneeF', 'pelvis'], keys: there(top, bottom) });
}

{ // Ягодичный мост
  const up: Pose = { s1: 295, s2: 292, head: 228, aN: [90, 90], aF: [90, 90], lN: [115, 10, 90], lF: [113, 8, 90] };
  def({ id: 'glute-bridge', view: 'side', period: 3, contacts: ['shoulderN', 'ankleN', 'pelvis'], anchor: 'ankleN', level: ['shoulderN', 'ankleN'], traces: ['pelvis'], prop: 'mat',
    keys: there(SUPINE_KNEES, up, 0.2) });
}

{ // Стульчик у стены
  const a: Pose = { s1: 180, s2: 180, head: 180, aN: [40, 85], aF: [38, 82], lN: [90, 0, 90], lF: [90, 2, 90] };
  const b = P(a, { s1: 179, s2: 178, head: 178 });
  def({ id: 'wall-sit', view: 'side', period: 4, contacts: FEET, anchor: 'pelvis', traces: ['kneeN'], prop: 'wall', propAt: { joint: 'pelvis', dx: -9, side: 'left' },
    keys: [k(0, a), k(0.5, b), k(1, a)] });
}

{ // Подъём на носки
  const up = P(STAND, { lN: [0, 0, 40], lF: [0, 0, 40] });
  def({ id: 'calf-raise', view: 'side', period: 2.4, contacts: FEET, anchor: 'toeN', traces: ['ankleN'], keys: there(STAND, up, 0.16) });
}

{ // Приседание с прыжком
  const bottom = P(STAND, { s1: 140, s2: 148, head: 160, aN: [-30, -10], aF: [-28, -8], lN: [78, -28, 90], lF: [80, -26, 90] });
  const air = P(STAND, { aN: [165, 172], aF: [160, 168], lN: [0, -2, 30], lF: [-3, -5, 30], lift: 46 });
  const land = P(STAND, { s1: 165, s2: 170, aN: [60, 70], aF: [55, 65], lN: [30, -12, 90], lF: [32, -10, 90] });
  def({ id: 'squat-jump', view: 'side', period: 2.2, contacts: FEET, anchor: 'ankleN', traces: ['pelvis'],
    keys: [k(0, bottom), k(0.24, air, 'out'), k(0.46, land, 'in'), k(0.72, bottom), k(1, bottom)] });
}

// ═════════ Верх ═════════

/**
 * Отжимания как шарнир: опора (носки или колени) прибита к полу, прямой корпус поворачивается
 * вокруг неё на угол elev над полом, ладони стоят на месте, локти сгибаются по IK назад к ногам.
 */
function hingePush(pivot: 'toeN' | 'kneeN', legs: (body: number) => Pick<Pose, 'lN' | 'lF'>) {
  const build = (body: number): Pose => ({ s1: body, s2: body, head: body + 4, aN: [0, 0], aF: [0, 0], ...legs(body) });
  const rel = (body: number) => { const j = fk(build(body), 'side'); return { j, dx: j.shoulderN[0] - j[pivot][0], dy: j[pivot][1] - j.shoulderN[1] }; };
  // угол корпуса, при котором плечи на высоте h над опорой
  const solve = (h: number) => {
    let lo = 90, hi = 150;
    for (let n = 0; n < 40; n++) { const m = (lo + hi) / 2; if (rel(m).dy < h) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  const topBody = solve(L.upper + L.fore - 1);   // руки почти прямые и вертикальные
  const handX = rel(topBody).dx;                  // ладони под плечами в верхней точке
  const bottomBody = solve(13);                   // грудь у пола
  return (u: number): Pose => {
    let p = build(topBody + (bottomBody - topBody) * u);
    const { j } = rel(p.s1);
    const hand: Vec = [j[pivot][0] + handX, j[pivot][1]];
    p = reach(p, 'side', 'aN', hand, -1);
    p = reach(p, 'side', 'aF', [hand[0] + 1, hand[1]], -1);
    return p;
  };
}

{ // Отжимания: опора на носки
  const f = hingePush('toeN', (b) => ({ lN: [b - 180, b - 180, b - 130], lF: [b - 180, b - 180, b - 130] }));
  def({ id: 'pushup', view: 'side', period: 2.6, contacts: ['wristN', 'toeN'], anchor: 'wristN', traces: ['neck', 'elbowN'], prop: 'mat',
    keys: thereFn(f) });
}

{ // Отжимания с колен: колени на месте, голени лежат приподнятыми, двигается только корпус
  const f = hingePush('kneeN', (b) => ({ lN: [b - 180, -112, -112], lF: [b - 180, -110, -110] }));
  def({ id: 'knee-pushup', view: 'side', period: 2.6, contacts: ['wristN', 'kneeN'], anchor: 'wristN', traces: ['neck', 'elbowN'], prop: 'mat',
    keys: thereFn(f) });
}

{ // Отжимания от стены: ладони на стене на высоте груди
  const lean = (phi: number) => {
    let p: Pose = { s1: phi, s2: phi, head: phi + 4, aN: [90, 90], aF: [90, 90], lN: [phi - 180, phi - 180, 90], lF: [phi - 180, phi - 180, 90] };
    const j = fk(p, 'side');
    const target: Vec = [j.ankleN[0] + 96, j.ankleN[1] - 116];
    p = reach(p, 'side', 'aN', target, -1);
    p = reach(p, 'side', 'aF', [target[0], target[1] - 2], -1);
    return p;
  };
  def({ id: 'incline-pushup', view: 'side', period: 2.6, contacts: FEET, anchor: 'ankleN', traces: ['neck', 'elbowN'], prop: 'wall', propAt: { joint: 'wristN', dx: 4, side: 'right' },
    keys: thereFn((u) => lean(160 - 13 * u)) });
}

{ // Отжимания уголком (пайк): таз высоко, голова опускается между ладонями
  const pike = (a: number, head: number, H: number, hand: number, foot: number): Pose => {
    let p: Pose = { s1: a, s2: a - 4, head, aN: [a, a], aF: [a, a], lN: [-30, -30, -30], lF: [-30, -30, -30] };
    p = reach(p, 'side', 'aN', [hand, H], 1);
    p = reach(p, 'side', 'aF', [hand + 2, H], 1);
    p = reach(p, 'side', 'lN', [foot, H], 1);
    p = reach(p, 'side', 'lF', [foot - 2, H], 1);
    return p;
  };
  def({ id: 'pike-pushup', view: 'side', period: 2.8, contacts: ['wristN', 'toeN', 'ankleN'], anchor: 'wristN', traces: ['head'], prop: 'mat',
    keys: there(pike(48, 40, 70, 78, -44.6), pike(47, 28, 58, 78.5, -44)) });
}

{ // Обратные отжимания от стула: стул позади, таз опускается вниз
  const dip = (H: number): Pose => {
    let p: Pose = { s1: 176, s2: 178, head: 180, aN: [-5, -5], aF: [-5, -5], lN: [70, 0, 90], lF: [70, 0, 90] };
    p = reach(p, 'side', 'lN', [44, H], 1);
    p = reach(p, 'side', 'lF', [46, H], 1);
    p = reach(p, 'side', 'aN', [-7, H - 46], -1);
    p = reach(p, 'side', 'aF', [-9, H - 46], -1);
    return p;
  };
  def({ id: 'chair-dips', view: 'side', period: 2.8, contacts: FEET, anchor: 'ankleN', traces: ['pelvis', 'elbowN'], prop: 'chair', propAt: { joint: 'wristN', dx: -15, side: 'left' },
    keys: thereFn((u) => dip(53 - 25 * u)) });
}

{ // Супермен: лёжа на животе
  const down: Pose = { s1: 90, s2: 90, head: 112, aN: [90, 90], aF: [90, 90], lN: [-90, -90, -90], lF: [-90, -90, -90] };
  const up: Pose = { s1: 94, s2: 103, head: 108, aN: [104, 106], aF: [102, 104], lN: [-99, -99, -96], lF: [-98, -98, -95] };
  def({ id: 'superman', view: 'side', period: 3, contacts: ['pelvis'], anchor: 'pelvis', traces: ['wristN', 'ankleN'], prop: 'mat', keys: there(down, up, 0.2) });
}

// ═════════ Кор ═════════

{ // Планка на предплечьях
  const a: Pose = { s1: 102, s2: 102, head: 104, aN: [0, 90], aF: [2, 92], lN: [-78, -78, -10], lF: [-78, -78, -10] };
  const b = P(a, { s1: 101, s2: 103, head: 106 });
  def({ id: 'plank', view: 'side', period: 4, contacts: ['elbowN', 'toeN'], anchor: 'elbowN', level: ['elbowN', 'toeN'], traces: ['pelvis'], prop: 'mat',
    keys: [k(0, a), k(0.5, b), k(1, a)] });
}

{ // Боковая планка (вид спереди): опора на нижний локоть, верхняя рука вверх
  const up: Pose = { s1: 110, s2: 110, head: 114, aN: [0, 90], aF: [180, 180], lN: [-70, -70, 20], lF: [-70, -70, 20] };
  const down: Pose = { s1: 99, s2: 105, head: 110, aN: [0, 90], aF: [172, 172], lN: [-81, -81, 10], lF: [-81, -81, 10] };
  def({ id: 'side-plank', view: 'front', period: 3.6, contacts: ['elbowN', 'ankleN'], anchor: 'elbowN', level: ['elbowN', 'ankleN'], traces: ['pelvis'], prop: 'mat',
    keys: there(up, down, 0.16) });
}

{ // Скалолаз: колени по очереди к груди
  const b0 = PLANK_HI.s1;
  const a: Pose = { ...PLANK_HI, lN: [b0 - 100, b0 - 215, b0 - 140] };
  const b = swapSides(a, 'side');
  def({ id: 'mountain-climbers', view: 'side', period: 1.2, contacts: ['wristN', 'toeN', 'toeF'], anchor: 'wristN', traces: ['kneeN'], mirror: true, prop: 'mat',
    keys: [k(0, a), k(1, b)] });
}

{ // Скручивания: руки скрещены на груди, поднимаются лопатки
  const down = P(SUPINE_KNEES, { aN: [100, 248], aF: [96, 244] });
  const up = P(SUPINE_KNEES, { s2: 235, head: 215, aN: [65, 213], aF: [61, 209] });
  def({ id: 'crunch', view: 'side', period: 2.6, contacts: ['pelvis', 'ankleN'], anchor: 'ankleN', traces: ['neck'], prop: 'mat', keys: there(down, up, 0.12) });
}

{ // Велосипед
  const a: Pose = { s1: 270, s2: 240, head: 225, aN: [215, 130], aF: [210, 125], lN: [200, 100, 190], lF: [105, 105, 195] };
  def({ id: 'bicycle-crunch', view: 'side', period: 2, contacts: ['pelvis', 'mid'], anchor: 'pelvis', traces: ['kneeN'], mirror: true, prop: 'mat',
    keys: [k(0, a), k(1, swapSides(a, 'side'))] });
}

{ // Подъёмы ног лёжа
  const up: Pose = { s1: 270, s2: 270, head: 238, aN: [92, 90], aF: [92, 90], lN: [178, 168, 255], lF: [180, 170, 257] };
  const down = P(up, { lN: [110, 100, 190], lF: [112, 102, 192] });
  def({ id: 'leg-raises', view: 'side', period: 3.6, contacts: ['pelvis', 'shoulderN'], anchor: 'pelvis', traces: ['ankleN'], prop: 'mat', keys: there(up, down, 0.1) });
}

{ // Мёртвый жук: противоположные рука и нога
  const table: Pose = { s1: 270, s2: 270, head: 238, aN: [180, 180], aF: [180, 180], lN: [180, 90, 180], lF: [180, 90, 180] };
  const ext = P(table, { aN: [258, 262], lF: [102, 102, 188] });
  def({ id: 'dead-bug', view: 'side', period: 4, contacts: ['pelvis', 'shoulderN', 'mid'], anchor: 'pelvis', traces: ['wristN', 'ankleF'], mirror: true, prop: 'mat',
    keys: [k(0, table), k(0.4, ext), k(0.6, ext), k(1, table)] });
}

{ // Птица-собака
  const ext = P(FOURS, { aN: [96, 96], lF: [-96, -96, -90] });
  def({ id: 'bird-dog', view: 'side', period: 4.6, contacts: ['wristN', 'wristF', 'kneeN', 'kneeF'], anchor: 'pelvis', traces: ['wristN', 'ankleF'], mirror: true, prop: 'mat',
    keys: [k(0, FOURS), k(0.4, ext), k(0.6, ext), k(1, FOURS)] });
}

// ═════════ Кардио ═════════

{ // Бёрпи (шагом, с подъёмом на носки)
  let sq: Pose = { s1: 130, s2: 128, head: 120, aN: [10, 10], aF: [10, 10], lN: [100, -40, 90], lF: [100, -38, 90] };
  sq = reach(sq, 'side', 'aN', [34, 24], -1);
  sq = reach(sq, 'side', 'aF', [36, 24], -1);
  const up = P(STAND, { aN: [170, 175], aF: [165, 172], lN: [0, 0, 40], lF: [0, 0, 40] });
  def({ id: 'burpee', view: 'side', period: 5, contacts: [...FEET, 'wristN', 'wristF'], anchor: 'wristN', traces: ['pelvis'], prop: 'mat',
    keys: [k(0, STAND), k(0.15, sq), k(0.32, PLANK_HI), k(0.44, PLANK_HI), k(0.6, sq), k(0.76, STAND), k(0.87, up), k(1, STAND)] });
}

{ // Конькобежец (вид спереди)
  const land = P(STAND_F, { s1: 172, s2: 175, head: 176, aN: [-28, -40], aF: [-62, -70], lN: [14, -8, 90], lF: [34, 62, 100], dx: 40 });
  const air = P(STAND_F, { aN: [6, 4], aF: [-6, -4], lN: [8, 4, 90], lF: [-8, -4, -90], lift: 16 });
  def({ id: 'skater-jumps', view: 'front', period: 2.4, contacts: FEET, traces: ['pelvis'], mirror: true,
    keys: [k(0, swapSides(land, 'front')), k(0.5, air, 'out'), k(1, land, 'in')] });
}

// ═════════ Заминка ═════════

{ // Поза ребёнка
  const a: Pose = { s1: 62, s2: 76, head: 92, aN: [88, 90], aF: [86, 88], lN: [62, -90, -90], lF: [62, -90, -90] };
  const b = P(a, { s1: 67, s2: 82, head: 96 });
  def({ id: 'childs-pose', view: 'side', period: 5, contacts: ['kneeN', 'ankleN', 'wristN'], anchor: 'kneeN', traces: ['mid'], prop: 'mat',
    keys: [k(0, a), k(0.5, b), k(1, a)] });
}

{ // Кобра: таз и ноги на полу, грудь поднимается на согнутых руках
  const pose = (s1: number, s2: number, head: number, bend: 1 | -1): Pose => {
    let p: Pose = { s1, s2, head, aN: [0, 0], aF: [0, 0], lN: [-90, -90, -90], lF: [-90, -90, -90] };
    const j = fk(p, 'side');
    p = reach(p, 'side', 'aN', [j.mid[0] + 20, 0], bend);
    p = reach(p, 'side', 'aF', [j.mid[0] + 22, 0], bend);
    return p;
  };
  def({ id: 'cobra-stretch', view: 'side', period: 5, contacts: ['pelvis', 'ankleN'], anchor: 'pelvis', traces: ['neck'], prop: 'mat',
    keys: there(pose(92, 92, 112, 1), pose(110, 128, 150, -1), 0.24) });
}

{ // Растяжка задней поверхности бедра сидя
  const sit: Pose = { s1: 172, s2: 176, head: 178, aN: [40, 60], aF: [38, 58], lN: [90, 92, 180], lF: [86, -93, 180] };
  const fold: Pose = { s1: 125, s2: 112, head: 108, aN: [96, 92], aF: [94, 90], lN: [90, 92, 180], lF: [86, -93, 180] };
  def({ id: 'hamstring-stretch', view: 'side', period: 6, contacts: ['pelvis', 'ankleN'], anchor: 'pelvis', traces: ['neck'], prop: 'mat', keys: there(sit, fold, 0.3) });
}

{ // Растяжка передней поверхности бедра стоя
  const pose = (knee: number, s: number): Pose => {
    let p: Pose = P(STAND, { s1: s, s2: s, aF: [80, 86], lN: [knee, 205, 290], lF: [2, -4, 90] });
    const j = fk(p, 'side');
    p = reach(p, 'side', 'aN', [j.ankleN[0] - 2, j.ankleN[1] + 2], -1);
    return p;
  };
  def({ id: 'quad-stretch', view: 'side', period: 5, contacts: ['ankleF', 'toeF'], anchor: 'ankleF', traces: ['kneeN'],
    keys: there(pose(-8, 178), pose(-16, 174), 0.3) });
}

export const moves: Record<string, Move> = Object.fromEntries(list.map((m) => [m.id, m]));
export const moveIds = list.map((m) => m.id);
