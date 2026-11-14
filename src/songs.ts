// The song manifest. All song data lives here.
//
// The three built-in songs are described in bars (so the generated music and
// the lyric timings can never drift apart) and turned into plain seconds by
// `build()`. To add a song from your own audio files you can skip `build()`
// and write a `Song` object by hand with times in seconds (see the README).

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
  /** 'files' looks in public/audio/<id>/ and falls back to 'generated'. */
  audio: { type: 'generated' | 'files' };
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

function build({ form, ...rest }: Draft): Song {
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

const porchChorus = ['Leave the porch light on', "I'm coming home tonight", 'Leave the porch light on', 'till the morning light'];
const tideChorus = ['Carry me, slow tide', 'out beyond the bay', 'Carry me, slow tide', 'wash the day away'];
const kiteChorus = ['Paper kites are flying', 'colors in the blue', 'Paper kites are flying', 'I let go with you'];

export const songs: Song[] = [
  build({
    id: 'porch-light',
    title: 'Porch Light',
    artist: 'Maple & Wire',
    album: 'Screen Door Summer',
    palette: ['rgb(55,77,104)', 'rgb(61,73,89)', 'rgb(64,71,80)', 'rgb(59,60,59)', 'rgb(52,48,42)'],
    blobs: ['rgb(72,104,148)', 'rgb(96,112,136)', 'rgb(120,96,72)', 'rgb(60,84,120)', 'rgb(88,70,52)'],
    art: { shape: 'lamp', from: 'rgb(70,96,130)', to: 'rgb(74,60,46)', accent: 'rgb(255,214,150)' },
    bpm: 96,
    feel: 'strum',
    melodyCentre: 67,
    audio: { type: 'generated' },
    form: [
      { name: 'Intro', chords: ['G', 'C'] },
      { name: 'Verse', chords: ['G', 'Em', 'C', 'D'], lines: ['Gravel road at evening', 'dust behind the wheels', 'Radio is humming low', 'something that I feel'] },
      { name: 'Chorus', chords: ['C', 'G', 'Em', 'D'], lines: porchChorus },
      { name: 'Verse', chords: ['G', 'Em', 'C', 'D'], lines: ['Fireflies in the field', 'your shadow on the door', 'Every mile behind me', "I don't count anymore"] },
      { name: 'Chorus', chords: ['C', 'G', 'Em', 'D'], lines: porchChorus },
      { name: 'Bridge', chords: ['Em', 'C', 'G', 'D'], lines: ['', '', "And if I'm running late", "you'll know I'm on my way"] },
      { name: 'Chorus', chords: ['C', 'G', 'Em', 'D'], lines: porchChorus },
      { name: 'Outro', chords: ['C', 'G'] },
    ],
  }),
  build({
    id: 'slow-tide',
    title: 'Slow Tide',
    artist: 'The Lanterns',
    album: 'Low Water',
    palette: ['rgb(128,84,96)', 'rgb(118,80,90)', 'rgb(100,74,82)', 'rgb(76,62,66)', 'rgb(54,46,48)'],
    blobs: ['rgb(168,104,120)', 'rgb(140,92,116)', 'rgb(120,88,96)', 'rgb(150,110,104)', 'rgb(84,60,72)'],
    art: { shape: 'waves', from: 'rgb(170,116,128)', to: 'rgb(84,58,70)', accent: 'rgb(255,226,220)' },
    bpm: 80,
    feel: 'fingerpick',
    melodyCentre: 66,
    audio: { type: 'generated' },
    form: [
      { name: 'Intro', chords: ['D', 'Bm'] },
      { name: 'Verse', chords: ['D', 'Bm', 'G', 'A'], lines: ['Morning on the harbor', 'boats all in a row', 'You were counting gulls', 'I was moving slow'] },
      { name: 'Chorus', chords: ['G', 'D', 'Em', 'A'], lines: tideChorus },
      { name: 'Verse', chords: ['D', 'Bm', 'G', 'A'], lines: ['Salt along the railing', 'footprints in the sand', 'Nothing here to hurry', 'nothing here is planned'] },
      { name: 'Chorus', chords: ['G', 'D', 'Em', 'A'], lines: tideChorus },
      { name: 'Bridge', chords: ['Bm', 'G', 'D', 'A'], lines: ['', '', 'Let the water wait', 'we have all the time'] },
      { name: 'Chorus', chords: ['G', 'D', 'Em', 'A'], lines: tideChorus },
      { name: 'Outro', chords: ['G', 'D'] },
    ],
  }),
  build({
    id: 'paper-kites',
    title: 'Paper Kites',
    artist: 'Juniper Hale',
    album: 'Hilltop Weather',
    palette: ['rgb(38,78,62)', 'rgb(48,80,60)', 'rgb(74,82,54)', 'rgb(104,82,44)', 'rgb(92,64,32)'],
    blobs: ['rgb(44,112,84)', 'rgb(88,116,64)', 'rgb(168,120,48)', 'rgb(36,92,76)', 'rgb(140,96,40)'],
    art: { shape: 'kite', from: 'rgb(46,104,80)', to: 'rgb(150,106,44)', accent: 'rgb(255,222,150)' },
    bpm: 108,
    feel: 'shuffle',
    melodyCentre: 69,
    audio: { type: 'generated' },
    form: [
      { name: 'Intro', chords: ['A', 'D'] },
      { name: 'Verse', chords: ['A', 'F#m', 'D', 'E'], lines: ['Racing up the hillside', 'string wound in my hand', 'Wind is getting louder', 'higher than we planned'] },
      { name: 'Chorus', chords: ['D', 'A', 'E', 'A'], lines: kiteChorus },
      { name: 'Verse', chords: ['A', 'F#m', 'D', 'E'], lines: ['Clouds are rolling over', 'grass up to our knees', 'Laughing at the thunder', 'leaning on the breeze'] },
      { name: 'Chorus', chords: ['D', 'A', 'E', 'A'], lines: kiteChorus },
      { name: 'Bridge', chords: ['F#m', 'D', 'A', 'E'], lines: ['', '', 'Hold on to the line', 'watch it climb and climb'] },
      { name: 'Chorus', chords: ['D', 'A', 'E', 'A'], lines: kiteChorus },
      { name: 'Outro', chords: ['D', 'A'] },
    ],
  }),
];

export const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds + 0.001));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
