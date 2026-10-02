import { describe, expect, it } from 'vitest';
import { createBoard, placeShip } from '../src/game/board';
import { FLEET } from '../src/game/constants';
import { autoPlace, randomFleet } from '../src/game/fleet';
import { createRng } from '../src/game/random';
import { at, expectValidFleet } from './helpers';

describe('fleet definition', () => {
  it('is the standard fleet', () => {
    expect(FLEET.map((s) => [s.name, s.length])).toEqual([
      ['Carrier', 5],
      ['Battleship', 4],
      ['Cruiser', 3],
      ['Submarine', 3],
      ['Destroyer', 2],
    ]);
  });
});

describe('autoPlace', () => {
  it('always produces a valid fleet (1,000 seeds)', () => {
    for (let seed = 0; seed < 1000; seed++) {
      expect(() => expectValidFleet(randomFleet(createRng(seed)))).not.toThrow();
    }
  });

  it('keeps ships already placed and adds the rest', () => {
    const partial = placeShip(createBoard(), 'Carrier', at('C4'), 'vertical');
    const board = autoPlace(partial, createRng(1));
    expectValidFleet(board);
    expect(board.ships.find((s) => s.name === 'Carrier')?.cells[0]).toEqual(at('C4'));
  });

  it('produces different layouts for different seeds', () => {
    const layouts = new Set(
      Array.from({ length: 20 }, (_, seed) => JSON.stringify(randomFleet(createRng(seed)).ships)),
    );
    expect(layouts.size).toBe(20);
  });

  it('is reproducible for the same seed', () => {
    expect(randomFleet(createRng(42))).toEqual(randomFleet(createRng(42)));
  });
});
