import { ArrowCounterClockwise, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { exerciseById } from '../data/exercises';
import { program } from '../data/program';
import { fmtTime, plural } from '../lib/labels';
import {
  addDays, bestStreak, dateKey, markFor, parseKey, restartProgram, setSound, streak, totals, useAppState, visitStreak, weekday, workoutFor,
} from '../lib/store';
import { Button, Panel, Stat } from '../ui';
import './progress.css';

const WEEKS = 53;
const MONTH = new Intl.DateTimeFormat('ru-RU', { month: 'short' });
const DAY = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });

export function Progress() {
  const s = useAppState();
  const t = totals(s);
  const st = streak(s);

  const grid = useMemo(() => {
    const now = new Date();
    const start = addDays(now, -weekday(now) - (WEEKS - 1) * 7);
    const cols: { key: string; state: ReturnType<typeof markFor>; future: boolean; rest: boolean }[][] = [];
    const months: { col: number; label: string }[] = [];
    for (let c = 0; c < WEEKS; c++) {
      const col = [];
      for (let r = 0; r < 7; r++) {
        const d = addDays(start, c * 7 + r);
        const key = dateKey(d);
        if (r === 0 && d.getDate() <= 7) months.push({ col: c, label: MONTH.format(d).replace('.', '') });
        col.push({ key, state: markFor(key, s), future: d > now, rest: Boolean(workoutFor(d, s).rest) });
      }
      cols.push(col);
    }
    return { cols, months };
  }, [s]);

  const recent = Object.values(s.sessions).sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 8);

  return (
    <div className="screen prog">
      <header className="screen__head">
        <h1 className="display screen__title">Прогресс</h1>
      </header>

      <section className="prog__hero">
        <div className="prog__big">
          <span className="dot prog__num">{String(st).padStart(2, '0')}</span>
          <span className="prog__cap">{plural(st, 'день', 'дня', 'дней')} подряд с тренировкой</span>
        </div>
        <div className="prog__stats">
          <Stat label="лучшая серия" value={bestStreak(s)} unit={plural(bestStreak(s), 'день', 'дня', 'дней')} />
          <Stat label="заходов подряд" value={visitStreak(s)} />
          <Stat label="тренировок" value={t.workouts} />
          <Stat label="минут в движении" value={t.minutes} />
          <Stat label="дней с заходом" value={t.visits} />
        </div>
      </section>

      <Panel className="heat">
        <div className="heat__head">
          <h3 className="heat__h">Год</h3>
          <div className="heat__legend">
            <span><i data-state="none" /> не заходил</span>
            <span><i data-state="visit" /> заходил</span>
            <span><i data-state="done" /> тренировка</span>
          </div>
        </div>
        <div className="heat__months" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
          {grid.months.map((m) => <span key={m.col} style={{ gridColumn: m.col + 1 }}>{m.label}</span>)}
        </div>
        <div className="heat__grid" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
          {grid.cols.map((col, c) => (
            <div key={c} className="heat__col">
              {col.map((d) => (
                <span
                  key={d.key}
                  className="heat__cell"
                  data-state={d.future ? 'future' : d.state}
                  data-today={d.key === dateKey() ? 'true' : undefined}
                  title={`${DAY.format(parseKey(d.key))}${d.state === 'done' ? ': тренировка' : d.state === 'visit' ? ': заход' : ''}`}
                />
              ))}
            </div>
          ))}
        </div>
        <p className="heat__note faint">Заход отмечается сам, когда открываешь приложение. Тренировка засчитывается, если выполнено от 60% подходов (пропуски стрелкой не считаются). В дни восстановления хватает захода, чтобы серия не прервалась.</p>
      </Panel>

      <section className="prog__cols">
        <div>
          <h3 className="prog__h">Последние тренировки</h3>
          {recent.length === 0 ? (
            <p className="muted prog__empty">Пока пусто. Первая тренировка появится здесь сразу после финиша.</p>
          ) : (
            <ul className="hist">
              {recent.map((r) => {
                const day = program.weeks.flat().find((d) => d.id === r.workoutId);
                const first = day?.main[0] ? exerciseById[day.main[0].exerciseId]?.name : undefined;
                return (
                  <li key={r.date} className="hist__row">
                    <span className="hist__d">{DAY.format(parseKey(r.date))}</span>
                    <span className="hist__t">{day?.title ?? 'Тренировка'}{first ? <span className="faint">, {first.toLowerCase()}…</span> : null}</span>
                    <span className="mono hist__m">{fmtTime(r.seconds)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div>
          <h3 className="prog__h">Настройки</h3>
          <div className="settings">
            <div className="settings__row">
              <span>Звуковые сигналы</span>
              <Button size="sm" onClick={() => setSound(!s.sound)}>
                {s.sound ? <><SpeakerHigh size={14} /> Включены</> : <><SpeakerSlash size={14} /> Выключены</>}
              </Button>
            </div>
            <div className="settings__row">
              <span>Программа с первой недели <span className="faint">(сейчас с {DAY.format(parseKey(s.startDate))})</span></span>
              <Button size="sm" onClick={() => { if (window.confirm('Начать программу заново с этой недели? Серия и история останутся.')) restartProgram(); }}>
                <ArrowCounterClockwise size={14} /> Сначала
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
