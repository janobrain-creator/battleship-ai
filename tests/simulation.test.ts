import { describe, expect, it } from 'vitest';
import { aiViewOf, chooseAiShot } from '../src/game/ai';
import { allSunk, isInBounds, receiveShot } from '../src/game/board';
import { randomFleet } from '../src/game/fleet';
import { createRng, randomInt, type Rng } from '../src/game/random';
import type { Board, Coord } from '../src/game/types';

const GAMES = 100;

function playOut(board: Board, chooseShot: (b: Board) => Coord): number {
  let shots = 0;
  while (!allSunk(board)) {
    const shot = chooseShot(board);
    expect(isInBounds(shot)).toBe(true);
    expect(board.shots[shot.row]?.[shot.col]).toBe('unknown');
    board = receiveShot(board, shot).board;
    shots++;
    expect(shots).toBeLessThanOrEqual(100);
  }
  return shots;
}

function randomShooter(rng: Rng) {
  return (board: Board): Coord => {
    const untried: Coord[] = [];
    board.shots.forEach((row, r) =>
      row.forEach((cell, c) => cell === 'unknown' && untried.push({ row: r, col: c })),
    );
    return untried[randomInt(rng, untried.length)]!;
  };
}

describe('full-game simulation', () => {
  it(`AI sinks every fleet without repeats and beats random play (${GAMES} games)`, () => {
    let aiTotal = 0;
    let randomTotal = 0;
    for (let seed = 0; seed < GAMES; seed++) {
      const fleet = randomFleet(createRng(seed));
      const rng = createRng(seed + 10_000);
      aiTotal += playOut(fleet, (b) => chooseAiShot(aiViewOf(b), rng));
      randomTotal += playOut(fleet, randomShooter(createRng(seed + 20_000)));
    }
    const aiAverage = aiTotal / GAMES;
    const randomAverage = randomTotal / GAMES;
    console.info(`Average shots to win — AI: ${aiAverage}, random: ${randomAverage}`);
    expect(aiAverage).toBeLessThanOrEqual(70);
    expect(aiAverage).toBeLessThan(randomAverage - 20);
  });
});
