import { isFleetComplete, shipAt } from '../game/board';
import { FLEET } from '../game/constants';
import {
  aiFire,
  autoPlacePlayer,
  newGame,
  placePlayerShip,
  playerFire,
  removePlayerShip,
  resetPlacement,
  startBattle,
} from '../game/game';
import { createRng, randomSeed, type Rng } from '../game/random';
import type { ActionResult, Board, Coord, FirstPlayer, GameState, ShipName } from '../game/types';
import { createView, render, type UiState } from './render';

const AI_DELAY_MS = 700;

function nextUnplacedShip(board: Board): ShipName | null {
  return FLEET.find((spec) => !board.ships.some((s) => s.name === spec.name))?.name ?? null;
}

function initialUi(): UiState {
  return {
    selectedShip: FLEET[0]?.name ?? null,
    orientation: 'horizontal',
    hover: null,
    dialog: null,
    message: '',
  };
}

function coordOf(target: EventTarget | null): Coord | null {
  if (!(target instanceof Element)) return null;
  const cell = target.closest<HTMLElement>('.cell[data-row]');
  if (!cell) return null;
  return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
}

function isFirstPlayer(value: string | undefined): value is FirstPlayer {
  return value === 'player' || value === 'ai' || value === 'random';
}

export function startApp(root: ParentNode, rng: Rng = createRng(randomSeed())): void {
  const view = createView(root);
  let state: GameState = newGame(rng);
  let ui: UiState = initialUi();
  let gameId = 0;
  let aiTimer: ReturnType<typeof setTimeout> | undefined;

  const update = (): void => render(view, state, ui);

  function apply(result: ActionResult): boolean {
    state = result.state;
    ui.message = result.ok ? '' : result.reason;
    return result.ok;
  }

  function startNewGame(): void {
    gameId++;
    clearTimeout(aiTimer);
    state = newGame(rng);
    ui = initialUi();
    update();
  }

  function afterShot(): void {
    if (state.phase === 'over') ui.dialog = 'game-over';
    update();
    scheduleAiTurn();
  }

  function scheduleAiTurn(): void {
    if (state.phase !== 'battle' || state.turn !== 'ai') return;
    const scheduledFor = gameId;
    aiTimer = setTimeout(() => {
      if (scheduledFor !== gameId) return;
      apply(aiFire(state, rng));
      afterShot();
    }, AI_DELAY_MS);
  }

  function setHover(coord: Coord | null): void {
    const same =
      coord === ui.hover ||
      (coord && ui.hover && coord.row === ui.hover.row && coord.col === ui.hover.col);
    if (same) return;
    ui.hover = coord;
    if (state.phase === 'placement') update();
  }

  function toggleOrientation(): void {
    ui.orientation = ui.orientation === 'horizontal' ? 'vertical' : 'horizontal';
    update();
  }

  function onPlayerCell(coord: Coord): void {
    if (state.phase !== 'placement') return;
    const existing = shipAt(state.player, coord);
    if (existing) {
      apply(removePlayerShip(state, existing.name));
      ui.selectedShip = existing.name;
      ui.orientation =
        existing.cells[0]?.row === existing.cells[1]?.row ? 'horizontal' : 'vertical';
    } else if (!ui.selectedShip) {
      ui.message = 'Choose a ship to place first.';
    } else if (apply(placePlayerShip(state, ui.selectedShip, coord, ui.orientation))) {
      ui.selectedShip = nextUnplacedShip(state.player);
    }
    update();
  }

  function onShipOption(name: ShipName): void {
    if (state.phase !== 'placement') return;
    if (state.player.ships.some((s) => s.name === name)) {
      apply(removePlayerShip(state, name));
    }
    ui.selectedShip = name;
    ui.message = '';
    update();
  }

  function onDialogAction(action: string | undefined, value: string | undefined): void {
    if (action === 'close') {
      ui.dialog = null;
      update();
    } else if (action === 'new-game') {
      startNewGame();
    } else if (action === 'first' && isFirstPlayer(value)) {
      ui.dialog = null;
      ui.hover = null;
      apply(startBattle(state, value, rng));
      update();
      scheduleAiTurn();
    }
  }

  view.newGameButton.addEventListener('click', () => {
    if (state.phase === 'battle') {
      ui.dialog = 'confirm-new';
      update();
    } else {
      startNewGame();
    }
  });

  view.playerBoard.addEventListener('click', (event) => {
    const coord = coordOf(event.target);
    if (coord) onPlayerCell(coord);
  });
  view.playerBoard.addEventListener('mouseover', (event) => setHover(coordOf(event.target)));
  view.playerBoard.addEventListener('focusin', (event) => setHover(coordOf(event.target)));
  view.playerBoard.addEventListener('mouseleave', () => setHover(null));
  view.playerBoard.addEventListener('focusout', (event) => {
    if (!view.playerBoard.contains(event.relatedTarget as Node | null)) setHover(null);
  });

  view.enemyBoard.addEventListener('click', (event) => {
    const coord = coordOf(event.target);
    if (!coord || state.phase !== 'battle' || state.turn !== 'player') return;
    if (apply(playerFire(state, coord))) afterShot();
  });

  view.shipPicker.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest<HTMLElement>('[data-ship]');
    const name = FLEET.find((spec) => spec.name === button?.dataset.ship)?.name;
    if (name) onShipOption(name);
  });

  view.rotateButton.addEventListener('click', toggleOrientation);

  view.autoPlaceButton.addEventListener('click', () => {
    apply(autoPlacePlayer(state, rng));
    ui.selectedShip = null;
    update();
  });

  view.resetButton.addEventListener('click', () => {
    apply(resetPlacement(state));
    ui.selectedShip = nextUnplacedShip(state.player);
    update();
  });

  view.startButton.addEventListener('click', () => {
    if (!isFleetComplete(state.player)) {
      ui.message = 'Place all five ships before starting the battle.';
    } else {
      ui.dialog = 'first-player';
    }
    update();
  });

  view.dialog.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest<HTMLElement>('[data-action]');
    if (button) onDialogAction(button.dataset.action, button.dataset.value);
  });
  view.dialog.addEventListener('close', () => {
    if (ui.dialog) {
      ui.dialog = null;
      update();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'r' && event.key !== 'R') return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (state.phase !== 'placement' || ui.dialog) return;
    toggleOrientation();
  });

  update();
}
