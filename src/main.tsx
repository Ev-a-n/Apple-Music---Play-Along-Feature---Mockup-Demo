import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './tokens.css';
import './base.css';
import './screens.css';
import { App } from './App';

// Published site: keep the app and the songs' clips on the device for fast later opens.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
