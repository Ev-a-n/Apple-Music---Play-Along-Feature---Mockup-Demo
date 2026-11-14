import { useEffect } from 'react';
import { Background } from './components/Background';
import { Guide } from './components/Guide';
import { NowPlaying } from './components/NowPlaying';
import { Viewer, useViewer } from './components/Viewer';
import { copy } from './copy';
import { StatusIcons } from './icons';
import { songs } from './songs';
import { actions, useApp } from './state/app';

export function App() {
  const viewer = useViewer();
  const app = useApp();
  const song = songs[app.songIndex];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'r' || e.key === 'R') viewer.rotate();
      if (e.key === 'f' || e.key === 'F') viewer.toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer.rotate, viewer.toggleFullscreen]);

  return (
    <Viewer viewer={viewer} onRestart={actions.restartPrototype} guide={<Guide done={app.guide} />}>
      <Background songIndex={app.songIndex} />
      <div className="statusbar">
        <span>{copy.statusTime}</span>
        <StatusIcons />
      </div>
      <NowPlaying app={app} song={song} duration={song.duration} />
    </Viewer>
  );
}
