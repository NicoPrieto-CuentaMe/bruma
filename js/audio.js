// Motor de sonido de Bruma. Todo se sintetiza en el navegador con Web Audio, sin muestras:
// cuatro instrumentos (piano de fieltro, piano eléctrico, marimba y campana) más un pad,
// texturas que deciden cuándo suena cada nota, y un bus con reverberación y eco.

import { midiToFreq } from './theory.js';

const LOOKAHEAD = 1.5; // segundos que se programan por adelantado
const TICK_MS = 200;
const MASTER_GAIN = 2.2;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const dbToGain = (db) => 10 ** (db / 20);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Cada textura convierte una disposición (alturas MIDI de grave a agudo) en golpes
// { beat, midi, vel } repartidos a lo largo de `beats` pulsos.
const TEXTURES = {
  // El acorde se abre despacio de grave a agudo; después, dos ecos una octava arriba.
  florecer(notes, beats) {
    const hits = notes.map((midi, i) => ({
      beat: i * 0.12 + Math.random() * 0.04,
      midi,
      vel: i === 0 ? 0.5 : 0.34 + Math.random() * 0.08,
    }));
    const high = notes.slice(1).map((m) => m + 12).filter((m) => m <= 88);
    if (high.length) {
      hits.push({ beat: beats * 0.5 + Math.random() * 0.3, midi: pick(high), vel: 0.2 });
      hits.push({ beat: beats * 0.75 + Math.random() * 0.3, midi: pick(high), vel: 0.15 });
    }
    return hits;
  },

  // Sobre el bajo caen notas sueltas del acorde, con aire entre ellas.
  gotas(notes, beats) {
    const [bass, ...rest] = notes;
    const pool = [...rest, ...rest.map((m) => m + 12)].filter((m) => m <= 88);
    const hits = [{ beat: 0, midi: bass, vel: 0.36 }];
    const drop = (beat) => {
      const last = hits[hits.length - 1].midi;
      const options = pool.length > 1 ? pool.filter((m) => m !== last) : pool;
      hits.push({ beat: beat + Math.random() * 0.12, midi: pick(options), vel: 0.2 + Math.random() * 0.16 });
    };
    for (let beat = 0.5; beat < beats - 0.5; beat += 0.5) {
      if (Math.random() < 0.34) drop(beat);
    }
    if (hits.length < 4) [1.5, 3.5, 5.5].filter((b) => b < beats).forEach(drop);
    return hits;
  },

  // Dos contra tres: la izquierda alterna bajo y quinta en corcheas, la derecha arpegia en tresillos.
  arpegio(notes, beats) {
    const [low, high, ...upper] = notes;
    const right = upper.length ? upper : [high + 12];
    const hits = [];
    for (let i = 0; i < beats * 2; i++) {
      hits.push({ beat: i / 2, midi: i % 2 ? high : low, vel: i % 8 === 0 ? 0.42 : 0.3 });
    }
    for (let i = 0; i < beats * 3; i++) {
      hits.push({ beat: i / 3, midi: right[i % right.length], vel: i % 3 === 0 ? 0.3 : 0.23 });
    }
    return hits;
  },

  // El acorde entero en corcheas, creciendo y apagándose como una respiración.
  pulso(notes, beats) {
    const count = beats * 2;
    const hits = [];
    for (let i = 0; i < count; i++) {
      const swell = Math.sin((Math.PI * (i + 0.5)) / count);
      notes.forEach((midi, j) => hits.push({ beat: i / 2 + j * 0.01, midi, vel: 0.06 + 0.3 * swell }));
    }
    return hits;
  },

  // La mano derecha repite una figura de corcheas sobre el bajo, que suena dos veces.
  ostinato(notes, beats) {
    const [bass, ...upper] = notes;
    const hits = [
      { beat: 0, midi: bass, vel: 0.42 },
      { beat: beats / 2, midi: bass, vel: 0.3 },
    ];
    if (!upper.length) return hits;
    const figure = upper.length > 2 ? [...upper, ...upper.slice(1, -1).reverse()] : upper;
    for (let i = 0; i < beats * 2; i++) {
      hits.push({ beat: i / 2, midi: figure[i % figure.length], vel: i % figure.length === 0 ? 0.3 : 0.22 });
    }
    return hits;
  },

  // Vals lento en tres por cuatro: el bajo en el primer tiempo y el acorde en el segundo.
  vals(notes, beats) {
    const [bass, ...upper] = notes;
    const hits = [];
    for (let bar = 0; bar * 3 < beats; bar++) {
      hits.push({ beat: bar * 3, midi: bass, vel: bar === 0 ? 0.42 : 0.34 });
      upper.forEach((midi, i) => hits.push({ beat: bar * 3 + 1 + i * 0.015, midi, vel: 0.25 }));
    }
    const high = upper.map((m) => m + 12).filter((m) => m <= 88);
    if (high.length && beats >= 6) hits.push({ beat: 5 + Math.random() * 0.2, midi: pick(high), vel: 0.2 });
    return hits;
  },

  // Tintinnabuli: las tres notas más agudas, una octava arriba, en arpegio descendente.
  // No toca el bajo: lo sostiene el pad.
  campanas(notes, beats) {
    const bells = notes.slice(-3).map((m) => m + 12).filter((m) => m <= 88);
    const hits = [];
    for (let i = 0; i < beats && bells.length; i++) {
      hits.push({ beat: i, midi: bells[bells.length - 1 - (i % bells.length)], vel: i % bells.length === 0 ? 0.32 : 0.24 });
    }
    return hits;
  },

  // Bucles de cinta: cada nota se repite con su propio periodo, así que las coincidencias cambian siempre.
  bucles(notes, beats) {
    const [bass, ...upper] = notes;
    const hits = [{ beat: 0, midi: bass, vel: 0.34 }];
    upper.forEach((midi, i) => {
      const period = 3.5 + i * 1.75 + Math.random() * 0.5;
      for (let beat = 0.5 + i * 0.9 + Math.random(); beat < beats; beat += period) {
        hits.push({ beat, midi, vel: 0.2 + Math.random() * 0.1 });
      }
    });
    return hits;
  },

  // Dos marimbas con el mismo dibujo de seis notas: la segunda, una octava arriba,
  // una semicorchea más tarde y dos notas adelantada.
  fase(notes, beats) {
    const [bass, ...upper] = notes;
    const hits = [
      { beat: 0, midi: bass, vel: 0.38 },
      { beat: beats / 2, midi: bass, vel: 0.3 },
    ];
    if (!upper.length) return hits;
    const [a, b = a, c = b] = upper;
    const cell = [a, c, b, c, a, b];
    for (let i = 0; i < beats * 2; i++) {
      hits.push({ beat: i / 2, midi: cell[i % 6], vel: 0.28 });
      const echo = cell[(i + 2) % 6] + 12;
      if (echo <= 88) hits.push({ beat: i / 2 + 0.25, midi: echo, vel: 0.2 });
    }
    return hits;
  },

  // Casi nada: el bajo y, más tarde, las dos notas más agudas. El resto lo sostiene el pad.
  aliento(notes, beats) {
    const hits = [
      { beat: 0, midi: notes[0], vel: 0.36 },
      { beat: beats * 0.3 + Math.random() * 0.3, midi: notes[notes.length - 1], vel: 0.22 },
    ];
    if (notes.length > 2) {
      hits.push({ beat: beats * 0.62 + Math.random() * 0.3, midi: notes[notes.length - 2], vel: 0.17 });
    }
    return hits;
  },

  // Notas repetidas en semicorcheas, en orden aleatorio, con una intensidad que va y viene.
  centelleo(notes, beats) {
    const [bass, ...upper] = notes;
    const pool = [...upper, ...upper.map((m) => m + 12)].filter((m) => m <= 88);
    const hits = [{ beat: 0, midi: bass, vel: 0.36 }];
    for (let i = 0; i < beats * 4 && pool.length; i++) {
      const last = hits[hits.length - 1].midi;
      const options = pool.length > 1 ? pool.filter((m) => m !== last) : pool;
      const swell = 0.5 + 0.5 * Math.sin((Math.PI * i) / 8);
      hits.push({ beat: i / 4, midi: pick(options), vel: 0.1 + 0.14 * swell });
    }
    return hits;
  },

  // El acorde se abre muy lento y una línea aguda deambula por sus notas.
  deriva(notes, beats) {
    const hits = notes.map((midi, i) => ({ beat: i * 0.22, midi, vel: 0.32 - i * 0.02 }));
    const line = [...new Set(notes.slice(1).map((m) => m + 12))].filter((m) => m <= 88);
    if (!line.length) return hits;
    let at = Math.floor(Math.random() * line.length);
    for (let beat = 2; beat < beats - 0.5; beat += 1.5) {
      at = clamp(at + (Math.random() < 0.5 ? -1 : 1), 0, line.length - 1);
      hits.push({ beat: beat + Math.random() * 0.25, midi: line[at], vel: 0.16 + Math.random() * 0.1 });
    }
    return hits;
  },
};

// Respuesta al impulso de una sala grande: ruido que decae y se oscurece con el tiempo.
function makeImpulse(ctx, seconds = 6, decay = 1.15) {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const predelay = Math.floor(rate * 0.025);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let smooth = 0;
    for (let i = predelay; i < length; i++) {
      const t = (i - predelay) / rate;
      smooth += (0.08 + 0.6 * Math.exp(-t / 1.4)) * (Math.random() * 2 - 1 - smooth);
      data[i] = smooth * Math.exp(-t / decay);
    }
  }
  return buffer;
}

function makeNoise(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// Parciales del piano: la fundamental y armónicos cada vez más débiles.
const PARTIALS = [1, 0.5, 0.26, 0.15, 0.08, 0.045, 0.025];
const PARTIAL_SUM = PARTIALS.reduce((a, b) => a + b);

export function createEngine(ctx) {
  const noise = makeNoise(ctx);

  // Bus común → compresor suave → ganancia → limitador → salida.
  // En paralelo, envíos a reverberación y eco.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -24;
  comp.knee.value = 18;
  comp.ratio.value = 2.5;
  comp.attack.value = 0.02;
  comp.release.value = 0.5;
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -4;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.15;
  comp.connect(master).connect(limiter).connect(ctx.destination);

  const bus = ctx.createGain();
  bus.connect(comp);

  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx);
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 0;
  bus.connect(reverbSend).connect(reverb).connect(comp);

  // Eco con realimentación filtrada: cada repetición suena más apagada, como en una cinta.
  const echo = ctx.createDelay(2);
  const echoLow = ctx.createBiquadFilter();
  echoLow.type = 'highpass';
  echoLow.frequency.value = 180;
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = 'lowpass';
  echoTone.frequency.value = 2200;
  const echoFeedback = ctx.createGain();
  echoFeedback.gain.value = 0.42;
  const echoSend = ctx.createGain();
  echoSend.gain.value = 0;
  bus.connect(echoSend).connect(echo).connect(echoLow).connect(echoTone);
  echoTone.connect(echoFeedback).connect(echo);
  echoTone.connect(comp);
  echoTone.connect(reverbSend);

  // Trémolo estéreo del piano eléctrico, compartido por todas sus voces.
  const tremolo = ctx.createOscillator();
  tremolo.frequency.value = 4.2;
  const tremoloDepth = ctx.createGain();
  tremoloDepth.gain.value = 0.32;
  tremolo.connect(tremoloDepth);
  tremolo.start();

  let session = null;
  let sessionCount = 0;
  let events = []; // avisos para la interfaz, ordenados por tiempo

  // Registra las fuentes de una voz para poder cortarlas y liberar el grafo cuando acaben.
  function own(s, sources, cleanup) {
    let alive = sources.length;
    for (const src of sources) {
      s.sources.add(src);
      src.onended = () => {
        s.sources.delete(src);
        if (--alive === 0) cleanup();
      };
    }
  }

  function piano(s, midi, t0, vel, t1, release) {
    const f = midiToFreq(midi);
    const bright = s.prog.bright ?? 1;
    const pan = ctx.createStereoPanner();
    pan.pan.value = clamp((midi - 60) / 40, -0.6, 0.6);
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.Q.value = 0.3;
    const cutoff = clamp(f * (2 + 6 * vel) * bright, 500, 8000);
    tone.frequency.setValueAtTime(cutoff * 1.8, t0);
    tone.frequency.setTargetAtTime(cutoff, t0, 0.15);

    const amp = ctx.createGain();
    const peak = 0.22 * vel;
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(peak, t0 + 0.004 + 0.012 * (1 - vel)); // el fieltro suaviza el ataque
    amp.gain.setTargetAtTime(0, t1, release);
    amp.connect(tone).connect(pan).connect(s.out);

    // Cada parcial decae en dos tiempos (golpe y resonancia), y los agudos se apagan antes.
    const ring = clamp(6 * Math.sqrt(220 / f), 1.2, 9);
    const end = t1 + release * 7;
    const sources = [];
    PARTIALS.forEach((weight, i) => {
      const n = i + 1;
      const freq = f * n * Math.sqrt(1 + 0.0004 * n * n); // inarmonicidad de la cuerda
      if (freq > 10000) return;
      const detunes = n <= 2 ? [-1, 1] : [0]; // dos cuerdas casi afinadas: el batido da calidez
      const level = weight / PARTIAL_SUM / detunes.length;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(level, t0);
      gain.gain.setTargetAtTime(level * 0.3, t0, 0.2 / n ** 0.4);
      gain.gain.setTargetAtTime(0, t0 + 0.5, ring / n ** 0.9);
      gain.connect(amp);
      for (const cents of detunes) {
        const osc = ctx.createOscillator();
        osc.frequency.value = freq;
        osc.detune.value = cents;
        osc.connect(gain);
        osc.start(t0);
        osc.stop(end);
        sources.push(osc);
      }
    });

    // El golpe del martillo de fieltro: un soplo de ruido muy corto.
    const thump = ctx.createBufferSource();
    thump.buffer = noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = clamp(f * 2.5, 250, 3000);
    const hit = ctx.createGain();
    hit.gain.setValueAtTime(0, t0);
    hit.gain.linearRampToValueAtTime(peak * 0.5, t0 + 0.002);
    hit.gain.setTargetAtTime(0, t0 + 0.002, 0.012);
    thump.connect(band).connect(hit).connect(tone);
    thump.start(t0, Math.random() * 0.8, 0.12);
    sources.push(thump);

    own(s, sources, () => pan.disconnect());
  }

  // Piano eléctrico por FM: una moduladora 1:1 da el cuerpo y otra a 14:1, el «ding» de la púa.
  function rhodes(s, midi, t0, vel, t1, release) {
    const f = midiToFreq(midi);
    const pan = ctx.createStereoPanner();
    pan.pan.value = clamp((midi - 60) / 48, -0.3, 0.3);
    tremoloDepth.connect(pan.pan);
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2800;
    tone.Q.value = 0.2;

    const amp = ctx.createGain();
    const peak = 0.2 * vel;
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(peak, t0 + 0.003);
    amp.gain.setTargetAtTime(peak * 0.45, t0 + 0.003, 0.5);
    if (t1 > t0 + 1.2) amp.gain.setTargetAtTime(0, t0 + 1.2, clamp(3.5 * Math.sqrt(220 / f), 1, 5));
    amp.gain.setTargetAtTime(0, t1, Math.max(release, 0.12));

    const carrier = ctx.createOscillator();
    carrier.frequency.value = f;
    const body = ctx.createOscillator();
    body.frequency.value = f;
    const bodyDepth = ctx.createGain();
    bodyDepth.gain.setValueAtTime(f * (0.5 + 2 * vel), t0);
    bodyDepth.gain.setTargetAtTime(f * 0.15, t0, 0.35);
    body.connect(bodyDepth).connect(carrier.frequency);
    const tine = ctx.createOscillator();
    tine.frequency.value = f * 14;
    const tineDepth = ctx.createGain();
    tineDepth.gain.setValueAtTime(f * 14 * 0.25 * vel, t0);
    tineDepth.gain.setTargetAtTime(0, t0, 0.02);
    tine.connect(tineDepth).connect(carrier.frequency);
    carrier.connect(amp).connect(tone).connect(pan).connect(s.out);

    const sources = [carrier, body, tine];
    for (const osc of sources) {
      osc.start(t0);
      osc.stop(t1 + Math.max(release, 0.12) * 7);
    }
    own(s, sources, () => {
      tremoloDepth.disconnect(pan.pan);
      pan.disconnect();
    });
  }

  // Marimba: la lámina vibra en la fundamental y en un parcial afinado a cuatro veces su
  // frecuencia, que se apaga mucho antes. El golpe de la baqueta es un soplo de ruido.
  function marimba(s, midi, t0, vel, t1, release) {
    const f = midiToFreq(midi);
    const pan = ctx.createStereoPanner();
    pan.pan.value = clamp((midi - 60) / 36, -0.5, 0.5);
    const amp = ctx.createGain();
    const peak = 0.32 * vel;
    const decay = clamp(0.5 * Math.sqrt(220 / f), 0.15, 1);
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(peak, t0 + 0.002);
    amp.gain.setTargetAtTime(0, t0 + 0.002, decay);
    if (t1 < t0 + decay * 5) amp.gain.setTargetAtTime(0, t1, Math.min(release, decay));
    amp.connect(pan).connect(s.out);

    const body = ctx.createOscillator();
    body.frequency.value = f;
    body.connect(amp);
    const overtone = ctx.createOscillator();
    overtone.frequency.value = f * 4;
    const overtoneLevel = ctx.createGain();
    overtoneLevel.gain.setValueAtTime(0.25, t0);
    overtoneLevel.gain.setTargetAtTime(0, t0, decay / 5);
    overtone.connect(overtoneLevel).connect(amp);

    const mallet = ctx.createBufferSource();
    mallet.buffer = noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = clamp(f * 3, 400, 4000);
    const hit = ctx.createGain();
    hit.gain.setValueAtTime(0, t0);
    hit.gain.linearRampToValueAtTime(peak * 0.4, t0 + 0.001);
    hit.gain.setTargetAtTime(0, t0 + 0.001, 0.006);
    mallet.connect(band).connect(hit).connect(pan);

    const end = Math.min(t1 + release * 7, t0 + decay * 7);
    for (const osc of [body, overtone]) {
      osc.start(t0);
      osc.stop(end);
    }
    mallet.start(t0, Math.random() * 0.8, 0.05);
    own(s, [body, overtone, mallet], () => pan.disconnect());
  }

  // Campana: FM con la moduladora a 3,5 veces la frecuencia, que da parciales inarmónicos de
  // metal. El brillo se apaga enseguida y queda un tono casi puro que resuena largo.
  function campana(s, midi, t0, vel, t1, release) {
    const f = midiToFreq(midi);
    const pan = ctx.createStereoPanner();
    pan.pan.value = clamp((midi - 66) / 30, -0.6, 0.6);
    const amp = ctx.createGain();
    const peak = 0.17 * vel * clamp(f / 220, 0.45, 1); // los graves, más suaves
    const decay = clamp(2.6 * Math.sqrt(440 / f), 0.8, 4.5);
    const ring = Math.max(release, 0.3); // el metal no se apaga de golpe
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(peak, t0 + 0.002);
    amp.gain.setTargetAtTime(0, t0 + 0.002, decay);
    amp.gain.setTargetAtTime(0, t1, ring);
    amp.connect(pan).connect(s.out);

    const carrier = ctx.createOscillator();
    carrier.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.frequency.value = f * 3.5;
    const depth = ctx.createGain();
    const index = 2.2 * vel * clamp(f / 330, 0.25, 1);
    depth.gain.setValueAtTime(f * 3.5 * index, t0);
    depth.gain.setTargetAtTime(f * 3.5 * index * 0.05, t0, 0.25);
    mod.connect(depth).connect(carrier.frequency);
    carrier.connect(amp);

    const sources = [carrier, mod];
    for (const osc of sources) {
      osc.start(t0);
      osc.stop(t1 + ring * 7);
    }
    own(s, sources, () => pan.disconnect());
  }

  const INSTRUMENTS = { piano, rhodes, marimba, campana };

  // Colchón de dos sierras desafinadas tras un filtro grave: entra y sale muy despacio.
  function pad(s, midi, t0, level, t1) {
    const f = midiToFreq(midi);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 0.6 - 0.3;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = clamp(f * 2, 350, 1400);
    tone.Q.value = 0.5;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(level, t0 + Math.min(2.5, (t1 - t0) / 2));
    amp.gain.setTargetAtTime(0, t1, 1.2);
    amp.connect(tone).connect(pan).connect(s.out);

    const sources = [-7, 7].map((cents) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.detune.value = cents;
      osc.connect(amp);
      osc.start(t0);
      osc.stop(t1 + 7);
      return osc;
    });
    own(s, sources, () => pan.disconnect());
  }

  function scheduleChord(s, index, start) {
    const { prog } = s;
    const chord = prog.chords[index];
    const beat = 60 / s.bpm;
    const end = start + prog.beats * beat;
    const play = INSTRUMENTS[prog.instrument] ?? piano;

    const hits = TEXTURES[prog.texture](chord.midi, prog.beats)
      .map((h) => ({ ...h, time: start + h.beat * beat }))
      .filter((h) => h.time < end)
      .sort((a, b) => a.time - b.time);

    // Cada nota suena hasta que se vuelve a tocar la misma tecla o hasta el cambio de pedal.
    hits.forEach((h, i) => {
      const again = hits.find((o, j) => j > i && o.midi === h.midi);
      play(s, h.midi, h.time, h.vel, again ? again.time : end, again ? 0.05 : 0.5);
      events.push({ session: s.id, time: h.time, type: 'note', index, pc: h.midi % 12 });
    });

    if (prog.pad > 0) {
      const padNotes = new Set(chord.midi.map((m) => (m < 43 ? m + 12 : m)));
      for (const midi of padNotes) pad(s, midi, start, 0.018 * prog.pad, end);
    }

    events.push({ session: s.id, time: start, type: 'chord', index, duration: end - start });
    events.sort((a, b) => a.time - b.time);
  }

  function setSpace(prog, bpm) {
    const t = ctx.currentTime;
    reverbSend.gain.setTargetAtTime(prog.space.reverb, t, 0.4);
    echoSend.gain.setTargetAtTime(prog.space.delay, t, 0.4);
    echo.delayTime.setTargetAtTime(clamp((0.75 * 60) / bpm, 0.05, 2), t, 0.3);
  }

  function setState(next) {
    engine.state = next;
    engine.onchange?.(next);
  }

  // Corta la sesión en curso con un fundido breve.
  function silence(fade) {
    const s = session;
    if (!s) return;
    session = null;
    clearInterval(s.timer);
    const t = ctx.currentTime;
    s.out.gain.cancelScheduledValues(t);
    s.out.gain.setValueAtTime(s.out.gain.value, t);
    s.out.gain.setTargetAtTime(0, t, fade / 4);
    events = events.filter((e) => e.session !== s.id);
    setTimeout(() => {
      for (const src of s.sources) {
        try {
          src.stop();
        } catch {
          // ya se había detenido
        }
      }
      s.out.disconnect();
    }, fade * 1000 + 300);
  }

  const engine = {
    state: 'stopped', // 'stopped' | 'playing' | 'audition'
    onchange: null,

    // Reproduce la progresión en bucle desde `from`, o solo ese acorde si `once`.
    play(prog, { from = 0, bpm = prog.bpm, once = false } = {}) {
      silence(1.2);
      const out = ctx.createGain();
      out.gain.value = dbToGain(prog.gain ?? 0);
      out.connect(bus);
      const s = {
        id: ++sessionCount,
        prog,
        bpm,
        out,
        index: from,
        next: ctx.currentTime + 0.05,
        remaining: once ? 1 : Infinity,
        sources: new Set(),
      };
      session = s;
      setSpace(prog, bpm);

      const tick = () => {
        // Si el navegador congeló los temporizadores, se retoma desde ahora en vez de
        // programar de golpe todos los acordes atrasados.
        if (s.remaining > 0 && s.next < ctx.currentTime) s.next = ctx.currentTime + 0.05;
        while (s.remaining > 0 && s.next < ctx.currentTime + LOOKAHEAD) {
          scheduleChord(s, s.index, s.next);
          s.next += (prog.beats * 60) / s.bpm;
          s.index = (s.index + 1) % prog.chords.length;
          s.remaining--;
        }
        // Un acorde suelto termina solo: se deja sonar la cola y se libera la sesión.
        if (s.remaining === 0 && ctx.currentTime >= s.next) {
          clearInterval(s.timer);
          if (session === s) {
            session = null;
            setState('stopped');
          }
          setTimeout(() => s.out.disconnect(), 10000);
        }
      };
      s.timer = setInterval(tick, TICK_MS);
      tick();
      setState(once ? 'audition' : 'playing');
    },

    stop() {
      silence(0.8);
      setState('stopped');
    },

    // El nuevo tempo se aplica desde el siguiente acorde.
    setBpm(bpm) {
      if (!session) return;
      session.bpm = bpm;
      setSpace(session.prog, bpm);
    },

    // Devuelve los avisos cuyo momento ya llegó a los altavoces. Las notas que se quedaron
    // atrás (pestaña oculta) se descartan; de los acordes basta con el último.
    poll() {
      const now = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
      let due = 0;
      while (due < events.length && events[due].time <= now) due++;
      if (!due) return [];
      return events.splice(0, due).filter((e) => e.type === 'chord' || now - e.time < 0.25);
    },
  };

  return engine;
}
