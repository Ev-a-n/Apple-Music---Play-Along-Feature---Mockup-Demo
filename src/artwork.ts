// The real album covers, streamed from Apple's catalogue and shown blurred
// past recognition (their colours and feel remain). Nothing is stored here.
import { useEffect, useState } from 'react';
import { artworkUrl } from './audio/sources';
import type { Song } from './songs';

const cache = new Map<string, Promise<string | null>>();
function artworkFor(song: Song) {
  let url = cache.get(song.id);
  if (!url) {
    url = artworkUrl(song);
    cache.set(song.id, url);
  }
  return url;
}

/** The song's cover address once known, else null. */
export function useArtwork(song: Song): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setUrl(null);
    void artworkFor(song).then((found) => {
      if (live) setUrl(found);
    });
    return () => {
      live = false;
    };
  }, [song]);
  return url;
}
