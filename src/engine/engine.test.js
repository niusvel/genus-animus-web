import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Mock global localStorage for Node execution
global.localStorage = {
  _store: {},
  getItem(key) { return this._store[key] || null; },
  setItem(key, value) { this._store[key] = String(value); },
  removeItem(key) { delete this._store[key]; },
  clear() { this._store = {}; }
};

// 2. Load and Register Scenes manually using Node fs to avoid raw import issues
import { registerScene, loadScene } from './contentLoader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenesDir = path.join(__dirname, '..', 'content', 'scenes');

const SCENES = ['cueva_capullos', 'cueva_enemigo', 'cueva_salida'];
SCENES.forEach(id => {
  const narrative = fs.readFileSync(path.join(scenesDir, id, 'narrativa.md'), 'utf-8');
  const definition = JSON.parse(fs.readFileSync(path.join(scenesDir, id, 'definicion.json'), 'utf-8'));
  registerScene(id, narrative, definition);
});

// Register a representative online-style scene (bosque_amanecer) to exercise the
// unified data-driven engine: casos declarativos, EXAMINAR por conteo y GUARDAR.
const bosqueNarrative = [
  '<!-- llegada -->', 'Llegada al exterior.',
  '<!-- observar_1 -->', 'Observas el bosque por primera vez.',
  '<!-- observar_repetido -->', 'El bosque sigue igual.',
  '<!-- examinar_arbol -->', 'Examinas el arbol con detalle.',
  '<!-- examinar_arbol_agotado -->', 'Ya examinaste el arbol.'
].join('\n');

registerScene('bosque_amanecer', bosqueNarrative, {
  id: 'bosque_amanecer',
  nombre: 'El Bosque del Amanecer',
  checkpoint: true,
  flags_que_otorga: ['bosque_amanecer_visitado'],
  comandos_iniciales: ['OBSERVAR', 'EXAMINAR', 'AYUDA'],
  comandos_desbloqueables: ['IR'],
  objetos: [
    { id: 'arbol', nombre: 'arbol', descripcion_corta: 'un arbol enorme', tomable: false, examinable: true, usos_examinar: 1, visible_desde_inicio: true }
  ],
  desbloqueos: [
    { id: 'desbloqueo_ir', condicion: { tipo: 'flag', flag: 'bosque_amanecer_visitado' }, desbloquea_comandos: ['IR'], se_repite: false }
  ],
  entradas: [
    { origen: 'cueva_salida', texto_llegada_id: 'llegada' }
  ],
  logica_observar: {
    flag_que_otorga: 'bosque_amanecer_visitado',
    casos: [
      { si: { no: { flag: 'bosque_amanecer_visitado' } }, texto: 'observar_1' },
      { texto: 'observar_repetido' }
    ]
  },
  logica_examinar: {
    arbol_disponible: 'examinar_arbol',
    arbol_agotado: 'examinar_arbol_agotado'
  }
});

// Import command processor and local storage INITIAL_STATE
import { processCommand } from './commandProcessor.js';
import { INITIAL_STATE } from './localStorage.js';

// Helper to assert conditions and print status
let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`\x1b[32m✔ PASS\x1b[0m: ${message}`);
    passedCount++;
  } else {
    console.error(`\x1b[31m✘ FAIL\x1b[0m: ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('\n--- STARTING GENUS ANIMUS SCENE ENGINE TEST SUITE ---\n');

  // Load expected narrative texts for reference assertions
  const capullosScene = loadScene('cueva_capullos');
  const enemigoScene = loadScene('cueva_enemigo');
  const salidaScene = loadScene('cueva_salida');

  // Initialize game state
  let state = JSON.parse(JSON.stringify(INITIAL_STATE));

  // --- CASE 1 ---
  // Jugador ejecuta ESCUCHAR en cueva_capullos por primera vez → texto escuchar_1
  let res = processCommand('ESCUCHAR', state);
  assert(
    res.text.includes(capullosScene.textos['escuchar_1']),
    'First ESCUCHAR in cueva_capullos returns escuchar_1'
  );
  assert(res.newState.flags.cocoon_broken === true, 'Flag cocoon_broken is set after first ESCUCHAR');
  state = res.newState;

  // --- CASE 2 ---
  // Jugador ejecuta ESCUCHAR en cueva_capullos por segunda vez → texto escuchar_repetido
  res = processCommand('ESCUCHAR', state);
  assert(
    res.text.includes(capullosScene.textos['escuchar_repetido']),
    'Second ESCUCHAR in cueva_capullos returns escuchar_repetido'
  );
  state = res.newState || state;

  // --- CASE 3 ---
  // Jugador ejecuta IR luz sin haber examinado capullos → texto ir_luz_bloqueado
  res = processCommand('IR luz', state);
  assert(
    res.error === 'navigation_blocked' && res.text.includes(capullosScene.textos['ir_luz_bloqueado']),
    'IR luz without examining capullos returns ir_luz_bloqueado'
  );

  // Execute OBSERVAR to unlock EXAMINAR command
  res = processCommand('OBSERVAR', state);
  assert(res.newState.flags.observing === true, 'OBSERVAR sets observing flag to true');
  state = res.newState;

  // --- CASE 4 ---
  // Jugador ejecuta EXAMINAR capullos → 9 fragmentos añadidos, flag cocoons_examined activo, texto examinar_capullos
  res = processCommand('EXAMINAR capullos', state);
  assert(
    res.text.includes(capullosScene.textos['examinar_capullos']),
    'EXAMINAR capullos returns examinar_capullos description'
  );
  assert(res.newState.dnaFragments === 9, 'Player receives 9 DNA fragments');
  assert(res.newState.flags.cocoons_examined === true, 'Flag cocoons_examined is set');
  state = res.newState;

  // --- CASE 5 ---
  // Jugador ejecuta EXAMINAR capullos por segunda vez → texto examinar_capullos_agotado
  res = processCommand('EXAMINAR capullos', state);
  assert(
    res.text.includes(capullosScene.textos['examinar_capullos_agotado']),
    'Second EXAMINAR capullos returns examinar_capullos_agotado'
  );
  assert(res.newState?.dnaFragments === undefined || res.newState.dnaFragments === 9, 'DNA fragments count remains 9');
  state = res.newState || state;

  // Move to cueva_enemigo for the next test cases
  res = processCommand('IR luz', state);
  assert(res.newState.currentScene === 'cueva_enemigo', 'Successfully transition to cueva_enemigo');
  state = res.newState;

  // --- CASE 8 ---
  // Jugador ejecuta IR luz en cueva_enemigo con enemigo vivo → texto ir_luz_bloqueado_enemigo_vivo
  res = processCommand('IR luz', state);
  assert(
    res.error === 'navigation_blocked' && res.text.includes(enemigoScene.textos['ir_luz_bloqueado_enemigo_vivo']),
    'IR luz in cueva_enemigo with enemy alive returns ir_luz_bloqueado_enemigo_vivo'
  );

  // Defeat enemy using ATACAR
  res = processCommand('ATACAR', state);
  assert(res.newState.flags.first_enemy_defeated === true, 'ATACAR defeats the enemy');
  assert(res.text.includes(enemigoScene.textos['atacar_1']), 'ATACAR output includes atacar_1 description');
  state = res.newState;

  // Examine the body to find ganglio and pezuña, which grants body_examined flag and 1 fragment (total 10)
  res = processCommand('EXAMINAR criatura', state);
  assert(res.newState.flags.body_examined === true, 'Flag body_examined is set');
  assert(res.newState.dnaFragments === 10, 'Player gains 1 DNA fragment (total 10)');
  state = res.newState;

  // --- CASE 6 ---
  // Jugador ejecuta TOMAR ganglio → texto tomar_ganglio, objeto en inventario, efecto tóxico activo
  res = processCommand('TOMAR ganglio', state);
  assert(
    res.text.includes(enemigoScene.textos['tomar_ganglio']),
    'TOMAR ganglio returns tomar_ganglio description'
  );
  assert(res.newState.inventory.some(item => item.id === 'ganglio'), 'Ganglio is added to inventory');
  assert(
    res.newState.flags.dano_continuo === true && res.newState.flags.toxic_effect_active === true,
    'Toxic damage effect is active'
  );
  state = res.newState;

  // --- CASE 7 ---
  // Jugador ejecuta SOLTAR ganglio → texto soltar_ganglio, objeto eliminado del inventario
  res = processCommand('SOLTAR ganglio', state);
  assert(
    res.text.includes(enemigoScene.textos['soltar_ganglio']),
    'SOLTAR ganglio returns soltar_ganglio description'
  );
  assert(!res.newState.inventory.some(item => item.id === 'ganglio'), 'Ganglio is removed from inventory');
  assert(
    res.newState.flags.dano_continuo === false && res.newState.flags.toxic_effect_active === false,
    'Toxic damage effect is deactivated'
  );
  state = res.newState;

  // Take the pezuña weapon and equip it
  res = processCommand('TOMAR pezuña', state);
  state = res.newState;
  res = processCommand('EQUIPAR pezuña', state);
  state = res.newState;

  // Move to cueva_salida
  res = processCommand('IR luz', state);
  assert(res.newState.currentScene === 'cueva_salida', 'Successfully transition to cueva_salida');
  state = res.newState;

  // --- CASE 9 ---
  // Jugador ejecuta IR sendero en cueva_salida sin mutar → texto ir_sendero_bloqueado_antes_descanso
  // Note: first test that it is blocked before resting (optional, but good)
  res = processCommand('IR sendero', state);
  assert(
    res.error === 'navigation_blocked' && res.text.includes(salidaScene.textos['ir_sendero_bloqueado_antes_descanso']),
    'IR sendero before rest returns ir_sendero_bloqueado_antes_descanso'
  );

  // Perform rest
  res = processCommand('DESCANSAR', state);
  assert(res.newState.flags.first_rest_completed === true, 'First rest completed successfully');
  state = res.newState;

  // Now, try going to exterior after resting but before muting
  res = processCommand('IR sendero', state);
  assert(
    res.error === 'navigation_blocked' && res.text.includes(salidaScene.textos['ir_sendero_bloqueado_sin_mutar']),
    'IR sendero after rest but before muting returns ir_sendero_bloqueado_sin_mutar'
  );

  // --- CASE 10 ---
  // Jugador completa mutación → flag first_mutation_completed activo, texto mutacion_completada, IR sendero desbloqueado
  res = processCommand('MUTAR cognicion', state);
  assert(res.newState.flags.first_mutation_completed === true, 'Flag first_mutation_completed is set');
  assert(res.newState.dnaFragments === 0, 'DNA fragments are spent (10 - 10 = 0)');
  assert(res.newState.genes.cognition === 0.41, 'Cognition gene is mutated successfully to 0.41');
  assert(
    res.text.includes(salidaScene.textos['mutacion_completada']),
    'Mutation output includes mutacion_completada description'
  );
  state = res.newState;

  // Set mock token to simulate authenticated state for the online scene transition
  state.token = 'mock-test-token';

  // Try going to exterior again (should now be unlocked!)
  res = processCommand('IR sendero', state);
  assert(res.newState.currentScene === 'bosque_amanecer', 'Player successfully exits the cave to bosque_amanecer!');
  state = res.newState;

  // --- ONLINE SCENE: unified data-driven engine on bosque_amanecer ---

  // CASE 11: First OBSERVAR resolves observar_1 (casos) and grants the visited flag.
  res = processCommand('OBSERVAR', state);
  assert(res.text.includes('Observas el bosque por primera vez'), 'First OBSERVAR in bosque returns observar_1 (casos)');
  assert(res.newState.flags.bosque_amanecer_visitado === true, 'OBSERVAR grants bosque_amanecer_visitado');
  state = res.newState;

  // CASE 12: Second OBSERVAR resolves observar_repetido.
  res = processCommand('OBSERVAR', state);
  assert(res.text.includes('El bosque sigue igual'), 'Second OBSERVAR in bosque returns observar_repetido');
  state = res.newState;

  // CASE 13: EXAMINAR arbol (count-based) returns examinar_arbol the first time.
  res = processCommand('EXAMINAR arbol', state);
  assert(res.text.includes('Examinas el arbol con detalle'), 'First EXAMINAR arbol returns examinar_arbol');
  state = res.newState;

  // CASE 14: Second EXAMINAR arbol returns the exhausted text.
  res = processCommand('EXAMINAR arbol', state);
  assert(res.text.includes('Ya examinaste el arbol'), 'Second EXAMINAR arbol returns examinar_arbol_agotado');
  state = res.newState;

  // CASE 15: GUARDAR in a checkpoint scene (authenticated) triggers the save action.
  res = processCommand('GUARDAR', state);
  assert(
    res.asyncAction && res.asyncAction.type === 'save_checkpoint',
    'GUARDAR in bosque (checkpoint scene) triggers save_checkpoint'
  );

  console.log('\n--- TEST RUN RESULTS ---');
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log('------------------------\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution crashed:', err);
  process.exit(1);
});
