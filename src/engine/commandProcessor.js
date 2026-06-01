import { loadScene } from './contentLoader.js';
import { getActiveCommands, getAvailableObjects, evaluateCondition } from './sceneManager.js';
import { mutateGene, calculatePhenotype, getMutationDetails, updateMorphologyState } from './geneticEngine.js';
import { saveState } from './localStorage.js';
import { resolverCasos } from './conditions.js';

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
function formatStats(genes, dominantPhenotype, morfologia) {
  const vigor = Math.round((genes.metabolism * 10) * 10) / 10;
  const perception = Math.round((genes.cognition * 10) * 10) / 10;
  const tacticalCohesion = Math.round((genes.cohesion * 10) * 10) / 10;
  const adaptation = Math.round((genes.adaptability * 10) * 10) / 10;
  const integration = Math.round((genes.substrate * 10) * 10) / 10;

  let morfologiaStr = '';
  if (morfologia && morfologia.ramaBloqueada) {
    const { partes, refuerzos } = morfologia;
    const items = [];
    if (partes.piernas) items.push(`${partes.piernas} Piernas${refuerzos.piernas ? ` (+${refuerzos.piernas} Reforzadas)` : ''}`);
    if (partes.brazos) items.push(`${partes.brazos} Brazos${refuerzos.brazos ? ` (+${refuerzos.brazos} Reforzados)` : ''}`);
    if (partes.cuernos) items.push(`${partes.cuernos} Cuernos${refuerzos.cuernos ? ` (+${refuerzos.cuernos} Reforzados)` : ''}`);
    if (partes.patas) items.push(`${partes.patas} Patas${refuerzos.patas ? ` (+${refuerzos.patas} Reforzadas)` : ''}`);
    if (partes.alas) items.push(`${partes.alas} Alas${refuerzos.alas ? ` (+${refuerzos.alas} Reforzadas)` : ''}`);
    if (partes.piel) items.push(`Piel Endurecida${refuerzos.piel ? ` (Reforzada)` : ''}`);
    if (partes.caparazon) items.push(`Caparazón${refuerzos.caparazon ? ` (Reforzado)` : ''}`);
    
    if (items.length > 0) {
      morfologiaStr = `\n\n**Morfología:**\n- ${items.join('\n- ')}`;
    } else {
      morfologiaStr = `\n\n**Morfología:** Ninguna modificación activa.`;
    }
  }

  return `### **ESTADO**
**Fenotipo Dominante:** *${dominantPhenotype}*

| Estadística | Valor | Vector Genético |
| :--- | :---: | :--- |
| **Vigor** | ${vigor} | Metabolismo |
| **Percepción** | ${perception} | Cognición |
| **Cohesión Táctica** | ${tacticalCohesion} | Cohesión |
| **Adaptación** | ${adaptation} | Adaptabilidad |
| **Integración** | ${integration} | Sustrato |${morfologiaStr}`;
}

// Obtiene la escena unificada (definicion + textos) sin importar su origen:
// del registro local (escenas del prólogo empaquetadas) o del contenido ya
// descargado del backend (escenas posteriores). El motor es el mismo para ambas.
function getSceneData(sceneId, gameState) {
  try {
    return loadScene(sceneId);
  } catch (e) {
    const meta = gameState && gameState.activeSceneContent && gameState.activeSceneContent.metadata;
    if (meta && (meta.id === sceneId || gameState.currentScene === sceneId)) {
      return { ...meta, textos: meta.textos || {} };
    }
    throw e;
  }
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
  if (!command && verbInput !== 'admin') {
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

  // Admin Phenotype Command
  if (verbInput === 'admin' && words[1] === 'phenotype') {
    const id = parseInt(words[2], 10);
    if (isNaN(id) || id < 0 || id > 20) {
      return { text: 'ID inválido. Usa un número del 0 al 20.', newState: null };
    }
    
    // Gene mapping for each phenotype (0-20)
    const phenoMap = [
      { c: 0.31, a: 0.31, co: 0.31, m: 0.31, s: 0.31, cm: 0.31 }, // 0: Primordial Latente
      { c: 0.45, a: 0.45, co: 0.45, m: 0.45, s: 0.31, cm: 0.31 }, // 1: Primordial Despertado
      { c: 0.48, a: 0.48, co: 0.31, m: 0.31, s: 0.31, cm: 0.31 }, // 2: Primordial en Transicion
      { c: 0.55, a: 0.55, co: 0.31, m: 0.31, s: 0.31, cm: 0.31 }, // 3: Humanoide Emergente
      { c: 0.65, a: 0.65, co: 0.31, m: 0.31, s: 0.31, cm: 0.31 }, // 4: Humanoide Consolidado
      { c: 0.80, a: 0.80, co: 0.31, m: 0.31, s: 0.31, cm: 0.31 }, // 5: Humanoide Avanzado
      { c: 0.65, a: 0.65, co: 0.50, m: 0.50, s: 0.31, cm: 0.31 }, // 6: Humanoide Adaptado
      { c: 0.65, a: 0.65, co: 0.31, m: 0.31, s: 0.50, cm: 0.50 }, // 7: Humanoide Integrado
      { c: 0.65, a: 0.65, co: 0.50, m: 0.50, s: 0.48, cm: 0.48 }, // 8: Humanoide Pleno
      { c: 0.31, a: 0.31, co: 0.55, m: 0.55, s: 0.31, cm: 0.31 }, // 9: Insectoide Emergente
      { c: 0.31, a: 0.31, co: 0.65, m: 0.65, s: 0.31, cm: 0.31 }, // 10: Insectoide Consolidado
      { c: 0.31, a: 0.31, co: 0.80, m: 0.80, s: 0.31, cm: 0.31 }, // 11: Insectoide Avanzado
      { c: 0.50, a: 0.50, co: 0.65, m: 0.65, s: 0.31, cm: 0.31 }, // 12: Insectoide Pensante
      { c: 0.31, a: 0.31, co: 0.65, m: 0.65, s: 0.50, cm: 0.50 }, // 13: Insectoide Sintetico
      { c: 0.50, a: 0.50, co: 0.65, m: 0.65, s: 0.48, cm: 0.48 }, // 14: Insectoide Supremo
      { c: 0.31, a: 0.31, co: 0.31, m: 0.31, s: 0.55, cm: 0.55 }, // 15: Androide Emergente
      { c: 0.31, a: 0.31, co: 0.31, m: 0.31, s: 0.65, cm: 0.65 }, // 16: Androide Consolidado
      { c: 0.31, a: 0.31, co: 0.31, m: 0.31, s: 0.80, cm: 0.80 }, // 17: Androide Avanzado
      { c: 0.50, a: 0.50, co: 0.31, m: 0.31, s: 0.65, cm: 0.65 }, // 18: Androide Organico
      { c: 0.31, a: 0.31, co: 0.50, m: 0.50, s: 0.65, cm: 0.65 }, // 19: Androide Enjambre
      { c: 0.48, a: 0.48, co: 0.50, m: 0.50, s: 0.65, cm: 0.65 }, // 20: Androide Supremo
    ];
    
    const target = phenoMap[id];
    state.genes.cognition = target.c;
    state.genes.adaptability = target.a;
    state.genes.cohesion = target.co;
    state.genes.metabolism = target.m;
    state.genes.substrate = target.s;
    state.genes.collectiveMemory = target.cm;
    
    const oldPhenotype = state.dominantPhenotype;
    state.dominantPhenotype = calculatePhenotype(state.genes);
    state.morfologia = updateMorphologyState(state.dominantPhenotype, state.morfologia);
    saveState(state);
    
    return {
      text: `[ADMIN] Fenotipo forzado a ID ${id}: ${state.dominantPhenotype}. Genes ajustados.`,
      newState: state
    };
  }

  const sceneId = state.currentScene || 'cueva_capullos';

  if (!state.scenes[sceneId]) {
    state.scenes[sceneId] = {
      objetos_tomados: [],
      objetos_dinamicos: [],
      objetos_examinados: []
    };
  }

  // Escena actual unificada: del registro local o del contenido del backend.
  const scene = getSceneData(sceneId, gameState);

  // Determine visited scenes in this playthrough (incluida la actual)
  const visitedSceneIds = new Set(['cueva_capullos', ...Object.keys(state.scenes), sceneId]);

  // Check if there is a living enemy in the current scene
  const sceneEnemies = scene.enemigos || [];
  const hasLivingEnemy = sceneEnemies.some(e => e.vivo && !state.flags[e.flag_derrota]);

  let enabledCommandsSet = new Set();

  if (hasLivingEnemy) {
    // Restrict strictly to combat commands of the current scene
    getActiveCommands(scene, state).forEach(cmd => enabledCommandsSet.add(cmd));
  } else {
    // Accumulate the union of all unlocked commands across resolvable visited scenes
    visitedSceneIds.forEach(id => {
      try {
        const s = getSceneData(id, gameState);
        getActiveCommands(s, state).forEach(cmd => enabledCommandsSet.add(cmd));
      } catch {
        // Ignore scenes we can't resolve (e.g. online scenes not currently loaded)
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
      const textKey = resolverCasos(logicBlock, state, argInput);

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
      const textKey = resolverCasos(logicBlock, state, argInput);

      const descText = textKey ? getNarrativeText(scene, textKey, state.dominantPhenotype) : '';
      const statsBlock = formatStats(state.genes, state.dominantPhenotype, state.morfologia);
      textResult = descText ? `${descText}\n\n${statsBlock}` : statsBlock;
      break;
    }

    case 'REST': {
      const logicBlock = scene.logica_descansar || {};
      const textKey = resolverCasos(logicBlock, state, argInput);

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
      const textKey = resolverCasos(logicBlock, state, argInput);

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

        // Online (autenticado): la mutación es autoritativa en el servidor; se
        // resuelve mediante una acción asíncrona (useCommands llama a la API).
        if (state.token) {
          return {
            text: `[Asimilando Mutación...] Iniciando reprogramación del gen de ${argInput}...`,
            newState: state,
            asyncAction: { type: 'mutate', gene: geneKey, rawName: argInput }
          };
        }

        // Offline (prólogo, sin registro): la mutación se aplica localmente.
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
        state.morfologia = updateMorphologyState(state.dominantPhenotype, state.morfologia);

        const logicBlock = scene.logica_mutacion || {};
        if (logicBlock.flag_que_otorga) {
          state.flags[logicBlock.flag_que_otorga] = true;
        }

        textResult = ''; // Text will be concatenated via desbloqueos
      } else {
        // Just investigating panel availability
        const logicBlock = scene.logica_investigar || {};
        const textKey = resolverCasos(logicBlock, state, argInput);

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
      const textKey = resolverCasos(logicBlock, state, argInput);

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
        // Texto de bloqueo: primero la lista declarativa `bloqueos` (primer caso que
        // se cumple); si no hay, el `texto_bloqueado_id` por defecto.
        const blockedTextId = resolverCasos({ casos: salida.bloqueos }, state, target) || salida.texto_bloqueado_id;
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
        const textKey = resolverCasos(logicBlock, state, '');
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

      const logicBlock = scene.logica_examinar || {};

      // Estado de exámenes por escena (objetos ya inspeccionados).
      if (!state.scenes[sceneId].objetos_examinados) {
        state.scenes[sceneId].objetos_examinados = [];
      }
      const yaExaminado = state.scenes[sceneId].objetos_examinados.includes(targetObj.id);

      // Resolución por objeto: <id>_disponible / <id>_agotado.
      const textKey = yaExaminado
        ? logicBlock[`${targetObj.id}_agotado`]
        : logicBlock[`${targetObj.id}_disponible`];

      if (textKey) {
        textResult = getNarrativeText(scene, textKey, state.dominantPhenotype);
      } else {
        textResult = targetObj.descripcion_corta || `Es un objeto: ${targetObj.nombre}.`;
      }

      // Primera vez: recompensa de fragmentos y flag de la lógica.
      if (!yaExaminado) {
        if (targetObj.fragmentos_adn) {
          state.dnaFragments += targetObj.fragmentos_adn;
        }
        if (logicBlock.flag_que_otorga) {
          state.flags[logicBlock.flag_que_otorga] = true;
        }
        state.scenes[sceneId].objetos_examinados.push(targetObj.id);
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
      const textKey = resolverCasos(logicBlock, state, argInput);

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
