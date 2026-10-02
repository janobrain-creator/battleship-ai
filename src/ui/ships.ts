import { shipLength } from '../game/board';
import type { ShipName } from '../game/types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const HEIGHT = 16;

/** Hull shared by surface ships: flat deck, raked bow pointing right. */
const hull = (w: number): string => `M1 9H${w - 1}L${w - 6} 15H4Z`;
const rect = (x: number, y: number, w: number, h: number, r = 0.6): string =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}H${x}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;

function silhouette(name: ShipName, w: number): string[] {
  const at = (fraction: number): number => Math.round(w * fraction);
  switch (name) {
    case 'Carrier':
      return [
        hull(w),
        rect(0, 7, w, 2, 0),
        rect(at(0.62), 3, 6, 4),
        rect(at(0.62) + 2, 0.5, 1.4, 2.5),
      ];
    case 'Battleship':
      return [
        hull(w),
        rect(at(0.4), 4.5, 9, 4.5),
        rect(at(0.4) + 3.5, 1, 2, 3.5),
        rect(at(0.16), 6.5, 5, 2.5, 1),
        rect(at(0.16) - 4, 7.2, 4, 1, 0),
        rect(at(0.72), 6.5, 5, 2.5, 1),
        rect(at(0.72) + 5, 7.2, 4, 1, 0),
      ];
    case 'Cruiser':
      return [
        hull(w),
        rect(at(0.34), 5, 8, 4),
        rect(at(0.34) + 3, 1.5, 1.6, 3.5),
        rect(at(0.7), 6.5, 4, 2.5, 1),
        rect(at(0.7) + 4, 7.2, 3, 1, 0),
      ];
    case 'Submarine':
      return [
        rect(1, 9, w - 2, 5, 2.5),
        rect(at(0.42), 5, 6, 4.5, 1),
        rect(at(0.42) + 3.5, 1.5, 1, 3.5, 0),
      ];
    case 'Destroyer':
      return [hull(w), rect(at(0.32), 5.5, 6, 3.5), rect(at(0.32) + 2.2, 2.5, 1.2, 3)];
  }
}

/** Small side-profile silhouette of a ship, sized by its length. */
export function shipIcon(name: ShipName): SVGSVGElement {
  const width = shipLength(name) * 10 + 4;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${HEIGHT}`);
  svg.setAttribute('class', 'ship-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.width = `${(width * 14) / HEIGHT}px`;
  for (const d of silhouette(name, width)) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
