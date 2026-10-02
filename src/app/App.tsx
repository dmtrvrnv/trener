import { ForkKnife, Lightning, PersonSimpleTaiChi, Pulse } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { markVisit, useAppState, streak } from '../lib/store';
import { Today } from '../screens/Today';
import { Exercises } from '../screens/Exercises';
import { Progress } from '../screens/Progress';
import { Workout } from '../screens/Workout';
import { go, useRoute } from './router';
import './app.css';

// Экраны Codex подключаются, если файл уже есть: сборка не падает, пока его нет.
const optional = (mods: Record<string, () => Promise<unknown>>) => {
  const loader = Object.values(mods)[0];
  return loader ? lazy(loader as () => Promise<{ default: ComponentType }>) : null;
};
const Calories = optional(import.meta.glob('../features/calories/CaloriesScreen.tsx'));

const NAV = [
  { id: 'today', label: 'Сегодня', Icon: Lightning },
  { id: 'exercises', label: 'Упражнения', Icon: PersonSimpleTaiChi },
  { id: 'progress', label: 'Прогресс', Icon: Pulse },
  { id: 'calories', label: 'Калории', Icon: ForkKnife },
] as const;

export function App() {
  const route = useRoute();
  const s = useAppState();
  const section = route.parts[0] ?? 'today';

  useEffect(() => {
    markVisit();
    // приложение может висеть открытым через полночь
    const t = window.setInterval(() => markVisit(), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // виджет открывает «/today?start=1» — сразу запускаем тренировку
  useEffect(() => {
    if (route.query.get('start') === '1') go('/play');
  }, [route]);

  if (section === 'play') return <Workout />;

  let screen;
  if (section === 'exercises') screen = <Exercises id={route.parts[1]} />;
  else if (section === 'progress') screen = <Progress />;
  else if (section === 'calories') screen = Calories ? <Calories /> : <Placeholder text="Калькулятор калорий скоро появится" />;
  else screen = <Today />;

  const st = streak(s);

  return (
    <div className="shell">
      <div className="titlebar" />
      <nav className="rail">
        <div className="rail__brand" aria-label="Trener">
          <span className="dot rail__streak" title="Серия дней">{String(st).padStart(2, '0')}</span>
          <span className="rail__streak-label">серия</span>
        </div>
        <div className="rail__items">
          {NAV.map(({ id, label, Icon }) => {
            const on = section === id;
            return (
              <button key={id} type="button" className="rail__item" aria-current={on ? 'page' : undefined} onClick={() => go(`/${id}`)}>
                {on && <motion.span layoutId="rail-pill" className="rail__pill" transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }} />}
                <Icon size={22} weight={on ? 'fill' : 'regular'} className="rail__icon" />
                <span className="rail__label">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <main className="stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={section}
            className="stage__inner"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <Suspense fallback={null}>{screen}</Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return <div className="placeholder muted">{text}</div>;
}
