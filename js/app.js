// Interfaz de Bruma: dibuja la progresión elegida y conecta los controles con el motor de sonido.

import { PROGRESSIONS } from './progressions.js';
import { parseNote, noteName } from './theory.js';
import { octaveSvg } from './keyboard.js';
import { createEngine } from './audio.js';

const byId = (id) => document.getElementById(id);
const els = {
  heading: byId('heading'),
  prev: byId('prev'),
  next: byId('next'),
  catalog: byId('catalog'),
  title: byId('title'),
  reference: byId('reference'),
  dots: byId('dots'),
  meta: byId('meta'),
  description: byId('description'),
  octaves: byId('octaves'),
  play: byId('play'),
  tempo: byId('tempo'),
  bpm: byId('bpm'),
  notation: document.querySelectorAll('[data-notation]'),
};

// Alturas MIDI y ortografía de cada nota, calculadas una sola vez.
for (const prog of PROGRESSIONS) {
  for (const chord of prog.chords) {
    const notes = chord.voicing.split(' ').map(parseNote);
    chord.midi = notes.map((n) => n.midi);
    chord.spellings = notes.map((n) => n.spelling);
    chord.rootPc = parseNote(chord.root).pc;
    chord.byPc = new Map();
    for (const n of notes) if (!chord.byPc.has(n.pc)) chord.byPc.set(n.pc, n.spelling);
  }
}

// localStorage puede no estar disponible (modo privado, almacenamiento bloqueado).
const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // sin almacenamiento la preferencia dura solo esta visita
    }
  },
};

const indexFromHash = () => PROGRESSIONS.findIndex((p) => p.id === decodeURIComponent(location.hash.slice(1)));

const state = {
  index: Math.max(0, indexFromHash()),
  notation: storage.get('bruma.notation') === 'solfege' ? 'solfege' : 'letters',
  bpm: 0,
};
state.bpm = PROGRESSIONS[state.index].bpm;

const current = () => PROGRESSIONS[state.index];
const wrap = (i) => (i + PROGRESSIONS.length) % PROGRESSIONS.length;

let ctx = null;
let engine = null;

// Vuelve a lanzar una animación CSS de entrada.
function replay(el, className = 'enter') {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function chordItem(chord, i) {
  const name = (spelling) => noteName(spelling, state.notation);
  const root = name(chord.root);
  const bass = chord.bass ? `/${name(chord.bass)}` : '';
  // La «m» de menor va en línea con la fundamental; el resto del cifrado, volado.
  const minor = /^m(?!aj)/.test(chord.quality) ? 'm' : '';
  const labels = new Map([...chord.byPc].map(([pc, spelling]) => [pc, name(spelling)]));

  const item = document.createElement('li');
  item.className = 'octave';
  item.style.setProperty('--i', i);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'octave-button';
  button.setAttribute('aria-label', `Escuchar ${root}${chord.quality}${bass}: ${chord.spellings.map(name).join(', ')}`);
  button.innerHTML = `
    <span class="chord">
      <span class="chord-name"><span class="chord-root"></span><span class="chord-minor"></span><span class="chord-quality"></span><span class="chord-bass"></span></span>
      <span class="roman"></span>
      <span class="voicing"></span>
    </span>`;
  button.querySelector('.chord-root').textContent = root;
  button.querySelector('.chord-minor').textContent = minor;
  button.querySelector('.chord-quality').textContent = chord.quality.slice(minor.length);
  button.querySelector('.chord-bass').textContent = bass;
  button.querySelector('.roman').textContent = chord.roman;
  button.querySelector('.voicing').textContent = chord.spellings.map(name).join(' · ');
  button.append(octaveSvg({ labels, root: chord.rootPc }));
  button.addEventListener('click', () => audition(i));

  const progress = document.createElement('span');
  progress.className = 'progress';
  progress.setAttribute('aria-hidden', 'true');

  item.append(button, progress);
  return item;
}

function render({ animate = true } = {}) {
  const prog = current();
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--accent-light', prog.accent.light);
  rootStyle.setProperty('--accent-dark', prog.accent.dark);
  document.title = `${prog.title} · Bruma`;

  const number = String(state.index + 1).padStart(3, '0');
  els.catalog.textContent = `BRM ${number}   ${state.index + 1} / ${PROGRESSIONS.length}`;
  els.title.textContent = prog.title;
  if (prog.reference) {
    const artist = document.createElement('span');
    artist.className = 'artist';
    artist.textContent = prog.reference;
    els.reference.replaceChildren('a la manera de ', artist);
  } else {
    els.reference.textContent = 'tema de apertura';
  }
  els.meta.replaceChildren(
    ...[`${noteName(prog.key[0], state.notation)} ${prog.key[1]}`, prog.sound, prog.texture].map((text) => {
      const item = document.createElement('span');
      item.textContent = text;
      return item;
    }),
  );
  els.description.textContent = prog.description;

  els.prev.setAttribute('aria-label', `Anterior: ${PROGRESSIONS[wrap(state.index - 1)].title}`);
  els.next.setAttribute('aria-label', `Siguiente: ${PROGRESSIONS[wrap(state.index + 1)].title}`);
  [...els.dots.children].forEach((dot, i) => {
    if (i === state.index) dot.setAttribute('aria-current', 'true');
    else dot.removeAttribute('aria-current');
  });

  els.tempo.value = state.bpm;
  els.bpm.textContent = `${state.bpm} bpm`;
  els.notation.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.notation === state.notation)));

  els.octaves.replaceChildren(...prog.chords.map(chordItem));
  if (animate) [els.heading, els.meta, els.description].forEach((el) => replay(el));
}

// --- Sonido -----------------------------------------------------------------

// El contexto de audio solo puede nacer de un gesto de la persona (clic o tecla).
async function audio() {
  if (!ctx) {
    // En iPhone, que suene aunque el interruptor de silencio esté activado.
    if ('audioSession' in navigator) navigator.audioSession.type = 'playback';
    ctx = new AudioContext({ latencyHint: 'playback' });
    engine = createEngine(ctx);
    engine.onchange = onEngineState;
    requestAnimationFrame(frame);
  }
  if (ctx.state !== 'running') await ctx.resume();
  return engine;
}

async function togglePlay() {
  const e = await audio();
  if (e.state === 'playing') e.stop();
  else e.play(current(), { bpm: state.bpm });
}

// Tocar un acorde: si la progresión está sonando salta a él; si no, lo hace sonar una vez.
async function audition(index) {
  const e = await audio();
  e.play(current(), { from: index, bpm: state.bpm, once: e.state !== 'playing' });
}

function onEngineState(next) {
  const playing = next === 'playing';
  els.play.setAttribute('aria-pressed', String(playing));
  els.play.setAttribute('aria-label', playing ? 'Detener' : 'Reproducir la progresión');
  if (next === 'stopped') {
    for (const item of els.octaves.children) item.classList.remove('is-current');
  }
}

const struckTimers = new WeakMap();

function strike(index, pc) {
  const item = els.octaves.children[index];
  if (!item) return;
  for (const key of item.querySelectorAll(`.key[data-pc="${pc}"]`)) {
    key.classList.add('struck');
    clearTimeout(struckTimers.get(key));
    struckTimers.set(key, setTimeout(() => key.classList.remove('struck'), 160));
  }
}

function markCurrent(index, duration) {
  [...els.octaves.children].forEach((item, i) => {
    if (i !== index) item.classList.remove('is-current');
  });
  const item = els.octaves.children[index];
  if (!item) return;
  item.style.setProperty('--duration', `${duration}s`);
  replay(item, 'is-current');
}

// Sincroniza la imagen con el sonido: cada aviso llega cuando la nota sale por los altavoces.
function frame() {
  for (const event of engine.poll()) {
    if (event.type === 'chord') markCurrent(event.index, event.duration);
    else strike(event.index, event.pc);
  }
  requestAnimationFrame(frame);
}

// --- Navegación --------------------------------------------------------------

function select(index) {
  if (index === state.index) return;
  state.index = index;
  state.bpm = current().bpm;
  history.replaceState(null, '', `#${current().id}`);
  render();
  if (engine?.state === 'playing') engine.play(current(), { bpm: state.bpm });
  else if (engine?.state === 'audition') engine.stop();
}

const step = (delta) => select(wrap(state.index + delta));

PROGRESSIONS.forEach((prog, i) => {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = 'dot';
  dot.setAttribute('aria-label', prog.reference ? `${prog.title}, a la manera de ${prog.reference}` : prog.title);
  dot.addEventListener('click', () => select(i));
  els.dots.append(dot);
});

els.prev.addEventListener('click', () => step(-1));
els.next.addEventListener('click', () => step(1));
els.play.addEventListener('click', togglePlay);

els.tempo.addEventListener('input', () => {
  state.bpm = Number(els.tempo.value);
  els.bpm.textContent = `${state.bpm} bpm`;
  engine?.setBpm(state.bpm);
});

els.notation.forEach((button) =>
  button.addEventListener('click', () => {
    if (button.dataset.notation === state.notation) return;
    state.notation = button.dataset.notation;
    storage.set('bruma.notation', state.notation);
    render({ animate: false });
  }),
);

document.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
  const onSlider = e.target === els.tempo;
  if (e.key === 'ArrowLeft' && !onSlider) {
    e.preventDefault();
    step(-1);
  } else if (e.key === 'ArrowRight' && !onSlider) {
    e.preventDefault();
    step(1);
  } else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
    e.preventDefault();
    togglePlay();
  } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= current().chords.length) {
    audition(Number(e.key) - 1);
  }
});

// Deslizar hacia los lados en el móvil cambia de progresión.
let touchStart = null;
const main = document.querySelector('main');
main.addEventListener(
  'touchstart',
  (e) => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  },
  { passive: true },
);
main.addEventListener(
  'touchend',
  (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  },
  { passive: true },
);

window.addEventListener('hashchange', () => {
  const index = indexFromHash();
  if (index >= 0) select(index);
});

render();
