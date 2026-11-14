# Build prompt: "Play Along" — a working in-browser prototype of an Apple Music concept feature

**Before you paste this:**
1. Install Node.js and have a GitHub account ready.
2. Make an empty folder and open Claude Code in it.
3. In that folder, make a `reference` folder. From the Figma section "Play Along — v2 polish", export each screen as a PNG at 2x and put them in it. Also export Now Playing and the More menu from "Play Along — final flow".
4. Paste everything below the line.

---

You are building a polished, working, in-browser prototype of **Play Along**, a concept feature for Apple Music. It lets a musician loop one part of a song, slow it down without changing the pitch, and turn the vocals down, so they can play along on their instrument. It must look and feel like a real part of Apple Music on iOS (Liquid Glass era), and it must really play audio.

This is a student UX portfolio concept. It is not affiliated with Apple. Do not use Apple's logo, Apple's SF Symbols files, real album art, real song recordings or real song lyrics.

Work in stages, and run and check the app in a browser after each stage. Do not stop at a static mockup: the audio, loop, speed, vocals, double-tap and swipe features must all work.

## 0. Before you start, and how to work

- **Ask me first** for my GitHub username and the repository name (suggest `play-along-prototype`). Use them for the GitHub Pages setup and the README link.
- **Look in the `reference/` folder.** If it contains PNG exports of my Figma screens (upright and sideways Play Along, the second song, the double-tap state, Now Playing and the More menu), study them before writing any UI and match them. If an image and this brief disagree, the image wins for looks and this brief wins for behaviour. If the folder is empty, continue from the written spec in section 6.
- **Show me a short plan** (files, components, audio approach) before you write code.
- **Build in this order, and make a Git commit after each stage** with a clear message, so I can go back a step if something breaks:
  1. Project setup, the viewer page and the phone frame with Rotate
  2. Now Playing and the More menu (static, then animated)
  3. Play Along layouts, upright and sideways (static, matching the reference)
  4. Audio: built-in songs, play/pause, speed and vocals
  5. Loop: markers, loop pill, tap-lyrics, restart and next section
  6. Gestures: double-tap restart and swipe to change song, with per-song memory
  7. Polish, accessibility, README and deploy setup
- Run `git init` at the start. **Do not push to GitHub or deploy until I ask.**
- After each stage, run the app, check it in the browser and tell me in one or two lines what works.

## 1. Tech and delivery

- Vite + React + TypeScript. Plain CSS (CSS variables), no UI library, no Tailwind.
- Web Audio API for sound. No backend. Everything runs from static files.
- Must deploy to GitHub Pages: set Vite `base: './'`, add an `npm run deploy` script (gh-pages) and a GitHub Actions workflow that builds and publishes on push to `main`.
- Works in current Chrome, Safari (desktop and iOS) and Firefox.
- Write a short README: how to run it, how to add your own songs (section 4), how to deploy.

## 2. How the prototype is presented (the viewer)

Model the viewing experience on this reference prototype of another Apple concept: https://komalp06.github.io/wallet-prototype/

- **On desktop:** a calm neutral page (`#F2F2F7`) with one iPhone-shaped screen centred. No heavy device bezel: just the screen with 55px rounded corners, a soft shadow and a Dynamic Island.
- Under the phone, a small caption: **"Apple Music · Play Along"** and below it **"concept prototype · tap to explore"**.
- Small text controls under the caption: **"Rotate (R)"**, **"Full screen (F)"**, **"Restart prototype"**. Keyboard: `R` rotates, `F` toggles full screen, `Space` plays/pauses, `←` `→` change song, `Esc` closes Play Along.
- A tiny footer line: "Student concept. Not affiliated with Apple."
- **Gesture guide.** Beside the phone on wide windows (under it on narrow ones), a short, quiet list titled "Try this", because the key gestures are invisible:
  - "Tap ••• and choose Play Along"
  - "Drag the two markers to choose a part to repeat"
  - "Tap a lyric line to start the loop there"
  - "Double-tap empty space to restart the loop"
  - "Swipe the song title to change songs"
  - "Press R to turn the phone sideways"
  Each line gets a small tick the first time the viewer does it. Keep the styling minimal (13px, grey) so the phone stays the focus.
- **Rotate** turns the phone between upright (402 × 874) and sideways (874 × 402) with a smooth 400ms rotation, and the Play Along layout changes to match (section 6). Scale the phone down to fit the window, never up past 1×.
- **On a real phone** (narrow touch screen): no frame, no caption. The prototype fills the screen, respects safe areas (`viewport-fit=cover`), disables pinch zoom, and switches layout from the device's real orientation.
- **iPhone quirks:**
  - iPhone Safari has no full-screen mode for web pages, so hide the "Full screen" control there.
  - The ring/silent switch mutes web audio on iPhone. The first time the viewer presses play on an iPhone, show a small glass toast for 4 seconds: "No sound? Turn off silent mode."
  - Add the meta tags that let the page be added to the Home Screen and opened without browser bars (`apple-mobile-web-app-capable`, a theme colour and an icon generated in code).
  - Since the gesture guide is hidden on a phone, show the same tips once as a short dismissible sheet the first time Play Along opens.
- "Restart prototype" returns to Now Playing, stops audio and clears saved settings.

## 3. Screens and flow

1. **Now Playing** (upright only). A faithful Apple Music Now Playing screen: status bar (4:02, signal, Wi-Fi, battery), grabber, large album art (258px, 10px radius, soft shadow), song title (22px semibold, fades out at the right edge if too long) and artist (22px regular, 65% white), a round glass **More (•••)** button at the right of the title, progress bar with elapsed and remaining times, back / play / forward buttons, volume bar with speaker icons, and a bottom row of three icons (lyrics, AirPlay, queue). Play and pause work here at normal speed. If the phone is rotated on this screen, show the same content in a simple two-column layout (art left, controls right).
2. **More menu.** Tapping ••• opens a Liquid Glass menu anchored to the button, with a scale-and-fade spring animation, the background dimmed and blurred slightly. Contents, in order:
   - Top row of three icon buttons: Add, Favorite, Share
   - Add to Playlist
   - Create Station
   - **Play Along** (metronome icon) — the only item that does something
   - Go to Album (with album name as a grey second line), Go to Artist (artist name as second line), View Credits, Share Lyrics
   Thin dividers separate the groups: after the top row, after Add to Playlist, after Create Station, after Play Along. Tapping outside closes it. Other items just close the menu.
3. **Play Along** (upright and sideways). Opens with a smooth cross-fade and slight scale from Now Playing. The **×** closes it and returns to Now Playing at normal speed, full vocals, loop off.

## 4. Songs and audio

### Songs
Ship **three** songs in a `songs` manifest (typed data file). Use invented titles and artists, for example:
- "Porch Light" — Maple & Wire (blue-grey to warm brown palette)
- "Slow Tide" — The Lanterns (dusty rose palette)
- "Paper Kites" — Juniper Hale (deep green to amber palette)

Each song has: `id`, `title`, `artist`, `album`, `duration`, a background palette (5 gradient stops, top to bottom), album art, `bpm`, `lyrics` (an array of lines, each with a start time in seconds), `sections` (name, start, end: Intro, Verse, Chorus, Verse, Chorus, Bridge, Chorus, Outro), a default loop (the first chorus) and an `audio` entry.

Write short, original placeholder lyrics yourself (simple, generic imagery). Never use lyrics from real songs.

Album art: generate it in code (an abstract gradient with a simple shape, as SVG or canvas) in each song's palette.

### Built-in audio (must work with zero files)
Generate each built-in song in code so the prototype always has sound:
- Compose 60–90 seconds of simple, pleasant music per song from the manifest's chords and tempo. Each song should sound different (different key, tempo and feel).
- Render **two separate stems** per song with `OfflineAudioContext`:
  - **backing:** plucked-guitar-style chords (Karplus-Strong or a filtered saw with a fast decay), a soft bass and light drums
  - **vocals:** a sung-sounding lead melody (a triangle or sine with gentle vibrato and a vowel-like band-pass filter) that follows the timed lyric lines
- Convert each rendered buffer to a WAV blob and use it as the source for the player in the next section, so built-in and file-based songs use one playback path. Render lazily (the first time a song is needed), show a brief loading shimmer, and cache the result.

### Your own files (optional)
Support dropping real audio into `public/audio/<song-id>/`:
- `vocals.mp3` **and** `backing.mp3` → both sliders work.
- or a single `full.mp3` → the song plays, speed and loop work, but the Vocals slider is shown disabled with the note "Not available for this song".
The manifest's `audio` entry chooses `generated` or `files`. Document this in the README, including that copyrighted recordings must not be committed or published.

- **Keep my own music out of Git.** Add `public/audio/*` to `.gitignore`, keeping only a `public/audio/README.md` that explains the folder. My files stay on my computer and are never published.
- **Fall back automatically.** If a song is set to `files` but its files are missing (as they will be on the published site), use the built-in generated version of that song without any error. This way the live site always works, and my local copy sounds better.
- Accept `.mp3`, `.m4a` and `.wav`. If the two stems differ in length, use the shorter length as the song duration.

### Playback engine
- One `AudioContext`. Each stem plays through its own `HTMLAudioElement` → `MediaElementAudioSourceNode` → `GainNode` → master gain → destination.
- **Speed without pitch change:** set `playbackRate` on both elements, with `preservesPitch = true` (also set `webkitPreservesPitch` and `mozPreservesPitch`).
- Keep the two stems in sync: start them together, and on every seek, loop jump or speed change set both `currentTime` values together. Check drift a few times a second and correct it if it exceeds 40ms.
- **Looping:** with the loop on, when playback reaches the loop end, jump both stems to the loop start with a very short (15ms) gain dip to avoid a click. Use `requestAnimationFrame` plus a look-ahead check so the jump is tight.
- Browsers block audio until the user interacts: create or resume the `AudioContext` on the first tap, and never autoplay before that.
- Stop cleanly when changing songs, closing Play Along or restarting the prototype.
- Pause the audio when the browser tab is hidden, and release WAV blob URLs that are no longer needed.
- If audio fails to load or decode, show a small glass toast ("Couldn't load this song") and keep the interface usable. Never leave the screen stuck on a loading state.
- Slowed-down audio gets slightly warbly at low speeds in every browser. That is expected. Do not go below 50%.
- Structure the audio code as one small, self-contained module (`audio/engine.ts`) with a clear interface (load, play, pause, seek, setRate, setVocals, setLoop, events for time and ended), so the UI never touches audio elements directly.

## 5. Play Along behaviour

**Loop**
- The timeline shows the whole song as a thin bar. The loop is a brighter stretch of the bar between two slim white markers. The part of the loop already played is fully white.
- Drag either marker to move that end. The visible marker is slim (6 × 23), but its touch area must be at least 44px wide. Markers snap gently to the start of lyric lines and to beats, with a light haptic (`navigator.vibrate(8)` where supported). Minimum loop length: 2 seconds. Markers cannot cross.
- **Tap lyrics to set the loop:** tapping a lyric line sets the loop start to that line. Tapping a later line within 4 seconds sets the loop end to the end of that line. Tapping the same line twice loops just that line. A thin vertical bar beside the lyrics marks the lines inside the loop.
- A small glass **loop pill** shows the loop's start and end times with a repeat icon ("↻ 0:47 – 1:22"). It has a fixed position in the middle of the time row under the timeline and never moves. Tapping it turns the loop off or on. When off: the pill reads "Loop Off", the markers and bright stretch dim to 35%, and the song plays straight through.
- At the end of the song with the loop off, playback stops and stays in Play Along. It never starts another song by itself.

**Controls (three buttons, plain white icons, no glass)**
- Left, **Restart loop** (bar with a triangle pointing left): jump to the loop start. If the loop is off, jump to the start of the song.
- Middle, **Play / Pause**.
- Right, **Next section** (triangle pointing to a bar): move the loop to the next section of the song (from the manifest), wrapping after the last one, and continue playing from its start.

**Double-tap to restart**
- Double-tapping (or double-clicking) any open space on the Play Along screen restarts the loop, the same as the Restart button.
- It must not fire on the lyrics, the timeline and markers, the sliders, the buttons, the loop pill or the header.
- Feedback: a round glass badge (68px) with the restart icon fades in at the centre of the screen and fades out over 500ms, with a light haptic.
- A single tap on open space does nothing.

**Swipe to change song**
- Swiping left or right on the header (album art, title and artist) changes to the next or previous song without leaving Play Along. On desktop, dragging with the mouse works too.
- The header follows the finger and the next song's header slides in. Past 30% of the width, or with a quick flick, it commits. Otherwise it springs back. Rubber-band at the first and last song.
- **Three small dots** under the header show which song you are on. The current dot is bright white, and the others are 30% white. They update with a smooth 250ms transition as the swipe commits, like an iOS page control. They are not tappable.
- When the song changes, the background palette cross-fades (400ms), the lyrics, timeline and album art update, and the audio switches. If the previous song was playing, the new one starts playing from its loop start.
- **Each song remembers its own setup:** loop start and end, loop on or off, speed and vocals level. Save them per song in `localStorage` (wrapped in try/catch, with in-memory fallback) and restore them when you swipe back to that song. A song opened for the first time uses its defaults: loop on its first chorus, speed 100%, vocals 100%.

**Sliders**
- **Vocals** (0–100%): the gain of the vocals stem. Label on the left, value on the right ("30%").
- **Speed** (50–100%): playback rate 0.5 to 1.0, pitch preserved. Small tick marks under the bar at 50%, 75% and 100%. The thumb snaps to those stops when within 2%, with a light haptic. Double-tapping the slider resets it to 100%.
- Both use one plain style: a thin rounded bar (7px tall) with a white filled part and no visible knob. Drag anywhere on the bar. The touch area is at least 44px tall. While dragging, the bar grows slightly (to 10px), as Apple Music's volume bar does.

**AirPlay**
- A plain white AirPlay icon, with no glass. Tapping it opens a small glass menu listing "iPhone" (ticked), "AirPods Pro" and "Living Room". Choosing one only moves the tick.

**Lyrics**
- Apple Music style: large bold lines. The current line is full white, lines inside the loop are 55% white, and other lines are 30% white.
- The lyrics scroll smoothly so the current line stays in the same position. Upright shows about five lines and sideways shows three.
- During instrumental sections with no lyric line, show three pulsing dots.

## 6. Visual design spec

Match these values closely. They are measured from the approved Figma design. Coordinates are in points on a 402 × 874 (upright) or 874 × 402 (sideways) screen. Build each layout with flexbox or grid so it holds together when scaled, and use these numbers as the targets.

**Shared style**
- Font: `-apple-system, "SF Pro Text", "SF Pro Display", system-ui, "Inter", sans-serif`. Load Inter from Google Fonts as the fallback for non-Apple devices.
- All text and icons are white at different opacities.
- Background: a top-to-bottom gradient from the song's palette. Song 1 stops, top to bottom: `rgb(55,77,104)`, `rgb(61,73,89)`, `rgb(64,71,80)`, `rgb(59,60,59)`, `rgb(52,48,42)`. On top, add four or five very large, heavily blurred (120px) colour blobs from the palette at 35–60% opacity, drifting slowly (60s loop), and a 12% black overlay. This gives the soft, album-art-derived look of Apple Music.
- **Liquid Glass** surfaces (× button, loop pill, menus, restart badge): `background: rgba(255,255,255,0.12)`, `backdrop-filter: blur(20px) saturate(160%)`, a 0.5px inner border of `rgba(255,255,255,0.25)` and a faint top highlight.
- Icons: draw your own simple SVG icons in the style of SF Symbols (rounded line ends, about 2px strokes on a 24px grid): metronome, xmark, ellipsis, AirPlay (two arcs over a triangle), repeat, play, pause, back and forward double triangles, go-to-start, go-to-end, speaker, quote bubble, list, plus-circle, star, share, music note.
- Motion: iOS-like springs (roughly `cubic-bezier(0.32, 0.72, 0, 1)`, 300–450ms). Respect `prefers-reduced-motion`.

**Play Along, upright (402 × 874)** — side margins 32
- Status bar: 54 tall. Time "4:02" 17px semibold at the left, and signal, Wi-Fi and battery at the right.
- Top row: "Play Along" label with a 15px metronome icon, 13px semibold, 72% white, **centred** horizontally, vertically centred on the × button. × button: 36px glass circle at x 334, y 66.
- Header at x 32, y 122: album art 56 × 56 (8px radius), 12px gap, then title (17px semibold, one line, fades out at the right edge) over artist (15px regular, 60% white).
- Song dots: three 6px dots with 6px gaps, centred horizontally, at y 192.
- Lyrics: x 46, 26px bold, 32px line height, 12px between lines, five lines, vertically centred between the dots and the timeline. Loop bar: 3px wide, rounded, 85% white, at x 32, spanning the looped lines.
- Timeline at x 32, y 559, 338 wide: bar 5px tall (20% white, fully rounded), loop stretch 50% white, played part 100% white, markers 6 × 23 white with 2px radius, centred on the bar.
- Time row, 22px below the bar: elapsed at the left, remaining at the right (12px semibold, 65% white, tabular numbers), with the loop pill centred between them (22px tall glass capsule, 14px repeat icon, 13px semibold text).
- Controls row centred at y 675: restart (24 × 22), play/pause (25 × 29) and next section (24 × 22), with 60px gaps, centred horizontally. AirPlay icon (22px) on the same centre line with its left edge at x 32.
- Sliders at y 759, side by side: Vocals at x 32 and Speed at x 211, each 159 wide. Label 13px semibold at 72% white, value 13px semibold white at the right, bar 10px below (7px tall, base 22% white, fill 95% white). Speed tick marks: 1.5 × 4 at 45% white, 4px under the bar.
- Home indicator: 139 × 5, 90% white, centred, 8px from the bottom.

**Play Along, sideways (874 × 402)** — side margins 62
- Dynamic Island: black capsule 37 × 126 at x 11, y 138. No status bar.
- Top row on the centre line y 40: "Play Along" label at x 62; header group **centred** horizontally (album art 40 × 40 with 7px radius, 10px gap, title 17px semibold over artist 15px regular at 60% white); × button (36px glass circle) with its right edge at x 812.
- Song dots: centred horizontally at y 70.
- Lyrics: x 76, y 116, three lines, 26px bold, 14px between lines. Loop bar at x 62.
- Sliders at the right, 209 wide, x 603: Vocals at y 208, Speed at y 265.
- Controls row centred at x 437, y 291: restart, play/pause and next section with about 52px gaps. AirPlay icon with its left edge at x 62 on the same centre line.
- Timeline at x 62, y 326, 750 wide, in the same style as upright. Time row 22px below it, with the loop pill centred at x 437.
- Home indicator: 200 × 5, centred, at y 388.

**Now Playing (upright)**
- Same background treatment and status bar. Grabber 60 × 5 at y 68 (27% white).
- Album art 258 × 258 at x 72, y 140.
- Title at x 33, y 487. Artist under it. More button: 32px glass circle at x 338, y 497.
- Progress bar at x 32, y 571, 338 wide and 6 tall. Times under it (13px semibold, 45% white).
- Back (39 × 22), play (31 × 36) and forward (39 × 22) centred on y 671, at x 75, 188 and 288.
- Volume bar at y 760 between speaker icons. Bottom icons at y 796: lyrics at x 76, AirPlay at x 190, queue at x 304.

**More menu**
- Glass panel 247 wide with 30px corner radius, anchored to the top right near the More button. Dark tint (`rgba(42,40,41,0.84)`) plus blur.
- Top row: three icons with 13px medium labels (Add, Favorite, Share).
- Rows: 22px icon at the left, 17px regular label at 97% white, optional 15px second line at 55% white. Dividers are 1px at 8% white.
- Pressed state: the row lightens to `rgba(255,255,255,0.12)`.

## 7. Quality bar

- Touch and mouse both work for every interaction (use pointer events). No text selection or page scrolling while interacting. No blue tap highlights.
- Every control has an accessible name (`aria-label`). The markers are sliders for screen readers ("Loop start, 0:47"). Visible focus rings for keyboard users.
- 60fps: animate only `transform` and `opacity`, and update the playhead with `requestAnimationFrame`.
- No console errors. No layout jumps when the lyrics change line.
- Keep the code easy for a designer to adjust: put every colour, size and timing in CSS variables or one `tokens.ts` file, and keep all song data and all on-screen text in the manifest and one `copy.ts` file.
- The page has a proper title ("Play Along — Apple Music concept"), a description and a social preview image generated in code, so the link looks good when shared.
- To test on a real phone on the same Wi-Fi, `npm run dev -- --host` must work. Mention this in the README.

## 8. Check before you finish

Run the app and confirm each of these yourself:
1. Now Playing plays and pauses the song at normal speed.
2. ••• opens the menu, and "Play Along" opens the Play Along screen.
3. The loop repeats cleanly with no click, and dragging either marker changes it while playing.
4. Tapping lyric lines sets the loop, and the bar beside the lyrics follows.
5. Speed at 50% sounds slower but at the **same pitch**. It snaps at 50, 75 and 100.
6. Vocals at 0% leaves only the backing. Both stems stay in time after several loops and speed changes.
7. The loop pill turns the loop off and on, and never overlaps the controls.
8. Restart and Next section work. Double-tap on open space restarts the loop and shows the badge. Double-tap on lyrics, sliders or buttons does not.
9. Swiping the header changes songs, the dots move, the colours cross-fade, and each song comes back with its own saved loop, speed and vocals.
10. Rotate (R) switches between upright and sideways and both layouts match the spec. On a real phone, turning the device does the same.
11. Full screen (F) and Restart prototype work.
12. `npm run build` succeeds and the built site works from a subfolder path (GitHub Pages).
13. The gesture guide ticks off each action as it is done.
14. With no files in `public/audio/`, all three songs still play (built-in versions). With my own `vocals` and `backing` files added for one song, that song uses them.
15. `git status` shows no audio files staged, and there is one commit per stage.
16. On a narrow touch screen (or the browser's phone emulation), the prototype fills the screen, the first-time tips appear and the full-screen control is hidden.

When finished, give me the local URL, a short summary of what you built, and anything that did not match this brief. Then wait for me to say when to push to GitHub and turn on GitHub Pages, and walk me through those steps one at a time.

---

## Amendments made while building

These are the places where the build deliberately differs from, or adds to, the brief above.

1. **Song names.** The Figma exports show real songs and artists. The prototype uses the invented ones from section 4.
2. **Timings come from bars.** Built-in songs are written in bars and chords in `src/songs.ts`; lyric and section times are calculated from the tempo, so the generated music and the lyrics cannot drift apart.
3. **First song renders at startup**, not on the first tap. Safari only allows `play()` directly inside a tap, so the audio has to be ready before it.
4. **Local audio is detected by the dev server**, not by probing URLs. This avoids "404" errors in the console on the published site, and the build strips any audio from `dist/`, so `npm run deploy` cannot publish your music by accident. All three built-in songs are set to `files` so dropping files in just works.
5. **Hundreds of guitar and drum notes are mixed in plain code** and then passed through `OfflineAudioContext` for the room sound and final render. One audio node per note took 3–7 seconds per song; this takes about 1.3.
6. **Now Playing's back and forward buttons change song** (the brief only asked for play/pause there).
7. **Guide ticks are per visit**; the per-song settings and the "tips seen" flag are what is saved in `localStorage`.
8. **Marker snapping** uses a 3px radius around lyric lines, otherwise the nearest beat.
9. **Real songs via Apple previews.** After review, the three songs became "Do I Wanna Know? (Live At the BBC)", "Sweet Creature" and "Who Knows", playing Apple's 30-second preview clips streamed from Apple. No recordings are stored in the project. The Vocals slider is disabled for previews (no stems); lyric lines are original placeholders; tempos are rough guesses.
10. **Viewer changes.** The phone now scales up to fill the window (the 1x cap is gone), the caption and controls are quieter, the footer is removed and "Try this" is a compact checklist.
11. **Additions.** A count-in (one bar of clicks before the loop) and a pulse on the More button until the menu is first opened.
