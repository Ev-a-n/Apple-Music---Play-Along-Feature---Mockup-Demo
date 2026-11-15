// Apple Music style lyrics: big bold lines, the current one brightest.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { copy } from '../copy';
import type { LyricLine, Song } from '../songs';
import { useTime } from '../state/time';

interface Row extends LyricLine {
  /** Instrumental stretch: shown as three pulsing dots. */
  dots?: boolean;
}

const MIN_GAP = 2; // seconds without a lyric line before dots are shown

export function lyricRows(song: Song, duration: number): Row[] {
  const rows: Row[] = [];
  let at = 0;
  for (const line of song.lyrics) {
    if (line.t - at >= MIN_GAP) rows.push({ t: at, end: line.t, text: '', dots: true });
    rows.push(line);
    at = line.end;
  }
  if (duration - at >= MIN_GAP) rows.push({ t: at, end: duration, text: '', dots: true });
  return rows;
}

interface Props {
  song: Song;
  duration: number;
  loop: { start: number; end: number; on: boolean };
  /** While a loop marker is dragged: the time under it. The lyrics follow it instead of the playhead. */
  scrub: number | null;
  visibleLines: number;
  loading: boolean;
  onTapLine: (line: LyricLine) => void;
  /** Where the block sits: Play Along by default, or Now Playing's lyrics view. */
  className?: string;
  label?: string;
}

export function Lyrics({ song, duration, loop, scrub, visibleLines, loading, onTapLine, className = 'pa-lyrics', label = copy.playAlong.lyrics }: Props) {
  const rows = useMemo(() => lyricRows(song, duration), [song, duration]);
  const current = useTime((now) => {
    const t = scrub ?? now;
    let i = 0;
    while (i < rows.length - 1 && rows[i + 1].t <= t + 0.02) i++;
    return i;
  });

  const inLoop = (row: Row) => !row.dots && row.t >= loop.start - 0.05 && row.t < loop.end - 0.05;
  const first = rows.findIndex(inLoop);
  const last = rows.reduce((found, row, i) => (inLoop(row) ? i : found), -1);

  // Long lines wrap, so rows differ in height: measure them to place the list
  // (the line before the current one at the top) and the loop bar beside the loop.
  const list = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const place = () => {
      const els = Array.from(el.querySelectorAll<HTMLElement>('.lyric'));
      if (els.length < 2) return;
      const y = current > 0 ? -els[current - 1].offsetTop : els[1].offsetTop - els[0].offsetTop;
      el.style.transform = `translateY(${y}px)`;
      if (bar.current && first >= 0) {
        bar.current.style.top = `${els[first].offsetTop}px`;
        bar.current.style.height = `${els[last].offsetTop + els[last].offsetHeight - els[first].offsetTop}px`;
      }
    };
    place();
    const watch = new ResizeObserver(place);
    watch.observe(el);
    return () => watch.disconnect();
  }, [rows, current, first, last, visibleLines]);

  return (
    <div className={`${className} ${loading ? 'shimmer' : ''}`} role="group" aria-label={label}>
      <div className="lyrics-view">
        <div className="lyrics-list" ref={list} data-nodtap>
          {first >= 0 && <div className={`lyrics-loopbar ${loop.on ? '' : 'off'}`} ref={bar} />}
          {rows.map((row, i) => {
            const shown = i >= current - 1 && i < current - 1 + visibleLines;
            const cls = `lyric ${i === current ? 'current' : ''} ${loop.on && inLoop(row) ? 'in-loop' : ''}`;
            return row.dots ? (
              <div key={i} className={`${cls} lyric-dots`} role="img" aria-label={copy.playAlong.instrumental} aria-hidden={!shown}>
                <i />
                <i />
                <i />
              </div>
            ) : (
              <button key={i} className={cls} tabIndex={shown ? 0 : -1} aria-hidden={!shown} aria-current={i === current} onClick={() => onTapLine(row)}>
                {row.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
