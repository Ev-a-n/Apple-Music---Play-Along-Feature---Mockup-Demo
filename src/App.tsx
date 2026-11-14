import { useEffect } from 'react';
import { Guide } from './components/Guide';
import { Viewer, useViewer } from './components/Viewer';

export function App() {
  const viewer = useViewer();

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
    <Viewer viewer={viewer} onRestart={() => {}} guide={<Guide done={{}} />}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgb(55,77,104), rgb(52,48,42))' }} />
    </Viewer>
  );
}
