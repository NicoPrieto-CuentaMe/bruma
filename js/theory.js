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

export const midiToFreq = (midi) => 440 * 2 ** ((midi - 69) / 12);
