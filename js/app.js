// Interfaz de Bruma: dos vistas (lectura y atril), la barra de reproducción con sus dos capas,
// los ajustes, el índice y la entrada MIDI.

import { PROGRESSIONS } from './progressions.js';
import { parseNote, noteName, scale, colorTones } from './theory.js';
import { octaveSvg } from './keyboard.js';
import { createEngine, GROOVES } from './audio.js';

const byId = (id) => document.getElementById(id);
const els = {
  page: byId('page'),
  lectura: byId('lectura'),
  heading: byId('heading'),
  prev: byId('prev'),
  next: byId('next'),
  catalog: byId('catalog'),
  title: byId('title'),
  reference: byId('reference'),
  meta: byId('meta'),
  description: byId('description'),
  octaves: byId('octaves'),
  openIndex: byId('open-index'),
  toAtril: byId('to-atril'),

  atril: byId('atril'),
  atrilGrid: byId('atril-grid'),
  atrilPrev: byId('atril-prev'),
  atrilNext: byId('atril-next'),
  atrilCatalog: byId('atril-catalog'),
  atrilName: byId('atril-name'),
  atrilReference: byId('atril-reference'),
  atrilKey: byId('atril-key'),
  atrilIndex: byId('atril-index'),
  aboutTitle: byId('sobre-titulo'),
  aboutMeta: byId('sobre-meta'),
  aboutText: byId('sobre-texto'),
  toLectura: byId('to-lectura'),
  countIn: byId('count-in'),

  index: byId('index'),
  indexList: byId('index-list'),
  indexCount: byId('index-count'),
  closeIndex: byId('close-index'),
  random: byId('random'),

  transport: byId('transport'),
  play: byId('play'),
  fondo: byId('layer-fondo'),
  arpegio: byId('layer-arpegio'),
  groove: byId('groove'),
  grooveName: byId('groove-name'),
  hold: byId('hold'),
  tempo: byId('tempo'),
  bpm: byId('bpm'),

  volFondo: byId('vol-fondo'),
  volArpegio: byId('vol-arpegio'),
  lengths: document.querySelectorAll('[data-length]'),
  countInToggle: byId('count-in-toggle'),
  tuning: byId('tuning'),
  tuningValue: byId('tuning-value'),
  tuningReset: byId('tuning-reset'),
  notation: document.querySelectorAll('[data-notation]'),
  midiConnect: byId('midi-connect'),
  midiStatus: byId('midi-status'),
};

// Alturas MIDI, ortografía y notas de color de cada acorde, calculadas una sola vez.
for (const prog of PROGRESSIONS) {
  const keyScale = prog.key ? scale(prog.key[0], prog.key[1]) : [];
  for (const chord of prog.chords) {
    const notes = chord.voicing.split(' ').map(parseNote);
    chord.midi = notes.map((n) => n.midi);
    chord.spellings = notes.map((n) => n.spelling);
    chord.rootPc = parseNote(chord.root).pc;
    chord.byPc = new Map();
    for (const n of notes) if (!chord.byPc.has(n.pc)) chord.byPc.set(n.pc, n.spelling);
    chord.colors = colorTones([...chord.byPc.values()], keyScale);
  }
}

// --- Ajustes guardados ---------------------------------------------------------

// localStorage puede no estar disponible (modo privado, almacenamiento bloqueado):
// entonces los ajustes duran solo esta visita.
const DEFAULTS = {
  version: 2,
  notation: 'letters',
  view: 'atril',
  fondo: 100,
  arpegio: 100,
  length: 1,
  countIn: true,
  tuning: 440,
  ritmo: 'pulso',
  midi: false,
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('bruma.ajustes') || '{}');
    // La primera versión guardaba solo la notación, con otra clave.
    if (!saved.notation && localStorage.getItem('bruma.notation') === 'solfege') saved.notation = 'solfege';
    return saved;
  } catch {
    return {};
  }
}

const saved = loadSettings();
const settings = { ...DEFAULTS, ...saved };
// Antes la app se abría en la vista de lectura; desde la versión 2 se abre en el atril,
// donde caben todos los acordes. Quien tuviera guardada la lectura pasa al atril una vez.
if (saved.version !== DEFAULTS.version) {
  settings.version = DEFAULTS.version;
  settings.view = 'atril';
}
if (![0.5, 1, 2].includes(settings.length)) settings.length = 1;
if (!GROOVES[settings.ritmo]) settings.ritmo = DEFAULTS.ritmo;
settings.tuning = Math.min(450, Math.max(430, Number(settings.tuning) || 440));

function saveSettings() {
  try {
    localStorage.setItem('bruma.ajustes', JSON.stringify(settings));
  } catch {
    // sin almacenamiento no se recuerdan
  }
}

// --- Estado ----------------------------------------------------------------------

const indexFromHash = () => PROGRESSIONS.findIndex((p) => p.id === decodeURIComponent(location.hash.slice(1)));

const state = {
  index: Math.max(0, indexFromHash()),
  bpm: 0,
  current: -1, // acorde que está sonando (-1: ninguno)
  focus: 0, // acorde en el que se marcan las teclas MIDI cuando no suena nada
  chordAt: 0, // instante (performance.now) en que empezó el acorde actual
  chordDuration: 0,
};
state.bpm = PROGRESSIONS[state.index].bpm;

const current = () => PROGRESSIONS[state.index];
const wrap = (i) => (i + PROGRESSIONS.length) % PROGRESSIONS.length;
const atrilOn = () => settings.view === 'atril';
const cards = () => [...(atrilOn() ? els.atrilGrid : els.octaves).children];

let ctx = null;
let engine = null;

// Vuelve a lanzar una animación CSS.
function replay(el, className = 'enter') {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function span(className, text = '') {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

const keyLabel = (prog) => (prog.key ? `${noteName(prog.key[0], settings.notation)} ${prog.key[1]}` : prog.keyText);

// --- Acordes ---------------------------------------------------------------------

function chordParts(chord) {
  const name = (spelling) => noteName(spelling, settings.notation);
  // La «m» de menor va en línea con la fundamental; el resto del cifrado, volado.
  const minor = /^m(?!aj)/.test(chord.quality) ? 'm' : '';
  const parts = {
    root: name(chord.root),
    minor,
    quality: chord.quality.slice(minor.length),
    bass: chord.bass ? `/${name(chord.bass)}` : '',
    notes: chord.spellings.map(name),
    labels: new Map([...chord.byPc].map(([pc, spelling]) => [pc, name(spelling)])),
    colors: new Map([...chord.colors].map(([pc, spelling]) => [pc, name(spelling)])),
  };
  parts.symbol = parts.root + parts.minor + parts.quality + parts.bass;
  return parts;
}

function chordName(parts) {
  const el = span('chord-name');
  el.append(
    span('chord-root', parts.root),
    span('chord-minor', parts.minor),
    span('chord-quality', parts.quality),
    span('chord-bass', parts.bass),
  );
  return el;
}

function progressBar() {
  const bar = span('progress');
  bar.setAttribute('aria-hidden', 'true');
  return bar;
}

// Fila de la vista de lectura: cifrado a la izquierda y la octava a la derecha.
function lecturaItem(chord, i) {
  const parts = chordParts(chord);
  const item = document.createElement('li');
  item.className = 'octave';
  item.style.setProperty('--i', i);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'octave-button';
  button.setAttribute('aria-label', `Escuchar ${parts.symbol}: ${parts.notes.join(', ')}`);
  const info = span('chord');
  info.append(chordName(parts), span('roman', chord.roman), span('voicing', parts.notes.join(' · ')));
  button.append(info, octaveSvg({ labels: parts.labels, root: chord.rootPc }));
  button.addEventListener('click', () => audition(i));
  item.append(button, progressBar());
  return item;
}

// Tarjeta del atril: además de las notas del acorde, las de color para improvisar.
function atrilCard(chord, i) {
  const parts = chordParts(chord);
  const item = document.createElement('li');
  item.className = 'card';
  item.style.setProperty('--i', i);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'card-button';
  const colors = [...parts.colors.values()];
  button.setAttribute(
    'aria-label',
    `Escuchar ${parts.symbol}: ${parts.notes.join(', ')}${colors.length ? `. Notas de color: ${colors.join(', ')}` : ''}`,
  );
  const top = span('card-top');
  top.append(span('badge'), span('card-beat'));
  const sub = span('card-sub');
  sub.append(span('roman', chord.roman), span('voicing', parts.notes.join(' · ')));
  button.append(top, chordName(parts), sub, octaveSvg({ labels: parts.labels, root: chord.rootPc, colors: parts.colors }));
  button.addEventListener('click', () => audition(i));
  const countdown = span('countdown');
  countdown.setAttribute('aria-hidden', 'true');
  item.append(button, countdown, progressBar());
  return item;
}

// Elige el número de columnas que deja las octavas más grandes en el espacio disponible.
function layoutAtril() {
  const n = current().chords.length;
  const { width, height } = els.atrilGrid.getBoundingClientRect();
  if (!width || !height) return;
  const gap = 14;
  let best = 1;
  let bestWidth = 0;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cardW = (width - gap * (cols - 1)) / cols;
    const cardH = (height - gap * (rows - 1)) / rows;
    // Lo que ocupa la cabecera de la tarjeta (insignia, cifrado y notas); en tarjetas
    // bajas la línea de notas se esconde (ver el @container del CSS).
    const header = cardH < 230 ? 66 : 100;
    const keys = Math.min(cardW - 32, (cardH - header) * (700 / 220));
    if (keys > bestWidth) {
      bestWidth = keys;
      best = cols;
    }
  }
  els.atrilGrid.style.setProperty('--cols', best);
}

function render({ animate = true } = {}) {
  const prog = current();
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--accent-light', prog.accent.light);
  rootStyle.setProperty('--accent-dark', prog.accent.dark);
  document.title = `${prog.title} · Bruma`;
  const number = String(state.index + 1).padStart(3, '0');
  const reference = prog.reference ? `a la manera de ${prog.reference}` : 'tema de apertura';
  const prevTitle = PROGRESSIONS[wrap(state.index - 1)].title;
  const nextTitle = PROGRESSIONS[wrap(state.index + 1)].title;

  if (atrilOn()) {
    els.atrilCatalog.textContent = `BRM ${number}`;
    els.atrilName.textContent = prog.title;
    els.atrilReference.textContent = reference;
    els.atrilKey.textContent = keyLabel(prog);
    els.atrilPrev.setAttribute('aria-label', `Anterior: ${prevTitle}`);
    els.atrilNext.setAttribute('aria-label', `Siguiente: ${nextTitle}`);
    els.aboutTitle.textContent = `${prog.title}, ${reference}`;
    els.aboutMeta.textContent = [keyLabel(prog), prog.sound, prog.texture].join(' · ');
    els.aboutText.textContent = prog.description;
    els.atrilGrid.replaceChildren(...prog.chords.map(atrilCard));
    layoutAtril();
  } else {
    els.catalog.textContent = `BRM ${number}   ${state.index + 1} / ${PROGRESSIONS.length}`;
    els.title.textContent = prog.title;
    if (prog.reference) {
      els.reference.replaceChildren('a la manera de ', span('artist', prog.reference));
    } else {
      els.reference.textContent = reference;
    }
    els.meta.replaceChildren(...[keyLabel(prog), prog.sound, prog.texture].map((text) => span('', text)));
    els.description.textContent = prog.description;
    els.prev.setAttribute('aria-label', `Anterior: ${prevTitle}`);
    els.next.setAttribute('aria-label', `Siguiente: ${nextTitle}`);
    els.octaves.replaceChildren(...prog.chords.map(lecturaItem));
    if (animate) [els.heading, els.meta, els.description].forEach((el) => replay(el));
  }

  els.tempo.value = state.bpm;
  els.bpm.textContent = `${state.bpm} bpm`;
  paintCurrent();
  showHeld();
}

// Marca el acorde que suena y, en el atril, el siguiente. Con `restart` vuelve a lanzar la
// barra de progreso desde cero (un acorde nuevo); si no, la retoma por donde iba.
function paintCurrent(restart = false) {
  const list = cards();
  const playing = state.current >= 0 && list.length > 0;
  const holding = engine?.hold && engine.state === 'playing';
  const next = playing ? (holding ? state.current : (state.current + 1) % list.length) : -1;
  const elapsed = restart ? 0 : (performance.now() - state.chordAt) / 1000;
  list.forEach((item, i) => {
    const isCurrent = i === state.current;
    item.classList.toggle('is-next', atrilOn() && i === next && !isCurrent);
    const badge = item.querySelector('.badge');
    if (badge) badge.textContent = isCurrent ? (holding ? 'ahora · se repite' : 'ahora') : i === next ? 'siguiente' : '';
    const countdown = item.querySelector('.countdown');
    if (countdown) countdown.textContent = '';
    const beat = item.querySelector('.card-beat');
    if (beat && !isCurrent) beat.textContent = '';
    if (!isCurrent) {
      item.classList.remove('is-current');
      return;
    }
    item.style.setProperty('--duration', `${state.chordDuration}s`);
    item.style.setProperty('--elapsed', `${Math.max(0, elapsed)}s`);
    if (restart || !item.classList.contains('is-current')) replay(item, 'is-current');
  });
}

// --- Sonido ----------------------------------------------------------------------

const volume = (percent) => (percent / 100) ** 2; // el oído percibe mejor una curva que una recta

function applySettings() {
  if (!engine) return;
  engine.setLayer('fondo', { volume: volume(settings.fondo) });
  engine.setLayer('arpegio', { volume: volume(settings.arpegio) });
  engine.length = settings.length;
  engine.tuning = settings.tuning;
  engine.groove = settings.ritmo;
}

// Ritmo del fondo: cada pulsación pasa al siguiente estilo. Se aplica desde el siguiente acorde.
const GROOVE_ORDER = Object.keys(GROOVES);

function cycleGroove() {
  const next = GROOVE_ORDER[(GROOVE_ORDER.indexOf(settings.ritmo) + 1) % GROOVE_ORDER.length];
  changeSetting('ritmo', next);
}

function updateGroove() {
  els.grooveName.textContent = settings.ritmo;
  const description = `Ritmo del fondo: ${settings.ritmo}, ${GROOVES[settings.ritmo].label}. Pulsa para cambiarlo (R).`;
  els.groove.setAttribute('aria-label', description);
  els.groove.title = description;
}

// El contexto de audio solo puede nacer de un gesto de la persona (clic o tecla).
async function audio() {
  if (!ctx) {
    // En iPhone, que suene aunque el interruptor de silencio esté activado.
    if ('audioSession' in navigator) navigator.audioSession.type = 'playback';
    ctx = new AudioContext({ latencyHint: 'playback' });
    engine = createEngine(ctx);
    engine.onchange = onEngineState;
    applySettings();
    requestAnimationFrame(frame);
  }
  if (ctx.state !== 'running') await ctx.resume();
  return engine;
}

const isPlaying = () => engine?.state === 'playing';
const layerOn = (name) => isPlaying() && engine.layers[name].on;
const countInBeats = () => (settings.countIn ? (current().texture === 'vals' ? 3 : 4) : 0);

// Las dos capas comparten reloj: encender una con la otra sonando la suma a tiempo.
async function setLayers(fondo, arpegio) {
  const e = await audio();
  e.setLayer('fondo', { on: fondo });
  e.setLayer('arpegio', { on: arpegio });
  if (!fondo && !arpegio) e.stop();
  else if (e.state !== 'playing') e.play(current(), { bpm: state.bpm, countIn: countInBeats() });
  updateTransport();
}

const togglePlay = () => (isPlaying() ? setLayers(false, false) : setLayers(true, true));

function toggleLayer(name) {
  const on = { fondo: layerOn('fondo'), arpegio: layerOn('arpegio') };
  on[name] = !on[name];
  return setLayers(on.fondo, on.arpegio);
}

async function toggleHold() {
  const e = await audio();
  e.setHold(!e.hold);
  updateTransport();
  paintCurrent();
}

// Tocar un acorde: si la progresión está sonando salta a él; si no, lo hace sonar una vez.
async function audition(index) {
  const e = await audio();
  state.focus = index;
  e.play(current(), { from: index, bpm: state.bpm, once: e.state !== 'playing' });
  showHeld();
}

function updateTransport() {
  const playing = isPlaying();
  els.play.setAttribute('aria-pressed', String(playing));
  els.play.setAttribute('aria-label', playing ? 'Detener' : 'Reproducir fondo y arpegio');
  els.fondo.setAttribute('aria-pressed', String(layerOn('fondo')));
  els.arpegio.setAttribute('aria-pressed', String(layerOn('arpegio')));
  els.hold.setAttribute('aria-pressed', String(Boolean(engine?.hold)));
}

function onEngineState(next) {
  if (next === 'stopped') {
    state.current = -1;
    els.countIn.hidden = true;
    paintCurrent();
    showHeld();
    keepAwake(false);
  } else if (next === 'playing') {
    keepAwake(true);
  }
  updateTransport();
}

const struckTimers = new WeakMap();

function strike(index, pc) {
  const item = cards()[index];
  if (!item) return;
  for (const key of item.querySelectorAll(`.key[data-pc="${pc}"]`)) {
    key.classList.add('struck');
    clearTimeout(struckTimers.get(key));
    struckTimers.set(key, setTimeout(() => key.classList.remove('struck'), 160));
  }
}

function onChord({ index, duration }) {
  els.countIn.hidden = true;
  state.current = index;
  state.focus = index;
  state.chordAt = performance.now();
  state.chordDuration = duration;
  paintCurrent(true);
  showHeld();
}

// Pulso a pulso: el contador del acorde actual y la cuenta atrás en el siguiente.
function onBeat({ index, beat, beats }) {
  if (index !== state.current) return;
  const list = cards();
  const beatEl = list[index]?.querySelector('.card-beat');
  if (beatEl) {
    beatEl.textContent = `${beat + 1} / ${beats}`;
    replay(beatEl, 'tick'); // un destello en cada pulso, para verlo además de oírlo
  }
  if (engine.hold) return;
  const countdown = list[(index + 1) % list.length]?.querySelector('.countdown');
  if (countdown) countdown.textContent = beats - beat <= 4 ? String(beats - beat) : '';
}

function onCount(n) {
  els.countIn.textContent = n;
  els.countIn.hidden = false;
  replay(els.countIn, 'pop');
}

// Sincroniza la imagen con el sonido: cada aviso llega cuando la nota sale por los altavoces.
function frame() {
  for (const event of engine.poll()) {
    if (event.type === 'chord') onChord(event);
    else if (event.type === 'beat') onBeat(event);
    else if (event.type === 'count') onCount(event.n);
    else strike(event.index, event.pc);
  }
  requestAnimationFrame(frame);
}

// --- Pantalla encendida -----------------------------------------------------------

let wakeLock = null;

async function keepAwake(on) {
  if (!('wakeLock' in navigator)) return;
  try {
    if (on && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    // El navegador puede negarlo (batería baja, pestaña oculta): la música sigue igual.
  }
}

// El navegador suelta el bloqueo al ocultar la pestaña; al volver, se pide otra vez.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isPlaying()) keepAwake(true);
});

// --- MIDI ------------------------------------------------------------------------

const held = new Set(); // notas MIDI pulsadas ahora mismo en el piano
let midiAccess = null;

// Marca las teclas pulsadas en la octava del acorde que suena (o del último que se tocó).
function showHeld() {
  for (const key of document.querySelectorAll('.key.pressed')) key.classList.remove('pressed');
  if (!held.size) return;
  const item = cards()[state.current >= 0 ? state.current : state.focus];
  if (!item) return;
  for (const pc of new Set([...held].map((n) => n % 12))) {
    for (const key of item.querySelectorAll(`.key[data-pc="${pc}"]`)) key.classList.add('pressed');
  }
}

function onMidiMessage({ data }) {
  const [status, note, velocity] = data;
  const type = status & 0xf0;
  if (type === 0x90 && velocity > 0) held.add(note);
  else if (type === 0x80 || type === 0x90) held.delete(note);
  else return;
  showHeld();
}

function bindMidiInputs() {
  const names = [];
  for (const input of midiAccess.inputs.values()) {
    input.onmidimessage = onMidiMessage;
    names.push(input.name);
  }
  els.midiStatus.textContent = names.length
    ? `Conectado: ${names.join(', ')}.`
    : 'No encuentro ningún piano. Conéctalo por USB y enciéndelo.';
  els.midiConnect.textContent = names.length ? 'Conectado' : 'Reintentar';
}

async function connectMidi() {
  if (!navigator.requestMIDIAccess) {
    els.midiStatus.textContent = 'Este navegador no admite MIDI. Usa Chrome o Edge.';
    return;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess();
  } catch {
    els.midiStatus.textContent = 'El navegador no dio permiso para usar MIDI.';
    return;
  }
  midiAccess.onstatechange = bindMidiInputs;
  bindMidiInputs();
  settings.midi = true;
  saveSettings();
}

// Si ya se dio permiso en otra visita, se conecta solo, sin preguntar.
async function reconnectMidi() {
  try {
    const permission = await navigator.permissions.query({ name: 'midi' });
    if (permission.state === 'granted') connectMidi();
  } catch {
    // El navegador no sabe consultar ese permiso: hará falta pulsar «Conectar».
  }
}

// --- Navegación ------------------------------------------------------------------

function select(index) {
  if (index === state.index) return;
  state.index = index;
  state.bpm = current().bpm;
  state.current = -1;
  state.focus = 0;
  history.replaceState(null, '', `#${current().id}`);
  render();
  if (isPlaying()) engine.play(current(), { bpm: state.bpm });
  else if (engine?.state === 'audition') engine.stop();
}

const step = (delta) => select(wrap(state.index + delta));

function setView(view) {
  settings.view = view;
  saveSettings();
  document.body.classList.toggle('atril-mode', view === 'atril');
  els.atril.hidden = view !== 'atril';
  els.page.hidden = view === 'atril';
  window.scrollTo(0, 0);
  render({ animate: false });
}

// --- Índice ----------------------------------------------------------------------

// Una entrada por progresión, con su número de catálogo, su referente y su color.
PROGRESSIONS.forEach((prog, i) => {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'index-item';
  button.style.setProperty('--swatch-light', prog.accent.light);
  button.style.setProperty('--swatch-dark', prog.accent.dark);
  const text = span('index-text');
  text.append(span('index-title', prog.title), span('index-ref', prog.reference ?? 'tema de apertura'));
  const swatch = span('index-swatch');
  swatch.setAttribute('aria-hidden', 'true');
  button.append(span('index-number', String(i + 1).padStart(3, '0')), text, swatch);
  button.addEventListener('click', () => {
    els.index.close();
    select(i);
  });
  item.append(button);
  els.indexList.append(item);
});
els.indexCount.textContent = `${PROGRESSIONS.length} progresiones`;

function openIndex() {
  const buttons = [...els.indexList.querySelectorAll('.index-item')];
  buttons.forEach((button, i) => {
    if (i === state.index) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
  els.index.showModal();
  buttons[state.index].focus({ preventScroll: true });
  buttons[state.index].scrollIntoView({ block: 'center' });
}

els.openIndex.addEventListener('click', openIndex);
els.atrilIndex.addEventListener('click', openIndex);
els.closeIndex.addEventListener('click', () => els.index.close());
// Un clic fuera del panel (en el fondo) lo cierra.
els.index.addEventListener('click', (e) => {
  if (e.target === els.index) els.index.close();
});
els.random.addEventListener('click', () => {
  const others = PROGRESSIONS.map((_, i) => i).filter((i) => i !== state.index);
  els.index.close();
  select(others[Math.floor(Math.random() * others.length)]);
});

// --- Controles -------------------------------------------------------------------

els.prev.addEventListener('click', () => step(-1));
els.next.addEventListener('click', () => step(1));
els.atrilPrev.addEventListener('click', () => step(-1));
els.atrilNext.addEventListener('click', () => step(1));
els.toAtril.addEventListener('click', () => setView('atril'));
els.toLectura.addEventListener('click', () => setView('lectura'));

els.play.addEventListener('click', togglePlay);
els.fondo.addEventListener('click', () => toggleLayer('fondo'));
els.arpegio.addEventListener('click', () => toggleLayer('arpegio'));
els.hold.addEventListener('click', toggleHold);
els.groove.addEventListener('click', cycleGroove);

els.tempo.addEventListener('input', () => {
  state.bpm = Number(els.tempo.value);
  els.bpm.textContent = `${state.bpm} bpm`;
  engine?.setBpm(state.bpm);
});

function updateSettingsUI() {
  els.volFondo.value = settings.fondo;
  els.volArpegio.value = settings.arpegio;
  els.lengths.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.length) === settings.length)));
  els.countInToggle.checked = settings.countIn;
  els.tuning.value = settings.tuning;
  els.tuningValue.textContent = `La = ${String(settings.tuning).replace('.', ',')} Hz`;
  els.notation.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.notation === settings.notation)));
  updateGroove();
}

function changeSetting(key, value) {
  settings[key] = value;
  saveSettings();
  updateSettingsUI();
  applySettings();
}

els.volFondo.addEventListener('input', () => changeSetting('fondo', Number(els.volFondo.value)));
els.volArpegio.addEventListener('input', () => changeSetting('arpegio', Number(els.volArpegio.value)));
els.lengths.forEach((button) =>
  button.addEventListener('click', () => changeSetting('length', Number(button.dataset.length))),
);
els.countInToggle.addEventListener('change', () => changeSetting('countIn', els.countInToggle.checked));
els.tuning.addEventListener('input', () => changeSetting('tuning', Number(els.tuning.value)));
els.tuningReset.addEventListener('click', () => changeSetting('tuning', 440));
els.notation.forEach((button) =>
  button.addEventListener('click', () => {
    if (button.dataset.notation === settings.notation) return;
    changeSetting('notation', button.dataset.notation);
    render({ animate: false });
  }),
);
els.midiConnect.addEventListener('click', connectMidi);

document.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.repeat || els.index.open) return;
  if (e.target instanceof Element && e.target.closest('#ajustes')) return; // las teclas son de los controles
  const onSlider = e.target === els.tempo;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key === 'ArrowLeft' && !onSlider) {
    e.preventDefault();
    step(-1);
  } else if (key === 'ArrowRight' && !onSlider) {
    e.preventDefault();
    step(1);
  } else if (key === ' ' && !(e.target instanceof HTMLButtonElement)) {
    e.preventDefault();
    togglePlay();
  } else if (/^[1-9]$/.test(key) && Number(key) <= current().chords.length) {
    audition(Number(key) - 1);
  } else if (key === 'f') {
    toggleLayer('fondo');
  } else if (key === 'a') {
    toggleLayer('arpegio');
  } else if (key === 'm') {
    toggleHold();
  } else if (key === 'r') {
    cycleGroove();
  } else if (key === 'v') {
    setView(atrilOn() ? 'lectura' : 'atril');
  } else if (key === 'i') {
    e.preventDefault();
    openIndex();
  }
});

// Deslizar hacia los lados en una pantalla táctil cambia de progresión.
for (const area of [els.lectura, els.atrilGrid]) {
  let touchStart = null;
  area.addEventListener(
    'touchstart',
    (e) => {
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    },
    { passive: true },
  );
  area.addEventListener(
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
}

window.addEventListener('hashchange', () => {
  const index = indexFromHash();
  if (index >= 0) select(index);
});

// El atril ocupa la pantalla menos la barra de reproducción, que cambia de alto con el ancho.
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--transport-h', `${els.transport.offsetHeight}px`);
  if (atrilOn()) layoutAtril();
}).observe(els.transport);
new ResizeObserver(() => {
  if (atrilOn()) layoutAtril();
}).observe(els.atrilGrid);

updateSettingsUI();
document.body.classList.toggle('atril-mode', atrilOn());
els.atril.hidden = !atrilOn();
els.page.hidden = atrilOn();
render();
if (settings.midi) reconnectMidi();
