# Your own audio (optional, never committed)

Everything in this folder except this README is ignored by Git, so your
music stays on your computer and is never published.

To use real audio for a song, make a folder named after the song's `id`
in `src/songs.ts` and set that song's `audio` to `{ type: 'files' }`:

```
public/audio/porch-light/vocals.mp3
public/audio/porch-light/backing.mp3
```

- `vocals` + `backing` → both sliders work.
- or one `full` file → speed and loop work, the Vocals slider is disabled.
- `.mp3`, `.m4a` and `.wav` are accepted.

If the files are missing (as they are on the published site), the song
falls back to its built-in generated version automatically.

Do not commit or publish copyrighted recordings.
