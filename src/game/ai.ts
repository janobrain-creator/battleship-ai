import { isInBounds, isSunk } from './board';
import { BOARD_SIZE } from './constants';
import { pick, type Rng } from './random';
import type { Board, CellShot, Coord } from './types';

/**
 * Everything the AI is allowed to know: the results of its own shots and the
 * cells of ships it has sunk (the same information a human player sees).
 */
export interface AiView {
  shots: CellShot[][];
  sunkCells: Coord[];
}

export function aiViewOf(board: Board): AiView {
  return {
    shots: board.shots,
    sunkCells: board.ships.filter(isSunk).flatMap((ship) => ship.cells),
  };
}

const DIRECTIONS: readonly Coord[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

const key = ({ row, col }: Coord): string => `${row},${col}`;

const step = (c: Coord, d: Coord, n = 1): Coord => ({
  row: c.row + d.row * n,
  col: c.col + d.col * n,
});

function uniqueCoords(coords: Coord[]): Coord[] {
  const seen = new Set<string>();
  return coords.filter((c) => {
    const k = key(c);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Chooses the next cell to fire at using a hunt / target strategy. */
export function chooseAiShot(view: AiView, rng: Rng): Coord {
  const isUntried = (c: Coord): boolean =>
    isInBounds(c) && view.shots[c.row]?.[c.col] === 'unknown';
  const sunk = new Set(view.sunkCells.map(key));
  const unresolved: Coord[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (view.shots[row]?.[col] === 'hit' && !sunk.has(key({ row, col }))) {
        unresolved.push({ row, col });
      }
    }
  }
  const unresolvedKeys = new Set(unresolved.map(key));
  const isUnresolvedHit = (c: Coord): boolean => unresolvedKeys.has(key(c));

  if (unresolved.length > 0) {
    // Two or more hits in a line: keep going along that line, at either end.
    const lineTargets: Coord[] = [];
    for (const hit of unresolved) {
      for (const dir of DIRECTIONS) {
        if (!isUnresolvedHit(step(hit, dir))) continue;
        let n = 1;
        while (isUnresolvedHit(step(hit, dir, n))) n++;
        const forward = step(hit, dir, n);
        if (isUntried(forward)) lineTargets.push(forward);
      }
    }
    if (lineTargets.length > 0) {
      return pick(rng, uniqueCoords(lineTargets));
    }

    // Otherwise try the cells directly around any unresolved hit.
    const neighbours = unresolved.flatMap((hit) => DIRECTIONS.map((dir) => step(hit, dir)));
    const targets = uniqueCoords(neighbours.filter(isUntried));
    if (targets.length > 0) {
      return pick(rng, targets);
    }
  }

  // Hunt: random untried cell, preferring a checkerboard pattern.
  const untried: Coord[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isUntried({ row, col })) untried.push({ row, col });
    }
  }
  const parity = untried.filter(({ row, col }) => (row + col) % 2 === 0);
  return pick(rng, parity.length > 0 ? parity : untried);
}
