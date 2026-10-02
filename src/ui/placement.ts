import { canPlaceShip, isInBounds, sameCoord, shipCells, shipLength } from '../game/board';
import type { Board, Coord, Orientation, Ship, ShipName } from '../game/types';

/** Index of the ship segment held under the pointer for a newly selected ship: its middle. */
export function centerSegment(name: ShipName): number {
  return Math.floor((shipLength(name) - 1) / 2);
}

/** Index of the segment the player clicked when picking up a placed ship. */
export function grabbedSegment(ship: Ship, coord: Coord): number {
  return Math.max(
    0,
    ship.cells.findIndex((cell) => sameCoord(cell, coord)),
  );
}

export function orientationOf(ship: Ship): Orientation {
  return ship.cells[0]?.row === ship.cells[1]?.row ? 'horizontal' : 'vertical';
}

/** Bow coordinate for a ship whose `segment`-th cell sits under `cursor`. */
export function bowFor(cursor: Coord, segment: number, orientation: Orientation): Coord {
  return orientation === 'horizontal'
    ? { row: cursor.row, col: cursor.col - segment }
    : { row: cursor.row - segment, col: cursor.col };
}

export interface PlacementPreview {
  bow: Coord;
  /** On-board cells the ship would occupy. */
  cells: Coord[];
  /** True when part of the ship would hang off the board. */
  outOfBounds: boolean;
  valid: boolean;
}

export function previewPlacement(
  board: Board,
  name: ShipName,
  cursor: Coord,
  segment: number,
  orientation: Orientation,
): PlacementPreview {
  const bow = bowFor(cursor, segment, orientation);
  const all = shipCells(bow, shipLength(name), orientation);
  const cells = all.filter(isInBounds);
  return {
    bow,
    cells,
    outOfBounds: cells.length < all.length,
    valid: canPlaceShip(board, name, bow, orientation),
  };
}
