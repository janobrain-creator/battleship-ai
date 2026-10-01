export interface Coord {
  row: number;
  col: number;
}

export type Orientation = 'horizontal' | 'vertical';

export type ShipName = 'Carrier' | 'Battleship' | 'Cruiser' | 'Submarine' | 'Destroyer';

export interface ShipSpec {
  name: ShipName;
  length: number;
}

export interface Ship {
  name: ShipName;
  cells: Coord[];
  hits: number;
}

export type CellShot = 'unknown' | 'miss' | 'hit';

export interface Board {
  ships: Ship[];
  /** shots[row][col]: what has been fired at this board so far. */
  shots: CellShot[][];
}

export type Side = 'player' | 'ai';

export type FirstPlayer = Side | 'random';

export type Phase = 'placement' | 'battle' | 'over';

export type ShotOutcome = 'miss' | 'hit' | 'sunk';

export interface ShotResult {
  coord: Coord;
  outcome: ShotOutcome;
  /** The ship that was hit or sunk, if any. */
  ship?: Ship;
}

export interface GameStats {
  playerShots: number;
  playerHits: number;
  aiShots: number;
  aiHits: number;
}

export interface GameState {
  phase: Phase;
  turn: Side;
  /** The human's fleet; the AI fires at this board. */
  player: Board;
  /** The AI's fleet; the human fires at this board. */
  ai: Board;
  firstPlayer: Side | null;
  winner: Side | null;
  lastShot: { by: Side; result: ShotResult } | null;
  log: string[];
  stats: GameStats;
}

export type ActionResult =
  { ok: true; state: GameState } | { ok: false; state: GameState; reason: string };
