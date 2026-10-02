# Battleship — Debugging Report

A short report on the manual/UAT round run against the playable preview before release. It found three real bugs, each fixed and verified as described below. The other items were requested UI/UX enhancements, listed separately.

## Bugs found and fixed

### Bug 1 — Invalid-placement preview inconsistent at board edges

- **Observed:** a ship hanging off the right edge previewed red, but pushing it against the top, left (and, for horizontal ships, bottom) edge never turned red.
- **Expected:** a ship that would extend off the board shows the same red invalid preview at all four edges.
- **Reproduce:** select the Carrier, keep it horizontal, hover column J (red), then hover column A (green). Rotate to vertical and compare row 1 with row 10.
- **Root cause:** `placementPreview()` in `src/ui/render.ts` treated the hovered cell as the ship's bow, so the footprint always grew right (horizontal) or down (vertical) from the cursor. A ship could only overhang the right or bottom edge. At the top and left edges the preview moved inward and showed green, not where the player was aiming. The game rules (`placementError()`) were always correct; only the preview was asymmetric.
- **Fix:** new pure module `src/ui/placement.ts`. The pointer now holds a specific segment of the ship: the middle segment for a newly selected ship. `bowFor(cursor, segment, orientation)` works out the bow, and `previewPlacement()` returns the on-board cells plus validity. Both the preview and the actual placement use this helper, so they can't disagree, and the footprint extends both ways from the cursor, so overhang looks the same on every edge. The invalid colour was also made solid so it reads clearly as red.
- **Verification:** `tests/placement.test.ts` checks that the Carrier held at A5, J5, E1 and E10 is invalid, out of bounds and shows 3 on-board cells in every case. A flush fit against each edge stays valid. A scripted Chrome check confirmed matching red previews on all four edges.

### Bug 2 — Stray cell outline after rotating with R

- **Observed:** after clicking a cell where the ship did not fit and pressing R, an outline stayed around that single cell until the next click.
- **Expected:** rotating only changes the ship preview; no extra outline appears.
- **Reproduce:** select the Carrier, click J10 (rejected: does not fit), then press R a few times.
- **Root cause:** the outline was the browser's keyboard focus ring, not a stale preview class. Clicking a board cell (a `<button>`) gives it focus. Cells are reused across redraws, so focus stayed on that cell. Pressing a key while it was focused made Chrome match `:focus-visible`, and the global `button:focus-visible` rule drew a 3px outline around that one cell. Rotating moved the preview away from the cell, so the outline looked stray. A mouse click cleared it.
- **Fix:** `src/ui/controller.ts` calls `preventDefault()` on `mousedown` over board cells, so a mouse click no longer moves focus onto the cell. The click itself still fires. Keyboard users who Tab or arrow to a cell still get the focus ring as before.
- **Verification:** a scripted Chrome repro (click J10, press R five times) showed the focused cell had `:focus-visible = true` before the fix. After the fix, focus stays on the page body and no outline is drawn. This can't reasonably be unit-tested: jsdom doesn't implement the browser's `:focus-visible` heuristics, and adding a browser test runner would be heavy for one check. Manual check: repeat the steps above.

### Bug 3 — Picked-up ship jumps right/down

- **Observed:** clicking a placed ship to move it made it jump: right for horizontal ships, down for vertical ones.
- **Expected:** picking up a ship leaves its preview exactly where it was until the player moves the pointer.
- **Reproduce:** place the Carrier horizontally at C3–G3, then click E3. The preview jumped to E3–I3.
- **Root cause:** the click handler removed the ship but left the clicked cell as the hover point. The preview (see Bug 1) drew the ship with its bow on the hovered cell. Clicking any cell other than the bow therefore shifted the ship by the index of that cell.
- **Fix:** on pick-up, the controller records which segment was clicked with `grabbedSegment()` and keeps the ship's orientation with `orientationOf()`. The preview and the next placement use `bowFor(cursor, segment, …)`, so the ship stays put and then follows the pointer from the point where it was grabbed.
- **Verification:** `tests/placement.test.ts` places the Carrier horizontally and vertically, picks it up from every one of its cells, and checks that the preview matches the original cells and is valid. A scripted Chrome check confirmed this for horizontal and vertical ships clicked at the bow, middle and stern.

## UI/UX enhancements (requested, not bugs)

1. **Enemy Waters tint:** the enemy panel, water cells and fleet chips use a subtle violet palette.
2. **Legend "Your ship":** the symbol is now a rounded square that matches board ship cells.
3. **Repeat-shot feedback:** clicking a cell you've already fired at makes it shake and outlines it in red for about 0.6 s. The controller checks this before calling `playerFire()`, so no turn is used and the AI doesn't move. Fired cells stay clickable but are marked `aria-disabled`.
4. **Battle log order:** a "Newest first" badge, a highlighted top entry with a "Latest" tag, and older entries fade.
5. **Sunk notification:** sinking an enemy ship shows a toast such as "Enemy Battleship sunk!" for 2 s. The event stays in the battle log. Timers are cleared on New game.
6. **Ship silhouettes:** small inline SVG side profiles (`src/ui/ships.ts`, sized by ship length) appear in the ship picker and both fleet-status lists. Sunk ships tilt and turn red.

## Broader manual testing (passed)

Apart from the three bugs above, the manual stress test passed for: edge/corner placement, rotation, overlapping ships, adjacent ships, repositioning, repeated auto-place/reset, mixed manual and automatic placement, premature battle start, rapid/double clicking, clicking during the AI delay, repeated shots, New game during an AI turn, all three first-player options, browser refresh, resizing, keyboard controls, AI hunt/target behaviour, game-end behaviour, statistics, fleet counters, sunk rendering and the browser console (no errors).

## Automated checks

`npm test` (6 files, 51 tests, including 5 new placement tests), `npm run lint`, `npm run typecheck`, `npm run format:check` and `npm run build` all pass.

## Final verification

The fixes and enhancements were then re-checked by hand on the updated preview, and all three bugs were confirmed fixed.
