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
  /** The lyric lines heard in the clip, in order. */
  lines: string[];
  /** When each line starts, in seconds. Without it the lines are spread evenly. */
  times?: number[];
}
const PREVIEW_LENGTH = 30; // seconds; replaced by the real length once loaded
const LINE_LENGTH = 3.6; // roughly how long one lyric line lasts

function fromPreview({ lines, times, ...rest }: PreviewDraft): Song {
  const bar = 240 / rest.bpm;
  const lineLength = Math.max(1, Math.round(LINE_LENGTH / bar)) * bar;
  const lyrics: LyricLine[] = lines
    .map((text, i) => {
      const t = times?.[i] ?? i * lineLength;
      const end = times ? (times[i + 1] ?? PREVIEW_LENGTH) : (i + 1) * lineLength;
      return { t: round(t), end: round(Math.min(PREVIEW_LENGTH, end)), text };
    })
    .filter((line) => line.t < PREVIEW_LENGTH - 1);
  const sections: Section[] = [];
  for (let i = 0; i < lyrics.length; i += 2) {
    sections.push({ name: `Part ${i / 2 + 1}`, start: lyrics[i].t, end: (lyrics[i + 1] ?? lyrics[i]).end });
  }
  sections[sections.length - 1].end = PREVIEW_LENGTH;
  const first = sections[1] ?? sections[0];
  return { ...rest, feel: 'strum', melodyCentre: 67, audio: { type: 'files' }, duration: PREVIEW_LENGTH, lyrics, sections, defaultLoop: { start: first.start, end: first.end } };
}

// The lyric lines below are placeholders. To show the words actually sung in
// each clip, replace `lines`, then time them with the T key (see the README)
// and paste the result in as `times`. The tempos are rough guesses: adjust
// `bpm` by ear (it sets the count-in and the beat the loop markers snap to).
export const songs: Song[] = [
  fromPreview({
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
    lines: ['Is the night still young', 'out on the avenue?', 'Do the streetlights hum', 'a song you never knew', 'Is the last train gone', 'are you walking too?', 'Does the morning come', 'the way it used to do?'],
  }),
  fromPreview({
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
    lines: ['Carry the morning slow', 'over the ridge again', 'Time keeps its quiet hold', 'on everything we were', 'Follow the river down', 'under the paling sky', 'Leave what the winter took', 'and keep the rest nearby'],
  }),
  fromPreview({
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
    lines: ['Maybe the days run long', 'maybe they slip away', 'Nobody reads the map', 'we fold it anyway', 'Ask where the road goes', 'I could not tell you now', 'Somewhere answers wait', 'we will find them soon'],
  }),
];

export const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds + 0.001));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
