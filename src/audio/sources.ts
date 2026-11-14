// Decides where a song's audio comes from, in this order:
//   1. your own files in public/audio/<id>/ (local only, never published)
//   2. Apple's 30-second preview clip, streamed from Apple
//   3. the built-in generated stems (songs that have chords in the manifest)
import localAudio from 'virtual:local-audio';
import type { Song } from '../songs';
import { renderSong } from './synth';

export interface Source {
  backing: string;
  /** null when there is only a single full mix (no Vocals slider). */
  vocals: string | null;
  /** Held in memory as blobs: nothing else to fall back to, and freed when unused. */
  generated: boolean;
}

const cache = new Map<string, Promise<Source>>();
const canGenerate = (song: Song) => song.sections.some((s) => s.chords?.length);

async function generate(song: Song): Promise<Source> {
  if (!canGenerate(song)) throw new Error(`No audio available for ${song.id}`);
  const stems = await renderSong(song);
  return { backing: URL.createObjectURL(stems.backing), vocals: URL.createObjectURL(stems.vocals), generated: true };
}

/** Ask Apple for the current address of the preview clip; fall back to the saved one. */
async function previewUrl(preview: NonNullable<Song['preview']>) {
  try {
    const reply = await fetch(`https://itunes.apple.com/lookup?id=${preview.appleId}`, { signal: AbortSignal.timeout(3000) });
    const data = (await reply.json()) as { results?: { previewUrl?: string }[] };
    return data.results?.[0]?.previewUrl ?? preview.url;
  } catch {
    return preview.url;
  }
}

/** The clip is small (about 1 MB), so it is held in memory: loop jumps are then instant. */
async function fromPreview(preview: NonNullable<Song['preview']>): Promise<Source> {
  const reply = await fetch(await previewUrl(preview));
  if (!reply.ok) throw new Error(`Preview unavailable (${reply.status})`);
  const clip = new Blob([await reply.arrayBuffer()], { type: 'audio/mp4' });
  return { backing: URL.createObjectURL(clip), vocals: null, generated: true };
}

export function resolveSource(song: Song): Promise<Source> {
  let source = cache.get(song.id);
  if (!source) {
    const files = song.audio.type === 'files' ? localAudio[song.id] : undefined;
    const url = (file: string) => `${import.meta.env.BASE_URL}audio/${song.id}/${file}`;
    if (files?.vocals && files.backing) source = Promise.resolve({ backing: url(files.backing), vocals: url(files.vocals), generated: false });
    else if (files?.full) source = Promise.resolve({ backing: url(files.full), vocals: null, generated: false });
    else if (song.preview) source = fromPreview(song.preview).catch((error) => (canGenerate(song) ? generate(song) : Promise.reject(error)));
    else source = generate(song);
    cache.set(song.id, source);
    source.catch(() => cache.delete(song.id));
  }
  return source;
}

/** Your own files could not be played: use the preview or generated version instead. */
export function forgetFiles(song: Song) {
  const next = song.preview ? fromPreview(song.preview) : generate(song);
  cache.set(song.id, next);
  next.catch(() => cache.delete(song.id));
}

/** Free the in-memory audio of songs that are not needed right now. */
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
