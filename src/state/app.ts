// App state for stage 2: which screen, which song, menu open. Audio comes later.
import { useSyncExternalStore } from 'react';
import type { GuideKey } from '../copy';
import { songs } from '../songs';

export interface AppState {
  screen: 'nowPlaying' | 'playAlong';
  songIndex: number;
  menuOpen: boolean;
  playing: boolean;
  guide: Partial<Record<GuideKey, boolean>>;
}

const initial = (): AppState => ({ screen: 'nowPlaying', songIndex: 0, menuOpen: false, playing: false, guide: {} });
let state = initial();
const listeners = new Set<() => void>();
const set = (patch: Partial<AppState>) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};

export const actions = {
  setMenu: (menuOpen: boolean) => set({ menuOpen }),
  openPlayAlong: () => set({ screen: 'playAlong', menuOpen: false, guide: { ...state.guide, menu: true } }),
  closePlayAlong: () => set({ screen: 'nowPlaying' }),
  togglePlay: () => set({ playing: !state.playing }),
  changeSong: (step: number) => set({ songIndex: Math.max(0, Math.min(songs.length - 1, state.songIndex + step)) }),
  tick: (key: GuideKey) => !state.guide[key] && set({ guide: { ...state.guide, [key]: true } }),
  restartPrototype: () => set(initial()),
};

export function useApp(): AppState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );
}
