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
  /** Apple's 30-second clip, which stands in for the whole song (it is started over for the song's full length). */
  clip: boolean;
}

const cache = new Map<string, Promise<Source>>();
const canGenerate = (song: Song) => song.sections.some((s) => s.chords?.length);

async function generate(song: Song): Promise<Source> {
  if (!canGenerate(song)) throw new Error(`No audio available for ${song.id}`);
  const stems = await renderSong(song);
  return { backing: URL.createObjectURL(stems.backing), vocals: URL.createObjectURL(stems.vocals), generated: true, clip: false };
}

interface Catalogue {
  previewUrl?: string;
  artworkUrl100?: string;
}
const lookups = new Map<number, Promise<Catalogue>>();
/** Ask Apple's catalogue about a song (once): the current preview address and the artwork. */
function lookup(appleId: number): Promise<Catalogue> {
  let found = lookups.get(appleId);
  if (!found) {
    found = fetch(`https://itunes.apple.com/lookup?id=${appleId}`, { signal: AbortSignal.timeout(4000) })
      .then((reply) => reply.json() as Promise<{ results?: Catalogue[] }>)
      .then((data) => data.results?.[0] ?? {});
    lookups.set(appleId, found);
    found.catch(() => lookups.delete(appleId));
  }
  return found;
}

/** The current address of the preview clip; falls back to the saved one. */
const previewUrl = (preview: NonNullable<Song['preview']>) => lookup(preview.appleId).then((c) => c.previewUrl ?? preview.url, () => preview.url);

/** The song's album cover, streamed from Apple (shown blurred); null when there is none. */
export function artworkUrl(song: Song): Promise<string | null> {
  if (!song.preview) return Promise.resolve(null);
  return lookup(song.preview.appleId).then((c) => c.artworkUrl100?.replace(/\d+x\d+bb/, `${ARTWORK_PX}x${ARTWORK_PX}bb`) ?? null, () => null);
}
const ARTWORK_PX = 600;

/** The clip is small (about 1 MB), so it is held in memory: loop jumps are then instant. */
async function fromPreview(preview: NonNullable<Song['preview']>): Promise<Source> {
  const reply = await fetch(await previewUrl(preview));
  if (!reply.ok) throw new Error(`Preview unavailable (${reply.status})`);
  const clip = new Blob([await reply.arrayBuffer()], { type: 'audio/mp4' });
  return { backing: URL.createObjectURL(clip), vocals: null, generated: true, clip: true };
}

export function resolveSource(song: Song): Promise<Source> {
  let source = cache.get(song.id);
  if (!source) {
    const files = song.audio.type === 'files' ? localAudio[song.id] : undefined;
    const url = (file: string) => `${import.meta.env.BASE_URL}audio/${song.id}/${file}`;
    if (files?.vocals && files.backing) source = Promise.resolve({ backing: url(files.backing), vocals: url(files.vocals), generated: false, clip: false });
    else if (files?.full) source = Promise.resolve({ backing: url(files.full), vocals: null, generated: false, clip: false });
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
