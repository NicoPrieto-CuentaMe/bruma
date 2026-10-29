// Progresiones de Bruma.
//
// Cada acorde se escribe como fundamental + cualidad (+ bajo si es un acorde con barra)
// y con su disposición concreta en el piano, de grave a agudo, en notación científica
// (Do central = C4). La octava dibujada resalta las clases de nota de esa disposición.
//
// Sonido:
//   instrument  'piano' (piano de fieltro) o 'rhodes' (piano eléctrico)
//   texture     'florecer' | 'gotas' | 'arpegio' | 'pulso' | 'deriva'  (ver audio.js)
//   bpm, beats  tempo inicial y pulsos que dura cada acorde
//   pad         0–1, nivel del colchón sostenido bajo el instrumento
//   bright      brillo del piano (1 = normal)
//   space       envío a reverberación y a eco, 0–1
//   gain        ajuste de volumen en dB para que todas las progresiones suenen parecido

export const PROGRESSIONS = [
  {
    id: 'bruma',
    title: 'Bruma',
    reference: null,
    key: ['Ab', 'mayor'],
    sound: 'piano de fieltro y pad',
    description:
      'Empieza en el IV y nunca se apoya del todo en la tónica: La♭ aparece con Do en el bajo y el ciclo termina en un ♭VII prestado, Sol♭ con ♯11. La frase queda suspendida, como niebla que no termina de levantarse.',
    accent: { light: '#5c7186', dark: '#a3b6c9' },
    instrument: 'piano',
    texture: 'florecer',
    bpm: 60,
    beats: 8,
    pad: 0.7,
    bright: 1,
    space: { reverb: 0.5, delay: 0.12 },
    gain: 2,
    chords: [
      { root: 'Db', quality: 'maj9', roman: 'IVmaj9', voicing: 'Db2 Ab2 F3 C4 Eb4' },
      { root: 'Ab', quality: '(add9)', bass: 'C', roman: 'I(add9)', voicing: 'C2 Ab2 Eb3 Bb3 Eb4' },
      { root: 'Bb', quality: 'm9', roman: 'ii9', voicing: 'Bb1 F2 Db3 Ab3 C4' },
      { root: 'Gb', quality: 'maj7(♯11)', roman: '♭VIImaj7(♯11)', voicing: 'Gb2 Db3 F3 Bb3 C4' },
    ],
  },
  {
    id: 'fieltro',
    title: 'Fieltro',
    reference: 'Nils Frahm',
    key: ['D', 'menor'],
    sound: 'piano de fieltro',
    description:
      'Ciclo eólico i–VI–III–VII. Casi todos los acordes llevan dos notas a medio tono (Mi–Fa, La–Si♭): en un piano con fieltro ese roce suena a respiración, no a choque.',
    accent: { light: '#86664f', dark: '#c9a98f' },
    instrument: 'piano',
    texture: 'florecer',
    bpm: 66,
    beats: 8,
    pad: 0,
    bright: 0.8,
    space: { reverb: 0.32, delay: 0 },
    gain: 6,
    chords: [
      { root: 'D', quality: 'm(add9)', roman: 'i(add9)', voicing: 'D2 A2 E3 F3 A3' },
      { root: 'Bb', quality: 'maj7', roman: 'VImaj7', voicing: 'Bb1 F2 D3 A3 Bb3' },
      { root: 'F', quality: 'maj7', bass: 'A', roman: 'IIImaj7', voicing: 'A1 F2 C3 E3 F3' },
      { root: 'C', quality: 'sus2', roman: 'VIIsus2', voicing: 'C2 G2 D3 G3' },
    ],
  },
  {
    id: 'marea',
    title: 'Marea',
    reference: 'Ólafur Arnalds',
    key: ['Eb', 'mayor'],
    sound: 'piano de fieltro y cuerdas',
    description:
      'I–iii–vi–IV, sin dominante. Cada acorde comparte notas con el siguiente, así que la armonía no avanza a pasos: sube y baja como la marea. Debajo, unas cuerdas sostienen el acorde mientras el piano florece.',
    accent: { light: '#4b7772', dark: '#93bdb6' },
    instrument: 'piano',
    texture: 'florecer',
    bpm: 58,
    beats: 8,
    pad: 1,
    bright: 0.9,
    space: { reverb: 0.45, delay: 0 },
    gain: 1,
    chords: [
      { root: 'Eb', quality: '(add9)', roman: 'I(add9)', voicing: 'Eb2 Bb2 F3 G3 Bb3' },
      { root: 'G', quality: 'm7', roman: 'iii7', voicing: 'G2 D3 F3 Bb3' },
      { root: 'C', quality: 'm(add9)', roman: 'vi(add9)', voicing: 'C2 G2 D3 Eb3 G3' },
      { root: 'Ab', quality: 'maj9', roman: 'IVmaj9', voicing: 'Ab1 Eb2 C3 G3 Bb3' },
    ],
  },
  {
    id: 'postal',
    title: 'Postal',
    reference: 'Hiroshi Yoshimura',
    key: ['C', 'mayor'],
    sound: 'piano eléctrico y sintetizador',
    description:
      'Cuatro acordes de séptima que bajan por grados conjuntos hasta la tónica. Las notas caen sueltas, con aire entre ellas: música ambiental en el sentido japonés, kankyo ongaku, pensada para habitar un lugar más que para escucharla de frente.',
    accent: { light: '#9a6359', dark: '#dba79c' },
    instrument: 'rhodes',
    texture: 'gotas',
    bpm: 72,
    beats: 8,
    pad: 0.5,
    bright: 1,
    space: { reverb: 0.42, delay: 0.18 },
    gain: -1.5,
    chords: [
      { root: 'F', quality: 'maj7', roman: 'IVmaj7', voicing: 'F2 C3 E3 A3' },
      { root: 'E', quality: 'm7', roman: 'iii7', voicing: 'E2 B2 D3 G3' },
      { root: 'D', quality: 'm9', roman: 'ii9', voicing: 'D2 A2 C3 E3 F3' },
      { root: 'C', quality: 'maj9', roman: 'Imaj9', voicing: 'C2 G2 B2 D3 E3' },
    ],
  },
  {
    id: 'espiral',
    title: 'Espiral',
    reference: 'Philip Glass',
    key: ['A', 'menor'],
    sound: 'piano de fieltro',
    description:
      'Dos contra tres: la mano izquierda alterna bajo y quinta en corcheas mientras la derecha arpegia en tresillos. La armonía apenas cambia; lo que hipnotiza es la repetición.',
    accent: { light: '#85703a', dark: '#cfb67a' },
    instrument: 'piano',
    texture: 'arpegio',
    bpm: 84,
    beats: 8,
    pad: 0,
    bright: 1.05,
    space: { reverb: 0.28, delay: 0 },
    gain: 2.5,
    chords: [
      { root: 'A', quality: 'm', roman: 'i', voicing: 'A2 E3 A3 C4 E4' },
      { root: 'F', quality: '', roman: 'VI', voicing: 'F2 C3 A3 C4 F4' },
      { root: 'D', quality: 'm6', roman: 'iv6', voicing: 'D2 A2 B3 D4 F4' },
      { root: 'E', quality: '7sus4', roman: 'V7sus4', voicing: 'E2 B2 A3 D4 E4' },
    ],
  },
  {
    id: 'pulso',
    title: 'Pulso',
    reference: 'Steve Reich',
    key: ['D', 'mayor'],
    sound: 'piano',
    description:
      'Cada acorde se repite en pulsos de corchea que crecen y se apagan, como una respiración. El último, sin tercera, devuelve el ciclo al principio sin resolverlo.',
    accent: { light: '#94503f', dark: '#d8957f' },
    instrument: 'piano',
    texture: 'pulso',
    bpm: 96,
    beats: 8,
    pad: 0,
    bright: 1.3,
    space: { reverb: 0.3, delay: 0 },
    gain: 1,
    chords: [
      { root: 'B', quality: 'm7(add11)', roman: 'vi7(add11)', voicing: 'B2 F#3 A3 D4 E4' },
      { root: 'G', quality: '(add9)', roman: 'IV(add9)', voicing: 'G2 D3 A3 B3 D4' },
      { root: 'D', quality: '(add9)', bass: 'F#', roman: 'I(add9)', voicing: 'F#2 D3 A3 D4 E4' },
      { root: 'A', quality: 'sus4', roman: 'Vsus4', voicing: 'A2 E3 A3 D4 E4' },
    ],
  },
  {
    id: 'costa',
    title: 'Costa',
    reference: 'Gaussian Curve',
    key: ['G', 'mayor'],
    sound: 'piano eléctrico, ecos y pad',
    description:
      'Sube grado a grado por la escala de Sol hasta un IV lidio, Do con Fa♯. Piano eléctrico con trémolo, ecos y un pad cálido: ambient balear, para mirar el mar.',
    accent: { light: '#3f6f8c', dark: '#8dbad6' },
    instrument: 'rhodes',
    texture: 'deriva',
    bpm: 64,
    beats: 8,
    pad: 0.6,
    bright: 1,
    space: { reverb: 0.38, delay: 0.32 },
    gain: -2,
    chords: [
      { root: 'G', quality: 'maj9', roman: 'Imaj9', voicing: 'G2 D3 F#3 A3 B3' },
      { root: 'A', quality: 'm9', roman: 'ii9', voicing: 'A2 E3 G3 B3 C4' },
      { root: 'B', quality: 'm7', roman: 'iii7', voicing: 'B2 F#3 A3 D4' },
      { root: 'C', quality: 'maj7(♯11)', roman: 'IVmaj7(♯11)', voicing: 'C3 G3 B3 E4 F#4' },
    ],
  },
  {
    id: 'paralelo',
    title: 'Paralelo',
    reference: 'Arrangement',
    key: ['C', 'mayor'],
    sound: 'piano de fieltro, ecos y pad',
    description:
      'Las fundamentales bajan por semitonos (Fa, Mi, Mi♭, Re) y alternan un acorde lidio con uno menor de novena. Armonía de jazz convertida en textura, con ecos largos que se mezclan entre sí.',
    accent: { light: '#6a5f8e', dark: '#b2a8d6' },
    instrument: 'piano',
    texture: 'deriva',
    bpm: 56,
    beats: 8,
    pad: 0.55,
    bright: 0.9,
    space: { reverb: 0.5, delay: 0.4 },
    gain: 2,
    chords: [
      { root: 'F', quality: 'maj7(♯11)', roman: 'IVmaj7(♯11)', voicing: 'F2 C3 E3 A3 B3' },
      { root: 'E', quality: 'm9', roman: 'iii9', voicing: 'E2 B2 D3 F#3 G3' },
      { root: 'Eb', quality: 'maj7(♯11)', roman: '♭IIImaj7(♯11)', voicing: 'Eb2 Bb2 D3 G3 A3' },
      { root: 'D', quality: 'm9', roman: 'ii9', voicing: 'D2 A2 C3 E3 F3' },
    ],
  },
];
