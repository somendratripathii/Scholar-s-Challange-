# The Scholar's Challenge

A candlelit mental-arithmetic training game. Pure HTML5 + CSS3 + vanilla
JavaScript — no frameworks, no build step, no external audio/image files
(music and sound effects are synthesized in-browser with the Web Audio
API, so there's nothing here that isn't either code you own or freely
usable).

## Run it locally

Just open `index.html` in a browser, or serve the folder so the service
worker and manifest work correctly:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy to GitHub Pages

1. Push this folder's contents to a repo (root, or a `/docs` folder).
2. In the repo settings → **Pages**, set the source to that branch/folder.
3. Your game will be live at `https://<username>.github.io/<repo>/`.

No build tools, no `npm install` — it's ready as-is.

## What's inside

- `index.html` — layout for the hall (menu), practice picker, the game
  screen, the summary screen, and the settings dialog.
- `css/styles.css` — the warm walnut/parchment/brass/burgundy design
  system, all animations (page turns, wax-seal stamps, combo flares,
  level-up toasts, timer glow).
- `js/questions.js` — question generation for every category (addition
  through BODMAS); every generator is designed to always return an
  integer answer, and a seeded RNG produces the same Daily Challenge
  set for every player on a given date.
- `js/game.js` — the game state machine: levels 1‑13+, practice mode,
  endless mode, the daily challenge, scoring, combos, streak rewards
  (10/25/50/100 correct answers unlock badges and desk themes),
  and local-storage persistence.
- `js/audio.js` — an ambient pad + soft "piano" pluck for background
  music, plus correct/wrong/level-up/tick sound effects, all generated
  with oscillators — toggle and volume control included.
- `js/particles.js` — the floating dust motes and slow candlelight
  glow on the canvas background.
- `js/storage.js` — a small localStorage wrapper for best score,
  accuracy, unlocks, badges, and settings.
- `sw.js` / `manifest.json` — offline support and installability.

## Notes on customizing

- Add or tweak categories in `Questions.SUBJECTS` (in `questions.js`) —
  each entry just needs a `label` and a `gen(tier)` function returning
  `{ text, answer }` with an integer `answer`.
- Level pacing (which subjects unlock when, timer lengths, difficulty
  tiers) lives in `subjectsForLevel`, `timerForLevel`, and `tierFor`
  in the same file.
- Desk themes are CSS custom-property swaps — see the
  `body[data-theme="…"]` rules at the top of `styles.css`.
