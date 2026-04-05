# NWL Word Trainer (crossplay-trainer)

A progressive web app for drilling NWL2023 2- and 3-letter Scrabble words using spaced repetition.

## Features

- **SM-2 spaced repetition** — words you miss come back sooner; words you nail get pushed out further
- **Valid + invalid distractors** — ~35% of cards are plausible-looking non-NWL words to keep you sharp
- **Dark/light mode** — respects system preference, persists your override
- **PWA** — installs to iOS/Android home screen, works fully offline
- **No backend** — all progress stored in localStorage

## Development

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

```bash
npm run deploy
```

The app will be live at: `https://nicholasalawrence.github.io/crossplay-trainer/`

> `npm run deploy` runs `vite build` then publishes the `dist/` folder via `gh-pages`.

## Adding new word categories

1. Add the new category string to the `Category` union in `src/types.ts`
2. Add words with that category to `src/data/words_nwl23.json`
3. That's it — the filter UI and SRS logic pick it up automatically
