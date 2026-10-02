// Read-only contract and tracker regression checks. Run with Node 22.13+.
import { stripTypeScriptTypes } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const uri = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const read = file => stripTypeScriptTypes(fs.readFileSync(file, 'utf8'));
const exerciseURI = uri(read('src/data/exercises.ts'));
const programURI = uri(read('src/data/program.ts').replace('./exercises', exerciseURI));
const rigURI = uri(read('src/anim/rig.ts'));
const movesURI = uri(read('src/anim/moves.ts').replaceAll('./rig', rigURI));
const modelURI = uri(read('src/features/calories/model.ts'));
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const storeURI = uri(read('src/lib/store.ts').replace("'react'", JSON.stringify(import.meta.resolve('react'))).replace('../data/program', programURI).replace('../data/exercises', exerciseURI));
const [ex, p, rig, moves, model, store] = await Promise.all([exerciseURI, programURI, rigURI, movesURI, modelURI, storeURI].map(url => import(url)));
assert.equal(ex.exercises.length, 34);
assert.equal(p.program.weeks.length, 8);
const used = new Set();
for (const week of p.program.weeks) {
  assert.equal(week.length, 7);
  for (const day of week) for (const block of [...day.warmup, ...day.main, ...day.cooldown]) {
    used.add(block.exerciseId);
    assert.ok(ex.exerciseById[block.exerciseId]);
    assert.equal(ex.exerciseById[block.exerciseId].kind === 'time', block.seconds !== undefined);
  }
}
assert.equal(used.size, 34);
for (const exercise of ex.exercises) {
  const move = moves.moves[exercise.id];
  assert.ok(move, exercise.id);
  for (let i = 0; i < 100; i++) assert.ok(Object.values(rig.place(move, i / 100).joints).flat().every(Number.isFinite), exercise.id);
}
assert.equal(model.calculate({ ...model.defaultProfile, age: 30, height: 180, weight: 80, activity: 1.2 }).bmr, 1780);
assert.equal(model.calculate({ ...model.defaultProfile, age: 17 }), null);
assert.equal(store.credited({ blocksTotal: 10, blocksDone: 0 }), false);
assert.equal(store.credited({ blocksTotal: 10, blocksDone: 6 }), true);
const session = date => ({ date, workoutId: 'w1d1', seconds: 120, blocksDone: 10, blocksTotal: 10, finishedAt: 1 });
const historical = { ...store.getState(), startDate: '2026-09-14', visits: ['2026-09-20'], sessions: { '2026-09-19': session('2026-09-19'), '2026-09-21': session('2026-09-21') } };
assert.equal(store.bestStreak(historical), 3, 'Historical series includes Sunday recovery + visit');
console.log('PASS: exercise/program contracts, 3400 poses, calories, skipped-session credit, historical recovery series');
