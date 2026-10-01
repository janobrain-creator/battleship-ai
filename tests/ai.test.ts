import { describe, expect, it } from 'vitest';
import { createBoard, formatCoord, receiveShot } from '../src/game/board';
import { aiViewOf, chooseAiShot, type AiView } from '../src/game/ai';
import { createRng } from '../src/game/random';
import type { CellShot } from '../src/game/types';
import { at, fixedFleet } from './helpers';

function view({
  hits = [],
  misses = [],
  sunk = [],
}: Partial<Record<'hits' | 'misses' | 'sunk', string[]>>): AiView {
  const shots: CellShot[][] = createBoard().shots;
  for (const label of [...hits, ...sunk]) {
    const { row, col } = at(label);
    shots[row]![col] = 'hit';
  }
  for (const label of misses) {
    const { row, col } = at(label);
    shots[row]![col] = 'miss';
  }
  return { shots, sunkCells: sunk.map(at) };
}

/** Every distinct shot the AI might choose for this view, over many seeds. */
function possibleShots(v: AiView): Set<string> {
  const shots = new Set<string>();
  for (let seed = 0; seed < 200; seed++) shots.add(formatCoord(chooseAiShot(v, createRng(seed))));
  return shots;
}

describe('AI target mode', () => {
  it('fires next to a single hit', () => {
    expect(possibleShots(view({ hits: ['E5'] }))).toEqual(new Set(['E4', 'E6', 'D5', 'F5']));
  });

  it('stays on the board when the hit is in a corner', () => {
    expect(possibleShots(view({ hits: ['A1'] }))).toEqual(new Set(['B1', 'A2']));
  });

  it('skips neighbours that were already tried', () => {
    expect(possibleShots(view({ hits: ['E5'], misses: ['E4', 'E6', 'D5'] }))).toEqual(
      new Set(['F5']),
    );
  });

  it('follows the line after two hits in a row', () => {
    expect(possibleShots(view({ hits: ['E5', 'F5'] }))).toEqual(new Set(['D5', 'G5']));
    expect(possibleShots(view({ hits: ['C2', 'C3', 'C4'] }))).toEqual(new Set(['C1', 'C5']));
  });

  it('continues past the other end when one end is blocked', () => {
    expect(possibleShots(view({ hits: ['E5', 'F5'], misses: ['D5'] }))).toEqual(new Set(['G5']));
    expect(possibleShots(view({ hits: ['A1', 'B1'] }))).toEqual(new Set(['C1']));
  });

  it('tries around the hits when the line is blocked at both ends', () => {
    expect(possibleShots(view({ hits: ['E5', 'F5'], misses: ['D5', 'G5'] }))).toEqual(
      new Set(['E4', 'E6', 'F4', 'F6']),
    );
  });

  it('moves on to another wounded ship after a sink', () => {
    expect(possibleShots(view({ sunk: ['A1', 'B1'], hits: ['H8'] }))).toEqual(
      new Set(['H7', 'H9', 'G8', 'I8']),
    );
  });
});

describe('AI hunt mode', () => {
  it('returns to hunting on a checkerboard after a sink', () => {
    const v = view({ sunk: ['A1', 'B1'], misses: ['C1', 'A2', 'B2'] });
    for (let seed = 0; seed < 100; seed++) {
      const { row, col } = chooseAiShot(v, createRng(seed));
      expect((row + col) % 2).toBe(0);
      expect(v.shots[row]?.[col]).toBe('unknown');
    }
  });

  it('fires at the last untried cell when only one remains', () => {
    const v = view({});
    for (const row of v.shots) row.fill('miss');
    v.shots[3]![8] = 'unknown';
    expect(chooseAiShot(v, createRng(1))).toEqual({ row: 3, col: 8 });
  });
});

describe('AI information', () => {
  it('only sees shot results and sunk ships, never hidden ship positions', () => {
    let board = fixedFleet();
    board = receiveShot(board, at('A9')).board;
    board = receiveShot(board, at('B9')).board; // sinks the Destroyer
    board = receiveShot(board, at('A1')).board; // hits the Carrier
    const v = aiViewOf(board);
    expect(Object.keys(v).sort()).toEqual(['shots', 'sunkCells']);
    expect(v.sunkCells.map(formatCoord)).toEqual(['A9', 'B9']);
  });
});
