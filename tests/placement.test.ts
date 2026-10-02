import { describe, expect, it } from 'vitest';
import { createBoard, formatCoord, placeShip, removeShip } from '../src/game/board';
import type { Coord, Orientation } from '../src/game/types';
import {
  bowFor,
  centerSegment,
  grabbedSegment,
  orientationOf,
  previewPlacement,
} from '../src/ui/placement';
import { at } from './helpers';

const labels = (cells: Coord[]): string[] => cells.map(formatCoord);

describe('placement preview anchoring', () => {
  it('holds a new ship by its middle segment', () => {
    expect(centerSegment('Carrier')).toBe(2);
    expect(centerSegment('Battleship')).toBe(1);
    expect(centerSegment('Cruiser')).toBe(1);
    expect(centerSegment('Destroyer')).toBe(0);
    expect(bowFor(at('E5'), 2, 'horizontal')).toEqual(at('C5'));
    expect(bowFor(at('E5'), 2, 'vertical')).toEqual(at('E3'));
  });

  it('treats an overhang on every edge the same way (regression: bug 1)', () => {
    const board = createBoard();
    const segment = centerSegment('Carrier');
    const edges: { cursor: string; orientation: Orientation }[] = [
      { cursor: 'A5', orientation: 'horizontal' },
      { cursor: 'J5', orientation: 'horizontal' },
      { cursor: 'E1', orientation: 'vertical' },
      { cursor: 'E10', orientation: 'vertical' },
    ];
    for (const { cursor, orientation } of edges) {
      const preview = previewPlacement(board, 'Carrier', at(cursor), segment, orientation);
      expect(preview, cursor).toMatchObject({ valid: false, outOfBounds: true });
      expect(preview.cells, cursor).toHaveLength(3);
    }
  });

  it('accepts a ship that fits flush against each edge', () => {
    const board = createBoard();
    expect(previewPlacement(board, 'Carrier', at('C1'), 2, 'horizontal').valid).toBe(true);
    expect(previewPlacement(board, 'Carrier', at('H10'), 2, 'horizontal').valid).toBe(true);
    expect(previewPlacement(board, 'Carrier', at('A3'), 2, 'vertical').valid).toBe(true);
    expect(previewPlacement(board, 'Carrier', at('J8'), 2, 'vertical').valid).toBe(true);
  });

  it('keeps a picked-up ship exactly where it was, whichever cell is clicked (regression: bug 3)', () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const placed = placeShip(createBoard(), 'Carrier', at('C3'), orientation);
      const ship = placed.ships[0]!;
      const lifted = removeShip(placed, 'Carrier');
      for (const clicked of ship.cells) {
        const preview = previewPlacement(
          lifted,
          'Carrier',
          clicked,
          grabbedSegment(ship, clicked),
          orientationOf(ship),
        );
        expect(labels(preview.cells), `${orientation} ${formatCoord(clicked)}`).toEqual(
          labels(ship.cells),
        );
        expect(preview.valid).toBe(true);
      }
    }
  });

  it('flags overlap with another ship as invalid', () => {
    const board = placeShip(createBoard(), 'Destroyer', at('E5'), 'vertical');
    const preview = previewPlacement(board, 'Carrier', at('E6'), 2, 'horizontal');
    expect(preview).toMatchObject({ valid: false, outOfBounds: false });
  });
});
