// The page around the prototype: phone frame, rotate, full screen, caption.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { copy } from '../copy';

export type Orientation = 'upright' | 'sideways';
const SIZE = { upright: { w: 402, h: 874 }, sideways: { w: 874, h: 402 } };
/** Page layout numbers (match --page-pad, --guide-w, --guide-gap in tokens.css). */
const LAYOUT = { pad: 20, guideW: 170, guideGap: 30, caption: 100, controls: 40, guideBelow: 100, maxScale: 1.4, maxScaleImmersive: 2.4, wideFrom: 1000 };
/** The device body around the screen (rim and black bezel), in design pixels. Matches .device in base.css. */
const BEZEL = 17;

/** A narrow touch screen: show the prototype without a frame. */
const isRealPhone = () =>
  window.matchMedia('(pointer: coarse)').matches && Math.min(window.screen.width, window.screen.height) <= 500;

type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => void };
const FULLSCREEN_WAIT = 600; // ms to give the browser before falling back to the focus layout
const nativeFullscreen = () => !!(document.fullscreenElement ?? (document as FullscreenDocument).webkitFullscreenElement);

export function useViewer() {
  const [bare, setBare] = useState(isRealPhone);
  const [win, setWin] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [chosen, setChosen] = useState<Orientation>('upright');
  // Full screen: the browser's own when it allows it, else a focus layout
  // (just the phone, filling the window). Either way `immersive` is true.
  const [native, setNative] = useState(nativeFullscreen);
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    const onResize = () => {
      setBare(isRealPhone());
      setWin({ w: window.innerWidth, h: window.innerHeight });
    };
    const onFullscreen = () => {
      const on = nativeFullscreen();
      setNative(on);
      if (on) setFocus(false);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('webkitfullscreenchange', onFullscreen);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('webkitfullscreenchange', onFullscreen);
    };
  }, []);

  // On a real phone the page behind the prototype is black, so nothing light shows around the notch or the home bar.
  useEffect(() => {
    document.documentElement.classList.toggle('bare-page', bare);
  }, [bare]);

  // On a real phone the device decides; in the frame the viewer does.
  const orientation: Orientation = bare ? (win.w > win.h ? 'sideways' : 'upright') : chosen;
  const rotate = useCallback(() => setChosen((o) => (o === 'upright' ? 'sideways' : 'upright')), []);

  const immersive = native || focus;
  const toggleFullscreen = useCallback(() => {
    const doc = document as FullscreenDocument;
    if (nativeFullscreen()) {
      void (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      return;
    }
    if (focus) return setFocus(false);
    const el = document.documentElement as FullscreenElement;
    const request = el.requestFullscreen ?? el.webkitRequestFullscreen;
    if (!request) return setFocus(true);
    // The browser may refuse (an embedded page, a blocked permission) or
    // never answer: if it is not full screen shortly, use the focus layout.
    const fallback = () => {
      if (!nativeFullscreen()) setFocus(true);
    };
    try {
      const result = request.call(el) as unknown;
      if (result instanceof Promise) result.catch(fallback);
    } catch {
      return fallback();
    }
    window.setTimeout(fallback, FULLSCREEN_WAIT);
  }, [focus]);
  /** Leave the focus layout (the browser's own full screen leaves on Esc by itself). */
  const exitFocus = useCallback(() => setFocus(false), []);

  return { bare, win, orientation, rotate, immersive, focus, toggleFullscreen, exitFocus };
}

interface Props {
  viewer: ReturnType<typeof useViewer>;
  onRotate: () => void;
  onRestart: () => void;
  guide: ReactNode;
  children: ReactNode;
}

export function Viewer({ viewer, onRotate, onRestart, guide, children }: Props) {
  const { bare, win, orientation, immersive, toggleFullscreen } = viewer;
  const design = SIZE[orientation];
  const deviceRef = useRef<HTMLDivElement>(null);
  const frame = bare ? 0 : BEZEL;

  // Framed: as large as the window allows (up to maxScale), leaving room for
  // the caption under the phone and the checklist beside (or under) it.
  // Bare: fill the screen; the stage may be a little larger than the design size.
  // Immersive (full screen or the focus layout): only the phone and the small controls row.
  const L = LAYOUT;
  const wide = win.w >= L.wideFrom && !immersive;
  const roomW = win.w - L.pad * 2 - (wide ? (L.guideW + L.guideGap) * 2 : 0);
  const roomH = win.h - L.pad * 2 - (immersive ? L.controls : L.caption) - (wide || immersive ? 0 : L.guideBelow);
  const maxScale = immersive ? L.maxScaleImmersive : L.maxScale;
  const scale = bare ? Math.min(win.w / design.w, win.h / design.h) : Math.min(maxScale, roomW / (design.w + 2 * frame), roomH / (design.h + 2 * frame));
  const s = Math.max(0.3, scale);
  const stage = bare ? { w: win.w / s, h: win.h / s } : design;
  const outer = { w: stage.w + 2 * frame, h: stage.h + 2 * frame };

  // Smooth quarter-turn: the new layout starts turned back to the old shape.
  const prev = useRef({ orientation, s });
  useLayoutEffect(() => {
    const was = prev.current;
    prev.current = { orientation, s };
    const el = deviceRef.current;
    if (!el || bare || was.orientation === orientation) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const turn = orientation === 'sideways' ? 90 : -90;
    el.animate([{ transform: `rotate(${turn}deg) scale(${was.s / s})` }, { transform: 'none' }], {
      duration: 400,
      easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
    });
  }, [orientation, s, bare]);

  const phone = (
    <div className="phone-slot" style={{ width: outer.w * s, height: outer.h * s }}>
      <div className="phone-scale" style={{ width: outer.w, height: outer.h, transform: `scale(${s})` }}>
        <div className={`device ${orientation}`} ref={deviceRef} style={{ padding: frame }}>
          {!bare && (
            <>
              <i className="side side-action" />
              <i className="side side-up" />
              <i className="side side-down" />
              <i className="side side-power" />
            </>
          )}
          <div className={`phone ${orientation}`}>
            {children}
            <div className="island" />
          </div>
        </div>
      </div>
    </div>
  );

  if (bare) return <div className="bare">{phone}</div>;

  return (
    <div className={`viewer ${immersive ? 'immersive' : ''}`}>
      <main className="viewer-main">
        <p className="viewer-caption">
          <strong>{copy.viewer.caption}</strong>
          <span>{copy.viewer.sub}</span>
        </p>
        {phone}
        <div className="viewer-controls">
          <button onClick={onRotate}>{copy.viewer.rotate}</button>
          <button onClick={toggleFullscreen}>{immersive ? copy.viewer.exitFullScreen : copy.viewer.fullScreen}</button>
          <button onClick={onRestart}>{copy.viewer.restart}</button>
        </div>
      </main>
      {guide}
    </div>
  );
}
