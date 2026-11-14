// The one place that ties screens, songs, settings and the audio engine together.
import { useSyncExternalStore } from 'react';
import { Engine } from '../audio/engine';
import { forgetFiles, releaseExcept, resolveSource } from '../audio/sources';
import { copy, type GuideKey } from '../copy';
import { songs, type LyricLine, type Song } from '../songs';
import { store, type SongSettings } from './store';
import { time } from './time';

export type { SongSettings };
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
  toast: { id: number; text: string } | null;
  tipsSeen: boolean;
  /** Click one bar before the loop starts again. */
  countIn: boolean;
  /** The beat being counted (1–4), or 0. */
  count: number;
  /** Pulse the More button until the menu has been opened once. */
  moreHint: boolean;
  guide: Partial<Record<GuideKey, boolean>>;
}

const MIN_LOOP = 2; // seconds
const LYRIC_PAIR_WINDOW = 4000; // ms in which a second lyric tap sets the loop end
const TOAST_MS = 4000;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const defaults = (song: Song): SongSettings => ({ loopStart: song.defaultLoop.start, loopEnd: song.defaultLoop.end, loopOn: true, speed: 100, vocals: 100 });
const settingsFor = (song: Song) => store.get(song.id) ?? defaults(song);
const initial = (): AppState => ({
  screen: 'nowPlaying', songIndex: 0, menuOpen: false, playing: false, loading: true, vocalsAvailable: true,
  duration: songs[0].duration, settings: settingsFor(songs[0]), airplay: 0, toast: null, tipsSeen: store.tipsSeen(), countIn: store.countIn(), count: 0, moreHint: true, guide: {},
});

let state = initial();
const listeners = new Set<() => void>();
const set = (patch: Partial<AppState>) => {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
};
const song = () => songs[state.songIndex];

const engine = new Engine();
engine.on('time', time.set);
engine.on('playing', (playing) => set({ playing }));
engine.on('count', (count) => set({ count }));

let toastTimer = 0;
let toastId = 0;
function toast(text: string) {
  clearTimeout(toastTimer);
  set({ toast: { id: ++toastId, text } });
  toastTimer = window.setTimeout(() => set({ toast: null }), TOAST_MS);
}

/** Play Along uses the song's own setup; Now Playing is always plain. */
function applyToEngine() {
  const s = state.settings;
  const practising = state.screen === 'playAlong';
  engine.setRate(practising ? s.speed / 100 : 1);
  engine.setVocals(practising && state.vocalsAvailable ? s.vocals / 100 : 1);
  engine.setLoop({ start: s.loopStart, end: s.loopEnd, on: practising && s.loopOn });
  engine.setCountIn(practising && s.loopOn && state.countIn, song().bpm);
}
function setSettings(patch: Partial<SongSettings>) {
  const settings = { ...state.settings, ...patch };
  store.set(song().id, settings);
  set({ settings });
  applyToEngine();
}
const loopStartOrZero = () => (state.screen === 'playAlong' && state.settings.loopOn ? state.settings.loopStart : 0);

let loads = 0;
async function loadSong(songIndex: number, autoplay: boolean) {
  const load = ++loads;
  const next = songs[songIndex];
  engine.pause();
  set({ songIndex, loading: true, duration: next.duration, settings: settingsFor(next), vocalsAvailable: true });
  time.set(loopStartOrZero());
  try {
    let source = await resolveSource(next);
    let duration: number;
    try {
      duration = await engine.load(source);
    } catch (error) {
      if (load !== loads || source.generated) throw error;
      // Your own files could not be played: use the preview or built-in version instead.
      forgetFiles(next);
      source = await resolveSource(next);
      duration = await engine.load(source);
    }
    if (load !== loads) return;
    // Keep the saved loop inside the real length of the audio.
    const s = state.settings;
    const loopEnd = Math.min(s.loopEnd, duration);
    const loopStart = Math.max(0, Math.min(s.loopStart, loopEnd - MIN_LOOP));
    set({ loading: false, duration, vocalsAvailable: source.vocals !== null, settings: { ...s, loopStart, loopEnd } });
    applyToEngine();
    engine.seek(loopStartOrZero());
    releaseExcept([next.id]);
    if (autoplay) await engine.play();
  } catch {
    if (load !== loads) return;
    set({ loading: false });
    toast(copy.toasts.loadFailed);
  }
}

let started = false;
let playedOnce = false;
let lastLyricTap: { line: LyricLine; at: number } | null = null;

export const actions = {
  /** Prepare the first song (rendering needs no user gesture; playing does). */
  init() {
    if (started) return;
    started = true;
    void loadSong(0, false);
  },
  setMenu: (menuOpen: boolean) => set(menuOpen ? { menuOpen, moreHint: false } : { menuOpen }),

  openPlayAlong() {
    set({ screen: 'playAlong', menuOpen: false });
    actions.tick('menu');
    applyToEngine();
    const { loopOn, loopStart, loopEnd } = state.settings;
    if (loopOn && (time.get() < loopStart || time.get() >= loopEnd)) engine.seek(loopStart);
  },
  closePlayAlong() {
    if (state.screen !== 'playAlong') return;
    set({ screen: 'nowPlaying' });
    applyToEngine();
  },

  togglePlay() {
    if (state.loading) return;
    if (state.playing) return engine.pause();
    if (isIOS && !playedOnce) toast(copy.toasts.silent);
    playedOnce = true;
    engine.play().catch(() => toast(copy.toasts.loadFailed));
  },

  /** Returns false at the first or last song. */
  changeSong(step: number) {
    const index = state.songIndex + step;
    if (index < 0 || index >= songs.length) return false;
    void loadSong(index, state.playing);
    return true;
  },

  setLoop(start: number, end: number) {
    const loopEnd = Math.min(state.duration, Math.max(end, MIN_LOOP));
    const loopStart = Math.max(0, Math.min(start, loopEnd - MIN_LOOP));
    setSettings({ loopStart, loopEnd });
  },
  toggleLoop: () => setSettings({ loopOn: !state.settings.loopOn }),
  setSpeed: (speed: number) => setSettings({ speed }),
  setVocals: (vocals: number) => setSettings({ vocals }),

  /** First tap: the loop starts at that line. A later line within 4s: the loop ends there. */
  tapLyric(line: LyricLine) {
    const now = performance.now();
    const first = lastLyricTap;
    if (first && now - first.at < LYRIC_PAIR_WINDOW && line.t >= first.line.t) {
      lastLyricTap = null;
      setSettings({ loopStart: first.line.t, loopEnd: Math.min(state.duration, line.end), loopOn: true });
    } else {
      lastLyricTap = { line, at: now };
      // Keep the current end if it still makes sense, else run to the end of that section.
      const section = song().sections.find((s) => line.t >= s.start - 0.01 && line.t < s.end - 0.01);
      const keep = state.settings.loopEnd - line.t >= MIN_LOOP;
      const loopEnd = keep ? state.settings.loopEnd : Math.min(state.duration, Math.max(section?.end ?? 0, line.end, line.t + MIN_LOOP));
      setSettings({ loopStart: line.t, loopEnd, loopOn: true });
    }
    engine.seek(state.settings.loopStart, true);
    actions.tick('lyric');
  },

  /** Back to the loop start, or to the start of the song when the loop is off. */
  restartLoop() {
    if (!state.loading) engine.seek(loopStartOrZero(), true);
  },

  /** Move the loop to the next section of the song, wrapping at the end. */
  nextSection() {
    if (state.loading) return;
    const sections = song().sections.filter((s) => s.start < state.duration - MIN_LOOP);
    let current = -1;
    sections.forEach((s, i) => {
      if (s.start <= state.settings.loopStart + 0.01) current = i;
    });
    const next = sections[(current + 1) % sections.length];
    setSettings({ loopStart: next.start, loopEnd: Math.min(next.end, state.duration), loopOn: true });
    engine.seek(next.start, true);
  },

  toggleCountIn() {
    const countIn = !state.countIn;
    store.setCountIn(countIn);
    set({ countIn });
    applyToEngine();
    toast(countIn ? copy.toasts.countInOn : copy.toasts.countInOff);
  },

  setAirplay: (airplay: number) => set({ airplay }),
  tick(key: GuideKey) {
    if (!state.guide[key]) set({ guide: { ...state.guide, [key]: true } });
  },
  dismissTips() {
    store.setTipsSeen();
    set({ tipsSeen: true });
  },

  /** Back to Now Playing, audio stopped, saved settings cleared. */
  restartPrototype() {
    clearTimeout(toastTimer);
    store.clear();
    playedOnce = false;
    lastLyricTap = null;
    state = { ...initial(), airplay: 0 };
    listeners.forEach((fn) => fn());
    void loadSong(0, false);
  },
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

// Handy while developing: inspect the engine from the browser console.
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__playAlong = { engine, actions, state: () => state };

// Lyric timing helper (development only). On Now Playing, press play and tap
// T each time the singer starts a new line. You decide how many lines there
// are: press Enter when done and the start times are copied to the clipboard,
// ready to paste into src/songs.ts as `times: [...]`.
//   Backspace  undo the last tap
//   Enter      finish and copy
// Taps start over by themselves when you change song or the song jumps back
// (press play again from the start to have another go).
if (import.meta.env.DEV) {
  let stamps: number[] = [];
  let stampedSong = '';
  let lastTime = 0;
  time.subscribe(() => {
    const t = time.get();
    if (stamps.length && t < lastTime - 0.5) {
      stamps = [];
      toast('Taps cleared. Tap T on each new line');
    }
    lastTime = t;
  });
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (stampedSong !== song().id) stamps = [];
    stampedSong = song().id;
    if (key === 't') {
      stamps.push(Math.round(time.get() * 100) / 100);
      toast(`Line ${stamps.length} at ${stamps[stamps.length - 1]}s · Backspace undo · Enter finish`);
    } else if (key === 'backspace' && stamps.length) {
      stamps.pop();
      toast(stamps.length ? `Undone. ${stamps.length} so far` : 'Undone. No lines yet');
    } else if (key === 'enter' && stamps.length) {
      e.preventDefault();
      const result = `times: [${stamps.join(', ')}],`;
      console.info(`${song().title} (${stamps.length} lines): ${result}`);
      void navigator.clipboard?.writeText(result).catch(() => {});
      toast(`${stamps.length} times copied. Paste them into the chat`);
      stamps = [];
    }
  });
}
