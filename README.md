# Bruma

Acordes de piano para música ambient y minimalista.

Cada progresión se dibuja como una pila de octavas: una por acorde, con su cifrado como título y las notas
resaltadas sobre las teclas. Las flechas cambian de progresión, y el sonido se sintetiza en el navegador con
Web Audio, sin muestras.

**Abrir la app:** https://nicoprieto-cuentame.github.io/bruma/

## Progresiones

| #   | Nombre   | A la manera de    | Tonalidad  | Textura  |
| --- | -------- | ----------------- | ---------- | -------- |
| 1   | Bruma    | tema de apertura  | La♭ mayor  | florecer |
| 2   | Fieltro  | Nils Frahm        | Re menor   | florecer |
| 3   | Marea    | Ólafur Arnalds    | Mi♭ mayor  | florecer |
| 4   | Postal   | Hiroshi Yoshimura | Do mayor   | gotas    |
| 5   | Espiral  | Philip Glass      | La menor   | arpegio  |
| 6   | Pulso    | Steve Reich       | Re mayor   | pulso    |
| 7   | Costa    | Gaussian Curve    | Sol mayor  | deriva   |
| 8   | Paralelo | Arrangement       | Do mayor   | deriva   |

Las progresiones están escritas a la manera de cada referente, no transcritas de sus discos.

## Uso

- **← →** o deslizar: cambiar de progresión.
- **Espacio** o el botón redondo: reproducir en bucle o detener.
- **Clic en un acorde** (o las teclas **1–4**): escucharlo solo; si la progresión está sonando, salta a él.
- **Tempo**: se aplica desde el siguiente acorde.
- **C D E / Do Re Mi**: notación de las notas.

Cada progresión tiene su propia dirección, por ejemplo `#postal`.

## Probar en local

Los módulos de JavaScript necesitan un servidor; con abrir el archivo no basta:

```sh
python -m http.server 8000
```

y abrir http://localhost:8000.

## Estructura

```
index.html
css/styles.css
js/app.js           interfaz y controles
js/progressions.js  las progresiones (aquí se añaden nuevas)
js/keyboard.js      dibujo SVG de una octava
js/audio.js         síntesis: piano de fieltro, piano eléctrico, pad, reverberación y eco
js/theory.js        nombres de notas y frecuencias
```

## Añadir una progresión

Añade un objeto a `PROGRESSIONS` en `js/progressions.js`. Cada acorde lleva su cifrado y su disposición en el
piano, de grave a agudo, en notación científica (Do central = `C4`):

```js
{ root: 'Db', quality: 'maj9', roman: 'IVmaj9', voicing: 'Db2 Ab2 F3 C4 Eb4' }
```

Para los acordes con barra se añade `bass: 'C'`. Las texturas disponibles son `florecer`, `gotas`, `arpegio`,
`pulso` y `deriva`.
