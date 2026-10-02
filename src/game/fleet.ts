import { createBoard, placementError, placeShip } from './board';
import { BOARD_SIZE, FLEET } from './constants';
import { pick, type Rng } from './random';
import type { Board, Coord, Orientation, ShipName } from './types';

export interface Placement {
  start: Coord;
  orientation: Orientation;
}

export function validPlacements(board: Board, name: ShipName): Placement[] {
  const placements: Placement[] = [];
  for (const orientation of ['horizontal', 'vertical'] as const) {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const start = { row, col };
        if (placementError(board, name, start, orientation) === null) {
          placements.push({ start, orientation });
        }
      }
    }
  }
  return placements;
}

const MAX_ATTEMPTS = 100;

/**
 * Places every fleet ship not yet on the board at a random valid position,
 * longest ship first. Ships already on the board are kept.
 */
export function autoPlace(board: Board, rng: Rng): Board {
  const remaining = FLEET.filter((spec) => !board.ships.some((ship) => ship.name === spec.name));
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let result: Board | null = board;
    for (const spec of remaining) {
      const options = validPlacements(result, spec.name);
      if (options.length === 0) {
        result = null;
        break;
      }
      const { start, orientation } = pick(rng, options);
      result = placeShip(result, spec.name, start, orientation);
    }
    if (result) {
      return result;
    }
  }
  throw new Error('Could not find room for the remaining ships.');
}

export function randomFleet(rng: Rng): Board {
  return autoPlace(createBoard(), rng);
}
