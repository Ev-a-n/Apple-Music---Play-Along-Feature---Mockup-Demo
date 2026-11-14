// The playhead position, kept out of React state so that only the parts of
// the screen that depend on it update while a song plays.
import { useSyncExternalStore } from 'react';

let now = 0;
const listeners = new Set<() => void>();

export const time = {
  get: () => now,
  set(t: number) {
    if (t === now) return;
    now = t;
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

/** Re-render only when the selected value changes (return a primitive). */
export function useTime<T>(select: (t: number) => T): T {
  return useSyncExternalStore(time.subscribe, () => select(now));
}
