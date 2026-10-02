# Battleship — Implementation Plan

**Status:** Draft for review · Implements `REQUIREMENTS.md` v0.2

## 1. Guiding principles

- **Simple over clever.** No UI framework, no backend, no state library. One static web page.
- **Logic separate from the UI.** All game rules and the AI are plain TypeScript functions with no browser code, so they can be fully unit-tested. The UI only displays state and forwards clicks.
- **One source of truth.** The whole game is a single `GameState` object. Every action produces a new state, then the screen is redrawn from it. The UI never keeps its own copy of game data.
- **Deterministic tests.** Every random choice goes through an injectable random-number generator, so tests can use a fixed seed and give the same result every run.

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript (strict mode) | Type errors are caught before the game ever runs. |
| Build / dev server | Vite | Near-zero config, instant reload, produces a small static `dist/` folder. |
| UI | Plain DOM + CSS (no framework) | Two 10x10 grids and a few panels don't need React; fewer moving parts. |
| Tests | Vitest | Works natively with Vite and TypeScript, fast. |
| Lint / format | ESLint + Prettier | Consistent, clean code. |
| Hosting | GitHub Pages, deployed by GitHub Actions | Free for public repos, the repo is already on GitHub, deploys automatically on every merge to `main`. |
| Runtime | Node.js 22 LTS (dev only) | Needed only to build/test; players need only a browser. |

## 3. Project structure

```
battleship-ai/
├── index.html                 # Page shell
├── src/
│   ├── main.ts                # Entry point: creates the game and wires the UI
│   ├── game/                  # Pure logic — no DOM, fully unit-tested
│   │   ├── types.ts           # Coord, Ship, Board, GameState, ShotResult…
│   │   ├── constants.ts       # Board size (10), fleet definition
│   │   ├── random.ts          # Seedable RNG (mulberry32) + helpers
│   │   ├── board.ts           # Placement validation, placing/removing ships, receiving shots
│   │   ├── fleet.ts           # Random (auto) fleet placement
│   │   ├── game.ts            # Game state + actions (the "rules engine")
│   │   └── ai.ts              # AI opponent: chooses the next cell to fire at
│   ├── ui/
│   │   ├── render.ts          # Draws boards, fleet panels, status, dialogs from GameState
│   │   ├── controller.ts      # Handles clicks/keys, calls game actions, schedules AI turns
│   │   └── styles.css         # Visual design
├── tests/                     # Vitest unit + simulation tests for src/game/*
├── .github/workflows/
│   ├── ci.yml                 # Lint + typecheck + tests on every pull request
│   └── deploy.yml             # Build + deploy to GitHub Pages on push to main
├── REQUIREMENTS.md
├── IMPLEMENTATION_PLAN.md
└── README.md                  # How to play, run, test, deploy
```

## 4. Major components

### 4.1 Game logic (`src/game/`)

| Module | Responsibility | Key functions |
|---|---|---|
| `constants.ts` | Board size and the fleet (name + length for the 5 ships). | `BOARD_SIZE`, `FLEET` |
| `random.ts` | Seedable RNG so all randomness is reproducible in tests. | `createRng(seed)`, `randomInt`, `pick`, `shuffle` |
| `board.ts` | Everything about one side's board. | `createBoard()`, `shipCells(start, length, orientation)`, `canPlace(board, …)`, `placeShip`, `removeShip`, `receiveShot(board, coord) → ShotResult`, `allSunk(board)` |
| `fleet.ts` | Valid random placement for the whole fleet (used for the AI and the Auto-place button). | `autoPlace(board, rng)` — places the remaining ships, longest first, choosing a random valid position from all legal positions (always succeeds, no retry loops). |
| `game.ts` | The rules engine: phases, turns, win detection, stats. | `newGame(rng)`, `placePlayerShip`, `removePlayerShip`, `autoPlacePlayer`, `resetPlacement`, `startBattle(first)`, `playerFire(coord)`, `aiFire()` |
| `ai.ts` | Decides where the AI fires next. | `chooseAiShot(view, rng) → Coord` |

### 4.2 User interface (`src/ui/`)

- **`render.ts`** — `render(state)` redraws the whole screen from `GameState`. That's only ~200 cells, so a full redraw is instant and avoids "screen out of sync with game" bugs. Board cells are `<button>` elements with labels such as "C5, hit" (keyboard and screen-reader friendly).
- **`controller.ts`** — the only place where things happen: listens to clicks, hover and the **R** key, calls the matching action in `game.ts`, stores the new state, calls `render`. It also schedules the AI's turn after a short delay.
- **`styles.css`** — a calm "naval" palette, CSS Grid boards with A–J / 1–10 labels, clear symbols (✕ hit, • miss, sunk ships darkened and outlined), hover states and a short "splash" animation on each shot. Boards sit side by side on desktop and stack on narrow screens.

### 4.3 Screen layout

```
┌──────────────────────────────────────────────────────────┐
│  BATTLESHIP                                  [New game]  │
│  Status: "Your turn — fire at the enemy fleet"           │
├──────────────────────────┬───────────────────────────────┤
│  YOUR FLEET              │  ENEMY WATERS                 │
│  (10x10 own board)       │  (10x10 target board)         │
│  Fleet status: ■■■■□     │  Fleet status: ■■■□□          │
├──────────────────────────┴───────────────────────────────┤
│  Placement phase only: ship list · [Rotate (R)]          │
│  [Auto-place] [Reset] [Start battle]                     │
│  Battle log: last few shots for both sides               │
└──────────────────────────────────────────────────────────┘
Dialogs: "Who fires first? [Me] [Computer] [Random]",
         "You win! / You lose — shots, accuracy — [Play again]",
         "Abandon current game? [Cancel] [New game]"
```

## 5. How game state works

### 5.1 Shape of the state

```ts
type Coord = { row: number; col: number };          // 0–9 each
type Orientation = 'horizontal' | 'vertical';
type ShipName = 'Carrier' | 'Battleship' | 'Cruiser' | 'Submarine' | 'Destroyer';

interface Ship { name: ShipName; cells: Coord[]; hits: number }

interface Board {
  ships: Ship[];
  shots: ('unknown' | 'miss' | 'hit')[][];          // 10x10: what has been fired at this board
}

interface GameState {
  phase: 'placement' | 'battle' | 'over';
  turn: 'player' | 'ai';
  player: Board;                                     // the human's fleet; AI shoots here
  ai: Board;                                         // the AI's fleet; human shoots here
  winner: 'player' | 'ai' | null;
  log: string[];                                     // messages for the status area
  stats: { playerShots: number; playerHits: number; aiShots: number; aiHits: number };
}
```

UI-only details (selected ship, orientation, hover cell, open dialog) live in a small separate `UiState` in the controller, because they don't affect the rules.

### 5.2 Phases and transitions

```
             newGame()
                │
                ▼
  ┌──── placement ────┐   place / remove / auto-place / reset
  │                   │◄──────────────────────────────┐
  │ all 5 placed →    │                               │
  │ "Who fires first?"│                               │
  └────────┬──────────┘                               │
           │ startBattle(first)                       │
           ▼                                          │
        battle ── playerFire() / aiFire(), turns alternate
           │
           │ last ship of one side sunk
           ▼
         over ──── "Play again" / New game ───────────┘
```

### 5.3 Rules enforced by `game.ts` (not by the UI)

- Every action first checks it is legal: right phase, right turn, coordinate on the board, cell not already fired at. Illegal actions return the state **unchanged** plus a reason — so a double click, a stale click or a UI bug can never break the rules.
- A shot updates the target board, increments the ship's `hits`, reports `miss` / `hit` / `sunk` (with the ship's name), updates stats and the log, then either ends the game (if that was the last ship) or passes the turn.
- `startBattle('random')` resolves to player or AI using the RNG.

### 5.4 Turn timing

When it becomes the AI's turn (after the player fires, or at the start if the AI goes first), the controller waits ~700 ms, then calls `aiFire()` and redraws. The player's board is locked meanwhile. Each game gets an id; a pending AI move from an old game is ignored if **New game** is clicked during the delay.

### 5.5 Keeping AI ships hidden

The target board is rendered only from `ai.shots` (what the player has discovered) plus cells of ships already sunk. The AI's ship positions are not put into the page at all until the game is over, so they can't be seen with browser dev tools either.

## 6. How the AI opponent works

The AI uses the classic **hunt / target** strategy. It is **stateless**: every turn it looks only at what it has learned so far — the grid of its own shots (unknown / miss / hit) plus the cells of ships it has already sunk (the same information the human sees on their target board). It never sees the player's ship positions; the function's input type makes that impossible. Being stateless means there is no hidden AI memory that can get out of sync, and each decision can be tested in isolation.

**Each turn:**

1. **Find unresolved hits** — cells the AI hit that do not belong to a ship it has already sunk.
2. **If there are none → Hunt mode.** Pick a random untried cell on a checkerboard pattern (cells where `row + col` is even). Every ship is at least 2 long, so every ship covers at least one such cell, which roughly halves the search. If no checkerboard cells are left, pick any untried cell.
3. **If there are unresolved hits → Target mode.**
   - If two or more unresolved hits lie next to each other in a straight line, the AI has found the ship's direction: it fires at the next untried cell at either end of that line.
   - Otherwise (a single hit, or the line is blocked at both ends) it fires at an untried cell directly above, below, left or right of an unresolved hit.
   - If none of those are available (rare, e.g. odd clusters of adjacent ships), it falls back to Hunt mode.
4. When a ship is sunk, its cells stop counting as unresolved, so the AI automatically moves on to any other ship it has hit, or returns to hunting.

**Expected strength:** roughly 55–65 shots on average to sink a whole fleet, against ~95 for random shooting. A simulation test checks the requirement of an average of 70 or fewer (AC-28). That's a fair, beatable opponent that clearly doesn't fire at random.

## 7. Testing strategy

### 7.1 Automated tests (Vitest) — `npm test`

All tests target `src/game/`, using a fixed RNG seed so results are repeatable.

| Test file | What it covers | Requirements |
|---|---|---|
| `board.test.ts` | Placement in both orientations; rejecting out-of-bounds (e.g. Carrier at G1 horizontal, A7 vertical) and overlaps; allowing adjacent ships; removing ships; hit / miss / sunk results; rejecting repeat and off-board shots; all-sunk detection. | AC-3–5, 15–16, 18, 21 |
| `fleet.test.ts` | Auto-place gives a valid fleet over 1,000 seeds (5 ships, correct lengths, in bounds, no overlap); completes a partially placed fleet; different seeds give different layouts. | AC-2, 9, 11 |
| `game.test.ts` | Phase transitions; Start battle refused until all ships placed; who fires first (Me / Computer / Random); strict turn alternation; rejecting wrong-turn and wrong-phase actions; game ends exactly on the 17th hit with the right winner; no actions after game over; stats and log messages; new game fully resets. | AC-10, 12–13, 21–23 |
| `ai.test.ts` | Neighbour targeting after a single hit; following a line after two hits; switching to a second wounded ship after a sink; hunt mode uses the checkerboard; never repeats a cell or fires off-board. | AC-24–27 |
| `simulation.test.ts` | Plays 100 complete AI-vs-random-fleet games: no repeated or off-board shots, every game finishes, average shots ≤ 70. | AC-24, 28 |

### 7.2 Static checks

`npm run lint` (ESLint) and `npm run typecheck` (`tsc --noEmit`). Together with `npm test`, these run automatically on every pull request (`ci.yml`), and a deploy only happens if they pass.

### 7.3 Manual / browser verification

The acceptance criteria marked (M) in `REQUIREMENTS.md` (layout, visuals, placement interaction, dialogs, browser compatibility) are verified by playing the game in the browser: full games won and lost, both manual and auto placement, each "who goes first" option, New game mid-battle, and desktop and tablet widths. I'll record a short video of that run as evidence.

## 8. Deployment process

1. **Vite config:** `base: '/battleship-ai/'` so asset paths work under the GitHub Pages sub-path.
2. **`deploy.yml` workflow:** on every push to `main` → install → lint, typecheck, test → `npm run build` → upload `dist/` → deploy with the official `actions/deploy-pages` action.
3. **One-time setting:** in the repo, *Settings → Pages → Source: GitHub Actions*. I can switch this on through the GitHub API, or you can click it once.
4. **Public URL:** `https://janobrain-creator.github.io/battleship-ai/`
5. **Releasing a change** is just merging a pull request into `main`; the site updates within about a minute. Rolling back means reverting the commit.

The build is plain static files, so it would also work unchanged on Netlify or Vercel if you ever prefer them.

## 9. Delivery steps

Work is split into small pull requests, each reviewable and with CI green:

| # | Pull request | Contents |
|---|---|---|
| 1 | Project setup | `REQUIREMENTS.md`, `IMPLEMENTATION_PLAN.md`, Vite + TypeScript + Vitest + ESLint scaffold, CI workflow, README. |
| 2 | Game logic + AI | `src/game/*` with the full test suite (§7.1). |
| 3 | User interface | Rendering, controller, styles, dialogs, polish, accessibility. |
| 4 | Deployment | Pages workflow + Vite base path; live URL in the README. |

All four fit comfortably in this session. After PR 3 I'll share a live preview link so you can play before it goes public.

## 10. Risks and how they're handled

| Risk | Mitigation |
|---|---|
| UI and game state drift apart | Single `GameState`, full redraw after every action. |
| Double clicks / clicking during the AI's turn | Rules engine rejects illegal actions; board locked during the AI delay. |
| Stale AI move after New game | Game id check on the delayed AI turn. |
| Flaky tests due to randomness | Injected, seeded RNG everywhere. |
| AI positions leaking to the player | AI ships never rendered into the page before game over. |
| Broken assets on GitHub Pages | Vite `base` path set; the deploy workflow builds exactly what CI tested. |
