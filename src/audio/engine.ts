// The playback engine. The UI never touches audio elements directly.
//
//   <audio backing> ─ MediaElementSource ─ centre cut ─┐
//   <audio vocals>  ─ MediaElementSource ─ gain ───────┴─ master ─ speakers
//
// Speed changes use playbackRate with preservesPitch, so pitch stays the same.
//
// Time is song time. Usually the audio is the whole song, but a short clip can
// stand in for a longer song (see `Span`): it plays in time with the song from
// `start` and starts over wherever else the playhead is. The UI never notices.
//
// Vocals: with two stems the vocals stem has its own gain. With a single mix,
// the vocals slider instead takes the centre of the stereo image (where a lead
// vocal almost always sits) out, above the bass. At 100% the mix is untouched.

export interface EngineSource {
  backing: string;
  /** null plays the backing element alone (a single full mix). */
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

const DRIFT_LIMIT = 0.04; // seconds the stems may drift apart before correction
const DRIFT_CHECK = 250; // ms between drift checks
const DIP = 0.015; // seconds of gain dip around a jump, to avoid a click
const COUNT_BEATS = 4; // one bar of clicks before the loop starts again
const LOOK_AHEAD = 0.032; // seconds before the loop end at which the jump starts
const CENTRE_CUT_HZ = 160; // the centre of the mix is turned down above this (bass and kick stay)

type PitchElement = HTMLAudioElement & { webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean };

export class Engine {
  private backing = this.element();
  private vocals = this.element();
  private ctx?: AudioContext;
  private master?: GainNode;
  private vocalsGain?: GainNode;
  /** How much of the centre of a single mix is taken away: 0 none, −1 all. */
  private centreCut?: GainNode;
  private hasVocals = false;
  /** Seconds of audio actually loaded; `duration` is the song. */
  private media = 0;
  /** Where in the song the audio plays in time with it. */
  private offset = 0;
  /** The stretch of the song the audio is standing in for right now: song time = base + pass × media + audio time. */
  private base = 0;
  private pass = 0;
  private vocalsLevel = 1;
  private rate = 1;
  private loop: Loop = { start: 0, end: 0, on: false };
  private frame = 0;
  private lastDriftCheck = 0;
  private jumping = false;
  private pendingJump: number | null = null;
  private rateSync = 0;
  private loads = 0;
  private countIn = { on: false, bpm: 120 };
  private counting = false;
  private countTimers: number[] = [];
  private countClicks: OscillatorNode[] = [];
  /** True once the elements have played from a tap; only then may a timer start them. */
  private primed = false;
  private listeners: { [K in keyof Events]: Set<(value: Events[K]) => void> } = { time: new Set(), playing: new Set(), ended: new Set(), count: new Set() };

  duration = 0;
  playing = false;

  constructor() {
    this.backing.addEventListener('ended', () => this.reachedEnd());
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

  get time() {
    return this.pendingJump ?? this.base + this.pass * this.media + this.backing.currentTime;
  }
  /** Seconds into the loaded audio itself (the clip, when one stands in for the song). */
  get audioTime() {
    return this.backing.currentTime;
  }

  /** Load a song. Resolves with its duration: the song's length, or the audio's (the shorter stem) without a `span`. */
  async load(source: EngineSource, span?: Span): Promise<number> {
    const load = ++this.loads;
    this.pause();
    this.hasVocals = source.vocals !== null;
    const ready = (el: HTMLAudioElement, src: string) =>
      new Promise<number>((resolve, reject) => {
        const done = (fn: () => void) => {
          clearTimeout(timer);
          el.removeEventListener('loadedmetadata', ok);
          el.removeEventListener('error', fail);
          fn();
        };
        const ok = () => done(() => resolve(el.duration));
        const fail = () => done(() => reject(new Error(`Could not load ${src}`)));
        const timer = setTimeout(fail, 20000);
        el.addEventListener('loadedmetadata', ok);
        el.addEventListener('error', fail);
        el.src = src;
        el.load();
      });
    const tasks = [ready(this.backing, source.backing)];
    if (source.vocals) tasks.push(ready(this.vocals, source.vocals));
    else this.unloadElement(this.vocals);
    const durations = await Promise.all(tasks);
    if (load !== this.loads) throw new Error('superseded');
    this.media = Math.min(...durations.filter((d) => Number.isFinite(d)));
    this.offset = span?.start ?? 0;
    this.duration = span ? Math.max(span.length, this.media) : this.media;
    this.base = 0;
    this.pass = 0;
    this.applyRate();
    this.applyVocals();
    this.emit('time', 0);
    return this.duration;
  }

  /** Must be called from a tap or key press: browsers block audio otherwise. */
  async play() {
    if (!this.backing.src) return;
    this.unlock();
    if (this.time >= this.duration - 0.05) this.setTime(this.loop.on ? this.loop.start : 0);
    if (this.hasVocals) this.vocals.currentTime = this.backing.currentTime;
    this.applyRate();
    this.playing = true;
    this.emit('playing', true);
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(this.tick);
    // Starting from the top of the loop: count one bar in first.
    if (this.primed && this.countIn.on && this.loop.on && Math.abs(this.time - this.loop.start) < 0.06) {
      this.startCount();
      return;
    }
    try {
      await this.startElements();
      this.primed = true;
    } catch (error) {
      // A pause() that interrupts play() is normal; anything else is a real failure.
      if ((error as DOMException).name !== 'AbortError') {
        this.pause();
        throw error;
      }
    }
  }

  pause() {
    this.backing.pause();
    this.vocals.pause();
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

  /** 0.5–1. Pitch is preserved. */
  setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(1, rate));
    this.applyRate();
    // Line the stems up again once the slider settles.
    clearTimeout(this.rateSync);
    this.rateSync = window.setTimeout(() => {
      if (this.hasVocals && !this.jumping) this.vocals.currentTime = this.backing.currentTime;
    }, 140);
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
    this.unloadElement(this.backing);
    this.unloadElement(this.vocals);
    this.duration = 0;
    this.media = 0;
    this.base = 0;
    this.pass = 0;
    this.emit('time', 0);
  }

  // ---------- internals ----------

  private element() {
    const el = new Audio() as PitchElement;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    el.setAttribute('playsinline', '');
    return el;
  }
  private unloadElement(el: HTMLAudioElement) {
    el.pause();
    if (!el.getAttribute('src')) return;
    el.removeAttribute('src');
    el.load();
  }

  /** Create (or wake) the AudioContext on the first user gesture. */
  private unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.vocalsGain = ctx.createGain();
      ctx.createMediaElementSource(this.vocals).connect(this.vocalsGain).connect(this.master);
      this.centreCutGraph(ctx, ctx.createMediaElementSource(this.backing)).connect(this.master);
      this.ctx = ctx;
      this.applyVocals();
    }
    if (this.ctx.state !== 'running') void this.ctx.resume();
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

  private applyRate() {
    for (const el of [this.backing, this.vocals] as PitchElement[]) {
      el.preservesPitch = true;
      el.webkitPreservesPitch = true;
      el.mozPreservesPitch = true;
      el.defaultPlaybackRate = this.rate;
      el.playbackRate = this.rate;
    }
  }
  private applyVocals() {
    const { ctx, vocalsGain, centreCut } = this;
    if (!ctx || !vocalsGain || !centreCut) return;
    vocalsGain.gain.setTargetAtTime(this.vocalsLevel, ctx.currentTime, 0.015);
    centreCut.gain.setTargetAtTime(this.hasVocals ? 0 : this.vocalsLevel - 1, ctx.currentTime, 0.015);
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

  private startElements() {
    const started = [this.backing.play()];
    if (this.hasVocals) started.push(this.vocals.play());
    return Promise.all(started);
  }

  /** Four clicks (the first one higher), then the music starts. */
  private startCount() {
    const ctx = this.ctx;
    this.cancelCount();
    if (!ctx) return void this.startElements();
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
    if (this.playing) this.startElements().catch(() => this.pause());
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

  private setTime(time: number) {
    const { base, pass, at } = this.place(time);
    this.base = base;
    this.pass = pass;
    this.backing.currentTime = at;
    if (this.hasVocals) this.vocals.currentTime = at;
    this.emit('time', time);
  }

  /** Move both stems together, with a very short gain dip so there is no click. */
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
      const restore = () => {
        clearTimeout(fallback);
        this.backing.removeEventListener('seeked', restore);
        if (ctx && master) {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setValueAtTime(0, ctx.currentTime);
          master.gain.linearRampToValueAtTime(1, ctx.currentTime + DIP);
        }
        this.jumping = false;
      };
      const fallback = window.setTimeout(restore, 120);
      this.backing.addEventListener('seeked', restore);
      if (countIn && this.playing) {
        // Hold the music at the new position while the bar is counted in.
        this.backing.pause();
        this.vocals.pause();
        this.startCount();
      } else if (this.playing && this.backing.paused) {
        // A count was interrupted by this jump: get the music going again.
        this.startElements().catch(() => this.pause());
      }
      this.setTime(target);
    }, DIP * 1000);
  }

  private reachedEnd() {
    if (this.playing && this.seam < this.duration - 0.05) {
      // The audio is over but the song is not: carry on from the start of the clip.
      this.setTime(this.seam);
      void this.backing.play();
      if (this.hasVocals) void this.vocals.play();
      return;
    }
    if (this.loop.on && this.playing) {
      // The loop runs to the very end of the song: go round again.
      this.setTime(this.loop.start);
      void this.backing.play();
      if (this.hasVocals) void this.vocals.play();
      return;
    }
    this.pause();
    this.emit('ended', undefined);
  }

  private tick = (now: number) => {
    if (!this.playing) return;
    this.frame = requestAnimationFrame(this.tick);
    if (this.jumping || this.counting) return;
    const t = this.time;
    this.emit('time', t);

    if (this.loop.on && t >= this.loop.end - LOOK_AHEAD * this.rate) {
      this.jump(this.loop.start, this.countIn.on);
      return;
    }
    // Stems of different lengths: stop at the shorter one.
    if (t >= this.duration - 0.01 && !this.backing.ended) {
      this.reachedEnd();
      return;
    }
    // A clip standing in for the song has run out: start it over, with a dip rather than a click.
    if (t >= this.seam - LOOK_AHEAD * this.rate) {
      this.jump(this.seam);
      return;
    }
    if (this.hasVocals && now - this.lastDriftCheck > DRIFT_CHECK) {
      this.lastDriftCheck = now;
      const at = this.backing.currentTime;
      if (Math.abs(this.vocals.currentTime - at) > DRIFT_LIMIT) this.vocals.currentTime = at;
    }
  };
}
