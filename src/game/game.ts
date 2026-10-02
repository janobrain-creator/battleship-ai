import { aiViewOf, chooseAiShot } from './ai';
import {
  allSunk,
  createBoard,
  formatCoord,
  isFleetComplete,
  placementError,
  placeShip,
  receiveShot,
  removeShip,
  shotError,
} from './board';
import { autoPlace, randomFleet } from './fleet';
import type { Rng } from './random';
import type {
  ActionResult,
  Coord,
  FirstPlayer,
  GameState,
  Orientation,
  ShipName,
  ShotResult,
  Side,
} from './types';

const ok = (state: GameState): ActionResult => ({ ok: true, state });
const fail = (state: GameState, reason: string): ActionResult => ({ ok: false, state, reason });

export function newGame(rng: Rng): GameState {
  return {
    phase: 'placement',
    turn: 'player',
    player: createBoard(),
    ai: randomFleet(rng),
    firstPlayer: null,
    winner: null,
    lastShot: null,
    log: ['Place your ships to begin.'],
    stats: { playerShots: 0, playerHits: 0, aiShots: 0, aiHits: 0 },
  };
}

function requirePlacement(state: GameState): string | null {
  return state.phase === 'placement' ? null : 'Ships can only be changed before the battle starts.';
}

export function placePlayerShip(
  state: GameState,
  name: ShipName,
  start: Coord,
  orientation: Orientation,
): ActionResult {
  const error = requirePlacement(state) ?? placementError(state.player, name, start, orientation);
  if (error) return fail(state, error);
  return ok({ ...state, player: placeShip(state.player, name, start, orientation) });
}

export function removePlayerShip(state: GameState, name: ShipName): ActionResult {
  const error = requirePlacement(state);
  if (error) return fail(state, error);
  return ok({ ...state, player: removeShip(state.player, name) });
}

/** Places the remaining ships; if the fleet is already complete, re-rolls all of it. */
export function autoPlacePlayer(state: GameState, rng: Rng): ActionResult {
  const error = requirePlacement(state);
  if (error) return fail(state, error);
  const base = isFleetComplete(state.player) ? createBoard() : state.player;
  return ok({ ...state, player: autoPlace(base, rng) });
}

export function resetPlacement(state: GameState): ActionResult {
  const error = requirePlacement(state);
  if (error) return fail(state, error);
  return ok({ ...state, player: createBoard() });
}

export function startBattle(state: GameState, first: FirstPlayer, rng: Rng): ActionResult {
  const error = requirePlacement(state);
  if (error) return fail(state, error);
  if (!isFleetComplete(state.player)) {
    return fail(state, 'Place all five ships before starting the battle.');
  }
  const turn: Side = first === 'random' ? (rng() < 0.5 ? 'player' : 'ai') : first;
  const opening =
    turn === 'player' ? 'You fire first. Choose a target.' : 'The computer fires first.';
  const prefix = first === 'random' ? 'Random pick: ' : '';
  return ok({
    ...state,
    phase: 'battle',
    turn,
    firstPlayer: turn,
    log: [...state.log, `Battle started. ${prefix}${opening}`],
  });
}

function describeShot(by: Side, result: ShotResult): string {
  const at = formatCoord(result.coord);
  if (by === 'player') {
    if (result.outcome === 'miss') return `You fired at ${at}: miss.`;
    if (result.outcome === 'hit') return `You fired at ${at}: hit!`;
    return `You fired at ${at}: you sank the computer's ${result.ship?.name}!`;
  }
  if (result.outcome === 'miss') return `Computer fired at ${at}: miss.`;
  if (result.outcome === 'hit') return `Computer fired at ${at}: hit!`;
  return `Computer fired at ${at}: it sank your ${result.ship?.name}!`;
}

function turnError(state: GameState, by: Side): string | null {
  if (state.phase === 'placement') return 'The battle has not started yet.';
  if (state.phase === 'over') return 'The game is over.';
  if (state.turn !== by)
    return by === 'player' ? "It's not your turn." : "It's not the computer's turn.";
  return null;
}

function fire(state: GameState, by: Side, coord: Coord): ActionResult {
  const turnProblem = turnError(state, by);
  if (turnProblem) return fail(state, turnProblem);
  const targetKey = by === 'player' ? 'ai' : 'player';
  const error = shotError(state[targetKey], coord);
  if (error) return fail(state, error);

  const { board, result } = receiveShot(state[targetKey], coord);
  const isHit = result.outcome !== 'miss';
  const stats =
    by === 'player'
      ? {
          ...state.stats,
          playerShots: state.stats.playerShots + 1,
          playerHits: state.stats.playerHits + (isHit ? 1 : 0),
        }
      : {
          ...state.stats,
          aiShots: state.stats.aiShots + 1,
          aiHits: state.stats.aiHits + (isHit ? 1 : 0),
        };
  const log = [...state.log, describeShot(by, result)];
  const next: GameState = { ...state, [targetKey]: board, stats, log, lastShot: { by, result } };

  if (allSunk(board)) {
    const ending =
      by === 'player'
        ? 'You sank the entire enemy fleet. You win!'
        : 'Your fleet has been sunk. You lose.';
    return ok({ ...next, phase: 'over', winner: by, log: [...log, ending] });
  }
  return ok({ ...next, turn: by === 'player' ? 'ai' : 'player' });
}

export function playerFire(state: GameState, coord: Coord): ActionResult {
  return fire(state, 'player', coord);
}

export function aiFire(state: GameState, rng: Rng): ActionResult {
  const turnProblem = turnError(state, 'ai');
  if (turnProblem) return fail(state, turnProblem);
  return fire(state, 'ai', chooseAiShot(aiViewOf(state.player), rng));
}
