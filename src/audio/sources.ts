// Decides where a song's audio comes from: your own files in
// public/audio/<id>/ when they exist, otherwise the built-in generated stems.
import localAudio from 'virtual:local-audio';
import type { Song } from '../songs';
import { renderSong } from './synth';

export interface Source {
  backing: string;
  /** null when there is only a single full mix (no Vocals slider). */
  vocals: string | null;
  generated: boolean;
}

const cache = new Map<string, Promise<Source>>();

async function generate(song: Song): Promise<Source> {
  const stems = await renderSong(song);
  return { backing: URL.createObjectURL(stems.backing), vocals: URL.createObjectURL(stems.vocals), generated: true };
}

export function resolveSource(song: Song): Promise<Source> {
  let source = cache.get(song.id);
  if (!source) {
    const files = song.audio.type === 'files' ? localAudio[song.id] : undefined;
    const url = (file: string) => `${import.meta.env.BASE_URL}audio/${song.id}/${file}`;
    if (files?.vocals && files.backing) source = Promise.resolve({ backing: url(files.backing), vocals: url(files.vocals), generated: false });
    else if (files?.full) source = Promise.resolve({ backing: url(files.full), vocals: null, generated: false });
    else source = generate(song);
    cache.set(song.id, source);
    source.catch(() => cache.delete(song.id));
  }
  return source;
}

/** Drop a file-based source so the song falls back to its generated version. */
export function forgetFiles(song: Song) {
  cache.set(song.id, generate(song));
}

/** Free the WAV blobs of generated songs that are not needed right now. */
export function releaseExcept(keep: string[]) {
  for (const [id, source] of cache) {
    if (keep.includes(id)) continue;
    cache.delete(id);
    void source.then((s) => {
      if (!s.generated) return;
      URL.revokeObjectURL(s.backing);
      if (s.vocals) URL.revokeObjectURL(s.vocals);
    }, () => {});
  }
}
