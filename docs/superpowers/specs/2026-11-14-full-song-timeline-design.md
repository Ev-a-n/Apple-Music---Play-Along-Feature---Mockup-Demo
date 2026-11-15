# Full-song timeline with a 30-second clip standing in

Date: 2026-11-14 (revised twice the same day: no restrictions in the demo; then the clip's lyrics repeat with the clip)

## Goal

Make the demo feel like the whole song is there, as in Apple Music, with
every control working everywhere. Only Apple's 30-second preview clip exists,
so the clip stands in for the whole song. The first version confined the loop
markers to the part the clip covers; that made a viewer bump into a wall, so
it was dropped.

## What the user sees

- Now Playing and Play Along show the full song length (for example 4:17).
  The song starts at 0:00.
- The loop markers, lyric taps, next section and restart work over the whole
  song, exactly as before.
- The Vocals slider works on every song. On a preview it turns the centre of
  the mix down above the bass instead of mixing a real vocal stem.

## Data

`Song.duration` is the full length from Apple's catalogue (hard-coded). Each
song's `lines` are the words sung in the clip with times in clip seconds.
`fromClip()` repeats them every 30 seconds for the song's length, makes a
section per pass, and starts the default loop on the clip's first few lines.
So the words fit the music at every point of the song.

## How it works

The engine keeps time in song seconds. `load(source, span?)` takes the song's
length (the clip starts at song time 0). Internally song time = pass × clip
length + audio time; the clip starts over every 30 seconds, each start-over a
jump with the usual gain dip. The engine also supports a clip that belongs
later in the song (`Span.start`), no longer used by the manifest. With the
whole song on disk the span is omitted and nothing wraps.

Vocals: the backing element goes through a mid/side graph. Left = sides +
centre + cut × highpass(centre), right = −sides + centre + cut × highpass
(centre), with `cut` from 0 (100%) to −1 (0%). At 100% the output is the
original left and right. With real stems the cut stays 0 and the vocals stem
has its own gain, as before.

`state/app.ts` only passes the span for the Apple clip and reports the vocals
slider as always available. Screens are unchanged.

## Out of scope

Real lyrics (copyrighted; the lines stay placeholders until pasted in),
fetching lengths at run time, true stem separation in the browser.
