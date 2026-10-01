import { describe, expect, it } from 'vitest';
import {
  allSunk,
  canPlaceShip,
  createBoard,
  formatCoord,
  placeShip,
  placementError,
  receiveShot,
  removeShip,
  shotError,
} from '../src/game/board';
import { at, fixedFleet } from './helpers';

describe('placement', () => {
  it('places ships horizontally and vertically', () => {
    let board = placeShip(createBoard(), 'Carrier', at('A1'), 'horizontal');
    board = placeShip(board, 'Battleship', at('J7'), 'vertical');
    expect(board.ships[0]?.cells.map(formatCoord)).toEqual(['A1', 'B1', 'C1', 'D1', 'E1']);
    expect(board.ships[1]?.cells.map(formatCoord)).toEqual(['J7', 'J8', 'J9', 'J10']);
  });

  it('accepts ships that exactly reach the edge', () => {
    expect(canPlaceShip(createBoard(), 'Carrier', at('F1'), 'horizontal')).toBe(true);
    expect(canPlaceShip(createBoard(), 'Carrier', at('A6'), 'vertical')).toBe(true);
  });

  it('rejects ships extending beyond the board', () => {
    expect(canPlaceShip(createBoard(), 'Carrier', at('G1'), 'horizontal')).toBe(false);
    expect(canPlaceShip(createBoard(), 'Carrier', at('A7'), 'vertical')).toBe(false);
    expect(canPlaceShip(createBoard(), 'Destroyer', { row: -1, col: 0 }, 'vertical')).toBe(false);
    expect(() => placeShip(createBoard(), 'Carrier', at('G1'), 'horizontal')).toThrow();
  });

  it('rejects overlapping ships but allows adjacent ones', () => {
    const board = placeShip(createBoard(), 'Cruiser', at('C3'), 'horizontal');
    expect(placementError(board, 'Destroyer', at('D2'), 'vertical')).toMatch(/overlap/);
    expect(canPlaceShip(board, 'Destroyer', at('C4'), 'horizontal')).toBe(true);
    expect(canPlaceShip(board, 'Destroyer', at('F3'), 'horizontal')).toBe(true);
  });

  it('rejects placing the same ship twice', () => {
    const board = placeShip(createBoard(), 'Cruiser', at('A1'), 'horizontal');
    expect(placementError(board, 'Cruiser', at('A5'), 'horizontal')).toMatch(/already/);
  });

  it('removes a ship so it can be placed again', () => {
    const board = removeShip(
      placeShip(createBoard(), 'Cruiser', at('A1'), 'horizontal'),
      'Cruiser',
    );
    expect(board.ships).toHaveLength(0);
    expect(canPlaceShip(board, 'Cruiser', at('A1'), 'vertical')).toBe(true);
  });
});

describe('shots', () => {
  it('reports a miss on empty water', () => {
    const { board, result } = receiveShot(fixedFleet(), at('J10'));
    expect(result.outcome).toBe('miss');
    expect(board.shots[9]?.[9]).toBe('miss');
  });

  it('reports a hit and the ship hit', () => {
    const { board, result } = receiveShot(fixedFleet(), at('B1'));
    expect(result.outcome).toBe('hit');
    expect(result.ship?.name).toBe('Carrier');
    expect(board.shots[0]?.[1]).toBe('hit');
  });

  it('reports sunk when the last cell of a ship is hit', () => {
    let board = fixedFleet();
    board = receiveShot(board, at('A9')).board;
    const { result } = receiveShot(board, at('B9'));
    expect(result.outcome).toBe('sunk');
    expect(result.ship?.name).toBe('Destroyer');
  });

  it('does not change the original board', () => {
    const original = fixedFleet();
    receiveShot(original, at('A1'));
    expect(original.shots[0]?.[0]).toBe('unknown');
    expect(original.ships[0]?.hits).toBe(0);
  });

  it('rejects firing at the same cell twice', () => {
    const { board } = receiveShot(fixedFleet(), at('E5'));
    expect(shotError(board, at('E5'))).toMatch(/already/);
    expect(() => receiveShot(board, at('E5'))).toThrow();
  });

  it('rejects shots outside the board', () => {
    expect(shotError(fixedFleet(), { row: 10, col: 0 })).toMatch(/not on the board/);
    expect(shotError(fixedFleet(), { row: 0, col: -1 })).toMatch(/not on the board/);
    expect(shotError(fixedFleet(), { row: 0.5, col: 1 })).toMatch(/not on the board/);
  });

  it('detects when every ship is sunk, and not before', () => {
    let board = fixedFleet();
    const cells = board.ships.flatMap((s) => s.cells);
    expect(cells).toHaveLength(17);
    cells.forEach((cell, i) => {
      expect(allSunk(board)).toBe(false);
      board = receiveShot(board, cell).board;
      if (i < cells.length - 1) expect(allSunk(board)).toBe(false);
    });
    expect(allSunk(board)).toBe(true);
  });

  it('never reports an empty board as all sunk', () => {
    expect(allSunk(createBoard())).toBe(false);
  });
});
