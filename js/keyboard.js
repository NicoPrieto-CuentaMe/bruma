// Una octava de piano (Do–Si) dibujada en SVG, con las notas del acorde resaltadas.

const NS = 'http://www.w3.org/2000/svg';
const WHITE_W = 100;
const WHITE_H = 210;
const BLACK_W = 58;
const BLACK_H = 128;
const GAP = 3;
const FELT = 10; // franja de fieltro sobre las teclas

const WHITE = [0, 2, 4, 5, 7, 9, 11];
// Centro de cada tecla negra, algo desplazado como en un teclado real.
const BLACK = [
  [1, 92],
  [3, 208],
  [6, 390],
  [8, 500],
  [10, 610],
];

function svgEl(name, attrs, parent) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent?.appendChild(node);
  return node;
}

// Rectángulo con las esquinas inferiores redondeadas.
function keyPath(x, w, h, r) {
  return `M${x} 0H${x + w}V${h - r}Q${x + w} ${h} ${x + w - r} ${h}H${x + r}Q${x} ${h} ${x} ${h - r}Z`;
}

// role: 'on' (nota del acorde), 'color' (nota de color para improvisar) o nada.
function key(svg, kind, pc, x, w, h, label, role, isRoot) {
  const group = svgEl('g', { class: `key ${kind}${role ? ` ${role}` : ''}`, 'data-pc': pc }, svg);
  svgEl('path', { d: keyPath(x, w, h, kind === 'white' ? 9 : 7) }, group);
  if (!label) return;
  const cx = x + w / 2;
  const y = h - (kind === 'white' ? 22 : 18);
  const text = svgEl('text', { x: cx, y, class: 'key-label' }, group);
  text.textContent = label;
  if (isRoot) svgEl('circle', { cx, cy: y - (kind === 'white' ? 32 : 28), r: 5, class: 'root-dot' }, group);
}

// labels: Map de clase de nota (0–11) → nombre de las notas del acorde.
// colors: lo mismo para las notas de color, que se dibujan más tenues.
// Es decorativo: el botón que lo contiene ya nombra el acorde y sus notas.
export function octaveSvg({ labels, root, colors = new Map() }) {
  const svg = svgEl('svg', {
    viewBox: `0 ${-FELT} ${WHITE_W * 7} ${WHITE_H + FELT}`,
    'aria-hidden': 'true',
    class: 'keys',
  });
  svgEl('rect', { x: 0, y: -FELT, width: WHITE_W * 7, height: FELT - 4, rx: 3, class: 'felt' }, svg);
  const mark = (pc) => {
    if (labels.has(pc)) return [labels.get(pc), 'on', pc === root];
    if (colors.has(pc)) return [colors.get(pc), 'color', false];
    return [null, null, false];
  };
  WHITE.forEach((pc, i) => {
    key(svg, 'white', pc, i * WHITE_W + GAP / 2, WHITE_W - GAP, WHITE_H, ...mark(pc));
  });
  for (const [pc, center] of BLACK) {
    key(svg, 'black', pc, center - BLACK_W / 2, BLACK_W, BLACK_H, ...mark(pc));
  }
  return svg;
}
