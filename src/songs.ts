// The song manifest. All song data lives here.
//
// The three songs play Apple's own 30-second preview clips (streamed from
// Apple, never stored in this project). `fromPreview()` lays placeholder lyric
// lines out evenly over the clip. `build()` is still here for songs generated
// in code from chords, and you can also write a `Song` by hand with times in
// seconds (see the README).

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
  /** Seconds. Replaced by the real length once audio has loaded. */
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

interface PreviewDraft extends Omit<Song, 'duration' | 'lyrics' | 'sections' | 'defaultLoop' | 'feel' | 'melodyCentre' | 'audio'> {
  /** Placeholder lines, spread evenly over the clip. */
  lines: string[];
}
const PREVIEW_LENGTH = 30; // seconds; replaced by the real length once loaded
const LINE_LENGTH = 3.6; // roughly how long one lyric line lasts

function fromPreview({ lines, ...rest }: PreviewDraft): Song {
  const bar = 240 / rest.bpm;
  const lineLength = Math.max(1, Math.round(LINE_LENGTH / bar)) * bar;
  const lyrics: LyricLine[] = lines
    .map((text, i) => ({ t: round(i * lineLength), end: round(Math.min(PREVIEW_LENGTH, (i + 1) * lineLength)), text }))
    .filter((line) => line.t < PREVIEW_LENGTH - 1);
  const sections: Section[] = [];
  for (let i = 0; i < lyrics.length; i += 2) {
    sections.push({ name: `Part ${i / 2 + 1}`, start: lyrics[i].t, end: (lyrics[i + 1] ?? lyrics[i]).end });
  }
  sections[sections.length - 1].end = PREVIEW_LENGTH;
  const first = sections[1] ?? sections[0];
  return { ...rest, feel: 'strum', melodyCentre: 67, audio: { type: 'files' }, duration: PREVIEW_LENGTH, lyrics, sections, defaultLoop: { start: first.start, end: first.end } };
}

// The lyric lines below are original placeholders, not the songs' real lyrics,
// and the tempos are rough guesses: adjust `bpm` by ear (it sets the count-in
// and the beat the loop markers snap to).
export const songs: Song[] = [
  fromPreview({
    id: 'do-i-wanna-know',
    title: 'Do I Wanna Know? (Live At the BBC)',
    artist: 'Hozier',
    album: 'Hozier (Special Edition)',
    preview: { appleId: 1053881214, url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a5/79/09/a57909c1-ddb5-30e2-8d41-da9c96163063/mzaf_708338140192584838.plus.aac.p.m4a' },
    palette: ['rgb(55,77,104)', 'rgb(61,73,89)', 'rgb(64,71,80)', 'rgb(59,60,59)', 'rgb(52,48,42)'],
    blobs: ['rgb(72,104,148)', 'rgb(96,112,136)', 'rgb(120,96,72)', 'rgb(60,84,120)', 'rgb(88,70,52)'],
    art: { shape: 'lamp', from: 'rgb(70,96,130)', to: 'rgb(74,60,46)', accent: 'rgb(255,214,150)' },
    bpm: 67,
    lines: ['Is the night still young', 'out on the avenue?', 'Do the streetlights hum', 'a song you never knew', 'Is the last train gone', 'are you walking too?', 'Does the morning come', 'the way it used to do?'],
  }),
  fromPreview({
    id: 'sweet-creature',
    title: 'Sweet Creature',
    artist: 'Harry Styles',
    album: 'Harry Styles',
    preview: { appleId: 1226034796, url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/41/01/18/41011809-5d2f-4fea-b8a2-b34a65a1e827/mzaf_9324748603234100318.plus.aac.p.m4a' },
    palette: ['rgb(128,84,96)', 'rgb(118,80,90)', 'rgb(100,74,82)', 'rgb(76,62,66)', 'rgb(54,46,48)'],
    blobs: ['rgb(168,104,120)', 'rgb(140,92,116)', 'rgb(120,88,96)', 'rgb(150,110,104)', 'rgb(84,60,72)'],
    art: { shape: 'waves', from: 'rgb(170,116,128)', to: 'rgb(84,58,70)', accent: 'rgb(255,226,220)' },
    bpm: 124,
    lines: ['Carry the morning slow', 'over the ridge again', 'Time keeps its quiet hold', 'on everything we were', 'Follow the river down', 'under the paling sky', 'Leave what the winter took', 'and keep the rest nearby'],
  }),
  fromPreview({
    id: 'who-knows',
    title: 'Who Knows',
    artist: 'Daniel Caesar',
    album: 'Son Of Spergy',
    preview: { appleId: 1839352411, url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f2/af/b0/f2afb01b-42c5-7803-be2f-b7365c9a928a/mzaf_17144887126595930673.plus.aac.p.m4a' },
    palette: ['rgb(38,78,62)', 'rgb(48,80,60)', 'rgb(74,82,54)', 'rgb(104,82,44)', 'rgb(92,64,32)'],
    blobs: ['rgb(44,112,84)', 'rgb(88,116,64)', 'rgb(168,120,48)', 'rgb(36,92,76)', 'rgb(140,96,40)'],
    art: { shape: 'kite', from: 'rgb(46,104,80)', to: 'rgb(150,106,44)', accent: 'rgb(255,222,150)' },
    bpm: 66,
    lines: ['Maybe the days run long', 'maybe they slip away', 'Nobody reads the map', 'we fold it anyway', 'Ask me where this road goes', 'I could not tell you now', 'Somewhere the answer waits', 'we will find it out somehow'],
  }),
];

export const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds + 0.001));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
