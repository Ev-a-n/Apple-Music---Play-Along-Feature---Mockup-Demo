// Album-art-derived background: gradient, drifting colour blobs, dark overlay.
import { songs } from '../songs';

const SPOTS = [
  { left: '-30%', top: '-12%', size: '95%', opacity: 0.6 },
  { left: '45%', top: '6%', size: '85%', opacity: 0.45 },
  { left: '-20%', top: '48%', size: '90%', opacity: 0.4 },
  { left: '40%', top: '58%', size: '80%', opacity: 0.35 },
  { left: '10%', top: '26%', size: '70%', opacity: 0.35 },
];

export function Background({ songIndex }: { songIndex: number }) {
  return (
    <div className="bg" aria-hidden="true">
      {songs.map((song, i) => (
        <div key={song.id} className={`bg-layer ${i === songIndex ? 'on' : ''}`} style={{ background: `linear-gradient(${song.palette.join(', ')})` }}>
          {SPOTS.map((spot, k) => (
            <span
              key={k}
              className={`bg-blob drift-${k % 4}`}
              style={{ left: spot.left, top: spot.top, width: spot.size, opacity: spot.opacity, background: song.blobs[k % song.blobs.length] }}
            />
          ))}
        </div>
      ))}
      <div className="bg-overlay" />
    </div>
  );
}
