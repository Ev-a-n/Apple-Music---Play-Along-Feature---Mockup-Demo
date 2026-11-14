// Each song remembers its own Play Along setup (kept in memory for now).
export interface SongSettings {
  loopStart: number;
  loopEnd: number;
  loopOn: boolean;
  /** Whole percent, 50–100. */
  speed: number;
  /** Whole percent, 0–100. */
  vocals: number;
}

const memory = new Map<string, SongSettings>();
let tipsSeen = false;

export const store = {
  get: (songId: string) => memory.get(songId),
  set: (songId: string, settings: SongSettings) => void memory.set(songId, settings),
  tipsSeen: () => tipsSeen,
  setTipsSeen: () => void (tipsSeen = true),
  clear() {
    memory.clear();
    tipsSeen = false;
  },
};
