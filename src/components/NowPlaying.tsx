// The regular Apple Music player. Play Along is opened from its More menu.
import { useEffect, useRef } from 'react';
import { copy } from '../copy';
import { Icon } from '../icons';
import { formatTime, type Song } from '../songs';
import { actions, type AppState } from '../state/app';
import { time, useTime } from '../state/time';
import { AlbumArt } from './AlbumArt';
import { MoreMenu } from './MoreMenu';

export function NowPlaying({ app, song, duration }: { app: AppState; song: Song; duration: number }) {
  const active = app.screen === 'nowPlaying';
  const fill = useRef<HTMLDivElement>(null);
  const second = useTime((t) => Math.floor(t));

  useEffect(() => {
    const draw = () => {
      if (fill.current) fill.current.style.transform = `scaleX(${Math.min(1, time.get() / duration)})`;
    };
    draw();
    return time.subscribe(draw);
  }, [duration]);

  const t = copy.nowPlaying;
  return (
    <section className={`screen np ${active ? 'is-active' : ''}`} inert={!active} aria-label={`${song.title}, ${song.artist}`}>
      <div className="np-grabber" />
      <AlbumArt song={song} className={`np-art ${app.playing ? 'playing' : ''}`} />
      <div className="np-title">
        <div className="fade-right np-song">{song.title}</div>
        <div className="fade-right np-artist">{song.artist}</div>
      </div>
      <button className="glass np-more" aria-label={t.more} aria-haspopup="menu" aria-expanded={app.menuOpen} onClick={() => actions.setMenu(true)}>
        <Icon name="ellipsis" size={18} />
      </button>
      <div className="np-progress" role="progressbar" aria-label={t.progress} aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={second} aria-valuetext={formatTime(second)}>
        <div className="np-bar">
          <div className="np-bar-fill" ref={fill} />
        </div>
        <div className="np-times">
          <span>{formatTime(second)}</span>
          <span>−{formatTime(duration - second)}</span>
        </div>
      </div>
      <div className="np-transport">
        <button aria-label={t.previous} onClick={() => actions.changeSong(-1)}>
          <Icon name="backward" size={40} />
        </button>
        <button aria-label={app.playing ? t.pause : t.play} onClick={actions.togglePlay}>
          <Icon name={app.playing ? 'pause' : 'play'} size={40} />
        </button>
        <button aria-label={t.next} onClick={() => actions.changeSong(1)}>
          <Icon name="forward" size={40} />
        </button>
      </div>
      <div className="np-volume" aria-hidden="true">
        <Icon name="speaker" size={15} />
        <div className="np-bar">
          <div className="np-bar-fill" style={{ transform: 'scaleX(0.72)' }} />
        </div>
        <Icon name="speakerLoud" size={17} />
      </div>
      <div className="np-bottom">
        <button aria-label={t.lyrics}>
          <Icon name="quote" size={22} />
        </button>
        <button aria-label={t.airplay}>
          <Icon name="airplay" size={22} />
        </button>
        <button aria-label={t.queue}>
          <Icon name="list" size={22} />
        </button>
      </div>
      <MoreMenu open={app.menuOpen} song={song} />
    </section>
  );
}
