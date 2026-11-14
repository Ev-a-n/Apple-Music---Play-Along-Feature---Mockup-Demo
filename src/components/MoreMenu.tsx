// The Liquid Glass "More" menu. Only Play Along does something.
import { copy } from '../copy';
import { Icon, type IconName } from '../icons';
import type { Song } from '../songs';
import { actions } from '../state/app';

export function MoreMenu({ open, song }: { open: boolean; song: Song }) {
  const t = copy.menu;
  const close = () => actions.setMenu(false);
  const row = (icon: IconName, label: string, sub?: string, onClick = close) => (
    <button className="menu-row" role="menuitem" onClick={onClick}>
      <Icon name={icon} size={22} />
      <span>
        {label}
        {sub && <small>{sub}</small>}
      </span>
    </button>
  );
  const top = (icon: IconName, label: string) => (
    <button className="menu-top-item" role="menuitem" onClick={close}>
      <Icon name={icon} size={22} />
      {label}
    </button>
  );
  return (
    <div className={`menu-layer ${open ? 'open' : ''}`} inert={!open}>
      <div className="menu-scrim" onPointerDown={close} />
      <div className="menu" role="menu" aria-label={t.label}>
        <div className="menu-top">
          {top('plusCircle', t.add)}
          {top('star', t.favorite)}
          {top('share', t.share)}
        </div>
        <hr />
        {row('playlistAdd', t.addToPlaylist)}
        <hr />
        {row('station', t.createStation)}
        <hr />
        {row('metronome', t.playAlong, undefined, actions.openPlayAlong)}
        <hr />
        {row('album', t.goToAlbum, song.album)}
        {row('mic', t.goToArtist, song.artist)}
        {row('info', t.viewCredits)}
        {row('shareLyrics', t.shareLyrics)}
      </div>
    </div>
  );
}
