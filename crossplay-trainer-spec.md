# Crossplay / Scrabble Word Trainer — Claude Code Build Spec

## Overview

A progressive web app (PWA) for drilling NWL2023 2- and 3-letter words. The user sees a word, taps Valid or Invalid, gets immediate feedback, and the app schedules future reviews using spaced repetition. Deployable to GitHub Pages with no backend.

---

## Tech Stack

- **Vite + React + TypeScript**
- **Tailwind CSS** for styling
- **localStorage** for all persistence (no backend, no auth)
- **PWA**: `vite-plugin-pwa` for manifest + service worker (Workbox)
- **Deploy target**: GitHub Pages via `gh-pages` npm package

---

## Project Structure

```
/
├── public/
│   └── icons/          # PWA icons (192x192, 512x512 — generate simple letter-tile style)
├── src/
│   ├── data/
│   │   └── words_nwl23.json   # Word list (provided — copy in as-is)
│   ├── hooks/
│   │   └── useWordEngine.ts   # All SRS logic and localStorage interaction
│   ├── components/
│   │   ├── DrillScreen.tsx    # Main flashcard UI
│   │   ├── SessionSummary.tsx # End-of-session results
│   │   ├── HomeScreen.tsx     # Settings / start session
│   │   └── ThemeToggle.tsx    # Night mode button
│   ├── types.ts
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
└── package.json
```

---

## Word List Data Format

The file `src/data/words_nwl23.json` is already provided and has this shape:

```json
{
  "two_letter": ["AA", "AB", "AD", ...],
  "three_letter": ["AAH", "AAL", "AAS", ...]
}
```

At app startup, transform this into a flat array of `WordEntry` objects (see Types below). This is done once and cached in memory for the session.

---

## Types (`src/types.ts`)

```typescript
export type Category = '2-letter' | '3-letter';
// Future categories will be added here: 'q-words' | 'vowel-dump' | etc.
// The filter UI reads this type, so adding a new category only requires:
//   1. Adding the string to this union
//   2. Adding entries with that category to the word list

export interface WordEntry {
  word: string;
  category: Category;
}

export interface WordProgress {
  word: string;
  interval: number;       // days until next review
  easeFactor: number;     // SM-2 ease factor, starts at 2.5
  dueDate: string;        // ISO date string
  timesCorrect: number;
  timesWrong: number;
}

export type FilterMode = '2-letter' | '3-letter' | 'both';
```

---

## Spaced Repetition Logic (`src/hooks/useWordEngine.ts`)

Use a simplified SM-2 algorithm. Do NOT use an external SRS library — implement it directly so the logic is transparent.

### Initial state for a word never seen before:
```
interval: 1
easeFactor: 2.5
dueDate: today
```

### On CORRECT answer:
```
newInterval = Math.round(interval * easeFactor)
easeFactor = easeFactor + 0.1  (cap at 3.0)
dueDate = today + newInterval days
```

### On WRONG answer:
```
newInterval = 1  (reset — show again soon)
easeFactor = Math.max(1.3, easeFactor - 0.2)
dueDate = today
```

### Session queue logic:
1. Filter the full word list by the user's selected `FilterMode`
2. From that filtered set, find all words where `dueDate <= today`
3. Shuffle that set
4. If the set is smaller than the session length, pad with random non-due words from the filtered set (these are "maintenance" reviews)
5. Session ends when `sessionLength` cards have been answered

### localStorage schema:
- Key: `nwl_progress`
- Value: JSON object where keys are words and values are `WordProgress` objects
- Example:
```json
{
  "AA": { "word": "AA", "interval": 4, "easeFactor": 2.6, "dueDate": "2026-04-09", "timesCorrect": 3, "timesWrong": 0 },
  "ZA": { "word": "ZA", "interval": 1, "easeFactor": 2.3, "dueDate": "2026-04-05", "timesCorrect": 1, "timesWrong": 2 }
}
```
- Read on app load, write after every card answer

---

## Home Screen (`src/components/HomeScreen.tsx`)

Shown at app start and after each session summary.

### Controls:
1. **Category filter** — segmented control or radio buttons:
   - `2-letter only`
   - `3-letter only`
   - `Both` (default)

2. **Session length** — segmented control:
   - `10` | `25` | `50` | `Unlimited`
   - Default: `25`

3. **Start Session** button — disabled if no words are due and filtered set is empty (edge case only)

4. **Stats summary** (read-only, below the start button):
   - Words due today (in selected filter)
   - Total words mastered (interval >= 21 days)
   - Overall accuracy % (all time)

### Note on "Unlimited":
Session ends only when the user navigates away or there are no more words to show. When the filtered due-word set is exhausted, keep cycling through the full filtered set in SRS order.

---

## Drill Screen (`src/components/DrillScreen.tsx`)

This is the core loop. It should feel fast and clean.

### Layout (top to bottom):
1. **Progress bar** — `cardsAnswered / sessionLength` (omit for Unlimited mode, show count instead: "12 answered")
2. **Streak counter** — "🔥 5 in a row" — shown when streak >= 3, hidden otherwise (don't show "🔥 0")
3. **Word display** — large centered text, all caps, prominent font (this is the main focus of the screen)
4. **Two buttons** — side by side, full width:
   - `VALID` (green)
   - `INVALID` (red)
5. **Feedback overlay** — shown for ~1 second after tap, then auto-advances:
   - ✓ Correct — green flash
   - ✗ Wrong — red flash, show brief definition or note (see Definitions below)
   - If correct, show nothing extra — keep it fast
   - If wrong AND it was a valid word, show: `[WORD] is valid` + one-line note if available
   - If wrong AND it was invalid: just `[WORD] is not valid in NWL2023`

### Behavior:
- After feedback overlay (~1000ms), automatically advance to next card — no tap needed
- Do NOT require a tap to advance. Speed matters.
- Track streak (reset to 0 on any wrong answer)
- When session length is reached, navigate to SessionSummary

---

## Definitions

For the feedback overlay on wrong answers, a full definition database is out of scope. Instead, include short notes only for the highest-surprise words — ones that look invalid but are valid, or look valid but aren't.

Provide a `definitions` map in `src/data/` as a separate JSON file:

```json
{
  "AA": "rough lava",
  "QI": "life force (Chinese philosophy)",
  "ZA": "pizza (slang)",
  "XI": "Greek letter",
  "KI": "variant of QI",
  "OI": "exclamation",
  "PHO": "Vietnamese noodle soup",
  "ZZZ": "representing sleep",
  "CWM": "a cirque (Welsh/geological term)",
  "NTH": "to the nth degree"
}
```

Populate this with ~50–100 of the trickiest/most surprising words. For words not in this map, show no definition — just the valid/invalid verdict. Claude Code should populate this list using its own knowledge of surprising NWL words.

---

## Session Summary (`src/components/SessionSummary.tsx`)

Shown at end of session.

### Display:
- Cards answered: N
- Correct: N (N%)
- Wrong: N
- Best streak: N
- Words you missed (list, scrollable if long)
- Two buttons: `Study Again` (same settings) | `Home` (back to HomeScreen)

---

## Night Mode (`src/components/ThemeToggle.tsx`)

- On app load, read `prefers-color-scheme` — default to dark if system is dark
- Persist user's manual override in localStorage key `nwl_theme` (`'light'` | `'dark'`)
- Toggle button in top-right corner of every screen — use a sun/moon icon (lucide-react has both)
- Implement via a `data-theme` attribute on `<html>` and CSS variables in `index.css`
- Tailwind dark mode: use `darkMode: 'class'` in `tailwind.config.js` and apply `dark:` variants

### Color palette:
- Light: white background, dark text, green/red for Valid/Invalid buttons
- Dark: near-black background (#111 or similar), light text, same green/red buttons (slightly muted)

---

## PWA Configuration

Use `vite-plugin-pwa` with these manifest values:

```json
{
  "name": "NWL Word Trainer",
  "short_name": "WordDrill",
  "description": "Spaced repetition drilling for NWL2023 2- and 3-letter words",
  "theme_color": "#111111",
  "background_color": "#111111",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Use Workbox `generateSW` strategy with `clientsClaim: true` and `skipWaiting: true`. Cache the word list JSON and all app assets so it works fully offline.

---

## GitHub Pages Deployment

1. Set `base` in `vite.config.ts` to the repo name: `base: '/your-repo-name/'`
2. Add deploy script to `package.json`:
```json
"scripts": {
  "deploy": "vite build && gh-pages -d dist"
}
```
3. Install: `npm install --save-dev gh-pages`
4. Leave a `README.md` note explaining: run `npm run deploy` to publish; the app will be live at `https://[username].github.io/[repo-name]/`

---

## Extensibility Hook (important — do not skip)

The category filter system must be built to support future expansion with zero code changes to the filter UI or SRS logic. Specifically:

- The `Category` type in `types.ts` is the single source of truth for what categories exist
- The `HomeScreen` filter control must derive its options dynamically from the word list (i.e., read what categories are present in the data, don't hardcode `['2-letter', '3-letter']` in the JSX)
- Future word categories (e.g., `'q-words'`, `'j-words'`, `'vowel-dump'`) need only be added to `words_nwl23.json` with the appropriate `category` field and to the `Category` type — no other changes

---

## What NOT to Build

- No user accounts or login
- No server, API, or database
- No timed mode
- No leaderboards or social features
- No definition lookup for every word (only the curated surprise list)
- No animation beyond the feedback flash and button press states

---

## Acceptance Criteria

- [ ] App loads and shows HomeScreen with filter and session length controls
- [ ] Starting a session shows cards from the correct filtered set
- [ ] Tapping Valid/Invalid scores correctly and shows feedback overlay
- [ ] Feedback auto-advances after ~1000ms without requiring a tap
- [ ] Wrong answers show a definition/note if one exists in the definitions map
- [ ] Streak counter appears when streak >= 3
- [ ] Progress bar updates correctly (or card count for Unlimited)
- [ ] Session ends at the correct count and shows SessionSummary
- [ ] SessionSummary shows missed words and correct/wrong counts
- [ ] SRS state persists in localStorage across sessions
- [ ] Words answered correctly multiple times are seen less frequently
- [ ] Words answered wrongly are re-queued soon
- [ ] Night mode toggle works and persists across sessions
- [ ] App installs to iOS home screen via Safari "Add to Home Screen"
- [ ] App works fully offline after first load
- [ ] `npm run deploy` publishes to GitHub Pages
