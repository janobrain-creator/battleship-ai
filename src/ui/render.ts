import {
  canPlaceShip,
  formatCoord,
  getShot,
  isFleetComplete,
  isInBounds,
  isSunk,
  shipAt,
  shipCells,
  shipLength,
} from '../game/board';
import { BOARD_SIZE, COLUMN_LABELS, FLEET } from '../game/constants';
import type { Board, Coord, GameState, Orientation, Ship, ShipName } from '../game/types';

export type DialogKind = 'first-player' | 'game-over' | 'confirm-new';

/** Presentation-only state that does not affect the game rules. */
export interface UiState {
  selectedShip: ShipName | null;
  orientation: Orientation;
  hover: Coord | null;
  dialog: DialogKind | null;
  message: string;
}

export interface View {
  newGameButton: HTMLButtonElement;
  status: HTMLElement;
  playerBoard: HTMLElement;
  playerCells: HTMLButtonElement[][];
  playerCount: HTMLElement;
  playerFleet: HTMLElement;
  placementPanel: HTMLElement;
  shipPicker: HTMLElement;
  shipButtons: Map<ShipName, HTMLButtonElement>;
  rotateButton: HTMLButtonElement;
  autoPlaceButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  startButton: HTMLButtonElement;
  placementMessage: HTMLElement;
  enemyPanel: HTMLElement;
  enemyBoard: HTMLElement;
  enemyCells: HTMLButtonElement[][];
  enemyCount: HTMLElement;
  enemyFleet: HTMLElement;
  log: HTMLElement;
  dialog: HTMLDialogElement;
  dialogKind: DialogKind | null;
}

function find<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text = '',
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function pips(length: number, filled = 0): HTMLElement {
  const wrap = make('span', 'pips');
  for (let i = 0; i < length; i++) wrap.append(make('i', i < filled ? 'pip damaged' : 'pip'));
  return wrap;
}

function buildBoard(container: HTMLElement): HTMLButtonElement[][] {
  container.replaceChildren(make('div', 'label corner'));
  for (const letter of COLUMN_LABELS) container.append(make('div', 'label col-label', letter));
  const cells: HTMLButtonElement[][] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    container.append(make('div', 'label row-label', String(row + 1)));
    const rowCells: HTMLButtonElement[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = make('button', 'cell');
      cell.type = 'button';
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      container.append(cell);
      rowCells.push(cell);
    }
    cells.push(rowCells);
  }
  return cells;
}

export function createView(root: ParentNode): View {
  const shipPicker = find<HTMLElement>(root, '#ship-picker');
  const shipButtons = new Map<ShipName, HTMLButtonElement>();
  for (const spec of FLEET) {
    const button = make('button', 'ship-option');
    button.type = 'button';
    button.dataset.ship = spec.name;
    button.append(make('span', 'ship-name', spec.name), pips(spec.length));
    shipPicker.append(button);
    shipButtons.set(spec.name, button);
  }
  const playerBoard = find<HTMLElement>(root, '#player-board');
  const enemyBoard = find<HTMLElement>(root, '#enemy-board');
  return {
    newGameButton: find(root, '#new-game'),
    status: find(root, '#status'),
    playerBoard,
    playerCells: buildBoard(playerBoard),
    playerCount: find(root, '#player-count'),
    playerFleet: find(root, '#player-fleet'),
    placementPanel: find(root, '#placement-panel'),
    shipPicker,
    shipButtons,
    rotateButton: find(root, '#rotate'),
    autoPlaceButton: find(root, '#auto-place'),
    resetButton: find(root, '#reset'),
    startButton: find(root, '#start'),
    placementMessage: find(root, '#placement-message'),
    enemyPanel: find(root, '#enemy-panel'),
    enemyBoard,
    enemyCells: buildBoard(enemyBoard),
    enemyCount: find(root, '#enemy-count'),
    enemyFleet: find(root, '#enemy-fleet'),
    log: find(root, '#log'),
    dialog: find(root, '#dialog'),
    dialogKind: null,
  };
}

const key = ({ row, col }: Coord): string => `${row},${col}`;

function shipShapeClasses(ship: Ship, coord: Coord): string[] {
  const index = ship.cells.findIndex((c) => c.row === coord.row && c.col === coord.col);
  const horizontal = ship.cells[0]?.row === ship.cells[1]?.row;
  const classes = ['ship', horizontal ? 'ship-h' : 'ship-v'];
  if (index === 0) classes.push('ship-start');
  if (index === ship.cells.length - 1) classes.push('ship-end');
  return classes;
}

function isLastShot(state: GameState, by: 'player' | 'ai', coord: Coord): boolean {
  const last = state.lastShot;
  return !!last && last.by === by && key(last.result.coord) === key(coord);
}

function placementPreview(
  state: GameState,
  ui: UiState,
): { cells: Set<string>; valid: boolean } | null {
  if (state.phase !== 'placement' || !ui.selectedShip || !ui.hover) return null;
  const cells = shipCells(ui.hover, shipLength(ui.selectedShip), ui.orientation).filter(isInBounds);
  return {
    cells: new Set(cells.map(key)),
    valid: canPlaceShip(state.player, ui.selectedShip, ui.hover, ui.orientation),
  };
}

function renderPlayerBoard(view: View, state: GameState, ui: UiState): void {
  const preview = placementPreview(state, ui);
  const board = state.player;
  view.playerBoard.classList.toggle('placing', state.phase === 'placement');
  view.playerCells.forEach((rowCells, row) =>
    rowCells.forEach((cell, col) => {
      const coord = { row, col };
      const ship = shipAt(board, coord);
      const shot = getShot(board, coord);
      const classes = ['cell'];
      let description = 'empty water';
      if (ship) {
        classes.push(...shipShapeClasses(ship, coord));
        description = ship.name;
      }
      if (shot === 'miss') {
        classes.push('miss');
        description = 'miss';
      } else if (shot === 'hit' && ship) {
        const sunk = isSunk(ship);
        classes.push(sunk ? 'sunk' : 'hit');
        description = `${ship.name}, ${sunk ? 'sunk' : 'hit'}`;
      }
      if (preview?.cells.has(key(coord))) {
        classes.push(preview.valid ? 'preview-valid' : 'preview-invalid');
      }
      if (isLastShot(state, 'ai', coord)) classes.push('last');
      cell.className = classes.join(' ');
      cell.disabled = state.phase !== 'placement';
      cell.setAttribute('aria-label', `Your board ${formatCoord(coord)}: ${description}`);
    }),
  );
}

function renderEnemyBoard(view: View, state: GameState): void {
  const board = state.ai;
  const canFire = state.phase === 'battle' && state.turn === 'player';
  view.enemyBoard.classList.toggle('armed', canFire);
  view.enemyCells.forEach((rowCells, row) =>
    rowCells.forEach((cell, col) => {
      const coord = { row, col };
      const shot = getShot(board, coord);
      const classes = ['cell'];
      let description = 'not fired at';
      if (shot === 'miss') {
        classes.push('miss');
        description = 'miss';
      } else if (shot === 'hit') {
        const ship = shipAt(board, coord);
        if (ship && isSunk(ship)) {
          classes.push(...shipShapeClasses(ship, coord), 'sunk');
          description = `sunk ${ship.name}`;
        } else {
          classes.push('hit');
          description = 'hit';
        }
      } else if (state.phase === 'over') {
        const ship = shipAt(board, coord);
        if (ship) {
          classes.push(...shipShapeClasses(ship, coord), 'revealed');
          description = `${ship.name}, not found`;
        }
      }
      if (isLastShot(state, 'player', coord)) classes.push('last');
      cell.className = classes.join(' ');
      cell.disabled = !canFire || shot !== 'unknown';
      cell.setAttribute('aria-label', `Enemy board ${formatCoord(coord)}: ${description}`);
    }),
  );
}

function renderFleet(
  list: HTMLElement,
  board: Board,
  showDamage: boolean,
  showPending: boolean,
): void {
  list.replaceChildren(
    ...FLEET.map((spec) => {
      const ship = board.ships.find((s) => s.name === spec.name);
      const sunk = !!ship && isSunk(ship);
      const item = make('li', 'fleet-item');
      item.classList.toggle('sunk', sunk);
      item.classList.toggle('pending', showPending && !ship);
      item.append(
        make('span', 'fleet-name', spec.name),
        pips(spec.length, sunk ? spec.length : showDamage ? (ship?.hits ?? 0) : 0),
      );
      if (sunk) item.append(make('span', 'tag', 'Sunk'));
      return item;
    }),
  );
}

function afloat(board: Board): string {
  const count = board.ships.filter((s) => !isSunk(s)).length;
  return `${count} of ${FLEET.length} afloat`;
}

function statusText(state: GameState): { title: string; tone: string } {
  if (state.phase === 'placement') {
    return isFleetComplete(state.player)
      ? { title: 'Fleet ready. Start the battle when you are.', tone: 'info' }
      : { title: 'Deploy your fleet.', tone: 'info' };
  }
  if (state.phase === 'battle') {
    return state.turn === 'player'
      ? { title: 'Your turn: fire at enemy waters.', tone: 'player' }
      : { title: 'The computer is aiming…', tone: 'ai' };
  }
  return state.winner === 'player'
    ? { title: 'Victory! You sank the entire enemy fleet.', tone: 'win' }
    : { title: 'Defeat. Your fleet has been sunk.', tone: 'lose' };
}

function renderStatus(view: View, state: GameState): void {
  const { title, tone } = statusText(state);
  view.status.className = `status status-${tone}`;
  const latest = state.phase === 'battle' ? (state.log.at(-1) ?? '') : '';
  view.status.replaceChildren(make('strong', 'status-title', title));
  if (latest && latest !== title) view.status.append(make('span', 'status-detail', latest));
}

function renderPlacementControls(view: View, state: GameState, ui: UiState): void {
  for (const [name, button] of view.shipButtons) {
    const placed = state.player.ships.some((s) => s.name === name);
    const selected = ui.selectedShip === name;
    button.classList.toggle('placed', placed);
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.title = placed ? `Pick up the ${name} to move it` : `Place the ${name}`;
  }
  view.rotateButton.textContent = `Rotate (R): ${ui.orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}`;
  view.startButton.disabled = !isFleetComplete(state.player);
  view.placementMessage.textContent = ui.message;
}

function renderLog(view: View, state: GameState): void {
  const entries = state.log.slice(-8).reverse();
  view.log.replaceChildren(...entries.map((text, i) => make('li', i === 0 ? 'latest' : '', text)));
}

function accuracy(hits: number, shots: number): string {
  return shots === 0 ? '0%' : `${Math.round((hits / shots) * 100)}%`;
}

function dialogContent(kind: DialogKind, state: GameState): string {
  if (kind === 'first-player') {
    return `
      <h2>Who fires first?</h2>
      <p>Choose who takes the opening shot.</p>
      <div class="dialog-actions">
        <button type="button" class="btn btn-primary" data-action="first" data-value="player">Me</button>
        <button type="button" class="btn" data-action="first" data-value="ai">Computer</button>
        <button type="button" class="btn" data-action="first" data-value="random">Random</button>
      </div>
      <button type="button" class="btn-link" data-action="close">Cancel</button>`;
  }
  if (kind === 'confirm-new') {
    return `
      <h2>Start a new game?</h2>
      <p>The current battle will be abandoned.</p>
      <div class="dialog-actions">
        <button type="button" class="btn" data-action="close">Keep playing</button>
        <button type="button" class="btn btn-danger" data-action="new-game">New game</button>
      </div>`;
  }
  const won = state.winner === 'player';
  const { playerShots, playerHits, aiShots, aiHits } = state.stats;
  return `
    <div class="result-icon ${won ? 'win' : 'lose'}" aria-hidden="true">${won ? '★' : '✕'}</div>
    <h2>${won ? 'Victory!' : 'Defeat'}</h2>
    <p>${won ? 'You sank the entire enemy fleet.' : 'The computer sank your entire fleet.'}</p>
    <dl class="stats">
      <div><dt>Your shots</dt><dd>${playerShots}</dd></div>
      <div><dt>Your hits</dt><dd>${playerHits}</dd></div>
      <div><dt>Your accuracy</dt><dd>${accuracy(playerHits, playerShots)}</dd></div>
      <div><dt>Computer accuracy</dt><dd>${accuracy(aiHits, aiShots)}</dd></div>
    </dl>
    <div class="dialog-actions">
      <button type="button" class="btn" data-action="close">View boards</button>
      <button type="button" class="btn btn-primary" data-action="new-game">Play again</button>
    </div>`;
}

function renderDialog(view: View, state: GameState, ui: UiState): void {
  if (!ui.dialog) {
    view.dialogKind = null;
    if (view.dialog.open) view.dialog.close();
    return;
  }
  if (view.dialogKind !== ui.dialog) {
    view.dialog.innerHTML = dialogContent(ui.dialog, state);
    view.dialogKind = ui.dialog;
  }
  if (!view.dialog.open) {
    view.dialog.showModal();
    view.dialog.querySelector<HTMLButtonElement>('.btn-primary, .btn-danger')?.focus();
  }
}

export function render(view: View, state: GameState, ui: UiState): void {
  const placing = state.phase === 'placement';
  view.placementPanel.hidden = !placing;
  view.enemyPanel.hidden = placing;
  view.newGameButton.classList.toggle('btn-primary', state.phase === 'over');
  renderStatus(view, state);
  renderPlayerBoard(view, state, ui);
  renderEnemyBoard(view, state);
  view.playerCount.textContent = placing
    ? `${state.player.ships.length} of ${FLEET.length} placed`
    : afloat(state.player);
  view.enemyCount.textContent = afloat(state.ai);
  renderFleet(view.playerFleet, state.player, true, placing);
  renderFleet(view.enemyFleet, state.ai, false, false);
  renderPlacementControls(view, state, ui);
  renderLog(view, state);
  renderDialog(view, state, ui);
}
