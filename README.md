# battleship-ai

Battleship game with AI as your opponent, built using Devin as part of an interview process.

Play classic Battleship (10x10 board, standard fleet) in the browser against a computer opponent.

**Play it live:** https://janobrain-creator.github.io/battleship-ai/

- Requirements: [REQUIREMENTS.md](REQUIREMENTS.md)
- Technical design: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)
- Debugging report: [BUGS.md](BUGS.md)

## How to play

1. **Place your fleet.** Choose a ship from the list, then click your board to place it. Press **R** (or the Rotate button) to switch between horizontal and vertical. The preview turns red if the ship would overlap another ship or hang off the board. Click a placed ship to pick it up and move it. **Auto-place** places the whole fleet at random, and **Reset** clears the board.
2. **Start the battle** and choose who fires first: you, the computer, or random.
3. **Fire** by clicking a cell in Enemy Waters. Turns alternate after every shot. Hits are marked ✕, misses with a dot, and a sunk ship is shown in full. You can't fire at the same cell twice.
4. **Win** by sinking all five enemy ships before the computer sinks yours. The game-over screen shows the stats. Use **New game** at any time to start over.

The fleet is the Carrier (5), Battleship (4), Cruiser (3), Submarine (3) and Destroyer (2). Ships may touch but not overlap.

## Run locally

Requires Node.js 22 (see `.nvmrc`).

```bash
npm ci            # install dependencies
npm run dev       # start the dev server (http://localhost:5173/battleship-ai/)
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

## Tests and checks

```bash
npm test             # Vitest unit tests (rules, fleet placement, game flow, AI, placement preview)
npm run lint         # ESLint
npm run typecheck    # TypeScript (tsc --noEmit)
npm run format:check # Prettier
```

The test suite includes a simulation of 100 games that checks the AI wins in 70 shots or fewer on average. A random shooter needs about 95.

## Architecture

TypeScript + Vite, plain DOM and CSS (no UI framework).

- `src/game/`: pure game logic with no DOM. `constants.ts` (board size and fleet), `board.ts` (placement and shots), `fleet.ts` (auto-placement), `game.ts` (immutable `GameState` and the actions on it: place, start, fire, and so on), `ai.ts` (hunt/target opponent) and `random.ts` (seedable random source, so tests are repeatable).
- `src/ui/`: browser layer. `controller.ts` holds the current `GameState` plus a small presentation-only `UiState`, turns clicks and keys into game actions, and schedules the AI's turn. `render.ts` redraws the screen from state after every action. `placement.ts` computes the ship-placement preview, and `ships.ts` draws the ship silhouettes.
- **AI:** fires in a checkerboard pattern while hunting. After a hit it tries the neighbouring cells, and once two hits line up it follows that line until the ship sinks. It only sees what a human player would see: its own shot results and which ships are sunk.

## CI and deployment

GitHub Actions runs lint, format check, type check, tests and build on every pull request (`.github/workflows/ci.yml`). Every push to `main` runs the checks again and deploys the build to GitHub Pages (`.github/workflows/deploy.yml`).
