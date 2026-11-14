// The page around the prototype: phone frame, rotate, full screen, caption.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { copy } from '../copy';

export type Orientation = 'upright' | 'sideways';
const SIZE = { upright: { w: 402, h: 874 }, sideways: { w: 874, h: 402 } };
/** Page layout numbers (match --page-pad, --guide-w, --guide-gap in tokens.css). */
const LAYOUT = { pad: 20, guideW: 170, guideGap: 30, caption: 80, guideBelow: 100, maxScale: 1.4, wideFrom: 1000 };

/** A narrow touch screen: show the prototype without a frame. */
const isRealPhone = () =>
  window.matchMedia('(pointer: coarse)').matches && Math.min(window.screen.width, window.screen.height) <= 500;

export function useViewer() {
  const [bare, setBare] = useState(isRealPhone);
  const [win, setWin] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [chosen, setChosen] = useState<Orientation>('upright');

  useEffect(() => {
    const onResize = () => {
      setBare(isRealPhone());
      setWin({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // On a real phone the device decides; in the frame the viewer does.
  const orientation: Orientation = bare ? (win.w > win.h ? 'sideways' : 'upright') : chosen;
  const rotate = useCallback(() => setChosen((o) => (o === 'upright' ? 'sideways' : 'upright')), []);

  const canFullscreen = !!document.fullscreenEnabled;
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  return { bare, win, orientation, rotate, canFullscreen, toggleFullscreen };
}

interface Props {
  viewer: ReturnType<typeof useViewer>;
  onRotate: () => void;
  onRestart: () => void;
  guide: ReactNode;
  children: ReactNode;
}

export function Viewer({ viewer, onRotate, onRestart, guide, children }: Props) {
  const { bare, win, orientation, canFullscreen, toggleFullscreen } = viewer;
  const design = SIZE[orientation];
  const phoneRef = useRef<HTMLDivElement>(null);

  // Framed: as large as the window allows (up to maxScale), leaving room for
  // the caption under the phone and the checklist beside (or under) it.
  // Bare: fill the screen; the stage may be a little larger than the design size.
  const L = LAYOUT;
  const wide = win.w >= L.wideFrom;
  const roomW = win.w - L.pad * 2 - (wide ? (L.guideW + L.guideGap) * 2 : 0);
  const roomH = win.h - L.pad * 2 - L.caption - (wide ? 0 : L.guideBelow);
  const scale = bare ? Math.min(win.w / design.w, win.h / design.h) : Math.min(L.maxScale, roomW / design.w, roomH / design.h);
  const s = Math.max(0.3, scale);
  const stage = bare ? { w: win.w / s, h: win.h / s } : design;

  // Smooth quarter-turn: the new layout starts turned back to the old shape.
  const prev = useRef({ orientation, s });
  useLayoutEffect(() => {
    const was = prev.current;
    prev.current = { orientation, s };
    const el = phoneRef.current;
    if (!el || bare || was.orientation === orientation) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const turn = orientation === 'sideways' ? 90 : -90;
    el.animate([{ transform: `rotate(${turn}deg) scale(${was.s / s})` }, { transform: 'none' }], {
      duration: 400,
      easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
    });
  }, [orientation, s, bare]);

  const phone = (
    <div className="phone-slot" style={{ width: stage.w * s, height: stage.h * s }}>
      <div className="phone-scale" style={{ width: stage.w, height: stage.h, transform: `scale(${s})` }}>
        <div className={`phone ${orientation}`} ref={phoneRef}>
          {children}
          <div className="island" />
        </div>
      </div>
    </div>
  );

  if (bare) return <div className="bare">{phone}</div>;

  return (
    <div className="viewer">
      <main className="viewer-main">
        {phone}
        <p className="viewer-caption">
          <strong>{copy.viewer.caption}</strong>
          <span>{copy.viewer.sub}</span>
        </p>
        <div className="viewer-controls">
          <button onClick={onRotate}>{copy.viewer.rotate}</button>
          {canFullscreen && <button onClick={toggleFullscreen}>{copy.viewer.fullScreen}</button>}
          <button onClick={onRestart}>{copy.viewer.restart}</button>
        </div>
      </main>
      {guide}
    </div>
  );
}
