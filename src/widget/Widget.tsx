import { useEffect, useState } from 'react';
import { Play, X, Check } from '@phosphor-icons/react';
import { useAppState, todayWorkout, workoutMinutes, streak, isDoneToday, thisWeek } from '../lib/store';
import { Button } from '../ui';
import './widget.css';
type DesktopBridge = { openMain: (route?: string) => Promise<void>; hideWidget: () => Promise<void> };
const bridge = () => (window as Window & { trener?: DesktopBridge }).trener;
export default function Widget() {
  useAppState();
  const [, tick] = useState(0);
  useEffect(() => { document.documentElement.classList.add('widget-mode'); const timer = window.setInterval(() => tick(value => value + 1), 30000); return () => { document.documentElement.classList.remove('widget-mode'); clearInterval(timer); }; }, []);
  const workout = todayWorkout(); const done = isDoneToday();
  return <aside className="desktop-widget"><header className="widget-drag"><span>Сегодня, {workoutMinutes(workout)} мин</span><button aria-label="Скрыть виджет" onClick={() => bridge()?.hideWidget()}><X size={16} /></button></header>
    <div className="widget-summary"><div className="widget-streak"><strong className="dot">{String(streak()).padStart(2, '0')}</strong><span>дней подряд</span></div><div className="widget-title"><h1>{workout.title}</h1>{workout.rest && <span>Лёгкий день</span>}</div></div>
    <div className="widget-week">{thisWeek().map(day => <div key={day.key} className={`${day.today ? 'current' : ''} ${day.state}`}><span>{day.label}</span><i>{day.state === 'done' ? <Check size={12} weight="bold" /> : ''}</i></div>)}</div>
    <footer>{done ? <span className="widget-done"><Check size={16} weight="bold" />Сегодня закрыто</span> : <Button variant="primary" onClick={() => bridge()?.openMain('/today?start=1')}><Play size={16} weight="fill" />Начать</Button>}</footer>
  </aside>;
}
