// Album art drawn in code: a soft gradient with one simple shape.
import type { Song } from '../songs';

export function AlbumArt({ song, className = '' }: { song: Song; className?: string }) {
  const { shape, from, to, accent } = song.art;
  const id = `art-${song.id}`;
  return (
    <svg className={`art ${className}`} viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={accent} stopOpacity="0.95" />
          <stop offset="0.35" stopColor={accent} stopOpacity="0.45" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {shape === 'lamp' && (
        <>
          <circle cx="64" cy="44" r="34" fill={`url(#${id}-glow)`} />
          <circle cx="64" cy="44" r="7" fill={accent} />
          <path d="M0 74h100v26H0z" fill="rgba(0,0,0,0.22)" />
        </>
      )}
      {shape === 'waves' && (
        <>
          <circle cx="50" cy="34" r="30" fill={`url(#${id}-glow)`} opacity="0.7" />
          <g fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" opacity="0.85">
            <path d="M12 52q9.500-8 19 0t19 0 19 0 19 0" />
            <path d="M12 64q9.500-8 19 0t19 0 19 0 19 0" opacity="0.6" />
            <path d="M12 76q9.500-8 19 0t19 0 19 0 19 0" opacity="0.35" />
          </g>
        </>
      )}
      {shape === 'kite' && (
        <>
          <circle cx="30" cy="28" r="34" fill={`url(#${id}-glow)`} opacity="0.5" />
          <path d="M58 16l17 22-17 30-17-30z" fill={accent} opacity="0.92" />
          <path d="M58 16v52M41 38h34" stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" />
          <path d="M58 68q-8 8-2 14t-6 12" fill="none" stroke={accent} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
        </>
      )}
    </svg>
  );
}
