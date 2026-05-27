import { registerScene } from '../engine/contentLoader.js';

import cuevaCapullosNarrative from './scenes/cueva_capullos/narrativa.md?raw';
import cuevaCapullosDefinition from './scenes/cueva_capullos/definicion.json';

import cuevaEnemigoNarrative from './scenes/cueva_enemigo/narrativa.md?raw';
import cuevaEnemigoDefinition from './scenes/cueva_enemigo/definicion.json';

import cuevaSalidaNarrative from './scenes/cueva_salida/narrativa.md?raw';
import cuevaSalidaDefinition from './scenes/cueva_salida/definicion.json';

// Register scenes in the engine loader
registerScene('cueva_capullos', cuevaCapullosNarrative, cuevaCapullosDefinition);
registerScene('cueva_enemigo', cuevaEnemigoNarrative, cuevaEnemigoDefinition);
registerScene('cueva_salida', cuevaSalidaNarrative, cuevaSalidaDefinition);

export default {
  cueva_capullos: { narrative: cuevaCapullosNarrative, definition: cuevaCapullosDefinition },
  cueva_enemigo: { narrative: cuevaEnemigoNarrative, definition: cuevaEnemigoDefinition },
  cueva_salida: { narrative: cuevaSalidaNarrative, definition: cuevaSalidaDefinition }
};
