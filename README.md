# Play Along — an Apple Music concept prototype

A working, in-browser prototype of **Play Along**: loop one part of a song,
slow it down without changing the pitch, and turn the vocals down, so you can
play along on your instrument.

**Live:** https://ev-a-n.github.io/play-along-prototype/

> Student UX concept. Not affiliated with Apple. All songs, lyrics, album art
> and icons are original and generated in code.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

To try it on a real phone on the same Wi-Fi:

```bash
npm run dev -- --host
```

and open the "Network" address on the phone.

| Key | Does |
| --- | --- |
| `R` | Rotate the phone |
| `F` | Full screen |
| `Space` | Play / pause |
| `←` `→` | Previous / next song |
| `Esc` | Close Play Along |

## Where things live

| To change… | Edit |
| --- | --- |
| Colours, sizes, timings | `src/tokens.css` |
| Any on-screen text | `src/copy.ts` |
| Songs, lyrics, sections, palettes | `src/songs.ts` |
| Layout of each screen | `src/screens.css` |
| Audio playback | `src/audio/engine.ts` |
| The built-in generated music | `src/audio/synth.ts` |

## Add your own songs

The three built-in songs are generated in code, so the prototype always has
sound. To hear real audio instead, drop files into `public/audio/<song-id>/`
(the id is in `src/songs.ts`, e.g. `porch-light`):

```
public/audio/porch-light/vocals.mp3
public/audio/porch-light/backing.mp3
```

- **`vocals` + `backing`** — both sliders work.
- **a single `full` file** — speed and loop work; the Vocals slider is shown
  disabled with "Not available for this song".
- `.mp3`, `.m4a` and `.wav` all work. If the two stems differ in length, the
  shorter one is the song length.
- The song's `audio` entry must be `{ type: 'files' }` (the built-in songs
  already are). If the files are missing, the generated version plays instead.

For a brand-new song, add an entry to `src/songs.ts` with your own lyric
times (`lyrics: [{ t, end, text }]`) and `sections` in seconds.

**Your music never leaves your computer.** Everything in `public/audio/`
except its README is ignored by Git, and the build removes any audio from the
published site. Do not commit or publish copyrighted recordings.

## Deploy to GitHub Pages

Automatic (recommended): push to `main`. The workflow in
`.github/workflows/deploy.yml` builds and publishes the site. In the
repository, set **Settings → Pages → Source** to **GitHub Actions** once.

Manual alternative: `npm run deploy` builds and pushes `dist/` to a
`gh-pages` branch (then set Pages → Source to that branch instead).

`npm run assets` regenerates the app icon and the social preview image.

## Known limits

- Slowed audio gets slightly warbly at low speeds in every browser; the
  slider stops at 50%.
- iPhone: the ring/silent switch mutes web audio, and Safari has no full
  screen mode for web pages (use "Add to Home Screen" instead).
