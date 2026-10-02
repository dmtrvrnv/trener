import { useSyncExternalStore } from 'react';

export interface Route {
  path: string;                 // '/today', '/exercises/squat'
  parts: string[];              // ['exercises', 'squat']
  query: URLSearchParams;
}

const read = (): string => window.location.hash.replace(/^#/, '') || '/today';

let cached = read();
let route = parse(cached);

function parse(raw: string): Route {
  const [path, qs = ''] = raw.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(qs) };
}

const subs = new Set<() => void>();
window.addEventListener('hashchange', () => {
  cached = read();
  route = parse(cached);
  subs.forEach((s) => s());
});

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb); },
    () => route,
  );
}

export function go(path: string) {
  if (read() !== path) window.location.hash = path;
}
