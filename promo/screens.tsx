import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Today } from '../src/screens/Today';
import { Exercises } from '../src/screens/Exercises';
import { Progress } from '../src/screens/Progress';
import { Workout } from '../src/screens/Workout';
import Calories from '../src/features/calories/CaloriesScreen';
import Widget from '../src/widget/Widget';
import { ForkKnife, Lightning, PersonSimpleTaiChi, Pulse } from '@phosphor-icons/react';
import { addDays, dateKey, getState, update, workoutFor } from '../src/lib/store';
import '../src/styles/global.css';
import '../src/app/app.css';

// Demo history belongs only to Remotion's isolated render origin.
const demo = { ...getState(), startDate: dateKey(addDays(new Date(), -14)), visits: [] as string[], sessions: {} as ReturnType<typeof getState>['sessions'] };
for (let i = 10; i >= 1; i--) { const date = addDays(new Date(), -i); const key = dateKey(date); demo.visits.push(key); if (!workoutFor(date, demo).rest) demo.sessions[key] = { date: key, workoutId: workoutFor(date, demo).id, finishedAt: date.getTime(), seconds: 1500, blocksDone: 25, blocksTotal: 25 }; }
update(() => demo);
const labels = ['Сегодня', 'Упражнения', 'Прогресс', 'Калории'];
const icons = [Lightning, PersonSimpleTaiChi, Pulse, ForkKnife];
function Screen({ index }: { index: number }) {
  if (index === 5) return <Widget />;
  if (index === 4) return <Workout />;
  return <div className="shell" style={{ background: 'var(--bg)' }}><div className="titlebar" /><nav className="rail"><div className="rail__brand"><span className="dot rail__streak">10</span><span className="rail__streak-label">серия</span></div><div className="rail__items">{labels.map((label, i) => { const Icon = icons[i]; return <div key={label} className="rail__item" style={{ color: i === index ? 'var(--accent)' : undefined }}><Icon size={22} weight={i === index ? 'fill' : 'regular'} className="rail__icon" /><span className="rail__label">{label}</span></div>; })}</div></nav><main className="stage"><div className="stage__inner">{index === 0 ? <Today /> : index === 1 ? <Exercises id="squat" /> : index === 2 ? <Progress /> : <Calories />}</div></main></div>;
}
registerRoot(() => <>{['Today', 'Exercises', 'Progress', 'Calories', 'Workout', 'Widget'].map((name, index) => <Composition key={name} id={`Screen${name}`} component={Screen} defaultProps={{ index }} durationInFrames={60} fps={30} width={index === 5 ? 340 : 1440} height={index === 5 ? 300 : 900} />)}</>);
