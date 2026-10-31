# Bruma

Acordes de piano para música ambient y minimalista.

Cada progresión se dibuja como una pila de octavas: una por acorde, con su cifrado como título y las notas
resaltadas sobre las teclas. Las flechas cambian de progresión, y el sonido se sintetiza en el navegador con
Web Audio, sin muestras.

**Abrir la app:** https://nicoprieto-cuentame.github.io/bruma/

## Progresiones

| #  | Nombre    | A la manera de    | Tonalidad         | Sonido                          | Textura   |
| -- | --------- | ----------------- | ----------------- | ------------------------------- | --------- |
| 1  | Bruma     | tema de apertura  | La♭ mayor         | piano de fieltro y pad          | florecer  |
| 2  | Fieltro   | Nils Frahm        | Re menor          | piano de fieltro                | florecer  |
| 3  | Marea     | Ólafur Arnalds    | Mi♭ mayor         | piano de fieltro y cuerdas      | florecer  |
| 4  | Postal    | Hiroshi Yoshimura | Do mayor          | piano eléctrico y sintetizador  | gotas     |
| 5  | Espiral   | Philip Glass      | La menor          | piano de fieltro                | arpegio   |
| 6  | Pulso     | Steve Reich       | Re mayor          | piano                           | pulso     |
| 7  | Costa     | Gaussian Curve    | Sol mayor         | piano eléctrico, ecos y pad     | deriva    |
| 8  | Paralelo  | Arrangement       | Do mayor          | piano de fieltro, ecos y pad    | deriva    |
| 9  | Terminal  | Brian Eno         | Fa mayor          | piano y pad                     | bucles    |
| 10 | Nácar     | Harold Budd       | Do mayor          | piano de pedal suave            | florecer  |
| 11 | Tarde     | Erik Satie        | Fa mayor          | piano                           | vals      |
| 12 | Tintineo  | Arvo Pärt         | La menor          | campanas y cuerdas              | campanas  |
| 13 | Hilo      | Nils Frahm        | Fa♯ menor         | piano de fieltro y sintetizador | ostinato  |
| 14 | Escarcha  | Ólafur Arnalds    | La♭ mayor         | piano de fieltro y cuerdas      | florecer  |
| 15 | Agua      | Hiroshi Yoshimura | Mi mayor          | campanas y pad                  | gotas     |
| 16 | Línea     | Philip Glass      | La menor          | piano                           | arpegio   |
| 17 | Fase      | Steve Reich       | Mi menor          | dos marimbas                    | fase      |
| 18 | Horizonte | Gaussian Curve    | Mi♭ mayor         | piano eléctrico, ecos y pad     | deriva    |
| 19 | Humo      | Arrangement       | cuartas paralelas | piano eléctrico, ecos y pad     | deriva    |
| 20 | Ventana   | Ryuichi Sakamoto  | Fa mayor          | piano                           | florecer  |
| 21 | Sueño     | Max Richter       | Sol mayor         | piano y cuerdas                 | florecer  |
| 22 | Quietud   | Satoshi Ashikawa  | Si♭ pentatónica   | campanas y pad                  | bucles    |
| 23 | Bosque    | Midori Takada     | Re dórico         | marimba y pad                   | fase      |
| 24 | Abrigo    | Joep Beving       | Do mayor          | piano de fieltro                | florecer  |
| 25 | Deshielo  | Hania Rani        | Mi menor          | piano y pad                     | ostinato  |
| 26 | Faro      | Jóhann Jóhannsson | Si menor          | piano y cuerdas                 | aliento   |
| 27 | Espejismo | Terry Riley       | Do mixolidio      | piano eléctrico con eco largo   | ostinato  |
| 28 | Destello  | Laraaji           | Re mayor          | campanas y pad                  | centelleo |
| 29 | Brisa     | Gigi Masin        | Si♭ mayor         | piano, ecos y pad               | deriva    |
| 30 | Lamento   | Nils Frahm        | La menor          | piano de fieltro                | florecer  |
| 31 | Jardín    | Hiroshi Yoshimura | Mi♭ mayor         | piano eléctrico y pad           | deriva    |
| 32 | Respiro   | Steve Reich       | La mayor          | marimba                         | pulso     |

Las progresiones están escritas a la manera de cada referente, no transcritas de sus discos.

## Uso

- **← →** o deslizar: cambiar de progresión.
- **Índice** (o la tecla **I**): todas las progresiones, con un botón para ir a una al azar.
- **Espacio** o el botón redondo: reproducir en bucle o detener.
- **Clic en un acorde** (o las teclas **1–8**): escucharlo solo; si la progresión está sonando, salta a él.
- **Tempo**: se aplica desde el siguiente acorde.

Cada progresión tiene su propia dirección, por ejemplo `#postal`.

## Tocar encima

Bruma está pensada también como acompañamiento para tocar el piano encima.

- **Fondo** (tecla **F**) y **Arpegio** (tecla **A**) son dos capas que comparten el mismo reloj. El fondo es el
  acorde sostenido (pad); el arpegio, lo que toca el instrumento. Se pueden encender por separado: con solo el
  fondo, el arpegio lo pones tú. Si enciendes una con la otra sonando, entra a tiempo.
- **Mantener** (tecla **M**) repite el acorde que suena hasta que lo sueltas, para explorar sobre él.
- **Atril** (tecla **V**): una vista que cabe entera en la pantalla. El acorde que suena se marca como
  «ahora», el siguiente lleva una cuenta atrás de los últimos cuatro pulsos, y en cada octava se ven, más
  tenues, las **notas de color**: las de la escala que suenan bien sobre ese acorde sin chocar.
- **Ajustes**: volumen de cada capa, duración de cada acorde (×½, ×1, ×2), cuenta de entrada de un compás,
  afinación (La = 430–450 Hz) y nombres de las notas (C D E / Do Re Mi).
- **Piano MIDI**: con el piano conectado por USB (en Chrome o Edge), las teclas que tocas se marcan en la
  octava del acorde que suena; las que no son del acorde ni de color se ven en gris.
- Mientras suena, la pantalla no se apaga.

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
js/app.js           interfaz: lectura, atril, índice, ajustes y MIDI
js/progressions.js  las progresiones (aquí se añaden nuevas)
js/keyboard.js      dibujo SVG de una octava
js/audio.js         síntesis: instrumentos, texturas, capas, reverberación y eco
js/theory.js        nombres de notas, frecuencias, escalas y notas de color
```

## Añadir una progresión

Añade un objeto a `PROGRESSIONS` en `js/progressions.js`. Cada acorde lleva su cifrado y su disposición en el
piano, de grave a agudo, en notación científica (Do central = `C4`):

```js
{ root: 'Db', quality: 'maj9', roman: 'IVmaj9', voicing: 'Db2 Ab2 F3 C4 Eb4' }
```

Para los acordes con barra se añade `bass: 'C'`.

**Instrumentos:** `piano` (de fieltro), `rhodes` (piano eléctrico), `marimba` y `campana`, más un pad opcional.

**Texturas:**

| Textura     | Qué hace                                                                   |
| ----------- | -------------------------------------------------------------------------- |
| `florecer`  | el acorde se abre despacio de grave a agudo, con dos ecos agudos después   |
| `gotas`     | notas sueltas del acorde que caen sobre el bajo                            |
| `arpegio`   | dos contra tres: corcheas en la izquierda y tresillos en la derecha        |
| `pulso`     | el acorde entero en corcheas que crecen y se apagan                        |
| `deriva`    | el acorde se abre muy lento y una línea aguda deambula por sus notas       |
| `ostinato`  | una figura de corcheas que se repite sobre el bajo                         |
| `vals`      | tres por cuatro: bajo en el primer tiempo, acorde en el segundo            |
| `campanas`  | las tres notas más agudas, en arpegio descendente (sin bajo: lo da el pad) |
| `bucles`    | cada nota se repite con su propio periodo, como bucles de cinta            |
| `fase`      | dos marimbas con el mismo dibujo, desplazadas una semicorchea              |
| `aliento`   | solo el bajo y dos notas agudas; el resto lo sostiene el pad               |
| `centelleo` | notas repetidas muy rápido, en orden aleatorio                             |

Con `gain` se ajusta el volumen de cada progresión (en dB) para que todas suenen parecido.
