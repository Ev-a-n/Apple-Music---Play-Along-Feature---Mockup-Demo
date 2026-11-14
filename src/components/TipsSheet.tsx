// On a real phone the "Try this" list is hidden, so show the tips once.
import { copy, type GuideKey } from '../copy';
import { actions } from '../state/app';

const TIPS: GuideKey[] = ['markers', 'lyric', 'doubleTap', 'swipe'];

export function TipsSheet({ open }: { open: boolean }) {
  return (
    <div className={`tips-layer ${open ? 'open' : ''}`} inert={!open} data-nodtap>
      <div className="tips-scrim" onClick={actions.dismissTips} />
      <div className="tips" role="dialog" aria-label={copy.guide.title}>
        <h2>{copy.guide.title}</h2>
        <ul>
          {TIPS.map((key) => (
            <li key={key}>{copy.guide.items[key]}</li>
          ))}
          <li>{copy.guide.rotatePhone}</li>
        </ul>
        <button className="glass" onClick={actions.dismissTips}>
          {copy.guide.sheetButton}
        </button>
      </div>
    </div>
  );
}
