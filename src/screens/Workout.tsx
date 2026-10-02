import { ArrowLeft, ArrowRight, Check, Pause, Play, Plus, SpeakerHigh, SpeakerSlash, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExerciseAnimation } from '../anim/ExerciseAnimation';
import { go } from '../app/router';
import { exerciseById } from '../data/exercises';
import { fmtTime, plural } from '../lib/labels';
import { buildSteps, PHASE_RU, type Step, type WorkStep } from '../lib/session';
import * as sfx from '../lib/sound';
import { CREDIT, getState, recordSession, setSound, streak, todayWorkout, useAppState } from '../lib/store';
import { Button, ProgressRing } from '../ui';
import './workout.css';

type Mode = 'ready' | 'run' | 'done';

export function Workout() {
  const s = useAppState();
  const w = useMemo(() => todayWorkout(), []);
  const steps = useMemo(() => buildSteps(w, getState().level), [w]);
  const [mode, setMode] = useState<Mode>('ready');
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(3);        // секунды на таймере текущего шага
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);  // чистое время
  const [extra, setExtra] = useState(0);      // добавленный отдых
  const startStreak = useRef(streak());
  const completed = useRef(new Set<number>()); // выполненные подходы: «Сделал» или таймер дошёл до нуля

  const step = steps[i];
  const timed = step && (step.type === 'rest' || step.seconds !== undefined);
  const stepTotal = step ? (step.type === 'rest' ? step.seconds + extra : step.seconds ?? 0) : 0;

  const finishAll = useCallback(() => {
    const works = steps.filter((x) => x.type === 'work').length;
    recordSession({ workoutId: w.id, seconds: elapsed, blocksDone: completed.current.size, blocksTotal: works });
    sfx.finish();
    setMode('done');
  }, [steps, w.id, elapsed]);

  /** Шаг выполнен честно — запоминаем и идём дальше. */
  const complete = useCallback((n: number) => {
    if (steps[n]?.type === 'work') completed.current.add(n);
  }, [steps]);

  const goTo = useCallback((n: number) => {
    if (n >= steps.length) { finishAll(); return; }
    const next = steps[Math.max(0, n)];
    setI(Math.max(0, n));
    setExtra(0);
    setLeft(next.type === 'rest' ? next.seconds : next.seconds ?? 0);
    if (next.type === 'work') sfx.go();
  }, [steps, finishAll]);

  // часы: интервал только считает, переходы — в отдельном эффекте
  useEffect(() => {
    if (paused || mode === 'done') return;
    const t = window.setInterval(() => {
      if (mode === 'run') setElapsed((x) => x + 1);
      if (mode === 'ready' || timed) setLeft((v) => Math.max(0, v - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [paused, mode, timed]);

  useEffect(() => {
    if (paused) return;
    if (mode === 'ready') {
      if (left === 0) { setMode('run'); goTo(0); } else sfx.tick();
      return;
    }
    if (mode === 'run' && timed) {
      if (left === 0) { complete(i); goTo(i + 1); }
      else if (left <= 3) sfx.tick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, paused]);

  // клавиатура
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { exit(); return; }
      if (mode !== 'run') return;
      if (e.code === 'Space') { e.preventDefault(); if (step?.type === 'work' && !timed) { complete(i); goTo(i + 1); } else setPaused((p) => !p); }
      if (e.key === 'ArrowRight') goTo(i + 1);
      if (e.key === 'ArrowLeft') goTo(i - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const exit = () => {
    if (mode === 'run' && i > 0 && !window.confirm('Выйти из тренировки? Прогресс этой тренировки не сохранится.')) return;
    go('/today');
  };

  const nextWork = steps.slice(i + 1).find((x): x is WorkStep => x.type === 'work');
  const workIndex = steps.slice(0, i + 1).filter((x) => x.type === 'work').length;
  const workTotal = steps.filter((x) => x.type === 'work').length;

  if (mode === 'done') {
    return <Finished seconds={elapsed} works={completed.current.size} total={workTotal} before={startStreak.current} title={w.title} />;
  }

  const shown: WorkStep | undefined = mode === 'ready' ? (steps.find((x) => x.type === 'work') as WorkStep) : step?.type === 'work' ? step : nextWork;
  const e = shown ? exerciseById[shown.exerciseId] : undefined;
  const isRest = mode === 'run' && step?.type === 'rest';

  return (
    <div className="wo">
      <header className="wo__bar">
        <Button variant="ghost" icon onClick={exit} aria-label="Закрыть"><X size={20} /></Button>
        <Segments steps={steps} i={mode === 'ready' ? -1 : i} />
        <span className="mono wo__clock">{fmtTime(elapsed)}</span>
        <Button variant="ghost" icon onClick={() => setSound(!s.sound)} aria-label="Звук">
          {s.sound ? <SpeakerHigh size={20} /> : <SpeakerSlash size={20} />}
        </Button>
      </header>

      <div className="wo__body">
        <div className={`wo__stage${isRest ? ' wo__stage--rest' : ''}`}>
          {e && <ExerciseAnimation id={e.id} playing={!paused} />}
          {isRest && <span className="wo__next-cap">Дальше</span>}
        </div>

        <div className="wo__panel">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode + i}
              className="wo__info"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            >
              {mode === 'ready' && (
                <>
                  <span className="wo__phase">Приготовьтесь</span>
                  <h1 className="display wo__name">{e?.name}</h1>
                  <div className="wo__big"><span className="dot">{left}</span></div>
                  <p className="muted">{w.title}. {workTotal} {plural(workTotal, 'подход', 'подхода', 'подходов')}</p>
                </>
              )}

              {mode === 'run' && step?.type === 'work' && e && (
                <>
                  <span className="wo__phase">
                    {PHASE_RU[step.phase]}
                    <span className="faint"> · подход {step.set} из {step.sets}{step.side ? (step.side === 'right' ? ', правая сторона' : ', левая сторона') : ''}</span>
                  </span>
                  <h1 className="display wo__name">{e.name}</h1>
                  {timed ? (
                    <div className="wo__big">
                      <ProgressRing value={left / Math.max(1, stepTotal)} size={220} stroke={5}>
                        <span className="dot wo__count">{left}</span>
                      </ProgressRing>
                    </div>
                  ) : (
                    <div className="wo__big wo__big--reps">
                      <span className="dot wo__count">{step.reps}</span>
                      <span className="wo__unit">{plural(step.reps ?? 0, 'повтор', 'повтора', 'повторов')}</span>
                    </div>
                  )}
                  <ol className="wo__cues">
                    {e.steps.slice(0, 3).map((c, k) => <li key={k}>{c}</li>)}
                  </ol>
                  <p className="wo__breath faint">{e.breathing}</p>
                </>
              )}

              {isRest && step.type === 'rest' && (
                <>
                  <span className="wo__phase">Отдых</span>
                  <div className="wo__big">
                    <ProgressRing value={left / Math.max(1, stepTotal)} size={220} stroke={5}>
                      <span className="dot wo__count">{left}</span>
                    </ProgressRing>
                  </div>
                  {nextWork && e && (
                    <p className="wo__upnext">
                      <span className="faint">Дальше</span> {e.name}
                      <span className="mono"> {nextWork.reps ? `× ${nextWork.reps}` : `${nextWork.seconds} с`}</span>
                    </p>
                  )}
                  <Button size="sm" onClick={() => { setExtra((x) => x + 15); setLeft((l) => l + 15); }}><Plus size={14} /> 15 с</Button>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {mode === 'run' && (
            <div className="wo__controls">
              <Button icon size="lg" onClick={() => goTo(i - 1)} disabled={i === 0} aria-label="Назад"><ArrowLeft size={20} /></Button>
              {step?.type === 'work' && !timed ? (
                <Button variant="primary" size="lg" className="wo__main" onClick={() => { complete(i); goTo(i + 1); }}>
                  <Check size={18} weight="bold" /> Сделал
                </Button>
              ) : (
                <Button size="lg" className="wo__main" onClick={() => setPaused((p) => !p)}>
                  {paused ? <><Play size={18} weight="fill" /> Продолжить</> : <><Pause size={18} weight="fill" /> Пауза</>}
                </Button>
              )}
              <Button icon size="lg" onClick={() => goTo(i + 1)} aria-label="Дальше"><ArrowRight size={20} /></Button>
            </div>
          )}
          {mode === 'run' && <p className="wo__hint faint">{workIndex} из {workTotal} · пробел, стрелки, Esc</p>}
        </div>
      </div>
    </div>
  );
}

function Segments({ steps, i }: { steps: Step[]; i: number }) {
  return (
    <div className="seg-bar">
      {steps.map((s, k) => s.type === 'work' && (
        <span key={k} className="seg-bar__s" data-state={k < i ? 'done' : k === i ? 'now' : undefined} />
      ))}
    </div>
  );
}

function Finished({ seconds, works, total, before, title }: { seconds: number; works: number; total: number; before: number; title: string }) {
  const after = streak();
  const ok = works / Math.max(1, total) >= CREDIT;
  const [shown, setShown] = useState(before);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(after), 650);
    return () => window.clearTimeout(t);
  }, [after]);
  return (
    <div className="fin">
      <motion.div className="fin__inner" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
        <span className="wo__phase">{title}</span>
        <h1 className="display fin__title">{ok ? 'Тренировка закрыта' : 'Не засчитано'}</h1>
        {!ok && <p className="muted">Выполнено {works} из {total} подходов. Для зачёта нужно от {Math.ceil(total * CREDIT)}: пропуски стрелкой не считаются.</p>}
        <div className="fin__streak">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={shown}
              className="dot"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.6, bounce: 0.25 }}
            >
              {String(shown).padStart(2, '0')}
            </motion.span>
          </AnimatePresence>
        </div>
        <p className="fin__cap">{plural(after, 'день', 'дня', 'дней')} подряд</p>
        <div className="fin__stats">
          <span><span className="mono">{fmtTime(seconds)}</span> <span className="faint">время</span></span>
          <span><span className="mono">{works}/{total}</span> <span className="faint">подходов</span></span>
        </div>
        <Button variant="primary" size="lg" onClick={() => go('/today')}>Готово</Button>
      </motion.div>
    </div>
  );
}
