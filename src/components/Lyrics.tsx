// Apple Music style lyrics: big bold lines, the current one brightest.
import { useMemo } from 'react';
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
  visibleLines: number;
  loading: boolean;
  onTapLine: (line: LyricLine) => void;
}

export function Lyrics({ song, duration, loop, visibleLines, loading, onTapLine }: Props) {
  const rows = useMemo(() => lyricRows(song, duration), [song, duration]);
  const current = useTime((t) => {
    let i = 0;
    while (i < rows.length - 1 && rows[i + 1].t <= t + 0.02) i++;
    return i;
  });

  const inLoop = (row: Row) => !row.dots && row.t >= loop.start - 0.05 && row.t < loop.end - 0.05;
  const first = rows.findIndex(inLoop);
  const last = rows.reduce((found, row, i) => (inLoop(row) ? i : found), -1);

  return (
    <div className={`pa-lyrics ${loading ? 'shimmer' : ''}`} data-nodtap role="group" aria-label={copy.playAlong.lyrics}>
      <div className="lyrics-view">
        <div className="lyrics-list" style={{ '--i': current } as React.CSSProperties}>
          {first >= 0 && (
            <div
              className={`lyrics-loopbar ${loop.on ? '' : 'off'}`}
              style={{ top: `calc(${first} * var(--pitch))`, height: `calc(${last - first} * var(--pitch) + var(--lyric-line))` }}
            />
          )}
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
