import { ArrowRight, Check, Play } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { ExerciseAnimation } from '../anim/ExerciseAnimation';
import { go } from '../app/router';
import { exerciseById } from '../data/exercises';
import { program } from '../data/program';
import type { Block, WorkoutDay } from '../data/types';
import { MUSCLE_RU, plural } from '../lib/labels';
import {
  blockSeconds, isDoneToday, workoutMinutes, scaleBlock, setLevel, streak, thisWeek, todayWorkout, useAppState, visitStreak, weekIndex, type Level,
} from '../lib/store';
import { Button, Chip, Dots, Segmented } from '../ui';
import './today.css';

const DAY_FMT = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

export function prescription(b: Block) {
  const e = exerciseById[b.exerciseId];
  const side = e?.perSide ? ' на сторону' : '';
  const amount = b.seconds ? `${b.seconds} с` : b.sets > 1 ? `${b.reps}` : `${b.reps} ${plural(b.reps ?? 0, 'раз', 'раза', 'раз')}`;
  return b.sets > 1 ? `${b.sets} × ${amount}${side}` : `${amount}${side}`;
}

export function Today() {
  const s = useAppState();
  const w = todayWorkout();
  const done = isDoneToday(s);
  const st = streak(s);
  const vs = visitStreak(s);
  const week = thisWeek(s);
  const scaled = (bs: Block[]) => bs.map((b) => scaleBlock(b, s.level));
  const sections = [
    { id: 'warmup', label: 'Разминка', blocks: scaled(w.warmup) },
    { id: 'main', label: w.rest ? 'Подвижность' : 'Основная часть', blocks: scaled(w.main) },
    { id: 'cooldown', label: 'Заминка', blocks: scaled(w.cooldown) },
  ].filter((x) => x.blocks.length);
  const all = sections.flatMap((x) => x.blocks);
  const total = all.reduce((a, b) => a + blockSeconds(b), 0);
  const hero = (w.main[0] ?? all[0])?.exerciseId;
  const wi = weekIndex();

  return (
    <div className="screen today">
      <header className="today__top">
        <div className="today__date">
          <span className="today__weekday">{DAY_FMT.format(new Date())}</span>
          <span className="faint">неделя {wi + 1} из {program.weeks.length}</span>
        </div>
        <Segmented<Level>
          value={s.level}
          onChange={setLevel}
          options={[{ value: 'easy', label: 'Легче' }, { value: 'normal', label: 'Норма' }, { value: 'hard', label: 'Тяжелее' }]}
        />
      </header>

      <section className="today__hero">
        <div className="today__intro">
          <span className="chip chip--accent today__kind">{w.rest ? 'лёгкий день' : 'тренировка дня'}</span>
          <h1 className="display today__title">{w.title}</h1>
          <div className="today__meta">
            <Meta value={workoutMinutes(w, s.level)} unit="мин" />
            <Meta value={all.length} unit={plural(all.length, 'упражнение', 'упражнения', 'упражнений')} />
            <Meta value={all.reduce((a, b) => a + b.sets, 0)} unit={plural(all.reduce((a, b) => a + b.sets, 0), 'подход', 'подхода', 'подходов')} />
          </div>
          <div className="today__focus">
            {w.focus.map((m) => <Chip key={m}>{MUSCLE_RU[m]}</Chip>)}
          </div>
          <div className="today__cta">
            {done ? (
              <>
                <span className="today__done"><Check size={18} weight="bold" /> Сегодня закрыто</span>
                <Button onClick={() => go('/play')}>Ещё раз</Button>
              </>
            ) : (
              <>
                <Button variant="primary" size="lg" onClick={() => go('/play')}>
                  <Play size={18} weight="fill" /> Начать
                </Button>
                {s.voice && <span className="faint">или скажите «начать»</span>}
              </>
            )}
          </div>
        </div>
        <div className="today__stage">
          {hero && <ExerciseAnimation id={hero} />}
          {hero && <span className="today__stage-cap faint">{exerciseById[hero]?.name}</span>}
        </div>
      </section>

      <section className="today__grid">
        <div className="today__plan">
          <Timeline sections={sections} total={total} />
          {sections.map((sec) => (
            <div key={sec.id} className="plan">
              <h3 className="plan__h">{sec.label}</h3>
              <ol className="plan__list">
                {sec.blocks.map((b, i) => {
                  const e = exerciseById[b.exerciseId];
                  return (
                    <li key={i}>
                      <button type="button" className="plan__row" onClick={() => go(`/exercises/${b.exerciseId}`)}>
                        <span className="plan__name">{e?.name ?? b.exerciseId}</span>
                        <span className="mono plan__rx">{prescription(b)}</span>
                        <span className="plan__rest faint">{b.sets > 1 || sec.id === 'main' ? `отдых ${b.restSec} с` : ''}</span>
                        <ArrowRight size={14} className="plan__go" />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>

        <aside className="today__side">
          <div className="streak">
            <div className="streak__num">
              <motion.span key={st} className="dot" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}>
                {String(st).padStart(2, '0')}
              </motion.span>
            </div>
            <div className="streak__txt">
              <span>{plural(st, 'день', 'дня', 'дней')} подряд с тренировкой</span>
              <span className="faint">заходов подряд: {vs}</span>
            </div>
          </div>
          <Dots days={week.map((d) => ({ label: d.label, state: d.state, today: d.today }))} />
          <WeekPlan days={week.map((d) => d.workout)} todayIndex={week.findIndex((d) => d.today)} />
        </aside>
      </section>
    </div>
  );
}

function Meta({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="meta">
      <span className="mono meta__v">{value}</span>
      <span className="meta__u">{unit}</span>
    </span>
  );
}

function Timeline({ sections, total }: { sections: { id: string; label: string; blocks: Block[] }[]; total: number }) {
  return (
    <div className="tl" aria-hidden>
      {sections.flatMap((sec) =>
        sec.blocks.map((b, i) => {
          const sec2 = blockSeconds(b);
          return <span key={sec.id + i} className="tl__seg" data-kind={sec.id} style={{ flexGrow: sec2 / total }} />;
        }),
      )}
    </div>
  );
}

function WeekPlan({ days, todayIndex }: { days: WorkoutDay[]; todayIndex: number }) {
  const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  return (
    <ul className="wp">
      {days.map((d, i) => (
        <li key={i} className="wp__row" data-today={i === todayIndex ? 'true' : undefined}>
          <span className="wp__d">{names[i]}</span>
          <span className="wp__t">{d.title}</span>
          <span className="mono wp__m">{workoutMinutes(d)}′</span>
        </li>
      ))}
    </ul>
  );
}
