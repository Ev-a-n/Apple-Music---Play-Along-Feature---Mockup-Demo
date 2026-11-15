# UX Copy: Play Along prototype

Review of every string in `src/copy.ts` on 2026-11-15. Audience: people
trying the demo (classmates, reviewers, musicians) on a laptop or a phone.
Tone: Apple Music's own, plain and short, sentence case except where Apple
uses Title Case in its menus. Nothing here is applied yet.

## Recommended copy

Page around the phone
- **Subtitle**: "concept prototype · try it" (was "… tap to explore"; on a
  laptop nobody taps).
- **Restart button**: "Reset demo" (was "Restart", which now collides with
  "restart the loop" inside Play Along).
- **Rotate button**: keep "Rotate · R", and make the trail say "rotate" too.

Trail ("Try this")
1. "Open ••• → Play Along" (keep)
2. "Press R to rotate" (was "to turn sideways": one word for one action)
3. "Drag the loop markers" (keep)
4. "Tap play" (was "Press play": press is for keys, tap for the screen)
5. "Tap the metronome for a count-in" (was "Tap the metronome": says why)
6. "Tap ⏮︎ to restart the loop" (keep)
7. "Swipe the song title" (was "Swipe to the next song": says where)
- **Header count**: "2 of 7" (keep). **Finished**: "All done" (keep).
- **Phone tips sheet**: match the trail. It still mentions double-tap and
  tapping a lyric line, which the trail no longer asks for. Use: markers,
  count-in, ⏮︎ to restart, swipe the title; keep "Turn your phone sideways".

Play Along
- **Loop pill off state**: "Loop off" (was "Loop Off": sentence case like
  "Count-in on").
- **Loop pill on state**: "4 lines · 0:01–0:15" if the pill ever shows what
  it covers; otherwise keep the times.
- **Next section button name**: "Next part" (the song is split into
  30-second parts, not musical sections).
- **Vocals unavailable note**: "No separate vocal track for this song" (was
  "Not available for this song"; says why). Rarely shown now.
- **Count-in on toast**: "Count-in on · 4 clicks before each loop" (was
  "one bar": "clicks" lands for non-musicians too).
- **Load error toast**: "Couldn't load this song. Check your connection and
  try again." (adds the fix).
- **Silent-mode toast**: keep "No sound? Turn off silent mode."
- Accessible names ("Loop start", "Lyrics. Tap a line to start the loop
  there.", "Song 1 of 3", "Close Play Along"): keep, they are exact.

Now Playing and menu
- Keep Apple's Title Case for menu rows ("Add to Playlist", "Go to Album").
- "Play Along" as the feature name everywhere, two words, both capped.

## Alternatives

| Element | Option | Copy | Tone | Best for |
|---|---|---|---|---|
| Trail stop 5 | A | Tap the metronome for a count-in | Plain | Default |
| | B | Turn on the count-in | Direct | If the icon is ever a labelled pill |
| | C | Tap the metronome to hear 4 clicks first | Explanatory | First-time visitors |
| Page reset | A | Reset demo | Plain | Default |
| | B | Start over | Friendly | If "demo" feels too internal |
| | C | Reset | Minimal | Tight layouts |
| Load error | A | Couldn't load this song. Check your connection and try again. | Helpful | Default |
| | B | This song didn't load. Try again in a moment. | Reassuring | When the cause is usually transient |
| | C | Couldn't reach Apple's preview. Try again. | Specific | If you want to name the source |

## Rationale

- One verb per kind of action: press for keys, tap for the screen, drag and
  swipe for gestures. The trail then reads as a single voice.
- Two things were called "restart": the page button and the loop. Renaming
  the page button removes the only real ambiguity in the prototype.
- "Next part" is honest about what the button does with a repeated clip.
- The toast and the error now follow what happened + how to fix.
- Everything else already matches Apple Music's register; the review keeps
  it rather than rewriting for the sake of it.

## Localization notes

- Keep "Play Along" as a product name or translate once and use it
  everywhere, including the menu row and the trail.
- The ⏮︎ glyph needs the text-presentation selector (U+FE0E) or it renders
  as an emoji on some systems; translators should keep it as is.
- German and French run about 30% longer: the trail labels under the phone
  wrap to three lines at 400 px, so keep translations under about 30
  characters.
- "Count-in" has no direct equivalent in some languages; "Einzählen" (DE),
  "décompte" (FR). Avoid "metronome" where the feature is the count.
- Times use a figure dash (0:01–0:15); keep the en dash, not a hyphen.
