// One plain slider style: a thin bar with a white fill and no knob.
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { capture, haptic } from '../haptic';

interface Props {
  label: string;
  /** Whole percent. */
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Stops the thumb snaps to when within `snapWithin` percent. */
  snaps?: number[];
  snapWithin?: number;
  /** Double-tap resets to this value. */
  resetTo?: number;
  disabled?: boolean;
  note?: string;
}

export function Slider({ label, value, min, max, onChange, snaps = [], snapWithin = 2, resetTo, disabled, note }: Props) {
  const [dragging, setDragging] = useState(false);
  const lastSnap = useRef<number | null>(null);
  const lastDown = useRef(0);
  const fraction = (value - min) / (max - min);

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let v = Math.round(min + f * (max - min));
    const snap = snaps.find((s) => Math.abs(v - s) <= snapWithin) ?? null;
    if (snap !== null) {
      v = snap;
      if (lastSnap.current !== snap) haptic();
    }
    lastSnap.current = snap;
    if (v !== value) onChange(v);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const now = performance.now();
    if (resetTo !== undefined && now - lastDown.current < 320) {
      lastDown.current = 0;
      haptic();
      onChange(resetTo);
      return;
    }
    lastDown.current = now;
    capture(e);
    setDragging(true);
    lastSnap.current = snaps.includes(value) ? value : null;
    fromPointer(e);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    const step = e.shiftKey ? 10 : 1;
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowUp' ? value + step
      : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? value - step
      : e.key === 'Home' ? min
      : e.key === 'End' ? max
      : null;
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    onChange(Math.max(min, Math.min(max, next)));
  };

  return (
    <div className={`slider ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`} data-nodtap>
      <div className="slider-head">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{disabled ? '—' : `${Math.round(value)}%`}</span>
      </div>
      <div
        className="slider-hit"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
        aria-valuetext={disabled ? note : `${Math.round(value)}%`}
        aria-disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => dragging && fromPointer(e)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={onKeyDown}
      >
        <div className="slider-bar">
          <div className="slider-fill" style={{ transform: `scaleX(${disabled ? 0 : fraction})` }} />
        </div>
        {snaps.map((s) => (
          <i key={s} className="slider-tick" style={{ left: `${((s - min) / (max - min)) * 100}%` }} />
        ))}
      </div>
      {disabled && note && <div className="slider-note">{note}</div>}
    </div>
  );
}
