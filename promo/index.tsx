import React from 'react';
import { AbsoluteFill, Composition, Img, interpolate, registerRoot, useCurrentFrame } from 'remotion';
import '@fontsource-variable/geist';
import '@fontsource-variable/unbounded';
import today from './screens/today.png';
import exercises from './screens/exercises.png';
import workout from './screens/workout.png';
import progress from './screens/progress.png';
import calories from './screens/calories.png';
const scenes = [
  { image: today, title: 'План на сегодня' },
  { image: exercises, title: 'Техника каждого движения' },
  { image: workout, title: 'Подходы, таймер и отдых' },
  { image: progress, title: 'Серия и история тренировок' },
  { image: calories, title: 'Калории и дневник питания' },
];
function TrenerPromo() {
  const frame = useCurrentFrame();
  const scene = scenes[Math.min(scenes.length - 1, Math.floor(frame / 60))];
  const opacity = interpolate(frame % 60, [0, 7, 53, 59], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: '#0d0e0d', color: '#eceee8', fontFamily: 'Geist Variable, sans-serif', padding: 40 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 50 }}><strong style={{ fontFamily: 'Unbounded Variable, sans-serif', fontSize: 26 }}>Trener</strong><span style={{ color: '#ff5b2e', fontSize: 23 }}>{scene.title}</span></header>
    <div style={{ position: 'absolute', left: 40, top: 110, width: 1200, height: 750, borderRadius: 12, overflow: 'hidden', border: '1px solid #2a2e2a', opacity }}><Img src={scene.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
  </AbsoluteFill>;
}
registerRoot(() => <Composition id="TrenerPromo" component={TrenerPromo} durationInFrames={300} fps={30} width={1280} height={900} />);
