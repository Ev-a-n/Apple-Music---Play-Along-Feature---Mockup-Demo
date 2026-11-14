// The playback engine. The UI never touches audio elements directly.
//
//   <audio backing> ─ MediaElementSource ─ gain ─┐
//   <audio vocals>  ─ MediaElementSource ─ gain ─┴─ master ─ speakers
//
// Speed changes use playbackRate with preservesPitch, so pitch stays the same.

export interface EngineSource {
  backing: string;
  /** null plays the backing element alone (a single full mix). */
  vocals: string | null;
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
}

const DRIFT_LIMIT = 0.04; // seconds the stems may drift apart before correction
const DRIFT_CHECK = 250; // ms between drift checks
const DIP = 0.015; // seconds of gain dip around a jump, to avoid a click
const LOOK_AHEAD = 0.032; // seconds before the loop end at which the jump starts

type PitchElement = HTMLAudioElement & { webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean };

export class Engine {
  private backing = this.element();
  private vocals = this.element();
  private ctx?: AudioContext;
  private master?: GainNode;
  private vocalsGain?: GainNode;
  private hasVocals = false;
  private vocalsLevel = 1;
  private rate = 1;
  private loop: Loop = { start: 0, end: 0, on: false };
  private frame = 0;
  private lastDriftCheck = 0;
  private jumping = false;
  private pendingJump: number | null = null;
  private rateSync = 0;
  private loads = 0;
  private listeners: { [K in keyof Events]: Set<(value: Events[K]) => void> } = { time: new Set(), playing: new Set(), ended: new Set() };

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
    return this.pendingJump ?? this.backing.currentTime;
  }

  /** Load a song. Resolves with its duration (the shorter stem). */
  async load(source: EngineSource): Promise<number> {
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
    this.duration = Math.min(...durations.filter((d) => Number.isFinite(d)));
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
    const started = [this.backing.play()];
    if (this.hasVocals) started.push(this.vocals.play());
    this.playing = true;
    this.emit('playing', true);
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(this.tick);
    try {
      await Promise.all(started);
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
    if (!this.playing) return;
    this.playing = false;
    this.emit('playing', false);
    this.emit('time', this.time);
  }

  seek(time: number) {
    const to = Math.max(0, Math.min(time, Math.max(0, this.duration - 0.05)));
    if (this.playing) this.jump(to);
    else this.setTime(to);
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
    this.emit('time', 0);
  }

  // ---------- internals ----------

  private element() {
    const el = new Audio() as PitchElement;
    el.preload = 'auto';
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
      this.vocalsGain.gain.value = this.vocalsLevel;
      ctx.createMediaElementSource(this.vocals).connect(this.vocalsGain).connect(this.master);
      ctx.createMediaElementSource(this.backing).connect(ctx.createGain()).connect(this.master);
      this.ctx = ctx;
    }
    if (this.ctx.state !== 'running') void this.ctx.resume();
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
    if (this.ctx && this.vocalsGain) this.vocalsGain.gain.setTargetAtTime(this.vocalsLevel, this.ctx.currentTime, 0.015);
  }

  private setTime(time: number) {
    this.backing.currentTime = time;
    if (this.hasVocals) this.vocals.currentTime = time;
    this.emit('time', time);
  }

  /** Move both stems together, with a very short gain dip so there is no click. */
  private jump(to: number) {
    this.pendingJump = to;
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
      this.setTime(target);
    }, DIP * 1000);
  }

  private reachedEnd() {
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
    if (this.jumping) return;
    const t = this.backing.currentTime;
    this.emit('time', t);

    if (this.loop.on && t >= this.loop.end - LOOK_AHEAD * this.rate) {
      this.jump(this.loop.start);
      return;
    }
    // Stems of different lengths: stop at the shorter one.
    if (t >= this.duration - 0.01 && !this.backing.ended) {
      this.reachedEnd();
      return;
    }
    if (this.hasVocals && now - this.lastDriftCheck > DRIFT_CHECK) {
      this.lastDriftCheck = now;
      if (Math.abs(this.vocals.currentTime - t) > DRIFT_LIMIT) this.vocals.currentTime = t;
    }
  };
}
