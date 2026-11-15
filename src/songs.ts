// The song manifest. All song data lives here.
//
// The three songs play Apple's own 30-second preview clips (streamed from
// Apple, never stored in this project). Each song is shown at its full length,
// as in Apple Music, and the clip stands in for the whole song: the music
// starts over every 30 seconds and the clip's lyric lines repeat with it, so
// the words always fit what is heard. `fromClip()` builds such a song from the
// clip's lines (times in clip seconds). `build()` is still here for songs
// generated in code from chords.

export interface LyricLine {
  /** Start and end time in seconds. */
  t: number;
  end: number;
  text: string;
}
export interface Section {
  name: string;
  start: number;
  end: number;
  /** One chord per bar, used only by the built-in generated audio. */
  chords?: string[];
}
export type Feel = 'strum' | 'fingerpick' | 'shuffle';
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** Full length of the song in seconds (from Apple's catalogue). */
  duration: number;
  /** Five background gradient stops, top to bottom. */
  palette: [string, string, string, string, string];
  /** Soft colour blobs drifting over the gradient. */
  blobs: string[];
  art: { shape: 'lamp' | 'waves' | 'kite'; from: string; to: string; accent: string };
  bpm: number;
  feel: Feel;
  /** MIDI note the sung melody is centred on. */
  melodyCentre: number;
  lyrics: LyricLine[];
  sections: Section[];
  defaultLoop: { start: number; end: number };
  /** 'files' looks in public/audio/<id>/ first, then uses `preview`, then generated audio. */
  audio: { type: 'generated' | 'files' };
  /** Apple's 30-second preview: the catalogue id (looked up when the song loads) and a fallback address. */
  preview?: { appleId: number; url: string };
}

interface Part {
  name: string;
  chords: string[];
  /** One lyric line per bar; '' leaves a bar instrumental. */
  lines?: string[];
}
interface Draft extends Omit<Song, 'duration' | 'lyrics' | 'sections' | 'defaultLoop'> {
  form: Part[];
}

const TAIL = 2.5; // seconds for the last chord to ring out
const round = (n: number) => Math.round(n * 1000) / 1000;

export function build({ form, ...rest }: Draft): Song {
  const bar = 240 / rest.bpm; // 4 beats
  const lyrics: LyricLine[] = [];
  const sections: Section[] = [];
  let at = 0;
  for (const part of form) {
    const start = at * bar;
    part.lines?.forEach((text, i) => {
      if (text) lyrics.push({ t: round(start + i * bar), end: round(start + (i + 1) * bar), text });
    });
    at += part.chords.length;
    sections.push({ name: part.name, start: round(start), end: round(at * bar), chords: part.chords });
  }
  const duration = round(at * bar + TAIL);
  sections[sections.length - 1].end = duration;
  const chorus = sections.find((s) => s.name === 'Chorus') ?? sections[0];
  return { ...rest, duration, lyrics, sections, defaultLoop: { start: chorus.start, end: chorus.end } };
}

/** Length of Apple's preview clips, in seconds (the real length is read from the audio). */
export const CLIP_LENGTH = 30;
const MAX_LINE = 8; // seconds a lyric line stays current when the next one is far off
const DEFAULT_LOOP_LINES = 4; // the starting loop covers this many of the clip's lines

/** A lyric line: when it starts (seconds into the clip) and its words. */
type Lyric = [t: number, text: string];
interface ClipDraft extends Omit<Song, 'lyrics' | 'sections' | 'defaultLoop' | 'feel' | 'melodyCentre' | 'audio'> {
  /** The lines sung in the clip, in order, with their start times in clip seconds (0–30). */
  lines: Lyric[];
}

/**
 * A song whose audio is the 30-second clip, started over for as long as the
 * song lasts. The clip's lines repeat with it, so the words always fit the
 * music; each pass of the clip is a section. The starting loop is the clip's
 * first few lines.
 */
function fromClip({ lines, ...rest }: ClipDraft): Song {
  const passes = Math.ceil(rest.duration / CLIP_LENGTH);
  const lyrics: LyricLine[] = [];
  const sections: Section[] = [];
  for (let pass = 0; pass < passes; pass++) {
    const at = pass * CLIP_LENGTH;
    lines.forEach(([t, text], i) => {
      const start = at + t;
      const next = i + 1 < lines.length ? at + lines[i + 1][0] : at + CLIP_LENGTH;
      if (start < rest.duration - 1) lyrics.push({ t: round(start), end: round(Math.min(next, start + MAX_LINE, rest.duration)), text });
    });
    sections.push({ name: `Part ${pass + 1}`, start: at, end: round(Math.min(at + CLIP_LENGTH, rest.duration)) });
  }
  const first = lines[0]?.[0] ?? 0;
  const end = lines[DEFAULT_LOOP_LINES]?.[0] ?? CLIP_LENGTH;
  return { ...rest, feel: 'strum', melodyCentre: 67, audio: { type: 'files' }, lyrics, sections, defaultLoop: { start: round(first), end: round(Math.min(end, rest.duration)) } };
}

// Each song's `lines` are the words sung in its clip, with start times in clip
// seconds. To re-time them, press play and tap T on each line (see the
// README). The tempos are rough guesses (`bpm` sets the count-in and the beat
// the loop markers snap to).
export const songs: Song[] = [
  fromClip({
    id: 'do-i-wanna-know',
    title: 'Do I Wanna Know? (Live At the BBC)',
    artist: 'Hozier',
    album: 'Hozier (Special Edition)',
    preview: { appleId: 1053881214, url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a5/79/09/a57909c1-ddb5-30e2-8d41-da9c96163063/mzaf_708338140192584838.plus.aac.p.m4a' },
    // Colours sampled from the album cover: warm browns over slate blue.
    palette: ['rgb(108,80,58)', 'rgb(98,90,82)', 'rgb(84,88,94)', 'rgb(66,72,84)', 'rgb(48,48,52)'],
    blobs: ['rgb(150,104,70)', 'rgb(109,153,198)', 'rgb(114,73,52)', 'rgb(84,100,124)', 'rgb(74,56,47)'],
    art: { shape: 'lamp', from: 'rgb(156,111,76)', to: 'rgb(78,84,100)', accent: 'rgb(196,218,238)' },
    bpm: 67,
    duration: 257.9,
    lines: [
      [1, 'every night this week'],
      [4.5, 'How many secrets can you keep?'],
      [8, "'Cause there's this tune I found"],
      [11.5, 'That makes me think of you somehow'],
      [15, 'And I play it on repeat'],
      [18.5, 'Until I fall asleep'],
      [22, 'Spilling drinks on my settee'],
      [25.5, 'Do I wanna know'],
    ],
  }),
  fromClip({
    id: 'sweet-creature',
    title: 'Sweet Creature',
    artist: 'Harry Styles',
    album: 'Harry Styles',
    preview: { appleId: 1226034796, url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/41/01/18/41011809-5d2f-4fea-b8a2-b34a65a1e827/mzaf_9324748603234100318.plus.aac.p.m4a' },
    // Colours sampled from the cover: warm sand and peach over deep brown.
    palette: ['rgb(150,116,92)', 'rgb(138,104,80)', 'rgb(116,84,64)', 'rgb(84,58,46)', 'rgb(50,36,32)'],
    blobs: ['rgb(204,164,124)', 'rgb(185,141,104)', 'rgb(108,57,40)', 'rgb(160,122,95)', 'rgb(60,34,28)'],
    art: { shape: 'waves', from: 'rgb(208,170,134)', to: 'rgb(100,58,42)', accent: 'rgb(252,236,214)' },
    bpm: 124,
    duration: 224.9,
    lines: [
      [1, 'Sweet creature, sweet creature'],
      [8, 'Wherever I go, you bring me home'],
      [15, 'Sweet creature, sweet creature'],
      [22, 'When I run out of road, you bring me home'],
    ],
  }),
  fromClip({
    id: 'who-knows',
    title: 'Who Knows',
    artist: 'Daniel Caesar',
    album: 'Son Of Spergy',
    preview: { appleId: 1839352411, url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f2/af/b0/f2afb01b-42c5-7803-be2f-b7365c9a928a/mzaf_17144887126595930673.plus.aac.p.m4a' },
    // Colours sampled from the cover: deep reds and maroon.
    palette: ['rgb(114,45,46)', 'rgb(104,42,45)', 'rgb(92,38,42)', 'rgb(72,40,42)', 'rgb(46,30,32)'],
    blobs: ['rgb(140,48,50)', 'rgb(123,19,28)', 'rgb(116,41,45)', 'rgb(84,70,68)', 'rgb(78,42,44)'],
    art: { shape: 'kite', from: 'rgb(142,48,50)', to: 'rgb(56,26,30)', accent: 'rgb(240,204,192)' },
    bpm: 66,
    duration: 226.3,
    lines: [
      [1, 'Does it snow there?'],
      [8, "Lately, I've been thinking 'bout my precarious future"],
      [15, 'Will you be there with me by my side, my girl, my shooter?'],
      [22, "Who's to say who calculates?"],
    ],
  }),
];

export const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds + 0.001));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
