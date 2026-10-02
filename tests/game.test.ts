import { describe, expect, it } from 'vitest';
import { receiveShot } from '../src/game/board';
import {
  aiFire,
  autoPlacePlayer,
  newGame,
  placePlayerShip,
  playerFire,
  removePlayerShip,
  resetPlacement,
  startBattle,
} from '../src/game/game';
import { createRng } from '../src/game/random';
import type { ActionResult, GameState } from '../src/game/types';
import { at, expectValidFleet, fixedFleet } from './helpers';

const rng = () => createRng(7);

function expectOk(result: ActionResult): GameState {
  if (!result.ok) throw new Error(`Expected success, got: ${result.reason}`);
  return result.state;
}

function expectRejected(result: ActionResult, before: GameState, reason: RegExp): void {
  expect(result.ok).toBe(false);
  expect(result.state).toBe(before);
  if (!result.ok) expect(result.reason).toMatch(reason);
}

/** A battle where the AI's fleet is the known fixed layout and the player moves first. */
function battle(first: 'player' | 'ai' = 'player'): GameState {
  const placed = expectOk(autoPlacePlayer({ ...newGame(rng()), ai: fixedFleet() }, rng()));
  return expectOk(startBattle(placed, first, rng()));
}

describe('new game', () => {
  it('starts in placement with an empty player board and a valid hidden AI fleet', () => {
    const state = newGame(rng());
    expect(state.phase).toBe('placement');
    expect(state.player.ships).toHaveLength(0);
    expectValidFleet(state.ai);
    expect(state.winner).toBeNull();
    expect(state.stats).toEqual({ playerShots: 0, playerHits: 0, aiShots: 0, aiHits: 0 });
  });

  it('gives the AI a different fleet each game', () => {
    expect(newGame(createRng(1)).ai).not.toEqual(newGame(createRng(2)).ai);
  });
});

describe('placement phase', () => {
  it('places, removes and resets player ships', () => {
    let state = expectOk(placePlayerShip(newGame(rng()), 'Cruiser', at('B2'), 'vertical'));
    expect(state.player.ships).toHaveLength(1);
    state = expectOk(removePlayerShip(state, 'Cruiser'));
    expect(state.player.ships).toHaveLength(0);
    state = expectOk(placePlayerShip(state, 'Cruiser', at('B2'), 'horizontal'));
    state = expectOk(resetPlacement(state));
    expect(state.player.ships).toHaveLength(0);
  });

  it('rejects invalid placements and leaves the state unchanged', () => {
    const state = expectOk(placePlayerShip(newGame(rng()), 'Cruiser', at('B2'), 'vertical'));
    expectRejected(placePlayerShip(state, 'Carrier', at('H1'), 'horizontal'), state, /fit/);
    expectRejected(placePlayerShip(state, 'Carrier', at('A3'), 'horizontal'), state, /overlap/);
  });

  it('auto-places the remaining ships, then re-rolls the whole fleet', () => {
    const partial = expectOk(placePlayerShip(newGame(rng()), 'Carrier', at('A1'), 'horizontal'));
    const completed = expectOk(autoPlacePlayer(partial, createRng(3)));
    expectValidFleet(completed.player);
    expect(completed.player.ships.find((s) => s.name === 'Carrier')?.cells[0]).toEqual(at('A1'));
    const rerolled = expectOk(autoPlacePlayer(completed, createRng(4)));
    expectValidFleet(rerolled.player);
    expect(rerolled.player.ships).not.toEqual(completed.player.ships);
  });

  it('does not start the battle until all five ships are placed', () => {
    const state = expectOk(placePlayerShip(newGame(rng()), 'Carrier', at('A1'), 'horizontal'));
    expectRejected(startBattle(state, 'player', rng()), state, /all five ships/);
  });

  it('rejects placement changes once the battle has started', () => {
    const state = battle();
    expectRejected(removePlayerShip(state, 'Carrier'), state, /before the battle/);
    expectRejected(autoPlacePlayer(state, rng()), state, /before the battle/);
    expectRejected(resetPlacement(state), state, /before the battle/);
    expectRejected(startBattle(state, 'player', rng()), state, /before the battle/);
  });
});

describe('who fires first', () => {
  it('lets the player choose themselves or the computer', () => {
    expect(battle('player').turn).toBe('player');
    expect(battle('ai').turn).toBe('ai');
    expect(battle('ai').log.at(-1)).toMatch(/computer fires first/);
  });

  it('random choice picks both sides across games and says who starts', () => {
    const placed = expectOk(autoPlacePlayer(newGame(rng()), rng()));
    const turns = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      const state = expectOk(startBattle(placed, 'random', createRng(seed)));
      turns.add(state.turn);
      expect(state.firstPlayer).toBe(state.turn);
      expect(state.log.at(-1)).toMatch(/Random pick/);
    }
    expect(turns).toEqual(new Set(['player', 'ai']));
  });
});

describe('battle', () => {
  it('rejects firing before the battle starts', () => {
    const state = newGame(rng());
    expectRejected(playerFire(state, at('A1')), state, /not started/);
    expectRejected(aiFire(state, rng()), state, /not started/);
  });

  it('alternates turns after every shot, hit or miss', () => {
    let state = battle('player');
    state = expectOk(playerFire(state, at('J10'))); // miss
    expect(state.turn).toBe('ai');
    expectRejected(playerFire(state, at('J9')), state, /not your turn/);
    state = expectOk(aiFire(state, rng()));
    expect(state.turn).toBe('player');
    expectRejected(aiFire(state, rng()), state, /not the computer's turn/);
    state = expectOk(playerFire(state, at('A1'))); // hit
    expect(state.turn).toBe('ai');
  });

  it('lets the computer move first when chosen', () => {
    let state = battle('ai');
    expectRejected(playerFire(state, at('A1')), state, /not your turn/);
    state = expectOk(aiFire(state, rng()));
    expect(state.stats.aiShots).toBe(1);
    expect(state.turn).toBe('player');
  });

  it('rejects repeat and off-board shots without using up the turn', () => {
    let state = battle('player');
    state = expectOk(playerFire(state, at('E5')));
    state = expectOk(aiFire(state, rng()));
    expectRejected(playerFire(state, at('E5')), state, /already been fired at/);
    expectRejected(playerFire(state, { row: 10, col: 3 }), state, /not on the board/);
    expect(state.turn).toBe('player');
  });

  it('records stats and describes each shot', () => {
    let state = battle('player');
    state = expectOk(playerFire(state, at('J10')));
    expect(state.log.at(-1)).toBe('You fired at J10: miss.');
    state = expectOk(aiFire(state, rng()));
    expect(state.log.at(-1)).toMatch(/^Computer fired at [A-J]\d+: (miss\.|hit!)$/);
    state = expectOk(playerFire(state, at('A9')));
    expect(state.log.at(-1)).toBe('You fired at A9: hit!');
    state = expectOk(aiFire(state, rng()));
    state = expectOk(playerFire(state, at('B9')));
    expect(state.log.at(-1)).toBe("You fired at B9: you sank the computer's Destroyer!");
    expect(state.lastShot).toEqual({
      by: 'player',
      result: expect.objectContaining({ outcome: 'sunk', coord: at('B9') }),
    });
    expect(state.stats).toMatchObject({ playerShots: 3, playerHits: 2, aiShots: 2 });
  });

  it('ends the game exactly when the last enemy ship is sunk', () => {
    let state = battle('player');
    const targets = state.ai.ships.flatMap((s) => s.cells);
    targets.forEach((cell, i) => {
      expect(state.phase).toBe('battle');
      state = expectOk(playerFire(state, cell));
      if (i < targets.length - 1) state = expectOk(aiFire(state, rng()));
    });
    expect(state.phase).toBe('over');
    expect(state.winner).toBe('player');
    expect(state.stats).toMatchObject({ playerShots: 17, playerHits: 17 });
    expect(state.log.at(-1)).toMatch(/You win/);
    expectRejected(playerFire(state, at('J10')), state, /game is over/);
    expectRejected(aiFire(state, rng()), state, /game is over/);
  });

  it('declares the computer the winner when the player fleet is sunk', () => {
    let state = battle('ai');
    // Leave only one undamaged cell in the player's fleet.
    const cells = state.player.ships.flatMap((s) => s.cells);
    let player = state.player;
    for (const cell of cells.slice(1)) player = receiveShot(player, cell).board;
    state = { ...state, player };

    const misses = ['J10', 'I10', 'H10', 'G10', 'F10', 'E10', 'D10', 'C10', 'B10', 'A10'].map(at);
    const aiRng = rng();
    while (state.phase === 'battle') {
      state = expectOk(aiFire(state, aiRng));
      if (state.phase === 'battle') state = expectOk(playerFire(state, misses.shift()!));
    }
    expect(state.winner).toBe('ai');
    expect(state.log.at(-1)).toMatch(/You lose/);
  });
});
