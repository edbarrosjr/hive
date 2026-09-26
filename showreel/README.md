# Motion showreel

A 15-second motion graphics reel rendered entirely from one HTML canvas: 900 deterministic frames at 1920×1080, 60 fps, with a soundtrack synthesized from code. Nothing is keyframed by hand and no video tooling beyond ffmpeg is involved.

Open `index.html` in a browser to watch it live (click to pause, `R` to restart).

## Timeline

| Time | Scene | What it shows |
| --- | --- | --- |
| 0.0–2.0 | Ignition | Dot, shockwave rings, iris reveal, staggered elastic title |
| 2.0–4.0 | Kinetic type | Words slam in on eighth notes with counter-moving bands, motion blur, squash and stretch, then stack and whip out |
| 4.0–6.5 | Geometry | Circle → triangle → square → pentagon → hexagon morph with stroke draw-on, orbiting dots, beat pops |
| 6.5–9.0 | Dimension | Perspective camera, wireframe icosahedra with chromatic edges over a noise-driven terrain |
| 9.0–11.5 | Interface | Product motion: card, bar chart, odometer counters, line chart draw-on, toggle, cursor, button click, toast |
| 11.5–13.5 | Particles | 4,200 agents in a curl flow field pulled into the word MOTION, then burst |
| 13.5–15.0 | Sign-off | End card |

Global passes: beat-synced screen shake, chromatic aberration on impacts, flash frames, vignette and film grain. Tempo is 120 BPM; every cut sits on a beat.

## Render

Needs Node 22+, an ffmpeg with `libx264` and `aac`, and a Chromium binary (Playwright's works).

```sh
cd showreel
npm i --no-save playwright-core
node audio.mjs                      # out/audio.wav
FFMPEG=/path/to/ffmpeg CHROMIUM=/path/to/chrome node render.mjs   # out/showreel.mp4
```

`render.mjs --sheet` writes a contact sheet and `--stills 0,90,...` writes single frames, which is how the timing was tuned.

Fonts are Inter (SIL Open Font License); see `fonts/LICENSE.txt`.
