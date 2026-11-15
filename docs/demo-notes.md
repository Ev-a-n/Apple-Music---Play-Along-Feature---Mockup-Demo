# Play Along: product and demo review

Reviewed 2026-11-14 after the real lyric lines went in. The prototype is a
concept, not a product. The bar is: a viewer never hits a wall, never stops
believing it, and comes away able to say what Play Along is for in one line.

## Where it stands

- The core loop works end to end: pick a part, repeat it, slow it down, take
  the vocals down, with a count-in and haptics. Sideways layout for a stand.
- The words fit the music everywhere: the 30-second clip repeats for the
  song's length and its lines repeat with it. Loop markers work anywhere.
- The frame reads as a device, the page has a title above and commands
  below, and a real phone follows rotation.
- The real covers, blurred past recognition, give the art and the
  background their colour and feel without showing the artwork itself.
- Moving a loop marker scrolls the lyrics to it, letting go starts the loop
  from its new start, and a tap on the bar moves the loop there.

## UI: what to refine next

1. **Entry point.** Play Along lives only in the ••• menu. That is the
   biggest usability question in the concept. Alternatives worth showing in
   the case study: a button in Now Playing's bottom row (beside Lyrics), or a
   "Play along" action inside the Lyrics view, where someone learning a song
   already is. Test which one people find.
2. **Loop pill.** It shows times (0:01 – 0:15). Musicians think in lines and
   bars: "4 lines" or "8 bars" next to the times would read better.
3. **Count-in toggle.** The on/off state is subtle. A filled pill when on, or
   a short "1 bar" label, would make it obvious.
4. **Speed slider.** Snaps at 50, 75 and 100 are right; label them as ½, ¾
   and full speed so the number is not the only cue.
5. **Section skipping.** With the clip repeated, "next section" steps through
   30-second parts. With a full song and real structure it should step
   through Verse, Chorus, Bridge: name that in the case study.
6. **Long lines.** They wrap now. In sideways, three lines fit; watch for a
   wrapped third line being half visible and consider two lines there.

## Product thinking

- **Who and why.** People learning a song by ear on guitar, piano, bass or
  voice. Today they slow YouTube to 0.75×, or switch to Moises, Capo or
  Anytune, re-finding the song there. Play Along removes that switch: you
  practise inside the player you already have the song open in.
- **Why it is credible for Apple.** Apple Music Sing already attenuates
  vocals on the device; pitch-preserving speed change is built into every
  Apple platform. The concept does not need new technology, it needs an
  entry point and a practice layout.
- **What to add to the story (not necessarily the prototype):** a saved
  practice spot per song with a name ("solo", "second verse"); a tempo ramp
  that raises the speed a few percent after each clean pass; a metronome
  click under the music; transpose for guitarists with a capo; chord or
  key display; Apple Watch tap to restart the loop hands-free.
- **Success measures.** Loops set per session, return visits to the same
  song within a week, share of play time at reduced speed, and whether
  people turn the count-in on (a sign they are really playing).
- **Constraints to name honestly.** Vocal separation quality on streamed
  audio, time-stretch artefacts below 75%, licensing for stems, and
  latency if a live instrument is ever mixed in.

## Wireframes and flow

Show three screens as the spine of the story: Now Playing → set the loop
(markers or a tapped line) → practise sideways on a stand. Then the states
around them: first-time tips, loading, vocals unavailable, loop off,
counting in, end of song. The prototype has all of these; screenshot them
from it rather than redrawing.

Call out the design decisions and the alternatives you rejected:

- Loop by dragging markers *and* by tapping a lyric line (two mental models:
  time and words). Why both, and which people reach for first.
- Double-tap empty space to restart, as a shortcut to the restart button.
- Sideways as a first-class layout, not a rotated phone.
- Count-in as a default-off option: it helps players and annoys listeners.

## Case study extras

- Open with the problem in the user's words: a short quote from a musician
  about slowing a song down. One or two real sources (forum threads, app
  reviews of Moises or Capo) carry more weight than a persona.
- A competitive strip: YouTube speed, Moises, Capo, Anytune, Yousician.
  Position Play Along as zero-switch practice inside the player.
- A usability test plan, even if small: five people, one task ("loop the
  chorus at three-quarter speed without the singer"), time and taps to
  finish, where they looked first for the feature. Run it with the "Try
  this" trail hidden.
- Accessibility note: sliders and markers are keyboard and screen-reader
  operable, reduced motion is honoured. Say so; it is rare in concepts.
- A 45-second demo film: open the song, ••• → Play Along, drag the markers,
  tap a line, slow down, vocals down, count-in, rotate. Record it from the
  prototype in full screen (press F).

## Demo tips

- Start on Now Playing at 0:00 and go in through the ••• menu: that is the
  product story, not just the feature.
- Demo speed at 75% and vocals around 20–30%, where both sound best.
- Keep loops shorter than 30 seconds; a loop across a 30-second boundary
  hears the clip start over.
- On an iPhone, Add to Home Screen gives the full-screen version. On a
  laptop, press F, then R for sideways.
- Press Reset demo on the page between viewers: it clears saved loops.

## Things to adjust by ear

- `lines` per song in `src/songs.ts`: the clip's words and their times
  (the T key re-times them).
- `bpm` per song: sets the count-in and the beat the markers snap to.
- `CENTRE_CUT_HZ` in `src/audio/engine.ts`: raise it if the bass thins out
  with the vocals down, lower it if low vocals stay too loud.
