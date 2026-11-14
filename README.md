# Play Along — an Apple Music concept prototype

A working, in-browser prototype of **Play Along**: loop one part of a song,
slow it down without changing the pitch, and turn the vocals down, so you can
play along on your instrument.

**Live:** https://ev-a-n.github.io/play-along-prototype/

> Student UX concept. Not affiliated with Apple. The three songs play Apple's
> own 30-second preview clips, streamed from Apple and never stored in this
> project. The lyric lines are placeholders, and the album art and icons are
> generated in code.

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

Each song plays Apple's 30-second preview, so the Vocals slider is off (a
preview has no separate vocal track). To use the whole song, and the Vocals
slider, on your own computer, drop your files into `public/audio/<song-id>/`
(the id is in `src/songs.ts`, e.g. `sweet-creature`):

```
public/audio/sweet-creature/vocals.mp3
public/audio/sweet-creature/backing.mp3
```

- **`vocals` + `backing`** — both sliders work.
- **a single `full` file** — speed and loop work; the Vocals slider is shown
  disabled with "Not available for this song".
- `.mp3`, `.m4a` and `.wav` all work. If the two stems differ in length, the
  shorter one is the song length.
- If the files are missing, the Apple preview plays instead.
- Lyric times in `src/songs.ts` are laid out for the 30-second clip. For a
  full-length file, write your own `lyrics` and `sections` times in seconds.
- `bpm` in `src/songs.ts` sets the count-in tempo and the beat the loop
  markers snap to. The current values are rough guesses: adjust them by ear.

For a brand-new song, add an entry to `src/songs.ts`: `fromPreview()` with an
Apple catalogue id for a preview clip, or `build()` with chords to have the
music generated in code.

**Your music never leaves your computer.** Everything in `public/audio/`
except its README is ignored by Git, and the build removes any audio from the
published site. Do not commit or publish copyrighted recordings.

## Lyrics

The lyric lines in `src/songs.ts` are placeholders. To show the words sung in
a clip:

1. Replace that song's `lines` with the lines heard in the clip, in order.
2. Run `npm run dev`, stay on Now Playing, press play, and tap **T** each
   time a new line starts. **Backspace** undoes a tap, **Enter** finishes and
   copies the times to your clipboard. Jumping back in the song clears the
   taps so you can try again.
3. Paste them into the song as `times: [...]`, next to `lines`.

The T key only exists while developing; it is not on the published site.

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
