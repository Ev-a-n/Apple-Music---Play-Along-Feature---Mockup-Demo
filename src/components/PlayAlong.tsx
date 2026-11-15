// The Play Along screen. One set of elements; CSS arranges them for upright
// and sideways.
import { useRef, useState, type PointerEvent } from 'react';
import { copy } from '../copy';
import { Icon } from '../icons';
import { haptic } from '../haptic';
import { formatTime, songs, type Song } from '../songs';
import { actions, type AppState } from '../state/app';
import { useTime } from '../state/time';
import { Lyrics } from './Lyrics';
import { Slider } from './Slider';
import { SongHeader } from './SongHeader';
import { Timeline } from './Timeline';
import type { Orientation } from './Viewer';

const TAP_MS = 350; // a press held longer than this is not a tap
const TAP_MOVE = 12; // px a press may move and still be a tap
const DOUBLE_TAP_MS = 320; // two taps this close together restart the loop
const DOUBLE_TAP_MOVE = 40; // px between the two taps

interface Props {
  app: AppState;
  song: Song;
  orientation: Orientation;
}

export function PlayAlong({ app, song, orientation }: Props) {
  const active = app.screen === 'playAlong';
  const t = copy.playAlong;
  const { settings, duration } = app;
  const loop = { start: settings.loopStart, end: settings.loopEnd, on: settings.loopOn };
  const second = useTime((s) => Math.floor(s));
  const [airplayOpen, setAirplayOpen] = useState(false);

  // Double-tap (or double-click) on open space restarts the loop. A tap is a
  // quick press that does not move; drags (the loop markers, a swipe) and
  // presses on controls (buttons, sliders, anything marked data-nodtap) never
  // count. Everything else on the screen is open space.
  const [badge, setBadge] = useState(0);
  const lastTap = useRef({ at: 0, x: 0, y: 0 });
  const pressed = useRef({ at: 0, x: 0, y: 0 });
  const onPointerDown = (e: PointerEvent) => {
    pressed.current = { at: performance.now(), x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const last = lastTap.current;
    const press = pressed.current;
    const now = performance.now();
    const tapped = now - press.at < TAP_MS && Math.hypot(e.clientX - press.x, e.clientY - press.y) < TAP_MOVE;
    if (!tapped || (e.target as Element).closest('button, [role="slider"], [data-nodtap]')) {
      last.at = 0;
      return;
    }
    if (now - last.at < DOUBLE_TAP_MS && Math.hypot(e.clientX - last.x, e.clientY - last.y) < DOUBLE_TAP_MOVE) {
      last.at = 0;
      actions.restartLoop();
      actions.tick('doubleTap');
      haptic();
      // With count-in on, the count itself is the feedback.
      if (!(app.countIn && app.playing && loop.on)) setBadge((n) => n + 1);
    } else lastTap.current = { at: now, x: e.clientX, y: e.clientY };
  };

  return (
    <section className={`screen pa ${active ? 'is-active' : ''}`} inert={!active} aria-label={t.label} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <div className="pa-label">
        <Icon name="metronome" size={15} />
        {t.label}
      </div>
      <button className="glass pa-close hit" aria-label={t.close} data-nodtap onClick={actions.closePlayAlong}>
        <Icon name="xmark" size={18} />
      </button>

      <SongHeader songIndex={app.songIndex} />
      <div className="pa-dots" role="img" aria-label={t.songOf(app.songIndex + 1, songs.length)}>
        {songs.map((s, i) => (
          <i key={s.id} className={i === app.songIndex ? 'on' : ''} />
        ))}
      </div>

      <Lyrics song={song} duration={duration} loop={loop} scrub={app.scrub} visibleLines={orientation === 'upright' ? 5 : 3} loading={app.loading} onTapLine={actions.tapLyric} />

      <Timeline song={song} duration={duration} loop={loop} loading={app.loading} onChange={actions.setLoop} onScrub={actions.setScrub} onDragged={actions.loopDragged} onTap={actions.jumpTo} />
      <div className="pa-timerow">
        <span>{formatTime(second)}</span>
        <button className="glass loop-pill" data-nodtap aria-pressed={loop.on} aria-label={loop.on ? t.loopToggleOn : t.loopToggleOff} onClick={actions.toggleLoop}>
          {loop.on ? (
            <>
              <Icon name="repeat" size={14} />
              {formatTime(loop.start)} – {formatTime(loop.end)}
            </>
          ) : (
            t.loopOff
          )}
        </button>
        <span>−{formatTime(duration - second)}</span>
      </div>

      <div className="pa-controls" data-nodtap>
        <button aria-label={loop.on ? t.restartLoop : t.restartSong} onClick={actions.restartLoop}>
          <Icon name="toStart" size={27} />
        </button>
        <button aria-label={app.playing ? t.pause : t.play} onClick={actions.togglePlay}>
          <Icon name={app.playing ? 'pause' : 'play'} size={33} />
        </button>
        <button aria-label={t.nextSection} onClick={actions.nextSection}>
          <Icon name="toEnd" size={27} />
        </button>
      </div>

      <button className="pa-airplay" data-nodtap aria-label={t.airplay} aria-haspopup="menu" aria-expanded={airplayOpen} onClick={() => setAirplayOpen(true)}>
        <Icon name="airplay" size={22} />
      </button>
      <button className={`pa-countin ${app.countIn ? 'on' : ''}`} data-nodtap aria-label={t.countIn} aria-pressed={app.countIn} onClick={actions.toggleCountIn}>
        <Icon name="metronome" size={22} />
      </button>
      <div className={`airplay-layer ${airplayOpen ? 'open' : ''}`} inert={!airplayOpen} data-nodtap>
        <div className="airplay-scrim" onPointerDown={() => setAirplayOpen(false)} />
        <div className="airplay-menu" role="menu" aria-label={t.airplay}>
          {copy.airplayDevices.map((device, i) => (
            <button key={device} role="menuitemradio" aria-checked={i === app.airplay} onClick={() => actions.setAirplay(i)}>
              {device}
              {i === app.airplay && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      </div>

      <div className="pa-sliders">
        <Slider label={t.vocals} value={settings.vocals} min={0} max={100} onChange={actions.setVocals} disabled={!app.vocalsAvailable} note={t.vocalsUnavailable} />
        <Slider label={t.speed} value={settings.speed} min={50} max={100} onChange={actions.setSpeed} snaps={[50, 75, 100]} resetTo={100} />
      </div>
      <div className="home-indicator" />
      {app.count > 0 && (
        <div key={`count-${app.count}`} className="glass restart-badge count-badge" aria-hidden="true">
          {app.count}
        </div>
      )}
      {badge > 0 && (
        <div key={badge} className="glass restart-badge">
          <Icon name="toStart" size={30} />
        </div>
      )}
    </section>
  );
}
