// "Try this": the key gestures are invisible, so list them quietly.
import { copy, type GuideKey } from '../copy';
import { Icon } from '../icons';

export const GUIDE_KEYS = Object.keys(copy.guide.items) as GuideKey[];

export function Guide({ done }: { done: Partial<Record<GuideKey, boolean>> }) {
  return (
    <aside className="guide" aria-label={copy.guide.title}>
      <h2>{copy.guide.title}</h2>
      <ul>
        {GUIDE_KEYS.map((key) => (
          <li key={key} className={done[key] ? 'done' : ''}>
            <span className="tick">
              <Icon name="check" />
            </span>
            {copy.guide.items[key]}
          </li>
        ))}
      </ul>
    </aside>
  );
}
