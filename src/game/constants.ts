import type { ShipSpec } from './types';

export const BOARD_SIZE = 10;

export const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;

export const FLEET: readonly ShipSpec[] = [
  { name: 'Carrier', length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser', length: 3 },
  { name: 'Submarine', length: 3 },
  { name: 'Destroyer', length: 2 },
];

export const TOTAL_SHIP_CELLS = FLEET.reduce((sum, ship) => sum + ship.length, 0);
