// Each song remembers its own Play Along setup. Saved in localStorage, with
// an in-memory copy for browsers where storage is blocked (private mode).
export interface SongSettings {
  loopStart: number;
  loopEnd: number;
  loopOn: boolean;
  /** Whole percent, 50–100. */
  speed: number;
  /** Whole percent, 0–100. */
  vocals: number;
}
interface Saved {
  songs: Record<string, SongSettings>;
  tipsSeen: boolean;
}

const KEY = 'play-along:v1';
const empty = (): Saved => ({ songs: {}, tipsSeen: false });

function read(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Saved> | null;
    return { songs: saved?.songs ?? {}, tipsSeen: !!saved?.tipsSeen };
  } catch {
    return empty();
  }
}
let memory = read();
function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* storage unavailable: the in-memory copy still works for this visit */
  }
}

export const store = {
  get: (songId: string): SongSettings | undefined => memory.songs[songId],
  set(songId: string, settings: SongSettings) {
    memory.songs[songId] = settings;
    write();
  },
  tipsSeen: () => memory.tipsSeen,
  setTipsSeen() {
    memory.tipsSeen = true;
    write();
  },
  clear() {
    memory = empty();
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* nothing to clear */
    }
  },
};
