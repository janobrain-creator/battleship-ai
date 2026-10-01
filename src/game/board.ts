import { BOARD_SIZE, COLUMN_LABELS, FLEET } from './constants';
import type { Board, CellShot, Coord, Orientation, Ship, ShipName, ShotResult } from './types';

export function createBoard(): Board {
  return {
    ships: [],
    shots: Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, (): CellShot => 'unknown'),
    ),
  };
}

export function isInBounds({ row, col }: Coord): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < BOARD_SIZE &&
    col >= 0 &&
    col < BOARD_SIZE
  );
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

/** Human-readable coordinate, e.g. { row: 4, col: 2 } -> "C5". */
export function formatCoord({ row, col }: Coord): string {
  return `${COLUMN_LABELS[col] ?? '?'}${row + 1}`;
}

export function shipLength(name: ShipName): number {
  const spec = FLEET.find((s) => s.name === name);
  if (!spec) {
    throw new Error(`Unknown ship: ${name}`);
  }
  return spec.length;
}

export function shipCells(start: Coord, length: number, orientation: Orientation): Coord[] {
  return Array.from({ length }, (_, i) =>
    orientation === 'horizontal'
      ? { row: start.row, col: start.col + i }
      : { row: start.row + i, col: start.col },
  );
}

export function shipAt(board: Board, coord: Coord): Ship | undefined {
  return board.ships.find((ship) => ship.cells.some((cell) => sameCoord(cell, coord)));
}

export function getShot(board: Board, { row, col }: Coord): CellShot {
  return board.shots[row]?.[col] ?? 'unknown';
}

export function isSunk(ship: Ship): boolean {
  return ship.hits >= ship.cells.length;
}

export function allSunk(board: Board): boolean {
  return board.ships.length > 0 && board.ships.every(isSunk);
}

export function isFleetComplete(board: Board): boolean {
  return FLEET.every((spec) => board.ships.some((ship) => ship.name === spec.name));
}

/** Returns why a placement is invalid, or null if it is valid. */
export function placementError(
  board: Board,
  name: ShipName,
  start: Coord,
  orientation: Orientation,
): string | null {
  if (board.ships.some((ship) => ship.name === name)) {
    return `The ${name} has already been placed.`;
  }
  const cells = shipCells(start, shipLength(name), orientation);
  if (!cells.every(isInBounds)) {
    return `The ${name} does not fit there.`;
  }
  if (cells.some((cell) => shipAt(board, cell))) {
    return `The ${name} would overlap another ship.`;
  }
  return null;
}

export function canPlaceShip(
  board: Board,
  name: ShipName,
  start: Coord,
  orientation: Orientation,
): boolean {
  return placementError(board, name, start, orientation) === null;
}

export function placeShip(
  board: Board,
  name: ShipName,
  start: Coord,
  orientation: Orientation,
): Board {
  const error = placementError(board, name, start, orientation);
  if (error) {
    throw new Error(error);
  }
  const ship: Ship = { name, cells: shipCells(start, shipLength(name), orientation), hits: 0 };
  return { ...board, ships: [...board.ships, ship] };
}

export function removeShip(board: Board, name: ShipName): Board {
  return { ...board, ships: board.ships.filter((ship) => ship.name !== name) };
}

/** Returns why a shot is invalid, or null if it is valid. */
export function shotError(board: Board, coord: Coord): string | null {
  if (!isInBounds(coord)) {
    return 'That coordinate is not on the board.';
  }
  if (getShot(board, coord) !== 'unknown') {
    return `${formatCoord(coord)} has already been fired at.`;
  }
  return null;
}

export function receiveShot(board: Board, coord: Coord): { board: Board; result: ShotResult } {
  const error = shotError(board, coord);
  if (error) {
    throw new Error(error);
  }
  const target = shipAt(board, coord);
  const shots = board.shots.map((row, r) =>
    r === coord.row
      ? row.map((cell, c) => (c === coord.col ? (target ? 'hit' : 'miss') : cell))
      : row,
  );
  if (!target) {
    return { board: { ...board, shots }, result: { coord, outcome: 'miss' } };
  }
  const hitShip: Ship = { ...target, hits: target.hits + 1 };
  const ships = board.ships.map((ship) => (ship === target ? hitShip : ship));
  return {
    board: { ships, shots },
    result: { coord, outcome: isSunk(hitShip) ? 'sunk' : 'hit', ship: hitShip },
  };
}
