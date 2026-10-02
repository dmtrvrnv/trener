import { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { moves } from './moves';
import { bounds, L, place, type JointName, type Joints, type Move, type Vec } from './rig';

export const CHRONO_W = 800;
export const CHRONO_H = 600;
export const CHRONO_FPS = 30;

const C = {
  text: 'var(--text, #eceee8)',
  far: 'var(--text-3, #62675f)',
  line: 'var(--line, #2a2e2a)',
  line2: 'var(--line-2, #363b36)',
  accent: 'var(--accent, #ff5b2e)',
  bg: 'var(--bg, #0d0e0d)',
  surface: 'var(--surface-2, #1c1f1c)',
};

const GROUND = 468;

type Seg = [JointName, JointName];
const FAR_ARM: Seg[] = [['shoulderF', 'elbowF'], ['elbowF', 'wristF']];
const FAR_LEG: Seg[] = [['hipF', 'kneeF'], ['kneeF', 'ankleF'], ['ankleF', 'toeF']];
const NEAR_ARM: Seg[] = [['shoulderN', 'elbowN'], ['elbowN', 'wristN']];
const NEAR_LEG: Seg[] = [['hipN', 'kneeN'], ['kneeN', 'ankleN'], ['ankleN', 'toeN']];
const SPINE: Seg[] = [['pelvis', 'mid'], ['mid', 'neck']];
const GHOST: Seg[] = [...SPINE, ...NEAR_ARM, ...NEAR_LEG, ...FAR_LEG, ...FAR_ARM];

function camera(m: Move) {
  const b = bounds(m);
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  const s = Math.min(2.3, (CHRONO_W - 120) / w, (GROUND - 60) / h);
  const cx = (b.x0 + b.x1) / 2;
  // линии толстые: поднимаем фигуру на полтолщины, чтобы стопы и спина лежали на полу, а не в нём
  return { s, tx: (p: Vec): Vec => [CHRONO_W / 2 + (p[0] - cx) * s, GROUND - 6 + p[1] * s], b };
}

function path(j: Joints, segs: Seg[], tx: (p: Vec) => Vec) {
  return segs
    .map(([a, b]) => {
      const p = tx(j[a]);
      const q = tx(j[b]);
      return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
    })
    .join('');
}

function frontPelvis(j: Joints, tx: (p: Vec) => Vec) {
  const a = tx(j.hipN), b = tx(j.hipF), c = tx(j.shoulderN), d = tx(j.shoulderF);
  return `M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${c[0]} ${c[1]}L${d[0]} ${d[1]}`;
}

function propX(m: Move): number {
  if (!m.propAt) return 0;
  return place(m, 0).joints[m.propAt.joint][0] + m.propAt.dx;
}

function Prop({ m, tx, s }: { m: Move; tx: (p: Vec) => Vec; s: number }) {
  if (m.prop === 'wall') {
    const x = tx([propX(m), 0])[0];
    const right = m.propAt?.side === 'right';
    return (
      <g>
        <rect x={right ? x : x - 22} y={30} width={22} height={GROUND - 30} fill={C.surface} />
        <line x1={x} y1={30} x2={x} y2={GROUND} stroke={C.line2} strokeWidth={2} />
      </g>
    );
  }
  if (m.prop === 'chair') {
    const seat = 46 * s + 6;
    const cx = tx([propX(m), 0])[0];
    const w = 42 * s;
    const backX = m.propAt?.side === 'right' ? cx + w / 2 - 3 : cx - w / 2 + 3;
    return (
      <g stroke={C.line2} strokeWidth={4} strokeLinecap="round" fill="none">
        <line x1={cx - w / 2} y1={GROUND - seat} x2={cx + w / 2} y2={GROUND - seat} strokeWidth={7} />
        <line x1={cx - w / 2 + 5} y1={GROUND - seat} x2={cx - w / 2 + 5} y2={GROUND} />
        <line x1={cx + w / 2 - 5} y1={GROUND - seat} x2={cx + w / 2 - 5} y2={GROUND} />
        <line x1={backX} y1={GROUND - seat} x2={backX} y2={GROUND - seat - 44 * s} />
      </g>
    );
  }
  if (m.prop === 'mat') {
    return <rect x={60} y={GROUND + 1} width={CHRONO_W - 120} height={6} rx={3} fill={C.surface} />;
  }
  return null;
}

export function Chrono({ moveId, ghosts = 6, traces = true }: { moveId: string; ghosts?: number; traces?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = moves[moveId];
  const cam = useMemo(() => (m ? camera(m) : null), [m]);
  const tracePaths = useMemo(() => {
    if (!m || !cam || !traces) return [];
    return (m.traces ?? []).map((jn) => {
      const pts: string[] = [];
      for (let i = 0; i <= 72; i++) {
        const p = cam.tx(place(m, i / 72).joints[jn]);
        pts.push(`${p[0].toFixed(1)},${p[1].toFixed(1)}`);
      }
      return { jn, d: `M${pts.join('L')}` };
    });
  }, [m, cam, traces]);

  if (!m || !cam) {
    return <AbsoluteFill style={{ background: 'transparent' }} />;
  }
  const phase = frame / (m.period * fps);
  const now = place(m, phase);
  const tx = cam.tx;
  const sw = Math.max(5, 4 * cam.s);
  const head = tx(now.joints.head);

  const ticks = [];
  for (let x = 40; x < CHRONO_W - 30; x += 24) ticks.push(x);

  return (
    <AbsoluteFill style={{ background: 'transparent' }}>
      <svg viewBox={`0 0 ${CHRONO_W} ${CHRONO_H}`} width="100%" height="100%">
        {/* пол-линейка */}
        <line x1={24} y1={GROUND + 0.5} x2={CHRONO_W - 24} y2={GROUND + 0.5} stroke={C.line2} strokeWidth={1} />
        {ticks.map((x, i) => (
          <line key={x} x1={x} y1={GROUND + 6} x2={x} y2={GROUND + (i % 4 === 0 ? 16 : 10)} stroke={C.line} strokeWidth={1} />
        ))}
        <Prop m={m} tx={tx} s={cam.s} />

        {/* траектории суставов */}
        {tracePaths.map((t) => (
          <path key={t.jn} d={t.d} fill="none" stroke={C.accent} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="0.1 7" strokeLinecap="round" />
        ))}

        {/* хронофотография: тающие прошлые позы */}
        {Array.from({ length: ghosts }, (_, k) => {
          const g = place(m, phase - (k + 1) * 0.05);
          const op = 0.55 * Math.pow(1 - k / ghosts, 1.6);
          const gh = tx(g.joints.head);
          return (
            <g key={k} opacity={op} stroke={C.accent} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={path(g.joints, GHOST, tx)} strokeWidth={1.6} />
              <circle cx={gh[0]} cy={gh[1]} r={L.headR * cam.s} strokeWidth={1.6} />
            </g>
          );
        })}

        {/* сам персонаж */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={path(now.joints, [...FAR_ARM, ...FAR_LEG], tx)} stroke={C.far} strokeWidth={sw * 1.15} />
          {m.view === 'front' && <path d={frontPelvis(now.joints, tx)} stroke={C.text} strokeWidth={sw * 1.4} />}
          <path d={path(now.joints, SPINE, tx)} stroke={C.text} strokeWidth={sw * 1.9} />
          <path d={path(now.joints, [['neck', 'head']], tx)} stroke={C.text} strokeWidth={sw * 0.9} />
          <path d={path(now.joints, NEAR_LEG, tx)} stroke={C.text} strokeWidth={sw * 1.3} />
          <path d={path(now.joints, NEAR_ARM, tx)} stroke={C.text} strokeWidth={sw * 1.05} />
          <circle cx={head[0]} cy={head[1]} r={L.headR * cam.s} fill={C.text} />
        </g>
        {/* суставы с траекторией — точкой акцента */}
        {(m.traces ?? []).map((jn) => {
          const p = tx(now.joints[jn]);
          return <circle key={jn} cx={p[0]} cy={p[1]} r={sw * 0.55} fill={C.accent} stroke={C.bg} strokeWidth={2} />;
        })}
      </svg>
    </AbsoluteFill>
  );
}
