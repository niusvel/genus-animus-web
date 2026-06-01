# Genus Animus — Web

Frontend de **Genus Animus**, una aventura de texto descriptiva con progresión genética. El jugador encarna a un ser primordial que evoluciona mediante mutaciones dirigidas; el fenotipo dominante reorienta sus capacidades y el contenido narrativo al que accede.

Este repositorio es el **cliente React**. El backend (API + contenido narrativo protegido) vive en el repositorio `genus-animus-api`.

## Stack

- **React 19** + **Vite** (build y dev server con HMR)
- **Zustand** — estado global del juego
- **TailwindCSS** — estilos (tema CRT por fenotipo)
- **marked** — render de Markdown narrativo
- **React Router** — navegación

## Arranque

Requisitos: Node 20+.

```bash
npm install
npm run dev      # servidor de desarrollo (http://localhost:5173)
```

> Para levantar a la vez el frontend y el backend, existe un `package.json` en la
> carpeta raíz del monorepo con `npm run dev` (usa `concurrently`).

### Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Build de producción a `dist/` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | ESLint |

## Variables de entorno

Vite selecciona el archivo según el modo (ver `.env.example`):

| Modo | Archivo | Variable |
|---|---|---|
| `npm run dev` (development) | `.env.development` | `VITE_API_URL` → API local |
| `vite build` (production) | `.env.production` | `VITE_API_URL` → API desplegada |

`VITE_API_URL` debe incluir el esquema (`http://` o `https://`). Solo las
variables con prefijo `VITE_` se exponen al cliente. **No** se versionan secretos
(tokens, contraseñas, claves) en este repositorio.

## Estructura

```
src/
├── components/game/   Componentes de UI del juego (Terminal, StatusBar, modales…)
├── content/
│   ├── index.js       Registra las escenas del prólogo en el motor
│   └── scenes/        Una carpeta por escena: definicion.json (lógica) + narrativa.md (texto)
├── engine/            Lógica pura del juego, sin React
│   ├── commandProcessor.js    Procesa los comandos del jugador
│   ├── geneticEngine.js       Mutaciones, antagonismos y morfología
│   ├── phenotypeCalculator.js Cálculo del fenotipo dominante
│   ├── contentLoader.js       Parseo y registro de escenas
│   ├── sceneManager.js        Comandos/objetos activos por escena
│   └── localStorage.js        Estado local (fase anónima)
├── hooks/             useGame, useCommands (puente motor ↔ React)
├── pages/             Game, Register
├── store/             gameStore (Zustand)
└── styles/            global.css (tema CRT y paletas por fenotipo)
```

### Modelo de contenido narrativo

Cada escena se define con **dos archivos**: `definicion.json` (lógica: comandos,
objetos, salidas, condiciones, flags, checkpoint) y `narrativa.md` (texto en
bloques delimitados por marcadores `<!-- clave -->`). El motor combina ambos: el
JSON decide *qué* bloque mostrar y el Markdown aporta *el texto*.

- **Fase anónima** (escenas del prólogo): el estado vive en `localStorage` y las
  escenas se empaquetan en el cliente (`src/content/scenes/`).
- **Fase autenticada** (escenas posteriores): el backend sirve el contenido y
  valida el acceso; el estado se persiste en el servidor (JWT).

## Herramientas de autoría de paletas

`palettes.css`, `parse_palettes.py` y `update_global_css.py` son utilidades de
autoría (no forman parte del bundle): regeneran la sección de paletas de
`src/styles/global.css` a partir del anexo de diseño `docs/genus-animus-paletas.md`.
No se ejecutan en build ni en runtime.
