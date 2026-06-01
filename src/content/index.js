import { registerScene } from '../engine/contentLoader.js';

import cuevaCapullosNarrative from './scenes/cueva_capullos/narrativa.md?raw';
import cuevaCapullosDefinition from './scenes/cueva_capullos/definicion.json';

import cuevaEnemigoNarrative from './scenes/cueva_enemigo/narrativa.md?raw';
import cuevaEnemigoDefinition from './scenes/cueva_enemigo/definicion.json';

import cuevaSalidaNarrative from './scenes/cueva_salida/narrativa.md?raw';
import cuevaSalidaDefinition from './scenes/cueva_salida/definicion.json';

// Registra las escenas del prólogo en el motor. Este módulo se importa por su
// efecto secundario desde main.jsx; el backend sirve el resto de escenas.
registerScene('cueva_capullos', cuevaCapullosNarrative, cuevaCapullosDefinition);
registerScene('cueva_enemigo', cuevaEnemigoNarrative, cuevaEnemigoDefinition);
registerScene('cueva_salida', cuevaSalidaNarrative, cuevaSalidaDefinition);
