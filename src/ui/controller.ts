import { getShot, isFleetComplete, shipAt } from '../game/board';
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
import { bowFor, centerSegment, grabbedSegment, orientationOf } from './placement';
import { createView, render, type UiState } from './render';

const AI_DELAY_MS = 700;
const TOAST_MS = 2000;
const REJECT_FLASH_MS = 650;

function nextUnplacedShip(board: Board): ShipName | null {
  return FLEET.find((spec) => !board.ships.some((s) => s.name === spec.name))?.name ?? null;
}

function initialUi(): UiState {
  const selectedShip = FLEET[0]?.name ?? null;
  return {
    selectedShip,
    orientation: 'horizontal',
    segment: selectedShip ? centerSegment(selectedShip) : 0,
    hover: null,
    dialog: null,
    message: '',
    rejected: null,
    toast: null,
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
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let rejectTimer: ReturnType<typeof setTimeout> | undefined;

  const update = (): void => render(view, state, ui);

  function apply(result: ActionResult): boolean {
    state = result.state;
    ui.message = result.ok ? '' : result.reason;
    return result.ok;
  }

  function startNewGame(): void {
    gameId++;
    clearTimeout(aiTimer);
    clearTimeout(toastTimer);
    clearTimeout(rejectTimer);
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

  function selectShip(name: ShipName | null): void {
    ui.selectedShip = name;
    ui.segment = name ? centerSegment(name) : 0;
  }

  function showToast(text: string): void {
    clearTimeout(toastTimer);
    ui.toast = text;
    toastTimer = setTimeout(() => {
      ui.toast = null;
      update();
    }, TOAST_MS);
  }

  function flashRejected(coord: Coord): void {
    clearTimeout(rejectTimer);
    ui.rejected = null;
    update();
    void view.enemyBoard.offsetWidth; // restart the CSS animation on repeat clicks
    ui.rejected = coord;
    update();
    rejectTimer = setTimeout(() => {
      ui.rejected = null;
      update();
    }, REJECT_FLASH_MS);
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
      ui.segment = grabbedSegment(existing, coord);
      ui.orientation = orientationOf(existing);
      ui.hover = coord;
    } else if (!ui.selectedShip) {
      ui.message = 'Choose a ship to place first.';
    } else if (
      apply(
        placePlayerShip(
          state,
          ui.selectedShip,
          bowFor(coord, ui.segment, ui.orientation),
          ui.orientation,
        ),
      )
    ) {
      selectShip(nextUnplacedShip(state.player));
    }
    update();
  }

  function onShipOption(name: ShipName): void {
    if (state.phase !== 'placement') return;
    if (state.player.ships.some((s) => s.name === name)) {
      apply(removePlayerShip(state, name));
    }
    selectShip(name);
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

  // Mouse clicks must not leave a board cell focused, or the next key press (e.g. R)
  // makes the browser draw a keyboard focus ring around it.
  for (const board of [view.playerBoard, view.enemyBoard]) {
    board.addEventListener('mousedown', (event) => {
      if (coordOf(event.target)) event.preventDefault();
    });
  }

  view.enemyBoard.addEventListener('click', (event) => {
    const coord = coordOf(event.target);
    if (!coord || state.phase !== 'battle' || state.turn !== 'player') return;
    if (getShot(state.ai, coord) !== 'unknown') {
      flashRejected(coord);
      return;
    }
    if (!apply(playerFire(state, coord))) return;
    const shot = state.lastShot?.result;
    if (shot?.outcome === 'sunk' && shot.ship) showToast(`Enemy ${shot.ship.name} sunk!`);
    afterShot();
  });

  view.shipPicker.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest<HTMLElement>('[data-ship]');
    const name = FLEET.find((spec) => spec.name === button?.dataset.ship)?.name;
    if (name) onShipOption(name);
  });

  view.rotateButton.addEventListener('click', toggleOrientation);

  view.autoPlaceButton.addEventListener('click', () => {
    apply(autoPlacePlayer(state, rng));
    selectShip(null);
    update();
  });

  view.resetButton.addEventListener('click', () => {
    apply(resetPlacement(state));
    selectShip(nextUnplacedShip(state.player));
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
