import { loadScene } from './contentLoader.js';
import { getActiveCommands, getAvailableObjects, evaluateCondition } from './sceneManager.js';
import { mutateGene, calculatePhenotype, getMutationDetails } from './geneticEngine.js';
import { saveState } from './localStorage.js';

// Command dictionary mapping Spanish verbs to English internal commands
export const COMMAND_MAPPING = {
  'observar': 'OBSERVE',
  'observe': 'OBSERVE',
  'mirar': 'OBSERVE',

  'escuchar': 'LISTEN',
  'listen': 'LISTEN',
  'oir': 'LISTEN',

  'ir': 'GO',
  'go': 'GO',
  'mover': 'GO',
  'moverse': 'GO',

  'examinar': 'EXAMINE',
  'examine': 'EXAMINE',
  'inspeccionar': 'EXAMINE',

  'tomar': 'TAKE',
  'take': 'TAKE',
  'recoger': 'TAKE',
  'coger': 'TAKE',

  'soltar': 'DROP',
  'drop': 'DROP',
  'descartar': 'DROP',
  'tirar': 'DROP',

  'equipar': 'EQUIP',
  'equip': 'EQUIP',

  'desequipar': 'UNEQUIP',
  'unequip': 'UNEQUIP',

  'usar': 'USE',
  'use': 'USE',

  'inventario': 'INVENTORY',
  'inventory': 'INVENTORY',
  'inv': 'INVENTORY',

  'fragmentos': 'FRAGMENTS',
  'fragments': 'FRAGMENTS',
  'dna': 'FRAGMENTS',

  'investigar': 'INVESTIGATE',
  'investigate': 'INVESTIGATE',
  'mutar': 'INVESTIGATE',

  'atacar': 'ATTACK',
  'attack': 'ATTACK',

  'defender': 'DEFEND',
  'defend': 'DEFEND',

  'descansar': 'REST',
  'rest': 'REST',

  'estado': 'STATUS',
  'status': 'STATUS',
  'stats': 'STATUS',

  'recordar': 'REMEMBER',
  'remember': 'REMEMBER',

  'cancelar': 'CANCEL',
  'cancel': 'CANCEL',

  'guardar': 'SAVE',
  'save': 'SAVE',

  'ayuda': 'HELP',
  'help': 'HELP',
  'h': 'HELP'
};

// Maps English command back to Spanish verb name used in the JSON definition files (e.g. logica_escuchar)
export const COMMAND_TO_SPANISH_VERB = {
  'OBSERVE': 'observar',
  'LISTEN': 'escuchar',
  'GO': 'ir',
  'EXAMINE': 'examinar',
  'TAKE': 'tomar',
  'DROP': 'soltar',
  'EQUIP': 'equipar',
  'UNEQUIP': 'desequipar',
  'USE': 'usar',
  'INVENTORY': 'inventario',
  'FRAGMENTS': 'fragmentos',
  'INVESTIGATE': 'investigar',
  'ATTACK': 'atacar',
  'DEFEND': 'defender',
  'REST': 'descansar',
  'STATUS': 'estado',
  'CANCEL': 'cancelar',
  'SAVE': 'guardar'
};

// Help descriptions in Spanish
export const ALL_HELP_COMMANDS = {
  'OBSERVAR': 'Describe detalladamente el entorno en el que te encuentras.',
  'ESCUCHAR': 'Presta atención a los sonidos o impulsos sutiles a tu alrededor.',
  'AYUDA': 'Muestra los comandos conocidos y sus descripciones en este momento.',
  'IR': 'Muévete hacia una dirección o zona (ej: "ir luz", "ir cueva").',
  'EXAMINAR': 'Inspecciona un objeto o elemento en detalle (ej: "examinar capullos").',
  'TOMAR': 'Recoge un objeto para guardarlo en tu inventario (ej: "tomar pezuna").',
  'SOLTAR': 'Deja caer un objeto de tu inventario (ej: "soltar ganglio").',
  'EQUIPAR': 'Coloca un objeto como equipo activo (ej: "equipar pezuna").',
  'DESEQUIPAR': 'Retira un objeto de tu equipamiento activo.',
  'USAR': 'Usa un objeto activamente de tu inventario.',
  'INVENTARIO': 'Muestra los objetos que llevas contigo en tu inventario.',
  'FRAGMENTOS': 'Consulta tus fragmentos de ADN acumulados.',
  'ATACAR': 'Realiza una acción ofensiva ante una amenaza física.',
  'DEFENDER': 'Adopta una postura defensiva ante un ataque inminente.',
  'DESCANSAR': 'Reposa para recuperar energías y asimilar cambios biológicos.',
  'ESTADO': 'Revisa tus estadísticas genéticas y tu fenotipo actual.',
  'INVESTIGAR': 'Accede a tu genoma y muestra las opciones de mutación disponibles.',
  'MUTAR': 'Gasta fragmentos de ADN para mejorar un gen (ej: "mutar cognicion").',
  'RECORDAR': 'Resume los eventos narrativos clave vividos en tu aventura.',
  'CANCELAR': 'Cierra el panel genético activo sin aplicar cambios.',
  'GUARDAR': 'Guarda tu progreso y estructura genética actual en el servidor cuando te encuentras en un punto de control (checkpoint).'
};

/**
 * Returns the narrative text block prioritizing phenotype-specific keys.
 */
function getNarrativeText(scene, key, phenotype) {
  if (phenotype) {
    const phenoId = phenotype.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const phenoKey = `fenotipo_${phenoId}_${key}`;
    if (scene.textos[phenoKey]) {
      return scene.textos[phenoKey];
    }
  }
  return scene.textos[key] || '';
}

/**
 * Checks command-specific logic condition.
 */
function checkCondition(key, state, target) {
  const flags = state.flags || {};
  const inventory = state.inventory || [];
  const normTarget = target ? target.toLowerCase().trim() : '';

  switch (key) {
    // Escuchar & Defender & Descansar
    case 'primera_vez':
      if (state.currentScene === 'cueva_capullos') {
        return !flags.cocoon_broken;
      }
      if (state.currentScene === 'cueva_salida') {
        return !flags.first_rest_completed;
      }
      return !flags.defended_once; // defender in cueva_enemigo

    case 'repetido':
      if (state.currentScene === 'cueva_capullos') {
        return !!flags.cocoon_broken;
      }
      if (state.currentScene === 'cueva_salida') {
        return !!flags.first_rest_completed;
      }
      return !!flags.defended_once; // defender in cueva_enemigo

    // Observar in cueva_capullos
    case 'sin_flag_observing':
      return !flags.observing;
    case 'capullos_no_examinados':
      return !flags.cocoons_examined;
    case 'capullos_examinados':
      return !!flags.cocoons_examined;

    // Examinar in cueva_capullos
    case 'capullos_disponible':
      return (normTarget === 'capullos' || normTarget === 'capullo') && !flags.cocoons_examined;
    case 'capullos_agotado':
      return (normTarget === 'capullos' || normTarget === 'capullo') && !!flags.cocoons_examined;

    // Observar in cueva_enemigo
    case 'enemigo_vivo':
      return !flags.first_enemy_defeated;
    case 'cadaver_sin_examinar':
      return !!flags.first_enemy_defeated && !flags.body_examined;
    case 'cadaver_examinado_con_objetos': {
      const hasPezuna = inventory.some(item => item.id === 'pezuna');
      const hasGanglio = inventory.some(item => item.id === 'ganglio');
      return !!flags.first_enemy_defeated && !!flags.body_examined && (!hasPezuna || !hasGanglio);
    }
    case 'cadaver_examinado_sin_objetos': {
      const hasPezuna = inventory.some(item => item.id === 'pezuna');
      const hasGanglio = inventory.some(item => item.id === 'ganglio');
      return !!flags.first_enemy_defeated && !!flags.body_examined && hasPezuna && hasGanglio;
    }

    // Escuchar in cueva_enemigo
    case 'tras_derrota':
      return !!flags.first_enemy_defeated;

    // Examinar in cueva_enemigo
    case 'criatura_sin_examinar':
      return normTarget === 'criatura' && !flags.body_examined;
    case 'criatura_ya_examinada':
      return normTarget === 'criatura' && !!flags.body_examined;

    // Tomar in cueva_enemigo
    case 'pezuna_duplicado':
      return (normTarget === 'pezuña' || normTarget === 'pezuna') && inventory.some(item => item.id === 'pezuna');
    case 'pezuna':
      return (normTarget === 'pezuña' || normTarget === 'pezuna');
    case 'ganglio':
      return normTarget === 'ganglio';

    // Soltar in cueva_enemigo
    case 'ganglio_no_en_inventario':
      return normTarget === 'ganglio' && !inventory.some(item => item.id === 'ganglio');

    // Observar in cueva_salida
    case 'antes_descanso':
      return !flags.first_rest_completed;
    case 'tras_descanso_sin_mutar':
      return !!flags.first_rest_completed && !flags.first_mutation_completed;
    case 'tras_mutar':
      return !!flags.first_mutation_completed;

    // Escuchar in cueva_salida
    case 'tras_descanso':
      return !!flags.first_rest_completed;

    // Estado in cueva_salida
    case 'tras_descanso_antes_mutar':
      return !!flags.first_rest_completed && !flags.first_mutation_completed;

    // Investigar in cueva_salida
    case 'disponible':
      return state.dnaFragments >= 10;
    case 'sin_fragmentos':
      return state.dnaFragments < 10;

    // Mutacion in cueva_salida
    case 'completada':
      return !!flags.first_mutation_completed;

    // Cancelar in cueva_salida
    case 'investigacion':
      return true;

    // Ir in cueva_salida
    case 'exterior_antes_descanso':
      return (normTarget === 'exterior' || normTarget === 'sendero') && !flags.first_rest_completed;
    case 'exterior_sin_mutar':
      return (normTarget === 'exterior' || normTarget === 'sendero') && !!flags.first_rest_completed && !flags.first_mutation_completed;
    case 'exterior':
      return (normTarget === 'exterior' || normTarget === 'sendero') && !!flags.first_mutation_completed;
    case 'cueva':
      return normTarget === 'cueva';

    default:
      if (key in flags) {
        return !!flags[key];
      }
      return false;
  }
}

/**
 * Evaluates scene unlocks and appends narratives.
 */
function evaluateUnlocks(scene, state, unlockedIds) {
  let extraText = '';
  if (!scene.desbloqueos) return extraText;

  for (const d of scene.desbloqueos) {
    if (evaluateCondition(d.condicion, state)) {
      if (!unlockedIds.includes(d.id)) {
        unlockedIds.push(d.id);

        if (d.flags_que_otorga) {
          d.flags_que_otorga.forEach(fl => {
            state.flags[fl] = true;
          });
        }

        if (d.texto_id) {
          const text = getNarrativeText(scene, d.texto_id, state.dominantPhenotype);
          if (text) {
            extraText += '\n\n' + text;
          }
        }
      }
    }
  }

  return extraText;
}

/**
 * Formats character genome table for mutation instruction.
 */
function formatGenesTable(genes) {
  const cognitionDetails = getMutationDetails(genes.cognition, true);
  const adaptabilityDetails = getMutationDetails(genes.adaptability, false);
  const cohesionDetails = getMutationDetails(genes.cohesion, false);
  const metabolismDetails = getMutationDetails(genes.metabolism, false);
  const substrateDetails = getMutationDetails(genes.substrate, true);
  const collectiveMemoryDetails = getMutationDetails(genes.collectiveMemory, false);

  return `
### **ESTRUCTURA GENÓMICA**
Usa el comando \`MUTAR [gen]\` (ej: **MUTAR cognicion**) para asimilar la mutación deseada.

| Vector Genético | Valor Actual | Coste | Finalidad y Efecto |
| :--- | :---: | :---: | :--- |
| **Cognición** | ${genes.cognition.toFixed(2)} | ${cognitionDetails.cost} ADN | Capacidad analítica, planificación y aprendizaje. *(Antagonista: Sustrato)* |
| **Adaptabilidad** | ${genes.adaptability.toFixed(2)} | ${adaptabilityDetails.cost} ADN | Versatilidad biológica y asimilación. *(Antagonista: Cohesión)* |
| **Cohesión** | ${genes.cohesion.toFixed(2)} | ${cohesionDetails.cost} ADN | Comportamiento colectivo y efectividad coordinada. *(Antagonista: Adaptabilidad)* |
| **Metabolismo** | ${genes.metabolism.toFixed(2)} | ${metabolismDetails.cost} ADN | Producción de energía y recuperación física. *(Antagonista: Memoria Col.)* |
| **Sustrato** | ${genes.substrate.toFixed(2)} | ${substrateDetails.cost} ADN | Integración con elementos bio-sintéticos. *(Antagonista: Cognición)* |
| **Memoria Colectiva** | ${genes.collectiveMemory.toFixed(2)} | ${collectiveMemoryDetails.cost} ADN | Multiplicador del techo de mejora de estadísticas. *(Antagonista: Metabolismo)* |
`;
}

/**
 * Formats character status stats.
 */
function formatStats(genes, dominantPhenotype) {
  const vigor = Math.round((genes.metabolism * 10) * 10) / 10;
  const perception = Math.round((genes.cognition * 10) * 10) / 10;
  const tacticalCohesion = Math.round((genes.cohesion * 10) * 10) / 10;
  const adaptation = Math.round((genes.adaptability * 10) * 10) / 10;
  const integration = Math.round((genes.substrate * 10) * 10) / 10;

  return `### **ESTADO**
**Fenotipo Dominante:** *${dominantPhenotype}*

| Estadística | Valor | Vector Genético |
| :--- | :---: | :--- |
| **Vigor** | ${vigor} | Metabolismo |
| **Percepción** | ${perception} | Cognición |
| **Cohesión Táctica** | ${tacticalCohesion} | Cohesión |
| **Adaptación** | ${adaptation} | Adaptabilidad |
| **Integración** | ${integration} | Sustrato |`;
}

/**
 * Processes a Spanish input command.
 * @param {string} inputText - User input.
 * @param {Object} gameState - Current state of the game.
 * @returns {Object} { text, newState, error }
 */
/**
 * Processes a command in an online scene (Scene 4+) served by the API.
 */
function processOnlineCommand(command, argInput, state, onlineScene) {
  const commands = onlineScene?.metadata?.commands || onlineScene?.commands || [];
  const mappedVerb = COMMAND_TO_SPANISH_VERB[command];

  // Normalize commands list for safe checking
  const upperCommands = commands.map(cmd => cmd.toUpperCase());
  const upperCommand = command.toUpperCase();
  const upperMappedVerb = mappedVerb ? mappedVerb.toUpperCase() : '';

  const isGlobalCommand = ['HELP', 'STATUS', 'INVENTORY', 'FRAGMENTS', 'INVESTIGATE', 'CANCEL', 'SAVE'].includes(upperCommand);
  const isAllowed = isGlobalCommand || upperCommands.includes(upperCommand) || upperCommands.includes(upperMappedVerb);

  if (!isAllowed) {
    return {
      text: `El comando "${mappedVerb || command}" no está disponible en esta zona.`,
      newState: null,
      error: 'command_not_available'
    };
  }

  let textResult = '';

  switch (command) {
    case 'HELP': {
      // Gather allowed commands: scene-specific + global commands
      const allowedSet = new Set(commands.map(c => c.toUpperCase()));
      const globalSpanish = ['AYUDA', 'ESTADO', 'INVENTARIO', 'FRAGMENTOS', 'INVESTIGAR', 'CANCELAR', 'GUARDAR'];
      globalSpanish.forEach(cmd => allowedSet.add(cmd));

      const allowed = Array.from(allowedSet).sort((a, b) => a.localeCompare(b));

      const lines = ['Comandos conocidos en este momento:'];
      allowed.forEach(cmd => {
        if (ALL_HELP_COMMANDS[cmd]) {
          lines.push(`- ${cmd}: ${ALL_HELP_COMMANDS[cmd]}`);
        }
      });
      textResult = lines.join('\n');
      break;
    }

    case 'OBSERVE':
    case 'LISTEN': {
      textResult = onlineScene?.body || 'No hay descripción disponible.';
      if (command === 'OBSERVE') {
        const fullScene = onlineScene?.metadata || onlineScene || {};
        const availableTakeables = getAvailableObjects(fullScene, state).filter(obj => obj.tomable);
        if (availableTakeables.length > 0) {
          const names = availableTakeables.map(o => o.nombre || o.name).join(', ');
          textResult += `\n\nEn el suelo ves: ${names}.`;
        }
      }
      break;
    }

    case 'STATUS': {
      const vigor = Math.round((state.genes.metabolism * 10) * 10) / 10;
      const perception = Math.round((state.genes.cognition * 10) * 10) / 10;
      const tacticalCohesion = Math.round((state.genes.cohesion * 10) * 10) / 10;
      const adaptation = Math.round((state.genes.adaptability * 10) * 10) / 10;
      const integration = Math.round((state.genes.substrate * 10) * 10) / 10;

      textResult = `### **ESTADO**
**Fenotipo Dominante:** *${state.dominantPhenotype}*

| Estadística | Valor | Vector Genético |
| :--- | :---: | :--- |
| **Vigor** | ${vigor} | Metabolismo |
| **Percepción** | ${perception} | Cognición |
| **Cohesión Táctica** | ${tacticalCohesion} | Cohesión |
| **Adaptación** | ${adaptation} | Adaptabilidad |
| **Integración** | ${integration} | Sustrato |`;
      break;
    }

    case 'INVENTORY': {
      if (!state.inventory || state.inventory.length === 0) {
        textResult = 'Tu inventario está vacío. No llevas ningún objeto físico.';
      } else {
        const items = state.inventory.map(item => `- ${item.name}${item.equipped ? ' (Equipado)' : ''}`).join('\n');
        textResult = `Inventario:\n${items}`;
      }
      break;
    }

    case 'FRAGMENTS': {
      textResult = `Fragmentos de ADN disponibles: ${state.dnaFragments}`;
      break;
    }

    case 'INVESTIGATE': {
      if (argInput) {
        const geneMap = {
          'cognición': 'cognition',
          'cognicion': 'cognition',
          'adaptabilidad': 'adaptability',
          'cohesión': 'cohesion',
          'cohesion': 'cohesion',
          'metabolismo': 'metabolism',
          'sustrato': 'substrate',
          'memoria_colectiva': 'collectiveMemory',
          'memoria colectiva': 'collectiveMemory'
        };

        const geneKey = geneMap[argInput.toLowerCase()];
        if (!geneKey) {
          return { text: `No reconozco el vector genético "${argInput}".`, newState: null, error: 'invalid_gene' };
        }

        return {
          text: `[Asimilando Mutación...] Iniciando reprogramación del gen de ${argInput}...`,
          newState: state,
          asyncAction: { type: 'mutate', gene: geneKey, rawName: argInput }
        };
      } else {
        state.flags.isInvestigating = true;
        textResult = 'El panel de tu estructura genética se abre ante tu percepción interna.\n' + formatGenesTable(state.genes);
      }
      break;
    }

    case 'CANCEL': {
      state.flags.isInvestigating = false;
      textResult = 'Cierras el acceso a tu estructura genética.';
      break;
    }

    case 'GO': {
      const target = argInput.toLowerCase().trim();

      // Try to find the exit dynamically from the salidas array first (handles multi-exit scenes)
      const salidas = onlineScene?.metadata?.salidas || onlineScene?.salidas || [];
      if (salidas.length > 0) {
        const salida = salidas.find(s => s.palabra_clave.toLowerCase() === target);
        if (!salida) {
          return { text: `No puedes ir hacia "${argInput}".`, newState: null, error: 'invalid_destination' };
        }

        state.currentScene = salida.destino;
        saveState(state);

        return {
          text: `Te diriges hacia la siguiente zona: ${target}...`,
          newState: state,
          error: null
        };
      }

      // Fallback: single nextScene
      const nextScene = onlineScene?.metadata?.next || onlineScene?.next;
      if (!nextScene) {
        return { text: 'No hay salidas visibles en esta zona.', newState: null, error: 'no_exit' };
      }

      const cleanNextName = nextScene.replace(/^\d+_/, '').toLowerCase();

      if (target && target !== cleanNextName && target !== nextScene.toLowerCase()) {
        return { text: `No puedes ir hacia "${argInput}".`, newState: null, error: 'invalid_destination' };
      }

      state.currentScene = nextScene;
      saveState(state);

      return {
        text: `Te diriges hacia la siguiente zona: ${cleanNextName.replace(/_/g, ' ')}...`,
        newState: state,
        error: null
      };
    }

    case 'SAVE': {
      const isCheckpoint = onlineScene?.metadata?.checkpoint || onlineScene?.checkpoint || false;
      if (!isCheckpoint) {
        return {
          text: 'No puedes guardar tu progreso aquí. Busca un punto de control seguro (checkpoint).',
          newState: null,
          error: 'no_checkpoint_scene'
        };
      }
      return {
        text: 'Iniciando guardado de progreso en el servidor...',
        newState: state,
        asyncAction: { type: 'save_checkpoint' }
      };
    }

    case 'EXAMINE': {
      textResult = `Inspeccionas ${argInput}, pero no encuentras nada inusual a simple vista.`;
      break;
    }

    default: {
      textResult = `Has ejecutado el comando: ${mappedVerb || command}.`;
      break;
    }
  }

  return {
    text: textResult,
    newState: state,
    error: null
  };
}

export function processCommand(inputText, gameState) {
  const cleanInput = inputText.trim().toLowerCase();
  if (!cleanInput) {
    return { text: 'Por favor, escribe un comando.', newState: null, error: 'empty_input' };
  }

  const words = cleanInput.split(/\s+/);
  const verbInput = words[0];
  const argInput = words.slice(1).join(' ');

  const command = COMMAND_MAPPING[verbInput];
  if (!command) {
    return {
      text: `No comprendo el verbo "${verbInput}". Escribe AYUDA para ver la lista de comandos disponibles.`,
      newState: null,
      error: 'unknown_command'
    };
  }

  // Clone state to perform updates cleanly
  const state = JSON.parse(JSON.stringify(gameState));
  if (!state.flags) state.flags = {};
  if (!state.inventory) state.inventory = [];
  if (!state.unlocked_desbloqueos) state.unlocked_desbloqueos = [];
  if (!state.scenes) state.scenes = {};

  const sceneId = state.currentScene || 'cueva_capullos';

  // Route online scenes to processOnlineCommand
  const isLocal = ['cueva_capullos', 'cueva_enemigo', 'cueva_salida'].includes(sceneId);
  if (!isLocal) {
    return processOnlineCommand(command, argInput, state, gameState.activeSceneContent);
  }

  if (!state.scenes[sceneId]) {
    state.scenes[sceneId] = {
      objetos_tomados: [],
      objetos_dinamicos: [],
      objetos_examinados: []
    };
  }

  const scene = loadScene(sceneId);

  // Determine visited scenes in this playthrough
  const visitedSceneIds = new Set(['cueva_capullos', ...Object.keys(state.scenes)]);

  // Check if there is a living enemy in the current scene
  const sceneEnemies = scene.enemigos || [];
  const hasLivingEnemy = sceneEnemies.some(e => e.vivo && !state.flags[e.flag_derrota]);

  let enabledCommandsSet = new Set();

  if (hasLivingEnemy) {
    // Restrict strictly to combat commands of the current scene
    getActiveCommands(scene, state).forEach(cmd => enabledCommandsSet.add(cmd));
  } else {
    // Accumulate the union of all unlocked commands across all visited scenes
    visitedSceneIds.forEach(id => {
      try {
        const s = loadScene(id);
        getActiveCommands(s, state).forEach(cmd => enabledCommandsSet.add(cmd));
      } catch (e) {
        // Ignore scene load errors
      }
    });
  }

  // AYUDA (HELP) should always be in the list of allowed commands
  enabledCommandsSet.add('AYUDA');

  if (scene.checkpoint) {
    enabledCommandsSet.add('GUARDAR');
  }

  const enabledCommands = Array.from(enabledCommandsSet);

  // Translate command list in JSON from Spanish to English for validation
  const englishEnabled = enabledCommands.map(cmd => COMMAND_MAPPING[cmd.toLowerCase()]);
  const allSceneCommands = [
    ...(scene.comandos_iniciales || []),
    ...(scene.comandos_desbloqueables || [])
  ].map(cmd => COMMAND_MAPPING[cmd.toLowerCase()]);

  // Check if command is locked in this scene
  // Allow GO command even if not officially enabled, because the blocked logic needs to catch it
  const isCommandAllowed = englishEnabled.includes(command) || command === 'HELP' || command === 'GO';
  if (!isCommandAllowed && allSceneCommands.includes(command)) {
    return {
      text: 'No puedes hacer eso todavía.',
      newState: null,
      error: 'command_locked'
    };
  }

  if (!isCommandAllowed) {
    return {
      text: `Comando "${command}" no disponible en la zona actual.`,
      newState: null,
      error: 'command_not_available'
    };
  }

  let textResult = '';

  // Execute Commands
  switch (command) {
    case 'OBSERVE': {
      const logicBlock = scene.logica_observar || {};
      let textKey = null;

      for (const [condKey, value] of Object.entries(logicBlock)) {
        if (condKey === 'flag_que_otorga') continue;
        if (checkCondition(condKey, state, argInput)) {
          textKey = value;
          break;
        }
      }

      if (textKey) {
        textResult = getNarrativeText(scene, textKey, state.dominantPhenotype);
        if (logicBlock.flag_que_otorga) {
          state.flags[logicBlock.flag_que_otorga] = true;
        }
      } else {
        textResult = 'Observas tu entorno.';
      }

      // 1. Dynamic formatting for cueva_enemigo corpse objects
      if (sceneId === 'cueva_enemigo' && textKey === 'observar_cadaver_examinado_con_objetos') {
        const available = getAvailableObjects(scene, state);
        const corpseItemNames = [];
        if (available.some(o => o.id === 'pezuna')) corpseItemNames.push('pezuña');
        if (available.some(o => o.id === 'ganglio')) corpseItemNames.push('ganglio');

        if (corpseItemNames.length > 0) {
          textResult = textResult.replace(
            'Todavía puedes TOMAR los objetos que dejaste.',
            `Todavía puedes TOMAR los objetos que dejaste: ${corpseItemNames.join(' y ')}.`
          );
        }
      }

      // 2. Append all takeable objects on the floor for all scenes
      const availableTakeables = getAvailableObjects(scene, state).filter(obj => obj.tomable);
      if (availableTakeables.length > 0) {
        const names = availableTakeables.map(o => o.nombre || o.name).join(', ');
        textResult += `\n\nEn el suelo ves: ${names}.`;
      }

      break;
    }

    case 'HELP': {
      const allowed = [...enabledCommands].sort((a, b) => a.localeCompare(b));
      const lines = ['Comandos conocidos en este momento:'];
      allowed.forEach(cmd => {
        if (ALL_HELP_COMMANDS[cmd]) {
          lines.push(`- ${cmd}: ${ALL_HELP_COMMANDS[cmd]}`);
        }
      });
      textResult = lines.join('\n');
      break;
    }

    case 'INVENTORY': {
      if (state.inventory.length === 0) {
        textResult = 'Tu inventario está vacío. No llevas ningún objeto físico.';
      } else {
        const items = state.inventory.map(item => `- ${item.name || item.nombre}${item.equipped ? ' (Equipado)' : ''}`).join('\n');
        textResult = `Inventario:\n${items}`;
      }
      break;
    }

    case 'FRAGMENTS': {
      textResult = `Fragmentos de ADN disponibles: ${state.dnaFragments}`;
      break;
    }

    case 'STATUS': {
      const logicBlock = scene.logica_estado || {};
      let textKey = null;

      // Find first condition that is met
      for (const [condKey, value] of Object.entries(logicBlock)) {
        if (condKey === 'flag_que_otorga') continue;
        if (checkCondition(condKey, state, argInput)) {
          textKey = value;
          break;
        }
      }

      const descText = textKey ? getNarrativeText(scene, textKey, state.dominantPhenotype) : '';
      const statsBlock = formatStats(state.genes, state.dominantPhenotype);
      textResult = descText ? `${descText}\n\n${statsBlock}` : statsBlock;
      break;
    }

    case 'REST': {
      const logicBlock = scene.logica_descansar || {};
      let textKey = null;

      for (const [condKey, value] of Object.entries(logicBlock)) {
        if (condKey === 'flag_que_otorga') continue;
        if (checkCondition(condKey, state, argInput)) {
          textKey = value;
          break;
        }
      }

      if (textKey) {
        textResult = getNarrativeText(scene, textKey, state.dominantPhenotype);
        if (logicBlock.flag_que_otorga) {
          state.flags[logicBlock.flag_que_otorga] = true;
        }
      } else {
        textResult = 'Descansas un momento, pero no sientes la necesidad de detenerte por más tiempo.';
      }
      break;
    }

    case 'CANCEL': {
      const logicBlock = scene.logica_cancelar || {};
      let textKey = null;

      for (const [condKey, value] of Object.entries(logicBlock)) {
        if (condKey === 'flag_que_otorga') continue;
        if (checkCondition(condKey, state, argInput)) {
          textKey = value;
          break;
        }
      }

      if (textKey) {
        textResult = getNarrativeText(scene, textKey, state.dominantPhenotype);
      } else {
        textResult = 'Cierras el acceso a tu estructura genética.';
      }

      state.flags.isInvestigating = false;
      break;
    }

    case 'INVESTIGATE': {
      // If specifying a gene to mutate (e.g. "MUTAR cognicion" / "INVESTIGAR cognicion")
      if (argInput) {
        const geneMap = {
          'cognición': 'cognition',
          'cognicion': 'cognition',
          'adaptabilidad': 'adaptability',
          'cohesión': 'cohesion',
          'cohesion': 'cohesion',
          'metabolismo': 'metabolism',
          'sustrato': 'substrate',
          'memoria_colectiva': 'collectiveMemory',
          'memoria colectiva': 'collectiveMemory'
        };

        const geneKey = geneMap[argInput.toLowerCase()];
        if (!geneKey) {
          return { text: `No reconozco el vector genético "${argInput}".`, newState: null, error: 'invalid_gene' };
        }

        // Apply mutation
        const result = mutateGene(state.genes, geneKey, state.dnaFragments);
        if (result.error) {
          let errorText = `No puedes realizar esa mutación: `;
          if (result.error === 'insufficient_fragments') errorText += 'Fragmentos de ADN insuficientes.';
          else if (result.error === 'gene_already_maximized') errorText += 'El gen ya está al máximo (1.00).';
          else errorText += result.error;
          return { text: errorText, newState: null, error: result.error };
        }

        // Apply changes
        state.genes = result.genes;
        state.dnaFragments -= result.cost;
        state.dominantPhenotype = calculatePhenotype(state.genes);

        const logicBlock = scene.logica_mutacion || {};
        if (logicBlock.flag_que_otorga) {
          state.flags[logicBlock.flag_que_otorga] = true;
        }

        textResult = ''; // Text will be concatenated via desbloqueos
      } else {
        // Just investigating panel availability
        const logicBlock = scene.logica_investigar || {};
        let textKey = null;

        for (const [condKey, value] of Object.entries(logicBlock)) {
          if (condKey === 'flag_que_otorga') continue;
          if (checkCondition(condKey, state, argInput)) {
            textKey = value;
            break;
          }
        }

        if (textKey) {
          textResult = getNarrativeText(scene, textKey, state.dominantPhenotype);
        } else {
          textResult = 'Accedes a tu genoma, pero no encuentras cambios que puedas realizar ahora.';
        }

        // Append the genes guide table!
        textResult += '\n' + formatGenesTable(state.genes);

        state.flags.isInvestigating = true;
      }
      break;
    }

    case 'DEFEND': {
      const logicBlock = scene.logica_defender || {};
      let textKey = null;

      for (const [condKey, value] of Object.entries(logicBlock)) {
        if (condKey === 'flag_que_otorga') continue;
        if (checkCondition(condKey, state, argInput)) {
          textKey = value;
          break;
        }
      }

      if (textKey) {
        textResult = getNarrativeText(scene, textKey, state.dominantPhenotype);
        if (logicBlock.flag_que_otorga) {
          state.flags[logicBlock.flag_que_otorga] = true;
        }
        state.flags.defended_once = true;
      } else {
        textResult = 'Te pones a la defensiva, alerta ante cualquier posible peligro.';
      }
      break;
    }

    case 'ATTACK': {
      const target = argInput.toLowerCase().trim();
      const sceneEnemies = scene.enemigos || [];
      const hasLivingEnemy = sceneEnemies.some(e => e.vivo && !state.flags[e.flag_derrota]);

      if (hasLivingEnemy) {
        const enemy = sceneEnemies.find(e => e.vivo && !state.flags[e.flag_derrota]);

        // If target is specified, validate it matches the enemy's name or ID
        if (target && target !== enemy.nombre.toLowerCase() && target !== enemy.id.toLowerCase()) {
          return {
            text: `No ves ningún "${argInput}" para atacar aquí.`,
            newState: null,
            error: 'enemy_not_found'
          };
        }

        // Defeat enemy!
        state.flags[enemy.flag_derrota] = true;
        state.defeatedEnemies += 1;
        textResult = ''; // Narrative block will be resolved and appended via evaluateUnlocks (atacar_1)
      } else {
        textResult = 'No hay ninguna amenaza inmediata que puedas atacar.';
      }
      break;
    }

    case 'SAVE': {
      const isCheckpoint = scene.checkpoint || false;
      if (!isCheckpoint) {
        return {
          text: 'No puedes guardar tu progreso aquí. Busca un punto de control seguro (checkpoint).',
          newState: null,
          error: 'no_checkpoint_scene'
        };
      }
      if (!state.token) {
        return {
          text: 'Debes estar conectado (sincronizado con el nexo) para poder guardar tu progreso en la nube.',
          newState: null,
          error: 'unauthenticated'
        };
      }
      return {
        text: 'Iniciando guardado de progreso en el servidor...',
        newState: state,
        asyncAction: { type: 'save_checkpoint' }
      };
    }

    case 'GO': {
      const target = argInput.toLowerCase().trim();
      const salida = (scene.salidas || []).find(s => s.palabra_clave.toLowerCase() === target);

      if (!salida) {
        return { text: `No puedes ir hacia "${argInput}".`, newState: null, error: 'invalid_destination' };
      }

      // Check requires flag
      const isBlocked = salida.requiere_flag && !state.flags[salida.requiere_flag];
      if (isBlocked) {
        // Resolve blocked text
        let blockedTextId = salida.texto_bloqueado_id;
        if (scene.id === 'cueva_salida' && (target === 'exterior' || target === 'sendero')) {
          if (!state.flags.first_rest_completed) {
            blockedTextId = salida.texto_bloqueado_antes_descanso_id;
          } else if (!state.flags.first_mutation_completed) {
            blockedTextId = salida.texto_bloqueado_sin_mutar_id;
          }
        }

        return {
          text: getNarrativeText(scene, blockedTextId, state.dominantPhenotype),
          newState: null,
          error: 'navigation_blocked'
        };
      }

      // Execute scene transition!
      const isDestLocal = ['cueva_capullos', 'cueva_enemigo', 'cueva_salida'].includes(salida.destino);
      if (!isDestLocal) {
        if (!state.token) {
          // Unauthenticated: intercept and trigger registration
          state.flags.triggerRegistration = true;
          return {
            text: 'Para avanzar más allá de este umbral y registrar tu evolución genética en el nexo central, debes sincronizar tu conciencia.\n\n(Iniciando interfaz de registro de usuario...)',
            newState: state,
            error: null
          };
        }

        // Authenticated: transition directly to online scene
        state.currentScene = salida.destino;

        let transitionText = '';
        if (salida.texto_transicion_id) {
          transitionText = getNarrativeText(scene, salida.texto_transicion_id, state.dominantPhenotype);
        }

        // Since we are authenticated, save state and let useGame.js fetch scene online
        saveState(state);

        return {
          text: transitionText || `Te adentras en la zona: ${salida.destino}...`,
          newState: state,
          error: null
        };
      }

      state.currentScene = salida.destino;

      // Load target scene
      const destScene = loadScene(salida.destino);
      const destSceneState = state.scenes[salida.destino] || { objetos_tomados: [], objetos_dinamicos: [], objetos_examinados: [] };
      state.scenes[salida.destino] = destSceneState;

      // Add scene visit flag if specified
      if (destScene.flags_que_otorga) {
        destScene.flags_que_otorga.forEach(fl => {
          state.flags[fl] = true;
        });
      }

      // Resolve optional transition text from source scene
      let transitionText = '';
      if (salida.texto_transicion_id) {
        transitionText = getNarrativeText(scene, salida.texto_transicion_id, state.dominantPhenotype);
      }

      // Find arrival text key in destination entries
      let arrivalText = '';
      if (salida.destino === 'cueva_enemigo' && state.flags.first_enemy_defeated) {
        const logicBlock = destScene.logica_observar || {};
        let textKey = null;
        for (const [condKey, value] of Object.entries(logicBlock)) {
          if (condKey === 'flag_que_otorga') continue;
          if (checkCondition(condKey, state, '')) {
            textKey = value;
            break;
          }
        }
        arrivalText = textKey ? getNarrativeText(destScene, textKey, state.dominantPhenotype) : '';
      } else {
        const entry = (destScene.entradas || []).find(e => e.origen === scene.id);
        const arrivalTextId = entry ? entry.texto_llegada_id : 'llegada';
        arrivalText = getNarrativeText(destScene, arrivalTextId, state.dominantPhenotype);
      }

      // Evaluate locks/unlocks of the new scene immediately
      const destUnlocksText = evaluateUnlocks(destScene, state, state.unlocked_desbloqueos);

      if (transitionText) {
        textResult = transitionText + '\n\n' + arrivalText + destUnlocksText;
      } else {
        textResult = arrivalText + destUnlocksText;
      }

      // Save state to localStorage immediately
      saveState(state);

      return {
        text: textResult,
        newState: state,
        error: null
      };
    }

    case 'EXAMINE': {
      const target = argInput.toLowerCase().trim();
      const availableObjs = getAvailableObjects(scene, state);
      const targetObj = availableObjs.find(o => o.nombre.toLowerCase() === target || o.id.toLowerCase() === target);

      if (!targetObj) {
        return { text: `No ves ningún "${argInput}" para examinar aquí.`, newState: null, error: 'object_not_found' };
      }

      const spanishVerb = COMMAND_TO_SPANISH_VERB[command] || 'examinar';
      const logicBlock = scene[`logica_${spanishVerb}`] || {};
      let textKey = null;

      // Check conditions
      for (const [condKey, value] of Object.entries(logicBlock)) {
        if (condKey === 'flag_que_otorga') continue;
        if (checkCondition(condKey, state, target)) {
          textKey = value;
          break;
        }
      }

      if (textKey) {
        textResult = getNarrativeText(scene, textKey, state.dominantPhenotype);

        if (!state.scenes[sceneId].objetos_examinados) {
          state.scenes[sceneId].objetos_examinados = [];
        }

        // Apply flags_que_otorga or specific object rewards
        if (!state.scenes[sceneId].objetos_examinados.includes(targetObj.id)) {
          // If the object gives DNA fragments, reward them on examine
          if (targetObj.fragmentos_adn && !state.flags[logicBlock.flag_que_otorga]) {
            state.dnaFragments += targetObj.fragmentos_adn;
          }
          state.scenes[sceneId].objetos_examinados.push(targetObj.id);
        }

        if (logicBlock.flag_que_otorga) {
          state.flags[logicBlock.flag_que_otorga] = true;
        }
      } else {
        textResult = targetObj.descripcion_corta || `Es un objeto: ${targetObj.nombre}.`;
      }
      break;
    }

    case 'TAKE': {
      const target = argInput.toLowerCase().trim();
      const availableObjs = getAvailableObjects(scene, state);
      const targetObj = availableObjs.find(o => o.nombre.toLowerCase() === target || o.id.toLowerCase() === target);

      const spanishVerb = COMMAND_TO_SPANISH_VERB[command] || 'tomar';
      const logicBlock = scene[`logica_${spanishVerb}`] || {};

      // If they already have it in the inventory
      if (state.inventory.some(item => item.id === target || item.name.toLowerCase() === target)) {
        const dupKey = `${targetObj?.id || target}_duplicado`;
        const textKey = logicBlock[dupKey];
        if (textKey) {
          return {
            text: getNarrativeText(scene, textKey, state.dominantPhenotype),
            newState: null,
            error: 'duplicate_item'
          };
        }
        return { text: `Ya llevas ${argInput} contigo.`, newState: null, error: 'duplicate_item' };
      }

      if (!targetObj) {
        return { text: `No ves ningún "${argInput}" para tomar aquí.`, newState: null, error: 'object_not_found' };
      }

      if (!targetObj.tomable) {
        return { text: `No puedes tomar "${argInput}".`, newState: null, error: 'object_not_takeable' };
      }

      // Add to inventory
      state.inventory.push({
        id: targetObj.id,
        name: targetObj.nombre || targetObj.name,
        equipped: false
      });

      // Remove from available/dynamic
      const isDynamic = (state.scenes[sceneId].objetos_dinamicos || []).some(o => o.id === targetObj.id);
      if (isDynamic) {
        state.scenes[sceneId].objetos_dinamicos = state.scenes[sceneId].objetos_dinamicos.filter(o => o.id !== targetObj.id);
      } else {
        state.scenes[sceneId].objetos_tomados.push(targetObj.id);
      }

      // Apply effects
      if (targetObj.toxico || targetObj.efecto_al_tomar === 'dano_continuo') {
        state.flags.dano_continuo = true;
        state.flags.toxic_effect_active = true;
      }

      // Resolve text
      const textKey = logicBlock[targetObj.id];
      textResult = textKey ? getNarrativeText(scene, textKey, state.dominantPhenotype) : `Has tomado: ${targetObj.nombre}.`;
      break;
    }

    case 'DROP': {
      const target = argInput.toLowerCase().trim();
      const spanishVerb = COMMAND_TO_SPANISH_VERB[command] || 'soltar';
      const logicBlock = scene[`logica_${spanishVerb}`] || {};

      const itemIndex = state.inventory.findIndex(item => item.id === target || item.name.toLowerCase() === target);

      if (itemIndex === -1) {
        const noItemKey = `${target}_no_en_inventario`;
        const textKey = logicBlock[noItemKey];
        if (textKey) {
          return {
            text: getNarrativeText(scene, textKey, state.dominantPhenotype),
            newState: null,
            error: 'item_not_in_inventory'
          };
        }
        return { text: `No tienes ningún "${argInput}" en tu inventario.`, newState: null, error: 'item_not_in_inventory' };
      }

      const item = state.inventory[itemIndex];
      state.inventory.splice(itemIndex, 1);

      // Add to scene dynamic objects
      if (!state.scenes[sceneId].objetos_dinamicos) {
        state.scenes[sceneId].objetos_dinamicos = [];
      }
      state.scenes[sceneId].objetos_dinamicos.push({
        id: item.id,
        nombre: item.name,
        name: item.name,
        tomable: true,
        examinable: false
      });

      // Clear toxic effect if applicable
      if (item.id === 'ganglio') {
        state.flags.dano_continuo = false;
        state.flags.toxic_effect_active = false;
      }

      // Resolve text
      const textKey = logicBlock[item.id];
      textResult = textKey ? getNarrativeText(scene, textKey, state.dominantPhenotype) : `Has soltado: ${item.name}.`;
      break;
    }

    case 'EQUIP': {
      const target = argInput.toLowerCase().trim();
      const item = state.inventory.find(item => item.id === target || item.name.toLowerCase() === target);

      if (!item) {
        return { text: `No tienes ningún "${argInput}" para equipar.`, newState: null, error: 'item_not_in_inventory' };
      }

      item.equipped = true;

      // Check if narrative text exists for equip_[itemId]
      const textKey = `equipar_${item.id}`;
      textResult = scene.textos[textKey] ? getNarrativeText(scene, textKey, state.dominantPhenotype) : `Te equipas: ${item.name}.`;
      break;
    }

    default: {
      // Fallback evaluation for general logic_[comando] blocks
      const spanishVerb = COMMAND_TO_SPANISH_VERB[command] || command.toLowerCase();
      const logicBlock = scene[`logica_${spanishVerb}`] || {};
      let textKey = null;

      for (const [condKey, value] of Object.entries(logicBlock)) {
        if (condKey === 'flag_que_otorga') continue;
        if (checkCondition(condKey, state, argInput)) {
          textKey = value;
          break;
        }
      }

      if (textKey) {
        textResult = getNarrativeText(scene, textKey, state.dominantPhenotype);
        if (logicBlock.flag_que_otorga) {
          state.flags[logicBlock.flag_que_otorga] = true;
        }
      } else {
        textResult = `Has ejecutado: ${command}.`;
      }
      break;
    }
  }

  // Evaluate unlocks for the current scene
  const unlocksText = evaluateUnlocks(scene, state, state.unlocked_desbloqueos);
  textResult += unlocksText;

  // Persist game state
  saveState(state);

  return {
    text: textResult,
    newState: state,
    error: null
  };
}

export default {
  COMMAND_MAPPING,
  COMMAND_TO_SPANISH_VERB,
  ALL_HELP_COMMANDS,
  processCommand
};
