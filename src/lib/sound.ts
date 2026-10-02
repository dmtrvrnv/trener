import { getState } from './store';

let ctx: AudioContext | null = null;

/** Короткий тон: обратный отсчёт и смена шага. */
export function beep(freq = 880, ms = 90, gain = 0.08, type: OscillatorType = 'sine') {
  if (!getState().sound) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + ms / 1000 + 0.02);
  } catch {
    /* без звука */
  }
}

export const tick = () => beep(660, 70, 0.06);
/** Начало подхода: высокий длинный тон. */
export const go = () => beep(1046, 220, 0.09);
/** Конец подхода (третий сигнал): яркий двойной аккорд вниз, не спутать с отсчётом. */
export const end = () => {
  beep(1046, 90, 0.1, 'triangle');
  setTimeout(() => beep(1568, 480, 0.12, 'triangle'), 90);
};
/** Команда голосом услышана: тихий короткий щелчок. */
export const heard = () => beep(1320, 40, 0.04);
export const finish = () => {
  beep(784, 140);
  setTimeout(() => beep(988, 140), 150);
  setTimeout(() => beep(1318, 260), 300);
};
