// Nombres, alturas y frecuencias de las notas.

const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SOLFEGE = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
const ACCIDENTAL = { '': '', b: '♭', bb: '𝄫', '#': '♯', '##': '𝄪' };

const NOTE_RE = /^([A-G])(bb|b|##|#)?(-?\d+)?$/;

// "Eb4" → { letter: 'E', acc: 'b', pc: 3, midi: 63, spelling: 'Eb' }
// Sin octava ("Eb") devuelve midi: null.
export function parseNote(text) {
  const match = NOTE_RE.exec(text);
  if (!match) throw new Error(`Nota no válida: «${text}»`);
  const [, letter, acc = '', octave] = match;
  const shift = acc.startsWith('b') ? -acc.length : acc.length;
  const semitone = LETTER_PC[letter] + shift;
  return {
    letter,
    acc,
    pc: (semitone + 12) % 12,
    midi: octave === undefined ? null : (Number(octave) + 1) * 12 + semitone,
    spelling: letter + acc,
  };
}

// "Eb" → "E♭" o "Mi♭", según la notación elegida.
export function noteName(spelling, notation = 'letters') {
  const { letter, acc } = parseNote(spelling);
  return (notation === 'solfege' ? SOLFEGE[letter] : letter) + ACCIDENTAL[acc];
}

// a4 es la afinación: la frecuencia del La central.
export const midiToFreq = (midi, a4 = 440) => a4 * 2 ** ((midi - 69) / 12);

const LETTERS = 'CDEFGAB';
const MODES = {
  mayor: [0, 2, 4, 5, 7, 9, 11],
  menor: [0, 2, 3, 5, 7, 8, 10],
  dórico: [0, 2, 3, 5, 7, 9, 10],
  mixolidio: [0, 2, 4, 5, 7, 9, 10],
  pentatónica: [0, 2, 4, 7, 9],
};
// Cuántas letras avanza cada grado: la pentatónica salta el cuarto y el séptimo.
const LETTER_STEPS = { pentatónica: [0, 1, 2, 4, 5] };

// Escala escrita: scale('Ab', 'mayor') → ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'].
export function scale(tonic, mode) {
  const semitones = MODES[mode];
  if (!semitones) return [];
  const { letter, pc } = parseNote(tonic);
  const steps = LETTER_STEPS[mode] ?? [0, 1, 2, 3, 4, 5, 6];
  return semitones.map((semi, i) => {
    const name = LETTERS[(LETTERS.indexOf(letter) + steps[i]) % 7];
    const shift = ((((pc + semi - LETTER_PC[name]) % 12) + 18) % 12) - 6;
    return name + (shift < 0 ? 'b'.repeat(-shift) : '#'.repeat(shift));
  });
}

// Notas de color para improvisar sobre un acorde: las de la escala que no son del acorde.
// Si el acorde altera una nota de la escala (trae Sol♭ en La♭ mayor), la escala la adopta;
// y se descartan las que quedan medio tono por encima de una nota del acorde, que chocan
// (la «nota a evitar»: Fa sobre Do mayor, por ejemplo).
// Devuelve un Map de clase de nota → ortografía.
export function colorTones(chordSpellings, keyScale) {
  const colors = new Map();
  if (!keyScale.length) return colors;
  const byLetter = new Map(keyScale.map((s) => [s[0], s]));
  for (const s of chordSpellings) byLetter.set(s[0], s);
  const chordPcs = new Set(chordSpellings.map((s) => parseNote(s).pc));
  for (const spelling of byLetter.values()) {
    const { pc } = parseNote(spelling);
    if (chordPcs.has(pc) || chordPcs.has((pc + 11) % 12)) continue;
    colors.set(pc, spelling);
  }
  return colors;
}
