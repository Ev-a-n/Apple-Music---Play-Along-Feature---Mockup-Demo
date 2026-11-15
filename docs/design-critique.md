# Design Critique: Play Along (Apple Music concept prototype)

Reviewed 2026-11-15 against the running prototype: Now Playing, the More menu,
Play Along upright and sideways, and the page around the phone. Stage:
refinement of a concept, heading for a case study and demo.

## Overall Impression

It reads as Apple Music, and the core act (choose a part, slow it, take the
singer out, repeat) works end to end with words that fit the music. The
biggest opportunity is wayfinding: Play Along is hidden in a nine-item menu,
and once inside, its transport icons borrow Now Playing's "previous/next
song" glyphs for "restart loop/next section".

## Usability

| Finding | Severity | Recommendation |
|---|---|---|
| Play Along lives only in the ••• menu, seventh of nine rows, with a pulsing More button as the only hint. | 🔴 Critical | Add a second entry: a Play Along button in Now Playing's bottom row (beside Lyrics) or an action inside the lyrics view. Keep the menu row. |
| ⏮ and ⏭ mean "previous/next song" on Now Playing but "restart loop/next section" in Play Along. Same glyphs, different jobs, one screen apart. | 🔴 Critical | Use distinct glyphs in Play Along: a loop-restart arrow (arrow.counterclockwise) and a "next part" chevron-to-line, or label the pills. |
| The loop pill (0:01 – 0:15) is the loop on/off switch, but it looks like a status label. Its tap area is 108 × 22 px. | 🟡 Moderate | Make it a 32 px-tall pill with the repeat icon filled when on, and say what it covers ("4 lines"). |
| "Next section" steps through 30-second parts with no visible section names. The user cannot predict where it goes. | 🟡 Moderate | Show the part name in the loop pill or a toast on skip ("Part 2"). With real song structure, name Verse/Chorus. |
| Tapping a lyric line sets the loop start, and a second tap within four seconds sets the end. Nothing on screen explains the pairing. | 🟡 Moderate | After the first tap, show a brief hint on the pill ("Tap where to end"). Or drop pairing and let the end come from the markers. |
| Three ways to move the loop (markers, lyric tap, bar tap) plus double-tap restart. Rich, but overlapping. | 🟢 Minor | Fine for a prototype that is explored. In the case study, state which is primary (lyric tap) and which are shortcuts. |
| The count-in toggle's on/off state is a subtle tint on a 22 px glyph. | 🟢 Minor | Filled pill when on, with "1 bar". |

## Visual Hierarchy

- **What draws the eye first**: upright, the bright current lyric line, then the play button. Correct: words and transport are the two things a player needs. Sideways, the lyrics own the left two-thirds; also correct for a music stand.
- **Reading flow**: header → lyrics → timeline → times → transport → sliders. The sliders sit last and smallest, yet speed and vocals are the feature's reason to exist. On the demo they are easy to miss.
- **Emphasis**: the loop region on the timeline is a slightly brighter band with 12 px marker heads. It is the most important state on the screen and the least visible element. Lift the loop band's brightness and give the markers a taller head.

## Consistency

| Element | Issue | Recommendation |
|---|---|---|
| Metronome glyph | Used for the "Play Along" label at top and for the count-in toggle at bottom right. One icon, two meanings. | Give the label a different mark (a repeat or music-note glyph) or drop the icon from the label. |
| Time labels | 12 px in Play Along, 13 px on Now Playing. | Use 13 px in both. |
| Secondary text tones | 45%, 65% and 72% white used for similar roles across the two screens. | Settle on two tones: 70% for labels, 50% for times. |
| Sideways bottom row | Now Playing's bottom row (Lyrics, AirPlay, Queue) sits tight under the volume slider, 350 px into a 402 px screen. | Trim the gap above or drop Queue sideways. |

## Accessibility

- **Color contrast**: time labels at 45% white and lyric lines at 30% white sit on a mid-tone blurred cover. Against the lighter covers they fall under 3:1. Apple Music does the same, but say so in the case study and keep the current line at 100%.
- **Touch targets**: markers, transport, count-in and AirPlay are 44 px; sliders 52 px tall; close is 36 px with a 48 px hit area. The loop pill at 22 px tall is the one miss.
- **Text readability**: lyrics 26 px bold with a 30 px line, long lines wrap over two or three rows. Good. The 12 px time row is small for a phone held at arm's length on a stand; 13 px is the floor.
- **Assistive**: markers are sliders with values, lyric lines are buttons, the next trail stop is `aria-current`, reduced motion is honoured. Strong for a concept.

## What Works Well

- The lyrics follow a dragged marker, and letting go starts the loop from its new start. That one detail makes the loop feel like an object you are holding.
- Count-in before each pass, with the four-count badge: a musician's detail that sells the idea.
- The sideways layout is a real layout, not a rotated phone.
- The page around the phone is quiet: title above, device frame, three commands, a six-stop trail. It explains itself.
- Blurred real covers give each song its mood without showing the artwork.

## Priority Recommendations

1. **Give Play Along a visible front door.** Put a Play Along button in Now Playing's bottom row (or inside the lyrics view). It is the single change that most affects whether people find the feature at all, and the case study's most defensible decision.
2. **Fix the transport glyphs.** Replace ⏮/⏭ in Play Along with a restart-loop arrow and a next-part chevron. Removes the one place the prototype contradicts Apple Music's own language.
3. **Make the loop visible and tappable.** Brighter loop band, taller marker heads, and a 32 px loop pill that reads "4 lines · 0:01–0:15" with a filled repeat icon when on.
