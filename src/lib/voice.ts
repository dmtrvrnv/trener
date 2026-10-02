import { useSyncExternalStore } from 'react';

/**
 * Голосовые команды офлайн: Vosk (WASM) с маленькой русской моделью и коротким словарём.
 * Ничего не уходит в интернет, микрофон слушается только пока включено голосовое управление.
 */

export type VoiceCommand = 'pause' | 'resume' | 'done' | 'next' | 'prev' | 'more' | 'start';
export type VoiceStatus = 'off' | 'loading' | 'listening' | 'error';

const WORDS: Record<VoiceCommand, string[]> = {
  pause: ['стоп', 'пауза', 'подожди'],
  resume: ['продолжить', 'продолжай', 'поехали'],
  done: ['готово', 'сделал', 'сделала'],
  next: ['дальше', 'следующее', 'пропустить'],
  prev: ['назад'],
  more: ['ещё', 'плюс', 'добавь'],
  start: ['начать', 'начинаем', 'старт'],
};
export const VOICE_HELP: { cmd: VoiceCommand; say: string; what: string }[] = [
  { cmd: 'pause', say: 'стоп / пауза', what: 'пауза' },
  { cmd: 'resume', say: 'продолжить / поехали', what: 'снять паузу' },
  { cmd: 'done', say: 'готово / сделал', what: 'подход выполнен' },
  { cmd: 'next', say: 'дальше', what: 'следующий шаг' },
  { cmd: 'prev', say: 'назад', what: 'предыдущий шаг' },
  { cmd: 'more', say: 'ещё', what: '+15 с отдыха' },
  { cmd: 'start', say: 'начать', what: 'запустить тренировку' },
];

const lookup = new Map<string, VoiceCommand>();
for (const [cmd, ws] of Object.entries(WORDS) as [VoiceCommand, string[]][]) for (const w of ws) lookup.set(w, cmd);

// ——— состояние ———
type Snap = { status: VoiceStatus; error: string; heard: { cmd: VoiceCommand; word: string; at: number } | null };
let status: VoiceStatus = 'off';
let error = '';
let heard: Snap['heard'] = null;
const subs = new Set<() => void>();
const set = (s: VoiceStatus, e = '') => { status = s; error = e; snapshot = { status, error, heard }; subs.forEach((f) => f()); };
let snapshot: Snap = { status, error, heard };

const handlers = new Set<(cmd: VoiceCommand) => void>();
/** Подписка экрана на команды. */
export function onVoice(fn: (cmd: VoiceCommand) => void) {
  handlers.add(fn);
  return () => { handlers.delete(fn); };
}

/** Разослать команду экранам (распознаватель и проверки зовут одно и то же). */
export function emitVoice(cmd: VoiceCommand, word: string = cmd) {
  heard = { cmd, word, at: Date.now() };
  snapshot = { status, error, heard };
  subs.forEach((f) => f());
  handlers.forEach((h) => h(cmd));
}

export function useVoice() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => snapshot);
}

// ——— движок ———
type Running = { stop: () => void };
let running: Running | null = null;
let modelPromise: Promise<import('vosk-browser').Model> | null = null;

function modelUrl() {
  return new URL('models/vosk-ru.tar.gz', window.location.href.split('#')[0]).href;
}

async function loadModel() {
  const { createModel } = await import('vosk-browser');
  modelPromise ??= createModel(modelUrl(), -1);
  return modelPromise;
}

export async function startVoice() {
  if (running || status === 'loading') return;
  set('loading');
  try {
    const [model, stream] = await Promise.all([
      loadModel(),
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 }, video: false }),
    ]);
    const ctx = new AudioContext();
    const grammar = JSON.stringify([...lookup.keys(), '[unk]']);
    const rec = new model.KaldiRecognizer(ctx.sampleRate, grammar);
    let last = 0;
    const fire = (text: string) => {
      const word = text.trim().split(/\s+/).reverse().find((w) => lookup.has(w));
      if (!word) return;
      const now = Date.now();
      if (now - last < 900) return; // одно слово — одна команда
      last = now;
      emitVoice(lookup.get(word)!, word);
    };
    // частичный результат приходит раньше финального — реагируем на него, чтобы не ждать паузы в речи
    rec.on('partialresult', (m) => fire((m as { result: { partial: string } }).result.partial ?? ''));
    rec.on('result', (m) => { fire((m as { result: { text: string } }).result.text ?? ''); last = 0; });

    const src = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    node.onaudioprocess = (e) => { try { rec.acceptWaveform(e.inputBuffer); } catch { /* пропускаем кадр */ } };
    src.connect(node);
    node.connect(ctx.destination);
    running = {
      stop: () => {
        node.disconnect(); src.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        rec.remove();
        void ctx.close();
      },
    };
    set('listening');
  } catch (e) {
    running = null;
    const msg = e instanceof DOMException && e.name === 'NotAllowedError'
      ? 'Нет доступа к микрофону'
      : e instanceof DOMException && e.name === 'NotFoundError' ? 'Микрофон не найден' : 'Не удалось запустить распознавание';
    set('error', msg);
  }
}

export function stopVoice() {
  running?.stop();
  running = null;
  set('off');
}

/** Для проверки без микрофона: прогнать готовый звук через тот же словарь. */
export async function recognizeSamples(samples: Float32Array, sampleRate: number): Promise<string> {
  const model = await loadModel();
  const rec = new model.KaldiRecognizer(sampleRate, JSON.stringify([...lookup.keys(), '[unk]']));
  return new Promise((resolve) => {
    let text = '';
    rec.on('result', (m) => { text += ' ' + ((m as { result: { text: string } }).result.text ?? ''); });
    const chunk = 4096;
    for (let i = 0; i < samples.length; i += chunk) rec.acceptWaveformFloat(samples.subarray(i, i + chunk), sampleRate);
    rec.retrieveFinalResult();
    setTimeout(() => { rec.remove(); resolve(text.trim()); }, 1500);
  });
}
