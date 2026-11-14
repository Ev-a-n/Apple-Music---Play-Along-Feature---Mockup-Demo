// App state for stage 3: screens, songs and Play Along settings (no audio yet).
import { useSyncExternalStore } from 'react';
import type { GuideKey } from '../copy';
import { songs, type LyricLine, type Song } from '../songs';

export interface SongSettings {
  loopStart: number;
  loopEnd: number;
  loopOn: boolean;
  /** Whole percent, 50–100. */
  speed: number;
  /** Whole percent, 0–100. */
  vocals: number;
}
export interface AppState {
  screen: 'nowPlaying' | 'playAlong';
  songIndex: number;
  menuOpen: boolean;
  playing: boolean;
  loading: boolean;
  vocalsAvailable: boolean;
  duration: number;
  settings: SongSettings;
  airplay: number;
  guide: Partial<Record<GuideKey, boolean>>;
}

const defaults = (song: Song): SongSettings => ({ loopStart: song.defaultLoop.start, loopEnd: song.defaultLoop.end, loopOn: true, speed: 100, vocals: 100 });
const initial = (): AppState => ({
  screen: 'nowPlaying', songIndex: 0, menuOpen: false, playing: false, loading: false, vocalsAvailable: true,
  duration: songs[0].duration, settings: defaults(songs[0]), airplay: 0, guide: {},
});
let state = initial();
const listeners = new Set<() => void>();
const set = (patch: Partial<AppState>) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};
const setSettings = (patch: Partial<SongSettings>) => set({ settings: { ...state.settings, ...patch } });

export const actions = {
  setMenu: (menuOpen: boolean) => set({ menuOpen }),
  openPlayAlong: () => set({ screen: 'playAlong', menuOpen: false, guide: { ...state.guide, menu: true } }),
  closePlayAlong: () => set({ screen: 'nowPlaying' }),
  togglePlay: () => set({ playing: !state.playing }),
  changeSong(step: number) {
    const songIndex = Math.max(0, Math.min(songs.length - 1, state.songIndex + step));
    if (songIndex !== state.songIndex) set({ songIndex, duration: songs[songIndex].duration, settings: defaults(songs[songIndex]) });
  },
  setLoop: (loopStart: number, loopEnd: number) => setSettings({ loopStart, loopEnd }),
  toggleLoop: () => setSettings({ loopOn: !state.settings.loopOn }),
  setSpeed: (speed: number) => setSettings({ speed }),
  setVocals: (vocals: number) => setSettings({ vocals }),
  tapLyric: (_line: LyricLine) => {},
  restartLoop: () => {},
  nextSection: () => {},
  setAirplay: (airplay: number) => set({ airplay }),
  tick: (key: GuideKey) => {
    if (!state.guide[key]) set({ guide: { ...state.guide, [key]: true } });
  },
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
