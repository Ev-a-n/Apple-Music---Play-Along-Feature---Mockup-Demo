// Album art, title and artist. Swipe (or drag with the mouse) to change songs.
import { useLayoutEffect, useRef, type PointerEvent } from 'react';
import { copy } from '../copy';
import { capture } from '../haptic';
import { songs, type Song } from '../songs';
import { actions } from '../state/app';
import { AlbumArt } from './AlbumArt';

const COMMIT_AT = 0.3; // fraction of the width
const FLICK = 0.5; // px per ms
const RUBBER = 0.3; // resistance past the first and last song

function Head({ song, place }: { song?: Song; place: 'prev' | 'current' | 'next' }) {
  if (!song) return null;
  return (
    <div className={`song-head song-head-${place}`} aria-hidden={place !== 'current'}>
      <AlbumArt song={song} />
      <div className="song-head-text">
        <div className="song-head-title fade-right">{song.title}</div>
        <div className="song-head-artist fade-right">{song.artist}</div>
      </div>
    </div>
  );
}

export function SongHeader({ songIndex }: { songIndex: number }) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; t0: number; scale: number; width: number; dx: number } | null>(null);
  /** Where the track should start from when the song changes mid-swipe. */
  const handoff = useRef<number | null>(null);
  const previous = useRef(songIndex);

  const place = (x: number, animate: boolean) => {
    const el = track.current;
    if (!el) return;
    el.style.transition = animate ? 'transform var(--t-med) var(--spring)' : 'none';
    el.style.transform = `translateX(${x}px)`;
  };

  // The new song's header slides in from the side it was waiting on.
  useLayoutEffect(() => {
    const el = track.current;
    if (!el || previous.current === songIndex) return;
    const width = el.offsetWidth;
    const from = handoff.current ?? (songIndex > previous.current ? width : -width);
    previous.current = songIndex;
    handoff.current = null;
    place(from, false);
    void el.offsetWidth; // apply the start position before animating
    place(0, true);
  }, [songIndex]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    capture(e);
    drag.current = { x0: e.clientX, t0: performance.now(), scale: el.getBoundingClientRect().width / el.offsetWidth, width: el.offsetWidth, dx: 0 };
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    let dx = (e.clientX - d.x0) / d.scale;
    const blocked = (dx > 0 && songIndex === 0) || (dx < 0 && songIndex === songs.length - 1);
    if (blocked) dx *= RUBBER;
    d.dx = dx;
    place(dx, false);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const step = d.dx < 0 ? 1 : -1;
    const speed = Math.abs(d.dx) / Math.max(1, performance.now() - d.t0);
    const far = Math.abs(d.dx) > d.width * COMMIT_AT || (speed > FLICK && Math.abs(d.dx) > 24);
    handoff.current = step * d.width + d.dx;
    if (far && actions.changeSong(step)) actions.tick('swipe');
    else {
      handoff.current = null;
      place(0, true);
    }
  };

  return (
    <div className="pa-header" data-nodtap role="group" aria-label={copy.playAlong.header} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div className="song-track" ref={track}>
        <Head song={songs[songIndex - 1]} place="prev" />
        <Head song={songs[songIndex]} place="current" />
        <Head song={songs[songIndex + 1]} place="next" />
      </div>
    </div>
  );
}
