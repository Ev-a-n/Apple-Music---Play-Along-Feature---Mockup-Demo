# Play Along — an Apple Music concept prototype

A working, in-browser prototype of **Play Along**: loop one part of a song,
slow it down without changing the pitch, and turn the vocals down, so you can
play along on your instrument.

**Live:** https://ev-a-n.github.io/Apple-Music---Play-Along-Feature---Mockup-Demo/

> Student UX concept. Not affiliated with Apple. The three songs play Apple's
> own 30-second preview clips, streamed from Apple and never stored in this
> project. Each song is shown at its full length, as in Apple Music: the clip
> starts over every 30 seconds and its lyric lines repeat with it, so the words
> always fit the music and every control works everywhere. The album covers
> are streamed from Apple's catalogue and shown blurred past recognition; the
> icons are generated in code.

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

Each song plays Apple's 30-second preview, started over every 30 seconds for
the song's full length (a small seam each time). Without a separate vocal
track, the Vocals slider turns down the centre of the stereo mix (where a
lead vocal sits) above the bass: convincing for a demo, not a true stem.

To use the whole song, and real stems, on your own computer, drop your files
into `public/audio/<song-id>/` (the id is in `src/songs.ts`, e.g.
`sweet-creature`):

```
public/audio/sweet-creature/vocals.mp3
public/audio/sweet-creature/backing.mp3
```

- **`vocals` + `backing`** — the Vocals slider mixes the real stems.
- **a single `full` file** — the Vocals slider uses the centre cut instead.
  (Demucs, Moises and similar tools split a song into stems.)
- `.mp3`, `.m4a` and `.wav` all work. If the two stems differ in length, the
  shorter one is the song length.
- If the files are missing, the Apple preview plays instead.
- With your own full-length file there is no seam, but the clip's lyric
  lines no longer fit: write that song's `lyrics` and `sections` by hand.
- `bpm` in `src/songs.ts` sets the count-in tempo and the beat the loop
  markers snap to. The current values are rough guesses: adjust them by ear.

For a brand-new song, add an entry to `src/songs.ts`: `fromPreview()` with an
Apple catalogue id for a preview clip, or `build()` with chords to have the
music generated in code.

**Your music never leaves your computer.** Everything in `public/audio/`
except its README is ignored by Git, and the build removes any audio from the
published site. Do not commit or publish copyrighted recordings.

## Lyrics

Each song in `src/songs.ts` has its full length (`duration`, from Apple's
catalogue) and `lines`: the words sung in its 30-second clip, in order, as
`[start, text]` pairs in clip seconds. The lines repeat with the clip for the
whole song. To re-time them, or to set up a new song:

1. Put the clip's lines into `lines`, in order. Rough times are fine.
2. Run `npm run dev`, press play (anywhere in the song: the helper measures
   the clip itself) and tap **T** each time the singer starts a new line.
   **Backspace** undoes a tap. **Enter** finishes and copies `lines` back
   with the right times.
3. Paste it over the song's `lines`.

If the music jumps back (a loop restart, say), the taps clear so you can
have another go. The T key only exists while developing; it is not on the
published site.

## Deploy to GitHub Pages

Automatic (recommended): push to `main`. The workflow in
`.github/workflows/deploy.yml` builds and publishes the site. In the
repository, set **Settings → Pages → Source** to **GitHub Actions** once.

Manual alternative: `npm run deploy` builds and pushes `dist/` to a
`gh-pages` branch (then set Pages → Source to that branch instead).

`npm run assets` regenerates the app icon and the social preview image.

## Known limits

- The song is the 30-second clip repeated, so there is a small seam every
  30 seconds and the same lines come round again.
- The Vocals slider on a preview is a centre cut: it also softens anything
  else mixed in the centre, and cannot remove a doubled or wide vocal.

- Slowed audio gets slightly warbly at low speeds in every browser; the
  slider stops at 50%.
- iPhone: the ring/silent switch mutes web audio, and Safari has no full
  screen mode for web pages (use "Add to Home Screen" instead).
