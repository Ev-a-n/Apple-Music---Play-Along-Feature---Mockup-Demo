// The Play Along screen. One set of elements; CSS arranges them for upright
// and sideways.
import { useState } from 'react';
import { copy } from '../copy';
import { Icon } from '../icons';
import { formatTime, songs, type Song } from '../songs';
import { actions, type AppState } from '../state/app';
import { useTime } from '../state/time';
import { AlbumArt } from './AlbumArt';
import { Lyrics } from './Lyrics';
import { Slider } from './Slider';
import { Timeline } from './Timeline';
import type { Orientation } from './Viewer';

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

  return (
    <section className={`screen pa ${active ? 'is-active' : ''}`} inert={!active} aria-label={t.label}>
      <div className="pa-label">
        <Icon name="metronome" size={15} />
        {t.label}
      </div>
      <button className="glass pa-close hit" aria-label={t.close} data-nodtap onClick={actions.closePlayAlong}>
        <Icon name="xmark" size={18} />
      </button>

      <div className="pa-header" data-nodtap>
        <div className="song-head">
          <AlbumArt song={song} />
          <div className="song-head-text">
            <div className="song-head-title fade-right">{song.title}</div>
            <div className="song-head-artist fade-right">{song.artist}</div>
          </div>
        </div>
      </div>
      <div className="pa-dots" role="img" aria-label={t.songOf(app.songIndex + 1, songs.length)}>
        {songs.map((s, i) => (
          <i key={s.id} className={i === app.songIndex ? 'on' : ''} />
        ))}
      </div>

      <Lyrics song={song} duration={duration} loop={loop} visibleLines={orientation === 'upright' ? 5 : 3} loading={app.loading} onTapLine={actions.tapLyric} />

      <Timeline song={song} duration={duration} loop={loop} loading={app.loading} onChange={actions.setLoop} onDragged={() => actions.tick('markers')} />
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
    </section>
  );
}
