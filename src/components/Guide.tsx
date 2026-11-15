// "Try this": the key gestures are invisible, so they are laid out as a short
// trail of stops. Done stops fill in, the next one is ringed, the rest wait.
import { copy, type GuideKey } from '../copy';
import { Icon } from '../icons';

export const GUIDE_KEYS = Object.keys(copy.guide.items) as GuideKey[];

export function Guide({ done }: { done: Partial<Record<GuideKey, boolean>> }) {
  const finished = GUIDE_KEYS.filter((key) => done[key]).length;
  const next = GUIDE_KEYS.findIndex((key) => !done[key]);
  return (
    <aside className="guide" aria-label={copy.guide.title}>
      <h2>
        {copy.guide.title}
        <span>{finished === GUIDE_KEYS.length ? copy.guide.allDone : copy.guide.count(finished, GUIDE_KEYS.length)}</span>
      </h2>
      <ol className="trail">
        {GUIDE_KEYS.map((key, i) => (
          <li key={key} className={done[key] ? 'done' : i === next ? 'next' : ''} aria-current={i === next ? 'step' : undefined}>
            <span className="stop" aria-hidden="true">
              {done[key] ? <Icon name="check" /> : i + 1}
            </span>
            <span className="stop-label">{copy.guide.items[key]}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
