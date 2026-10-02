import { getState } from './store';

let ctx: AudioContext | null = null;

/** Короткий тон: обратный отсчёт и смена шага. */
export function beep(freq = 880, ms = 90, gain = 0.08) {
  if (!getState().sound) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
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
export const go = () => beep(1046, 160, 0.09);
export const finish = () => {
  beep(784, 140);
  setTimeout(() => beep(988, 140), 150);
  setTimeout(() => beep(1318, 260), 300);
};
