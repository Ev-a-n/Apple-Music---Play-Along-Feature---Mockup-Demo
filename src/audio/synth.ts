// Built-in songs: composed from the manifest's chords and tempo and rendered
// to two stems (backing + vocals) with OfflineAudioContext, so the prototype
// always has sound without any audio files.
import type { Feel, Song } from '../songs';

const SR = 44100;
const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Small seeded random generator so every render of a song is identical. */
function seeded(text: string) {
  let a = 2166136261;
  for (let i = 0; i < text.length; i++) a = Math.imul(a ^ text.charCodeAt(i), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseChord(name: string) {
  const minor = name.endsWith('m');
  const root = NOTE.indexOf(minor ? name.slice(0, -1) : name);
  return { root, third: minor ? 3 : 4 };
}

/** Six "strings", low to high, like an open guitar chord. */
function voicing(name: string) {
  const { root, third } = parseChord(name);
  const low = 40 + ((root - 4 + 12) % 12);
  return [low, low + 7, low + 12, low + 12 + third, low + 19, low + 24];
}

/** Karplus-Strong plucked string. */
const plucks = new Map<number, Float32Array>();
function pluck(midi: number): Float32Array {
  const cached = plucks.get(midi);
  if (cached) return cached;
  const rand = seeded(`pluck${midi}`);
  const length = Math.floor(SR * 2.2);
  const out = new Float32Array(length);
  const period = SR / hz(midi) - 0.5; // the averaging filter adds half a sample
  const n = Math.floor(period);
  const frac = period - n;
  let last = 0;
  for (let i = 0; i <= n + 1; i++) {
    const white = rand() * 2 - 1;
    last = last * 0.55 + white * 0.45; // soften the pick attack
    out[i] = last;
  }
  const decay = 0.9975 - Math.max(0, midi - 52) * 0.00006;
  let prev = out[1];
  for (let i = n + 2; i < length; i++) {
    const delayed = out[i - n] * (1 - frac) + out[i - n - 1] * frac;
    out[i] = decay * 0.5 * (delayed + prev);
    prev = delayed;
  }
  const fade = Math.floor(SR * 0.08);
  for (let i = 0; i < fade; i++) out[length - 1 - i] *= i / fade;
  plucks.set(midi, out);
  return out;
}

/** A small generated room so the stems do not sound dry. */
function reverb(ctx: BaseAudioContext, wet: number) {
  const rand = seeded('room');
  const impulse = new AudioBuffer({ length: Math.floor(SR * 1.3), sampleRate: SR, numberOfChannels: 1 });
  const data = impulse.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (rand() * 2 - 1) * (1 - i / data.length) ** 3.2;
  const convolver = new ConvolverNode(ctx, { buffer: impulse });
  const gain = new GainNode(ctx, { gain: wet });
  convolver.connect(gain).connect(ctx.destination);
  return convolver;
}

interface Bar {
  index: number;
  start: number;
  chord: string;
  section: string;
  /** Position of the bar inside its section. */
  inSection: number;
}

function bars(song: Song): Bar[] {
  const length = 240 / song.bpm;
  const list: Bar[] = [];
  for (const section of song.sections) {
    (section.chords ?? []).forEach((chord, i) => {
      list.push({ index: list.length, start: list.length * length, chord, section: section.name, inSection: i });
    });
  }
  return list;
}

/** Time of an eighth-note slot (0–8) inside a bar; shuffle delays the off-beats. */
function slotTime(feel: Feel, bar: number, slot: number) {
  const beat = bar / 4;
  const swing = feel === 'shuffle' && slot % 2 === 1 ? beat * 0.16 : 0;
  return (slot / 2) * beat + swing;
}

// Strum patterns per eighth note: positive = down strum, negative = up strum.
const STRUMS: Record<Feel, number[]> = {
  strum: [1, 0, 0.7, -0.5, 0, -0.55, 0.75, -0.5],
  shuffle: [1, 0, 0.6, -0.5, 0.85, 0, 0.65, -0.5],
  fingerpick: [],
};
const PICKING = [0, 2, 3, 4, 1, 3, 4, 3];

/** Short drum sounds, made once and mixed in by hand. */
function drumKit() {
  const rand = seeded('drums');
  const make = (seconds: number, fn: (t: number, i: number) => number) => Float32Array.from({ length: Math.floor(SR * seconds) }, (_, i) => fn(i / SR, i));
  let phase = 0;
  const kick = make(0.28, (t) => {
    phase += (2 * Math.PI * (46 + 79 * Math.exp(-t / 0.035))) / SR;
    return Math.sin(phase) * Math.exp(-t / 0.07);
  });
  let low = 0;
  let lower = 0;
  const snare = make(0.16, (t) => {
    const white = rand() * 2 - 1;
    low += 0.45 * (white - low); // keep the middle band of the noise
    lower += 0.1 * (white - lower);
    return (low - lower) * 1.6 * Math.exp(-t / 0.032);
  });
  let smooth = 0;
  const hat = make(0.06, (t) => {
    const white = rand() * 2 - 1;
    smooth += 0.55 * (white - smooth); // high-pass: keep only the fizz
    return (white - smooth) * Math.exp(-t / 0.011);
  });
  return { kick, snare, hat };
}

async function renderBacking(song: Song): Promise<AudioBuffer> {
  const barLength = 240 / song.bpm;
  const all = bars(song);
  const length = Math.ceil(song.duration * SR);
  // Hundreds of short notes are mixed here in plain code (far faster than one
  // audio node per note). The OfflineAudioContext then adds the room and
  // renders the finished stem.
  const guitar = new Float32Array(length);
  const rhythm = new Float32Array(length);
  const bassLine = new Float32Array(length);
  const kit = drumKit();
  const mix = (track: Float32Array, sample: Float32Array, at: number, level: number) => {
    const offset = Math.max(0, Math.round(at * SR));
    const count = Math.min(sample.length, track.length - offset);
    for (let i = 0; i < count; i++) track[offset + i] += sample[i] * level;
  };

  const string = (midi: number, at: number, level: number) => mix(guitar, pluck(midi), at, level);
  const strum = (chord: string, at: number, level: number, spread = 0.013) => {
    const notes = voicing(chord);
    if (level > 0) notes.forEach((m, i) => string(m, at + i * spread, level * (i === 0 ? 1 : 0.8)));
    else notes.slice(2).reverse().forEach((m, i) => string(m, at + i * spread * 0.7, -level * 0.75));
  };
  const bass = (midi: number, at: number, hold: number, level: number) => {
    const f = hz(midi);
    const offset = Math.round(at * SR);
    const count = Math.min(Math.floor((hold + 0.3) * SR), length - offset);
    for (let i = 0; i < count; i++) {
      const t = i / SR;
      const triangle = 2 * Math.abs(2 * ((t * f) % 1) - 1) - 1;
      const attack = Math.min(1, t / 0.015);
      const body = 0.6 + 0.4 * Math.exp(-t / 0.12);
      const release = t > hold ? Math.exp(-(t - hold) / 0.05) : 1;
      bassLine[offset + i] += triangle * level * attack * body * release;
    }
  };
  const kick = (at: number, level: number) => mix(rhythm, kit.kick, at, level);
  const snare = (at: number, level: number) => mix(rhythm, kit.snare, at, level);
  const hat = (at: number, level: number) => mix(rhythm, kit.hat, at, level);

  for (const bar of all) {
    const t = (slot: number) => bar.start + slotTime(song.feel, barLength, slot);
    const quiet = bar.section === 'Intro' || bar.section === 'Outro';
    const sparse = quiet || (bar.section === 'Bridge' && bar.inSection < 2);
    const lift = bar.section === 'Chorus' ? 1 : 0.82;
    const notes = voicing(bar.chord);

    if (song.feel === 'fingerpick') {
      PICKING.forEach((s, slot) => string(notes[s], t(slot), (slot === 0 ? 1 : 0.7) * lift));
      if (bar.section === 'Chorus') string(notes[5], t(4), 0.5);
    } else {
      STRUMS[song.feel].forEach((level, slot) => level && strum(bar.chord, t(slot), level * lift * (quiet ? 0.8 : 1)));
    }

    if (bar.section !== 'Intro') {
      const root = notes[0] - 12 < 31 ? notes[0] : notes[0] - 12;
      bass(root, t(0), barLength * 0.42, 0.9);
      if (!sparse) bass(song.feel === 'shuffle' ? root + 7 : root, t(4), barLength * 0.36, 0.75);
      if (!sparse && song.feel !== 'fingerpick') bass(root, t(7), barLength * 0.1, 0.5);
    }
    if (!sparse) {
      kick(t(0), 0.85);
      if (song.feel !== 'fingerpick') kick(t(4), 0.7);
      (song.feel === 'fingerpick' ? [4] : [2, 6]).forEach((slot) => snare(t(slot), bar.section === 'Chorus' ? 0.34 : 0.24));
      for (let slot = 0; slot < 8; slot++) {
        if (song.feel === 'fingerpick' && slot % 2) continue;
        hat(t(slot), (slot % 2 ? 0.09 : 0.15) * lift);
      }
    }
  }
  // Let the last chord ring out.
  const last = all[all.length - 1];
  strum(last.chord, all.length * barLength, 0.9, 0.03);
  bass(voicing(last.chord)[0] - 12 < 31 ? voicing(last.chord)[0] : voicing(last.chord)[0] - 12, all.length * barLength, 1.4, 0.8);

  // Round off the bass (a gentle low-pass), then add it to the rhythm track.
  let smooth = 0;
  for (let i = 0; i < length; i++) {
    smooth += 0.06 * (bassLine[i] - smooth);
    rhythm[i] = rhythm[i] * (song.feel === 'fingerpick' ? 0.5 : 0.8) + smooth * 0.62;
  }

  const ctx = new OfflineAudioContext(1, length, SR);
  const room = reverb(ctx, 0.14);
  const play = (samples: Float32Array<ArrayBuffer>, level: number, wet: boolean) => {
    const buffer = new AudioBuffer({ length, sampleRate: SR, numberOfChannels: 1 });
    buffer.copyToChannel(samples, 0);
    const gain = new GainNode(ctx, { gain: level });
    const source = new AudioBufferSourceNode(ctx, { buffer });
    source.connect(gain).connect(ctx.destination);
    if (wet) gain.connect(room);
    source.start(0);
  };
  play(guitar, song.feel === 'fingerpick' ? 0.5 : 0.34, true);
  play(rhythm, 1, false);
  return ctx.startRendering();
}

// Rough formant pairs for each vowel, so the lead sounds sung.
const VOWELS: Record<string, [number, number]> = { a: [780, 1180], e: [480, 1750], i: [330, 2150], o: [500, 880], u: [360, 760], y: [330, 2150] };
const RHYTHMS: Record<number, number[]> = {
  3: [0, 2, 4],
  4: [0, 2, 4, 6],
  5: [0, 1, 2, 4, 6],
  6: [0, 1, 2, 3, 4, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
  8: [0, 1, 2, 3, 4, 5, 6, 7],
};

async function renderVocals(song: Song): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, Math.ceil(song.duration * SR), SR);
  const barLength = 240 / song.bpm;
  const all = bars(song);
  const key = parseChord(all.find((b) => b.section === 'Verse')?.chord ?? all[0].chord).root;
  const scale: number[] = [];
  for (let m = 48; m <= 84; m++) if (MAJOR.includes((m - key + 120) % 12)) scale.push(m);
  const room = reverb(ctx, 0.22);
  const out = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 4800 });
  const level = new GainNode(ctx, { gain: 0.5 });
  out.connect(level).connect(ctx.destination);
  level.connect(room);

  for (const line of song.lyrics) {
    const bar = all[Math.round(line.t / barLength)] ?? all[all.length - 1];
    const syllables = line.text.match(/[aeiouy]+/gi) ?? ['a', 'a', 'a'];
    const count = Math.max(3, Math.min(8, syllables.length));
    const slots = RHYTHMS[count];
    // The same seed for every Verse/Chorus line position, so choruses repeat.
    const rand = seeded(`${song.id}-${bar.section}-${bar.inSection}`);

    const { root, third } = parseChord(bar.chord);
    const chordTones = scale.filter((m) => [0, third, 7].includes((m - root + 120) % 12));
    const centre = song.melodyCentre + (bar.section === 'Chorus' ? 3 : bar.section === 'Bridge' ? 1 : 0);
    const nearest = (pool: number[], to: number) => pool.reduce((best, m) => (Math.abs(m - to) < Math.abs(best - to) ? m : best));
    let degree = scale.indexOf(nearest(chordTones, centre + Math.round((rand() - 0.5) * 6)));
    const pitches = slots.map((_, i) => {
      if (i > 0) {
        degree += [-2, -1, -1, 0, 1, 1, 2][Math.floor(rand() * 7)];
        const drift = scale[degree] - centre;
        if (drift > 6) degree -= 2;
        if (drift < -6) degree += 2;
      }
      return scale[Math.max(0, Math.min(scale.length - 1, degree))];
    });
    pitches[pitches.length - 1] = nearest(chordTones, pitches[pitches.length - 1]);

    const start = line.t;
    const at = (slot: number) => start + slotTime(song.feel, barLength, slot);
    const lineEnd = Math.min(at(slots[slots.length - 1]) + barLength * 0.34, start + barLength - 0.12);

    const tri = new OscillatorNode(ctx, { type: 'triangle', frequency: hz(pitches[0]) });
    const saw = new OscillatorNode(ctx, { type: 'sawtooth', frequency: hz(pitches[0]) });
    const vibrato = new OscillatorNode(ctx, { type: 'sine', frequency: 5.4 });
    const depth = new GainNode(ctx, { gain: 0 });
    vibrato.connect(depth);
    depth.connect(tri.detune);
    depth.connect(saw.detune);
    const f1 = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 700, Q: 5 });
    const f2 = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 1200, Q: 7 });
    const env = new GainNode(ctx, { gain: 0 });
    tri.connect(new GainNode(ctx, { gain: 0.42 })).connect(env);
    saw.connect(f1).connect(new GainNode(ctx, { gain: 0.9 })).connect(env);
    saw.connect(f2).connect(new GainNode(ctx, { gain: 0.55 })).connect(env);
    env.connect(out);

    env.gain.setValueAtTime(0, start);
    slots.forEach((slot, i) => {
      const t = at(slot);
      const next = i < slots.length - 1 ? at(slots[i + 1]) : lineEnd;
      const f = hz(pitches[i]);
      tri.frequency.setTargetAtTime(f, t, 0.014);
      saw.frequency.setTargetAtTime(f, t, 0.014);
      const [a, b] = VOWELS[(syllables[i % syllables.length] ?? 'a')[0].toLowerCase()] ?? VOWELS.a;
      f1.frequency.setTargetAtTime(a, t, 0.03);
      f2.frequency.setTargetAtTime(b, t, 0.03);
      env.gain.setTargetAtTime(i === 0 ? 0.95 : 1, t, 0.022); // attack
      env.gain.setTargetAtTime(0.62, next - 0.05, 0.022); // tiny dip between syllables
      // Vibrato arrives late on held notes, as a singer's does.
      depth.gain.setTargetAtTime(0, t, 0.02);
      if (next - t > 0.3) depth.gain.setTargetAtTime(22, t + 0.18, 0.12);
    });
    env.gain.setTargetAtTime(0, lineEnd, 0.05);
    for (const osc of [tri, saw, vibrato]) {
      osc.start(start);
      osc.stop(lineEnd + 0.5);
    }
  }
  return ctx.startRendering();
}

function toWav(samples: Float32Array, gain: number): Blob {
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const text = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SR, true);
  view.setUint32(28, SR * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] * gain));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([view], { type: 'audio/wav' });
}

export interface Stems {
  backing: Blob;
  vocals: Blob;
}

export async function renderSong(song: Song): Promise<Stems> {
  const [backing, vocals] = await Promise.all([renderBacking(song), renderVocals(song)]);
  const b = backing.getChannelData(0);
  const v = vocals.getChannelData(0);
  // One gain for both stems, so the mix never clips with vocals at 100%.
  let peak = 0;
  for (let i = 0; i < b.length; i++) peak = Math.max(peak, Math.abs(b[i] + (v[i] ?? 0)));
  const gain = peak > 0 ? 0.9 / peak : 1;
  return { backing: toWav(b, gain), vocals: toWav(v, gain) };
}
