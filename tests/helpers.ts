import { createBoard, placeShip } from '../src/game/board';
import { FLEET } from '../src/game/constants';
import type { Board, Coord, Orientation, ShipName } from '../src/game/types';

export const at = (label: string): Coord => ({
  row: Number(label.slice(1)) - 1,
  col: label.charCodeAt(0) - 'A'.charCodeAt(0),
});

/** A fixed, valid fleet: every ship horizontal in its own row, starting at column A. */
export const FIXED_LAYOUT: Record<ShipName, { start: string; orientation: Orientation }> = {
  Carrier: { start: 'A1', orientation: 'horizontal' },
  Battleship: { start: 'A3', orientation: 'horizontal' },
  Cruiser: { start: 'A5', orientation: 'horizontal' },
  Submarine: { start: 'A7', orientation: 'horizontal' },
  Destroyer: { start: 'A9', orientation: 'horizontal' },
};

export function fixedFleet(): Board {
  return FLEET.reduce(
    (board, spec) =>
      placeShip(
        board,
        spec.name,
        at(FIXED_LAYOUT[spec.name].start),
        FIXED_LAYOUT[spec.name].orientation,
      ),
    createBoard(),
  );
}

/** Checks the fleet rules: 5 named ships, correct lengths, straight, in bounds, no overlap. */
export function expectValidFleet(board: Board): void {
  if (board.ships.length !== FLEET.length) throw new Error('wrong number of ships');
  const occupied = new Set<string>();
  for (const spec of FLEET) {
    const ship = board.ships.find((s) => s.name === spec.name);
    if (!ship) throw new Error(`missing ${spec.name}`);
    if (ship.cells.length !== spec.length) throw new Error(`${spec.name} has wrong length`);
    const sameRow = ship.cells.every((c) => c.row === ship.cells[0]?.row);
    const sameCol = ship.cells.every((c) => c.col === ship.cells[0]?.col);
    if (!sameRow && !sameCol) throw new Error(`${spec.name} is not straight`);
    for (const [i, c] of ship.cells.entries()) {
      if (c.row < 0 || c.row > 9 || c.col < 0 || c.col > 9) {
        throw new Error(`${spec.name} out of bounds`);
      }
      const prev = ship.cells[i - 1];
      if (prev && Math.abs(prev.row - c.row) + Math.abs(prev.col - c.col) !== 1) {
        throw new Error(`${spec.name} cells not consecutive`);
      }
      const k = `${c.row},${c.col}`;
      if (occupied.has(k)) throw new Error('ships overlap');
      occupied.add(k);
    }
  }
}
