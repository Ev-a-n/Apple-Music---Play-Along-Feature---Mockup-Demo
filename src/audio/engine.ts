// The playback engine. The UI never touches audio directly.
//
//   backing buffer ─ source ─(stretch)─ centre cut ─┐
//   vocals buffer  ─ source ─(stretch)─ gain ───────┴─ master ─ speakers
//
// Songs are decoded into memory once and played from AudioBufferSourceNodes:
// seeks and loop jumps are then instant, and no browser media pipeline is
// involved. Slowing down keeps the pitch by running the sources through a
// SoundTouch time-stretcher in an AudioWorklet (on the audio thread). At full
// speed the sources are connected straight through, untouched.
//
// Time is song time. Usually the audio is the whole song, but a short clip can
// stand in for a longer song (see `Span`): it plays in time with the song from
// `start` and starts over wherever else the playhead is. The UI never notices.
//
// Vocals: with two stems the vocals stem has its own gain. With a single mix,
// the vocals slider instead takes the centre of the stereo image (where a lead
// vocal almost always sits) out, above the bass. At 100% the mix is untouched.
import { SoundTouchNode } from '@soundtouchjs/audio-worklet';
import processorUrl from '@soundtouchjs/audio-worklet/processor?url';

export interface EngineSource {
  backing: string;
  /** null plays the backing alone (a single full mix). */
  vocals: string | null;
}
export interface Span {
  /** Full length of the song in seconds. */
  length: number;
  /** Song time at which the audio's first second plays in time with the song. */
  start: number;
}
export interface Loop {
  start: number;
  end: number;
  on: boolean;
}
interface Events {
  time: number;
  playing: boolean;
  ended: undefined;
  /** 1–4 while the count-in clicks, 0 when it is over. */
  count: number;
}

const DIP = 0.015; // seconds of gain dip around a jump, to avoid a click
const COUNT_BEATS = 4; // one bar of clicks before the loop starts again
const LOOK_AHEAD = 0.032; // seconds before the loop end at which the jump starts
const CENTRE_CUT_HZ = 160; // the centre of the mix is turned down above this (bass and kick stay)
const RATE_SETTLE = 70; // ms the speed slider must rest before the new rate is applied
const STRETCH_LATENCY = 0.08; // seconds the stretched sound lags the source position
const STRETCH_WAIT = 2000; // ms to wait for the stretcher to register before playing without it

interface Chain {
  sources: AudioBufferSourceNode[];
  nodes: AudioNode[];
  startedAt: number;
  from: number;
  stretched: boolean;
}

export class Engine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private backingIn?: GainNode;
  private vocalsIn?: GainNode;
  private vocalsGain?: GainNode;
  /** How much of the centre of a single mix is taken away: 0 none, −1 all. */
  private centreCut?: GainNode;
  private stretchReady?: Promise<boolean>;
  private stretchOk = false;
  private buffers: { backing: AudioBuffer; vocals: AudioBuffer | null } | null = null;
  private hasVocals = false;
  private vocalsLevel = 1;
  private rate = 1;
  private loop: Loop = { start: 0, end: 0, on: false };
  private frame = 0;
  private jumping = false;
  private pendingJump: number | null = null;
  private rateApply = 0;
  private loads = 0;
  private countIn = { on: false, bpm: 120 };
  private counting = false;
  private countTimers: number[] = [];
  private countClicks: OscillatorNode[] = [];
  /** Seconds of audio actually loaded; `duration` is the song. */
  private media = 0;
  /** Where in the song the audio plays in time with it. */
  private offset = 0;
  /** The stretch of the song the audio is standing in for right now: song time = base + pass × media + audio time. */
  private base = 0;
  private pass = 0;
  /** Position in the audio while nothing is sounding. */
  private at = 0;
  /** What is sounding right now. */
  private chain: Chain | null = null;
  private listeners: { [K in keyof Events]: Set<(value: Events[K]) => void> } = { time: new Set(), playing: new Set(), ended: new Set(), count: new Set() };

  duration = 0;
  playing = false;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.playing) this.pause();
    });
  }

  on<K extends keyof Events>(event: K, fn: (value: Events[K]) => void) {
    this.listeners[event].add(fn);
    return () => void this.listeners[event].delete(fn);
  }
  private emit<K extends keyof Events>(event: K, value: Events[K]) {
    this.listeners[event].forEach((fn) => fn(value));
  }

  /** Seconds into the loaded audio itself (the clip, when one stands in for the song). */
  get audioTime() {
    const c = this.chain;
    if (!c || !this.ctx) return this.at;
    const lag = c.stretched ? STRETCH_LATENCY : 0;
    return Math.max(c.from, Math.min(this.media, c.from + (this.ctx.currentTime - c.startedAt) * this.rate - lag));
  }
  get time() {
    return this.pendingJump ?? this.base + this.pass * this.media + this.audioTime;
  }

  /** Load a song. Resolves with its duration: the song's length, or the audio's (the shorter stem) without a `span`. */
  async load(source: EngineSource, span?: Span): Promise<number> {
    const load = ++this.loads;
    this.pause();
    const ctx = this.context();
    const [backing, vocals] = await Promise.all([this.decode(ctx, source.backing), source.vocals ? this.decode(ctx, source.vocals) : null]);
    if (load !== this.loads) throw new Error('superseded');
    this.buffers = { backing, vocals };
    this.hasVocals = vocals !== null;
    this.media = Math.min(backing.duration, vocals?.duration ?? Infinity);
    this.offset = span?.start ?? 0;
    this.duration = span ? Math.max(span.length, this.media) : this.media;
    this.base = 0;
    this.pass = 0;
    this.at = 0;
    this.applyVocals();
    this.emit('time', 0);
    return this.duration;
  }

  /** Must be called from a tap or key press: browsers block audio otherwise. */
  async play() {
    if (!this.buffers || !this.ctx) return;
    if (this.ctx.state !== 'running') void this.ctx.resume();
    if (this.time >= this.duration - 0.05) this.setTime(this.loop.on ? this.loop.start : 0);
    this.playing = true;
    this.emit('playing', true);
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(this.tick);
    if (this.rate < 1 && !this.stretchOk) await Promise.race([this.stretchReady, new Promise((r) => setTimeout(r, STRETCH_WAIT))]);
    if (!this.playing) return;
    // Starting from the top of the loop: count one bar in first.
    if (this.countIn.on && this.loop.on && Math.abs(this.time - this.loop.start) < 0.06) this.startCount();
    else this.startChain();
  }

  pause() {
    this.stopChain();
    cancelAnimationFrame(this.frame);
    this.cancelCount();
    if (!this.playing) return;
    this.playing = false;
    this.emit('playing', false);
    this.emit('time', this.time);
  }

  /** With `countIn`, a playing song stops, clicks one bar, then carries on from there. */
  seek(time: number, countIn = false) {
    const to = Math.max(0, Math.min(time, Math.max(0, this.duration - 0.05)));
    if (this.playing) this.jump(to, countIn && this.countIn.on);
    else this.setTime(to);
  }

  /** Click one bar at the song tempo before the loop starts again. */
  setCountIn(on: boolean, bpm: number) {
    this.countIn = { on, bpm };
    if (!on) this.finishCount();
  }

  /** 0.5–1. Pitch is preserved. Applied once the slider rests for a moment. */
  setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(1, rate));
    clearTimeout(this.rateApply);
    this.rateApply = window.setTimeout(() => this.applyRate(), RATE_SETTLE);
  }

  /** 0–1 gain of the vocals stem. */
  setVocals(level: number) {
    this.vocalsLevel = Math.max(0, Math.min(1, level));
    this.applyVocals();
  }

  setLoop(loop: Loop) {
    this.loop = { ...loop };
  }

  /** Stop and let go of the current song. */
  unload() {
    this.loads++;
    this.pause();
    this.buffers = null;
    this.duration = 0;
    this.media = 0;
    this.base = 0;
    this.pass = 0;
    this.at = 0;
    this.emit('time', 0);
  }

  // ---------- internals ----------

  /** The AudioContext and the fixed part of the graph; made on first use (it may start suspended until a tap). */
  private context() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.vocalsIn = ctx.createGain();
    this.vocalsGain = ctx.createGain();
    this.vocalsIn.connect(this.vocalsGain).connect(this.master);
    this.backingIn = ctx.createGain();
    this.centreCutGraph(ctx, this.backingIn).connect(this.master);
    this.ctx = ctx;
    this.stretchReady = SoundTouchNode.register(ctx, processorUrl).then(
      () => (this.stretchOk = true),
      () => false,
    );
    return ctx;
  }

  private async decode(ctx: AudioContext, url: string) {
    const reply = await fetch(url);
    if (!reply.ok) throw new Error(`Could not load ${url}`);
    const bytes = await reply.arrayBuffer();
    return new Promise<AudioBuffer>((resolve, reject) => void ctx.decodeAudioData(bytes, resolve, reject));
  }

  /**
   * Split a stereo mix into its centre (L + R) and sides (L − R), and put it
   * back together with part of the centre, above the bass, taken away:
   *   left  = sides + centre + cut × highpass(centre)
   *   right = −sides + centre + cut × highpass(centre)
   * With `cut` at 0 this is exactly the original left and right.
   */
  private centreCutGraph(ctx: AudioContext, input: AudioNode): AudioNode {
    const gain = (value: number) => {
      const g = ctx.createGain();
      g.gain.value = value;
      return g;
    };
    const split = ctx.createChannelSplitter(2);
    input.connect(split);
    const centre = ctx.createGain();
    split.connect(gain(0.5), 0).connect(centre);
    split.connect(gain(0.5), 1).connect(centre);
    const sides = ctx.createGain();
    split.connect(gain(0.5), 0).connect(sides);
    split.connect(gain(-0.5), 1).connect(sides);
    const highs = ctx.createBiquadFilter();
    highs.type = 'highpass';
    highs.frequency.value = CENTRE_CUT_HZ;
    this.centreCut = gain(0);
    centre.connect(highs).connect(this.centreCut);
    const left = ctx.createGain();
    const right = ctx.createGain();
    for (const node of [centre, this.centreCut]) {
      node.connect(left);
      node.connect(right);
    }
    sides.connect(left);
    sides.connect(gain(-1)).connect(right);
    const merge = ctx.createChannelMerger(2);
    left.connect(merge, 0, 0);
    right.connect(merge, 0, 1);
    return merge;
  }

  private applyVocals() {
    const { ctx, vocalsGain, centreCut } = this;
    if (!ctx || !vocalsGain || !centreCut) return;
    vocalsGain.gain.setTargetAtTime(this.vocalsLevel, ctx.currentTime, 0.015);
    centreCut.gain.setTargetAtTime(this.hasVocals ? 0 : this.vocalsLevel - 1, ctx.currentTime, 0.015);
  }

  /** A new rate while playing: the chains are rebuilt at the current position (behind a gain dip). */
  private applyRate() {
    if (this.chain && this.playing) this.jump(this.time);
  }

  /** Where in the audio a song time falls, and which stretch of the song the audio stands in for there. */
  private place(t: number) {
    if (this.media >= this.duration - 0.01) return { base: 0, pass: 0, at: t };
    const base = t < this.offset ? 0 : this.offset;
    const pass = Math.floor((t - base) / this.media);
    return { base, pass, at: t - base - pass * this.media };
  }

  /** Song time at which the audio runs out and starts over (never, when it is the whole song). */
  private get seam() {
    if (this.media >= this.duration - 0.01) return Infinity;
    const next = this.base + (this.pass + 1) * this.media;
    return this.base < this.offset ? Math.min(next, this.offset) : next;
  }

  /** Move to a song time. Anything sounding is restarted there. */
  private setTime(time: number) {
    const { base, pass, at } = this.place(time);
    const wasSounding = !!this.chain;
    this.stopChain();
    this.base = base;
    this.pass = pass;
    this.at = Math.max(0, Math.min(at, this.media));
    if (wasSounding) this.startChain();
    this.emit('time', time);
  }

  /** Start the sources at `at`: straight through at full speed, through the stretcher when slowed. */
  private startChain() {
    const { ctx, buffers, backingIn, vocalsIn } = this;
    if (!ctx || !buffers || !backingIn || !vocalsIn || this.chain) return;
    const stretched = this.rate < 1 && this.stretchOk;
    const sources: AudioBufferSourceNode[] = [];
    const nodes: AudioNode[] = [];
    const feed = (buffer: AudioBuffer, into: AudioNode) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = this.rate;
      if (stretched) {
        const stretch = new SoundTouchNode({ context: ctx });
        stretch.playbackRate.value = this.rate;
        stretch.pitch.value = 1;
        source.connect(stretch).connect(into);
        nodes.push(stretch);
      } else source.connect(into);
      sources.push(source);
      return source;
    };
    const backing = feed(buffers.backing, backingIn);
    if (buffers.vocals) feed(buffers.vocals, vocalsIn);
    const from = Math.min(this.at, Math.max(0, this.media - 0.01));
    const chain: Chain = { sources, nodes, startedAt: ctx.currentTime, from, stretched };
    backing.onended = () => {
      if (this.chain === chain) this.reachedEnd();
    };
    for (const source of sources) source.start(0, from);
    this.chain = chain;
  }

  /** Silence the sources, remembering where they were. */
  private stopChain() {
    const c = this.chain;
    if (!c) return;
    this.at = this.audioTime;
    this.chain = null;
    for (const source of c.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* never started */
      }
      source.disconnect();
    }
    for (const node of c.nodes) node.disconnect();
  }

  /** Four clicks (the first one higher), then the music starts. */
  private startCount() {
    const ctx = this.ctx;
    this.cancelCount();
    if (!ctx) return this.startChain();
    this.stopChain();
    this.counting = true;
    const beat = 60 / this.countIn.bpm / this.rate;
    const out = ctx.createGain();
    out.gain.value = 0.22;
    out.connect(ctx.destination);
    for (let i = 0; i < COUNT_BEATS; i++) {
      const at = ctx.currentTime + 0.04 + i * beat;
      const click = ctx.createOscillator();
      const env = ctx.createGain();
      click.frequency.value = i === 0 ? 1760 : 1320;
      env.gain.setValueAtTime(0, at);
      env.gain.linearRampToValueAtTime(1, at + 0.002);
      env.gain.exponentialRampToValueAtTime(0.001, at + 0.06);
      click.connect(env).connect(out);
      click.start(at);
      click.stop(at + 0.08);
      this.countClicks.push(click);
      this.countTimers.push(window.setTimeout(() => this.emit('count', i + 1), 40 + i * beat * 1000));
    }
    this.countTimers.push(window.setTimeout(() => this.finishCount(), 40 + COUNT_BEATS * beat * 1000));
  }
  /** The count is over (or switched off mid-count): start the music. */
  private finishCount() {
    if (!this.counting) return;
    this.cancelCount();
    if (this.playing) this.startChain();
  }
  private cancelCount() {
    this.countTimers.forEach(clearTimeout);
    this.countTimers = [];
    for (const click of this.countClicks) {
      try {
        click.stop();
      } catch {
        /* already finished */
      }
    }
    this.countClicks = [];
    if (!this.counting) return;
    this.counting = false;
    this.emit('count', 0);
  }

  /** Move to a song time with a very short gain dip so there is no click, holding the music for a count-in if asked. */
  private jump(to: number, countIn = false) {
    this.pendingJump = to;
    this.cancelCount();
    if (this.jumping) return;
    this.jumping = true;
    const { ctx, master } = this;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + DIP);
    }
    window.setTimeout(() => {
      const target = this.pendingJump ?? to;
      this.pendingJump = null;
      this.stopChain();
      const { base, pass, at } = this.place(target);
      this.base = base;
      this.pass = pass;
      this.at = Math.max(0, Math.min(at, this.media));
      if (this.playing) {
        if (countIn) this.startCount();
        else this.startChain();
      }
      this.emit('time', target);
      if (ctx && master) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(0, ctx.currentTime);
        master.gain.linearRampToValueAtTime(1, ctx.currentTime + DIP);
      }
      this.jumping = false;
    }, DIP * 1000);
  }

  private reachedEnd() {
    if (this.playing && this.seam < this.duration - 0.05) {
      // The audio is over but the song is not: carry on from the start of the clip.
      this.stopChain();
      this.setTime(this.seam);
      this.startChain();
      return;
    }
    if (this.loop.on && this.playing) {
      // The loop runs to the very end of the song: go round again.
      this.stopChain();
      this.setTime(this.loop.start);
      this.startChain();
      return;
    }
    this.pause();
    this.emit('ended', undefined);
  }

  private tick = () => {
    if (!this.playing) return;
    this.frame = requestAnimationFrame(this.tick);
    if (this.jumping || this.counting) return;
    const t = this.time;
    this.emit('time', t);

    if (this.loop.on && t >= this.loop.end - LOOK_AHEAD * this.rate) {
      this.jump(this.loop.start, this.countIn.on);
      return;
    }
    if (t >= this.duration - 0.01) {
      this.reachedEnd();
      return;
    }
    // A clip standing in for the song has run out: start it over, with a dip rather than a click.
    if (t >= this.seam - LOOK_AHEAD * this.rate) this.jump(this.seam);
  };
}
