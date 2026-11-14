// The whole song as a thin bar, with the loop between two draggable markers.
import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { copy } from '../copy';
import { capture, haptic } from '../haptic';
import { formatTime, type Song } from '../songs';
import { time } from '../state/time';

export const MIN_LOOP = 2; // seconds
const SNAP_PX = 3; // how close (on screen) a marker must be to a lyric line to snap to it

interface Props {
  song: Song;
  duration: number;
  loop: { start: number; end: number; on: boolean };
  loading: boolean;
  onChange: (start: number, end: number) => void;
  onDragged: () => void;
}

export function Timeline({ song, duration, loop, loading, onChange, onDragged }: Props) {
  const played = useRef<HTMLDivElement>(null);
  const drag = useRef<{ which: 'start' | 'end'; snapped: number | null } | null>(null);
  const beat = 60 / song.bpm;

  // The played part follows the playhead without re-rendering React.
  useEffect(() => {
    const draw = () => {
      const el = played.current;
      if (!el) return;
      const t = time.get();
      const from = loop.on ? loop.start : 0;
      const to = loop.on ? Math.min(loop.end, Math.max(loop.start, t)) : t;
      el.style.transform = `translateX(${(from / duration) * 100}%) scaleX(${Math.max(0, to - from) / duration})`;
    };
    draw();
    return time.subscribe(draw);
  }, [loop.start, loop.end, loop.on, duration]);

  /** Snap gently: to a lyric line when close, otherwise to the beat. */
  const snap = (t: number, secondsPerPx: number) => {
    const stops = [...song.lyrics.flatMap((l) => [l.t, l.end]), ...song.sections.map((s) => s.start), duration];
    const near = stops.reduce((best, s) => (Math.abs(s - t) < Math.abs(best - t) ? s : best), Infinity);
    if (Math.abs(near - t) <= SNAP_PX * secondsPerPx) return { t: near, line: near };
    return { t: Math.round(t / beat) * beat, line: null };
  };

  const move = (which: 'start' | 'end', t: number) => {
    if (which === 'start') onChange(Math.max(0, Math.min(t, loop.end - MIN_LOOP)), loop.end);
    else onChange(loop.start, Math.min(duration, Math.max(t, loop.start + MIN_LOOP)));
  };

  const onPointerDown = (which: 'start' | 'end') => (e: PointerEvent<HTMLDivElement>) => {
    capture(e);
    drag.current = { which, snapped: null };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const rail = e.currentTarget.parentElement?.parentElement;
    if (!d || !rail) return;
    const rect = rail.getBoundingClientRect();
    const raw = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
    const s = snap(raw, duration / rect.width);
    if (s.line !== null && s.line !== d.snapped) haptic();
    d.snapped = s.line;
    move(d.which, s.t);
  };
  const onPointerUp = () => {
    if (drag.current) onDragged();
    drag.current = null;
  };
  const onKeyDown = (which: 'start' | 'end') => (e: KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    e.stopPropagation();
    const at = which === 'start' ? loop.start : loop.end;
    move(which, Math.round(at / beat + dir * (e.shiftKey ? 4 : 1)) * beat);
  };

  const marker = (which: 'start' | 'end', at: number, label: string) => (
    <div className="tl-rail" style={{ transform: `translateX(${(at / duration) * 100}%)` }}>
      <div
        className={`tl-marker tl-${which}`}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(at)}
        aria-valuetext={`${label}, ${formatTime(at)}`}
        onPointerDown={onPointerDown(which)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown(which)}
      />
    </div>
  );

  return (
    <div className={`pa-timeline ${loop.on ? '' : 'loop-off'} ${loading ? 'shimmer' : ''}`} data-nodtap>
      <div className="tl-bar">
        <div className="tl-loop" style={{ transform: `translateX(${(loop.start / duration) * 100}%) scaleX(${(loop.end - loop.start) / duration})` }} />
        <div className="tl-played" ref={played} />
      </div>
      {marker('start', loop.start, copy.playAlong.loopStart)}
      {marker('end', loop.end, copy.playAlong.loopEnd)}
    </div>
  );
}
