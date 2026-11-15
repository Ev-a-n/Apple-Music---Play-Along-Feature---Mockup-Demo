import { useCallback, useEffect, useRef } from 'react';
import { Background } from './components/Background';
import { Guide } from './components/Guide';
import { NowPlaying } from './components/NowPlaying';
import { PlayAlong } from './components/PlayAlong';
import { TipsSheet } from './components/TipsSheet';
import { Toast } from './components/Toast';
import { Viewer, useViewer } from './components/Viewer';
import { copy } from './copy';
import { StatusIcons } from './icons';
import { songs } from './songs';
import { actions, useApp } from './state/app';

export function App() {
  const viewer = useViewer();
  const app = useApp();
  const song = songs[app.songIndex];

  useEffect(() => actions.init(), []);

  // On a phone the browser tints its bars with the page's theme colour: follow the song.
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = song.palette[0];
  }, [song]);

  const rotate = useCallback(() => {
    viewer.rotate();
    actions.tick('rotate');
  }, [viewer.rotate]);
  // On a real phone, turning the device counts as rotating.
  const first = useRef(viewer.orientation);
  useEffect(() => {
    if (viewer.bare && viewer.orientation !== first.current) actions.tick('rotate');
  }, [viewer.bare, viewer.orientation]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      const onControl = !!target.closest?.('button, [role="slider"]');
      const key = e.key.toLowerCase();
      if (key === 'r') rotate();
      else if (key === 'f') viewer.toggleFullscreen();
      else if (key === ' ' && !onControl) actions.togglePlay();
      else if (key === 'arrowleft' && !target.closest?.('[role="slider"]')) actions.changeSong(-1);
      else if (key === 'arrowright' && !target.closest?.('[role="slider"]')) actions.changeSong(1);
      else if (key === 'escape') {
        if (app.menuOpen) actions.setMenu(false);
        else if (app.screen === 'playAlong') actions.closePlayAlong();
        else if (viewer.focus) viewer.exitFocus();
        else return;
      } else return;
      if (key === ' ' || key.startsWith('arrow')) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rotate, viewer.toggleFullscreen, viewer.focus, viewer.exitFocus, app.menuOpen, app.screen]);

  return (
    <Viewer viewer={viewer} onRotate={rotate} onRestart={actions.restartPrototype} guide={<Guide done={app.guide} />}>
      <Background songIndex={app.songIndex} />
      <div className="statusbar">
        <span>{copy.statusTime}</span>
        <StatusIcons />
      </div>
      <NowPlaying app={app} song={song} duration={app.duration} />
      <PlayAlong app={app} song={song} orientation={viewer.orientation} />
      <TipsSheet open={viewer.bare && app.screen === 'playAlong' && !app.tipsSeen} />
      <Toast toast={app.toast} />
    </Viewer>
  );
}
