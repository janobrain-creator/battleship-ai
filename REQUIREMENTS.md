# Battleship — Requirements Specification

**Status:** Approved with changes · **Version:** 0.2

## 1. Purpose and scope

A polished but simple single-player Battleship game that runs in a modern web browser. A human plays against a computer-controlled opponent ("the AI") using the classic rules.

**In scope:** one human vs. one AI, ship placement (manual and automatic), turn-based firing, clear hit/miss/sunk feedback, win/lose detection, starting a new game, automated tests for the game logic, deployment to a public URL.

**Out of scope (v1):** multiplayer (local or online), user accounts, saving a game across page reloads, leaderboards, sound, selectable difficulty levels, custom board sizes or fleets, game variants (e.g. "salvo", extra shot after a hit).

## 2. Definitions

| Term | Meaning |
|---|---|
| Board / grid | A 10x10 grid. Columns are labelled **A–J**, rows **1–10**. A cell is written e.g. `B7`. |
| Own board | The board showing the player's own fleet and the AI's shots against it. |
| Target board | The board showing the player's shots at the AI's fleet (AI ships stay hidden). |
| Hit | A shot that lands on a cell occupied by a ship. |
| Miss | A shot that lands on an empty cell. |
| Sunk | A ship whose every cell has been hit. |

## 3. Game rules

| ID | Rule |
|---|---|
| R-1 | Each side has its own 10x10 board. |
| R-2 | Each side has exactly this fleet: **Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)** — 5 ships, 17 cells in total. |
| R-3 | A ship occupies a straight line of consecutive cells, either horizontal or vertical (no diagonals). |
| R-4 | Ships may not overlap and may not extend beyond the board edge. Ships **may** touch each other (adjacent placement is allowed). |
| R-5 | Before the battle starts, the player chooses who fires first: **Me**, **Computer** or **Random**. |
| R-6 | Turns strictly alternate: one shot per turn, whether the shot hits or misses. |
| R-7 | A cell can be fired upon at most once per board. |
| R-8 | When a ship is sunk, the side that sank it is told which ship it was. |
| R-9 | The game ends immediately when every ship of one side is sunk; the other side wins. No further shots are allowed after that. |

## 4. Functional requirements

### 4.1 Game flow
| ID | Requirement |
|---|---|
| FR-1 | The game has three phases: **Placement → Battle → Game over**. |
| FR-2 | The UI always indicates the current phase and, during battle, whose turn it is. |
| FR-3 | A **New game** action is available at any time. It discards the current game and returns to an empty placement phase with a newly, randomly placed AI fleet. If a battle is in progress, the player is asked to confirm first. |

### 4.2 Ship placement (player)
| ID | Requirement |
|---|---|
| FR-4 | The player places each of the 5 ships on their own board, one at a time, choosing a ship, an orientation and a starting cell. |
| FR-5 | The player can switch orientation between horizontal and vertical (button and keyboard shortcut **R**). |
| FR-6 | While placing, hovering a cell shows a preview of where the ship would go, clearly marked as valid or invalid (overlap / out of bounds). |
| FR-7 | Invalid placements are rejected; the board is unchanged and the player can try again. |
| FR-8 | The player can pick up / remove an already placed ship and place it again before the battle starts. |
| FR-9 | An **Auto-place** action places all (remaining) ships randomly in valid positions. It can be used repeatedly to re-roll. |
| FR-10 | A **Reset placement** action clears all placed ships. |
| FR-11 | The **Start battle** action is enabled only when all 5 ships have been placed. Clicking it asks the player who fires first (Me / Computer / Random) and then starts the battle. |

### 4.3 AI fleet
| ID | Requirement |
|---|---|
| FR-12 | The AI fleet is placed automatically and randomly at the start of each game, following R-2 to R-4. |
| FR-13 | AI ship positions are never revealed to the player during battle (not in the UI and not in a way trivially visible on the page). After the game ends, the AI's remaining unsunk ships are revealed. |

### 4.4 Battle
| ID | Requirement |
|---|---|
| FR-14 | On their turn, the player fires by clicking a cell on the target board. |
| FR-15 | Already-fired cells cannot be selected again (they are visually disabled and clicks have no effect). |
| FR-16 | The target board cannot be clicked while it is not the player's turn or after the game has ended. |
| FR-17 | After the player's shot, the AI takes its turn automatically after a short delay (≈0.5–1 s) so the player can follow what happened. |
| FR-18 | Each shot shows its result immediately on the relevant board. |
| FR-19 | A status / message area describes the latest events, e.g. "You fired at C5 — Hit!", "AI fired at E2 — Miss.", "You sank the AI's Cruiser!". |
| FR-20 | A fleet status panel for each side lists the 5 ships and marks the ones that have been sunk. |

### 4.5 Visual feedback
| ID | Requirement |
|---|---|
| FR-21 | Hits, misses and sunk ships are visually distinct on both boards, using both colour **and** a symbol/shape (e.g. ✕ for hit, • for miss, sunk ships outlined/darkened), so they are distinguishable without relying on colour alone. |
| FR-22 | The player's own board shows their ships and every AI shot (hit/miss/sunk). |
| FR-23 | The target board shows only the player's shots; once a ship is sunk, all of its cells are marked as sunk. |

### 4.6 End of game
| ID | Requirement |
|---|---|
| FR-24 | When the game ends, a clear result is shown ("You win!" / "You lose") with simple stats: number of shots fired and accuracy (hits ÷ shots). |
| FR-25 | From the game-over screen, the player can start a new game in one click. |

### 4.7 AI behaviour
| ID | Requirement |
|---|---|
| FR-26 | The AI never fires at the same cell twice and never fires outside the board. |
| FR-27 | **Hunt mode:** with no unresolved hits, the AI picks a random cell it has not yet fired at. It may use a checkerboard (parity) pattern to improve efficiency. |
| FR-28 | **Target mode:** after a hit on a ship that is not yet sunk, the AI's next shots go to untried cells adjacent (up/down/left/right) to that hit. |
| FR-29 | Once the AI has two or more hits in a line on the same unsunk ship, it continues along that line (both directions) before trying other neighbours. |
| FR-30 | When a ship is sunk, the AI stops targeting around that ship's cells. If other hits remain unresolved (e.g. it hit two adjacent ships), it continues targeting those; otherwise it returns to hunt mode. |
| FR-31 | The AI only uses information a human player would have (hit / miss / which ship was sunk). It never reads the player's ship positions directly. |

## 5. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 **Browser support** | Works in the current versions of Chrome, Firefox, Safari and Edge. No plugins or installs. |
| NFR-2 **Responsive layout** | Usable on desktop/laptop screens (≥1024 px wide, boards side by side) and remains usable on tablet-width screens (boards stacked). Mobile phones are best-effort. |
| NFR-3 **UI quality** | Clean, consistent, professional look: coherent colour palette, readable typography, labelled grid coordinates, clear buttons, hover states, subtle animations for shots. A new user can start and finish a game without instructions; short on-screen hints explain placement controls. |
| NFR-4 **Accessibility (basic)** | Sufficient colour contrast; hit/miss/sunk distinguishable without colour (FR-21); buttons are keyboard-focusable; cells have accessible labels (e.g. "C5, hit"). |
| NFR-5 **Performance** | Page loads in under ~2 s on a normal connection; every interaction responds instantly (AI computes its move in <100 ms; the visible delay is intentional). |
| NFR-6 **Architecture** | Game logic (board, ships, placement validation, shots, win detection, AI) is kept separate from the UI, in plain modules with no browser/DOM dependency, so it can be tested in isolation. |
| NFR-7 **Automated tests** | Core game logic has automated unit tests runnable with a single command (e.g. `npm test`), covering at least the items in §6.8. Randomness can be seeded/injected so tests are deterministic. |
| NFR-8 **Code quality** | TypeScript (or typed JavaScript), a linter, consistent formatting, and a README explaining how to run, test and deploy. |
| NFR-9 **Deployment** | The app builds to static files (HTML/CSS/JS), needs no backend, database or secrets, and can be deployed to a public URL (e.g. GitHub Pages, Netlify or Vercel) with a single command or automatic deploy on push. |
| NFR-10 **No external runtime dependencies** | The deployed game does not depend on third-party APIs or services to run. |

## 6. Acceptance criteria

Each criterion is a verifiable check. **(T)** = covered by an automated test; **(M)** = verified manually in the browser.

### 6.1 Board and fleet
- [ ] AC-1 (M) Both boards display as 10x10 grids labelled A–J and 1–10.
- [ ] AC-2 (T) A new game creates exactly 5 ships per side with lengths 5, 4, 3, 3, 2 and the names Carrier, Battleship, Cruiser, Submarine, Destroyer.

### 6.2 Placement
- [ ] AC-3 (T, M) A ship can be placed horizontally and vertically at any position where it fits.
- [ ] AC-4 (T, M) Placing a ship that would extend past any edge is rejected (e.g. Carrier horizontally at `G1`, Carrier vertically at `A7`).
- [ ] AC-5 (T, M) Placing a ship that overlaps an existing ship is rejected; placing it directly adjacent is accepted.
- [ ] AC-6 (M) The hover preview shows the ship's cells and clearly indicates invalid positions.
- [ ] AC-7 (M) Pressing **R** or the rotate button toggles the orientation and the preview updates.
- [ ] AC-8 (M) A placed ship can be removed and placed again; Reset placement clears all ships.
- [ ] AC-9 (T, M) Auto-place produces a valid fleet (5 ships, no overlap, all in bounds). Over 1,000 automated runs, every result is valid.
- [ ] AC-10 (M) Start battle is disabled until all 5 ships are placed and enabled once they are.
- [ ] AC-11 (T) The AI fleet is always valid (same check as AC-9) and differs between games (not a fixed layout).

### 6.3 Turns and firing
- [ ] AC-12 (T, M) Clicking Start battle prompts who fires first. Choosing **Me** lets the player shoot first; choosing **Computer** makes the AI fire first automatically; choosing **Random** picks one of the two and the status area says who starts.
- [ ] AC-13 (T, M) After every shot (hit or miss) the turn passes to the other side; each side fires exactly one shot per turn.
- [ ] AC-14 (M) The target board ignores clicks during the AI's turn and after the game has ended.
- [ ] AC-15 (T, M) Firing at an already-fired cell is rejected and does not consume a turn; in the UI such cells are not clickable.
- [ ] AC-16 (T) Firing outside the board is rejected.

### 6.4 Feedback
- [ ] AC-17 (M) A hit, a miss and a sunk ship each look distinct on both boards, distinguishable even in greyscale.
- [ ] AC-18 (T, M) When the last cell of a ship is hit, that ship is reported as sunk by name, all its cells are shown as sunk, and the fleet status panel marks it.
- [ ] AC-19 (M) The message area describes each shot's coordinate and result for both sides.
- [ ] AC-20 (M) AI ship positions are not visible during battle; remaining AI ships are revealed after the game ends.

### 6.5 Game end and restart
- [ ] AC-21 (T) The game is reported over, with the correct winner, exactly when all 17 cells of one fleet are hit — not before.
- [ ] AC-22 (M) The win/lose result and shot stats (shots, accuracy) are shown; no further shots are possible.
- [ ] AC-23 (M) New game (from game over, or mid-game after confirmation) resets both boards, all stats and messages, and returns to the placement phase with a new AI fleet.

### 6.6 AI behaviour
- [ ] AC-24 (T) Across 100 full simulated games, the AI never fires at a cell twice or outside the board.
- [ ] AC-25 (T) After a hit on an unsunk ship, the AI's next shot is an untried orthogonal neighbour of that hit.
- [ ] AC-26 (T) After two hits in a line on an unsunk ship, the next shot continues along that line (either end), if such a cell is available.
- [ ] AC-27 (T) After sinking a ship with no other unresolved hits, the AI returns to hunt mode; if other unresolved hits exist, it targets those next.
- [ ] AC-28 (T) Smarter than random: across 100 simulated games against random fleets, the AI's average shots-to-win is clearly lower than a purely random shooter (target: ≤ 70 shots on average; a purely random shooter averages ~95).

### 6.7 UI, browser and deployment
- [ ] AC-29 (M) The game works end-to-end in the latest Chrome, Firefox and Safari (or Edge) with no console errors.
- [ ] AC-30 (M) The layout is usable at 1440 px and 1024 px widths, and on a tablet-width (~768 px) screen.
- [ ] AC-31 (M) A first-time user can place ships (manually or with auto-place), play and finish a game without external instructions.
- [ ] AC-32 (M) The app is deployed and playable at a public URL; the README documents the deploy steps.

### 6.8 Automated test coverage (minimum)
- [ ] AC-33 `npm test` (or equivalent) runs all logic tests and passes, covering: placement validation (bounds, overlap, both orientations), auto-placement validity, shot handling (hit, miss, repeat-shot rejection, out-of-bounds rejection), sunk detection, win detection, turn alternation, and the AI behaviours in AC-24 to AC-28.

## 7. Decisions

| # | Decision |
|---|---|
| D-1 | The player chooses who fires first at the start of each battle (R-5). |
| D-2 | A single AI difficulty level (§4.7). |
| D-3 | Code lives in the existing GitHub repo `janobrain-creator/battleship-ai`. Technical design is described in `IMPLEMENTATION_PLAN.md`. |
