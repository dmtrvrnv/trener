import { ArrowDown, ArrowUp, Wind } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { ExerciseAnimation } from '../anim/ExerciseAnimation';
import { exerciseById, exercises } from '../data/exercises';
import type { Exercise } from '../data/types';
import { go } from '../app/router';
import { Chip, ToggleChip } from '../ui';
import { GROUPS, MUSCLE_RU, groupOf, LEVEL_RU, EQUIP_RU } from '../lib/labels';
import './exercises.css';

export function Exercises({ id }: { id?: string }) {
  const [group, setGroup] = useState<string>('all');
  const current = exerciseById[id ?? ''] ?? exercises[0];
  const visible = useMemo(
    () => exercises.filter((e) => group === 'all' || groupOf(e.id) === group),
    [group],
  );

  return (
    <div className="ex">
      <aside className="ex__list">
        <h1 className="display ex__title">Упражнения</h1>
        <div className="ex__filters">
          <ToggleChip on={group === 'all'} onClick={() => setGroup('all')}>Все {exercises.length}</ToggleChip>
          {GROUPS.map((g) => (
            <ToggleChip key={g.id} on={group === g.id} onClick={() => setGroup(g.id)}>{g.label}</ToggleChip>
          ))}
        </div>
        <ul className="ex__rows">
          {visible.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="ex__row"
                aria-current={e.id === current.id ? 'true' : undefined}
                onClick={() => go(`/exercises/${e.id}`)}
              >
                <span className="ex__row-name">{e.name}</span>
                <span className="ex__row-meta">{MUSCLE_RU[e.muscles[0]]}</span>
                <LevelBars level={e.level} />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="ex__detail">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="ex__detail-inner"
          >
            <ExerciseDetail e={current} />
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

export function LevelBars({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="lvl" aria-label={LEVEL_RU[level]} title={LEVEL_RU[level]}>
      {[1, 2, 3].map((i) => <i key={i} data-on={i <= level ? 'true' : undefined} />)}
    </span>
  );
}

export function ExerciseDetail({ e, compact }: { e: Exercise; compact?: boolean }) {
  const easier = e.easier ? exerciseById[e.easier] : undefined;
  const harder = e.harder ? exerciseById[e.harder] : undefined;
  return (
    <div className={compact ? 'exd exd--compact' : 'exd'}>
      <div className="exd__stage">
        <ExerciseAnimation id={e.id} />
      </div>
      <div className="exd__info">
        <div className="exd__head">
          <h2 className="display exd__name">{e.name}</h2>
          <p className="muted exd__short">{e.short}</p>
          <div className="exd__chips">
            {e.muscles.map((m, i) => <Chip key={m} accent={i === 0}>{MUSCLE_RU[m]}</Chip>)}
            <Chip>{LEVEL_RU[e.level]}</Chip>
            {e.equipment && <Chip>{EQUIP_RU[e.equipment]}</Chip>}
            {e.perSide && <Chip>на каждую сторону</Chip>}
          </div>
        </div>

        <div className="exd__cols">
          <div>
            <h3 className="exd__h">Как делать</h3>
            <ol className="exd__steps">
              {e.steps.map((s, i) => (
                <li key={i}><span className="mono exd__n">{i + 1}</span><span>{s}</span></li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="exd__h">Частые ошибки</h3>
            <ul className="exd__mistakes">
              {e.mistakes.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
            <p className="exd__breath"><Wind size={16} /> {e.breathing}</p>
            {(easier || harder) && !compact && (
              <div className="exd__vars">
                {easier && (
                  <button type="button" className="exd__var" onClick={() => go(`/exercises/${easier.id}`)}>
                    <ArrowDown size={14} /> <span className="faint">Проще</span> {easier.name}
                  </button>
                )}
                {harder && (
                  <button type="button" className="exd__var" onClick={() => go(`/exercises/${harder.id}`)}>
                    <ArrowUp size={14} /> <span className="faint">Сложнее</span> {harder.name}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
