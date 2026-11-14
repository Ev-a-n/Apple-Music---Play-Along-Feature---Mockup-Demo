// Hand-drawn icons in the spirit of SF Symbols (24px grid, rounded ends).
import type { CSSProperties, ReactNode } from 'react';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const fwd = 'M2 6.2v11.6a.8.8 0 0 0 1.24.67L12 12.9v4.9a.8.8 0 0 0 1.24.67l8.7-5.8a.8.8 0 0 0 0-1.34l-8.7-5.8A.8.8 0 0 0 12 6.2v4.9L3.24 5.53A.8.8 0 0 0 2 6.2z';
const toEnd = (
  <>
    <path d="M4 5.8v12.4a.8.8 0 0 0 1.25.66l9.35-6.2a.8.8 0 0 0 0-1.32L5.25 5.14A.8.8 0 0 0 4 5.8z" />
    <rect x="17.4" y="5" width="2.6" height="14" rx="1.3" />
  </>
);
const flip = { transform: 'translate(24 0) scale(-1 1)' };

const paths = {
  play: <path d="M6.5 4.3v15.4a1 1 0 0 0 1.52.85l12.6-7.7a1 1 0 0 0 0-1.7L8.02 3.45A1 1 0 0 0 6.5 4.3z" />,
  pause: (
    <>
      <rect x="5.5" y="4" width="4.6" height="16" rx="1.4" />
      <rect x="13.9" y="4" width="4.6" height="16" rx="1.4" />
    </>
  ),
  forward: <path d={fwd} />,
  backward: <path d={fwd} {...flip} />,
  toEnd,
  toStart: <g {...flip}>{toEnd}</g>,
  xmark: <path {...S} strokeWidth={2.4} d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  ellipsis: (
    <>
      <circle cx="5.5" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="18.5" cy="12" r="1.9" />
    </>
  ),
  airplay: (
    <>
      <path {...S} strokeWidth={1.8} d="M6.2 17.6a8.8 8.8 0 1 1 11.6 0" />
      <path {...S} strokeWidth={1.8} d="M8.9 14.4a4.6 4.6 0 1 1 6.2 0" />
      <path d="M12 14.2a.8.8 0 0 1 .62.3l4.3 5.3a.75.75 0 0 1-.58 1.2H7.66a.75.75 0 0 1-.58-1.2l4.3-5.3a.8.8 0 0 1 .62-.3z" />
    </>
  ),
  repeat: <path {...S} d="M16.5 2.5l3.5 3.5-3.5 3.5M4 11V9.5A3.5 3.5 0 0 1 7.5 6H20M7.5 21.5L4 18l3.5-3.5M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H4" />,
  metronome: <path {...S} strokeWidth={1.8} d="M9.6 3h4.8a1 1 0 0 1 .98.8l3.36 16a1 1 0 0 1-.98 1.2H6.24a1 1 0 0 1-.98-1.2l3.36-16A1 1 0 0 1 9.6 3zM6.3 16h11.4M12 16l5.2-9.5" />,
  speaker: <path d="M3 9.6v4.8a.8.8 0 0 0 .8.8h2.9l4 3.5a.8.8 0 0 0 1.3-.6V5.9a.8.8 0 0 0-1.3-.6l-4 3.5H3.8a.8.8 0 0 0-.8.8z" />,
  speakerLoud: (
    <>
      <path d="M2 9.6v4.8a.8.8 0 0 0 .8.8h2.9l4 3.5a.8.8 0 0 0 1.3-.6V5.9a.8.8 0 0 0-1.3-.6l-4 3.5H2.8a.8.8 0 0 0-.8.8z" />
      <path {...S} strokeWidth={1.7} d="M14.2 9.3a4 4 0 0 1 0 5.4M17 6.8a7.6 7.6 0 0 1 0 10.4M19.8 4.4a11.2 11.2 0 0 1 0 15.2" />
    </>
  ),
  quote: (
    <>
      <path {...S} strokeWidth={1.8} d="M6.5 4.5h11a3 3 0 0 1 3 3V14a3 3 0 0 1-3 3h-5.2L8 20.5V17H6.5a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3z" />
      <path d="M8 9.2h2.6v2.5c0 1.1-.7 2-1.9 2.2v-1c.5-.2.7-.6.7-1.1H8zm5.4 0H16v2.5c0 1.1-.7 2-1.9 2.2v-1c.5-.2.7-.6.7-1.1h-1.4z" />
    </>
  ),
  list: (
    <>
      <circle cx="4.4" cy="6.5" r="1.4" />
      <circle cx="4.4" cy="12" r="1.4" />
      <circle cx="4.4" cy="17.5" r="1.4" />
      <path {...S} d="M9 6.5h11.5M9 12h11.5M9 17.5h11.5" />
    </>
  ),
  plusCircle: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path fill="none" stroke="#2b292a" strokeWidth={2.2} strokeLinecap="round" d="M12 7.6v8.8M7.6 12h8.8" />
    </>
  ),
  star: <path d="M12 2.6a.9.9 0 0 1 .82.52l2.4 5.06 5.5.74a.9.9 0 0 1 .5 1.54l-4.02 3.86 1 5.5a.9.9 0 0 1-1.31.95L12 18.1l-4.89 2.67a.9.9 0 0 1-1.31-.95l1-5.5-4.02-3.86a.9.9 0 0 1 .5-1.54l5.5-.74 2.4-5.06A.9.9 0 0 1 12 2.6z" />,
  share: (
    <>
      <path d="M7 9.5h10a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7.5a2 2 0 0 1 2-2z" />
      <path {...S} d="M12 12V2.8M8.6 5.8L12 2.5l3.4 3.3" />
    </>
  ),
  note: <path d="M9 4.6v11.1a3.2 3.2 0 1 0 1.6 2.8V8.3l7.8-1.7v7.3a3.2 3.2 0 1 0 1.6 2.8V3.2a.9.9 0 0 0-1.1-.88L9.7 3.9a.9.9 0 0 0-.7.7z" />,
  playlistAdd: <path {...S} d="M3.5 5.5h4M5.5 3.5v4M11 5.5h9.5M3.5 11.5h17M3.5 17.5h17" />,
  station: (
    <>
      <circle cx="6" cy="12" r="2.4" />
      <path {...S} strokeWidth={1.8} d="M11.2 8.4a5.2 5.2 0 0 1 0 7.2M14.6 5.8a8.8 8.8 0 0 1 0 12.4M18 3.4a12.4 12.4 0 0 1 0 17.2" />
    </>
  ),
  album: (
    <>
      <rect {...S} strokeWidth={1.8} x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M10 8.6v5.3a2 2 0 1 0 1.2 1.8v-5l3.6-.8v2.9a2 2 0 1 0 1.2 1.8V7.2a.6.6 0 0 0-.73-.59l-4.8 1.05a.6.6 0 0 0-.47.59z" />
    </>
  ),
  mic: (
    <>
      <circle cx="15.5" cy="8.5" r="4.6" {...S} strokeWidth={1.8} />
      <path {...S} strokeWidth={1.8} d="M12.2 11.8L4 20M11 9.5l3.5 3.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" {...S} strokeWidth={1.8} />
      <circle cx="12" cy="7.8" r="1.2" />
      <path {...S} d="M12 11.2v5.6" />
    </>
  ),
  shareLyrics: (
    <>
      <path {...S} strokeWidth={1.8} d="M8.5 7.5h-2a3 3 0 0 0-3 3V15a3 3 0 0 0 3 3H8v3.2l4.3-3.2h5.2a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-2" />
      <path {...S} strokeWidth={1.8} d="M12 12.5V2.8M9.2 5.2L12 2.5l2.8 2.7" />
    </>
  ),
  check: <path {...S} strokeWidth={2.6} d="M5 12.8l4.6 4.6L19.5 7" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 24, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" style={style}>
      {paths[name]}
    </svg>
  );
}

export function StatusIcons() {
  return (
    <svg width="78" height="13" viewBox="0 0 78 13" fill="currentColor" aria-hidden="true">
      <rect x="0" y="8.5" width="3.2" height="4" rx="0.8" />
      <rect x="4.9" y="6" width="3.2" height="6.5" rx="0.8" />
      <rect x="9.8" y="3.3" width="3.2" height="9.2" rx="0.8" />
      <rect x="14.7" y="0.5" width="3.2" height="12" rx="0.8" opacity="0.35" />
      <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M25.6 4.9a9.6 9.6 0 0 1 13.8 0" />
        <path d="M28.5 7.9a5.6 5.6 0 0 1 8 0" />
      </g>
      <circle cx="32.5" cy="11.2" r="1.5" />
      <rect x="48.5" y="1" width="24" height="11.5" rx="3.6" fill="none" stroke="currentColor" opacity="0.4" />
      <rect x="50.3" y="2.8" width="9" height="7.9" rx="2" />
      <path d="M74.2 4.8c1 .3 1.6 1 1.6 2s-.6 1.700-1.600 2z" opacity="0.4" />
    </svg>
  );
}
