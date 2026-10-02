import { moves, moveIds } from './moves';
import { bounds, place, type JointName } from './rig';

const SEGS: [JointName, JointName][] = [
  ['pelvis', 'mid'], ['mid', 'neck'], ['neck', 'head'],
  ['shoulderN', 'elbowN'], ['elbowN', 'wristN'], ['shoulderF', 'elbowF'], ['elbowF', 'wristF'],
  ['hipN', 'kneeN'], ['kneeN', 'ankleN'], ['ankleN', 'toeN'], ['hipF', 'kneeF'], ['kneeF', 'ankleF'], ['ankleF', 'toeF'],
];

/** Отладка: все движения в нескольких фазах. Открыть #/dev */
export function DevSheet() {
  const phases = [0, 0.2, 0.4, 0.6, 0.8];
  return (
    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, height: '100%', overflow: 'auto' }}>
      {moveIds.map((id) => {
        const m = moves[id];
        const b = bounds(m);
        const w = b.x1 - b.x0 + 20, h = b.y1 - b.y0 + 20;
        return (
          <div key={id} style={{ border: '1px solid var(--line)', padding: 6 }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>{id}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {phases.map((ph) => {
                const { joints } = place(m, ph);
                return (
                  <svg key={ph} viewBox={`${b.x0 - 10} ${b.y0 - 10} ${w} ${h}`} width={86} height={72} style={{ background: 'var(--surface)' }}>
                    <line x1={b.x0 - 10} y1={0} x2={b.x1 + 10} y2={0} stroke="var(--line-2)" strokeWidth={1} />
                    {SEGS.map(([a, c], i) => (
                      <line key={i} x1={joints[a][0]} y1={joints[a][1]} x2={joints[c][0]} y2={joints[c][1]}
                        stroke={a.endsWith('F') || c.endsWith('F') ? '#666' : '#eee'} strokeWidth={4} strokeLinecap="round" />
                    ))}
                    <circle cx={joints.head[0]} cy={joints.head[1]} r={11} fill="#eee" />
                  </svg>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
