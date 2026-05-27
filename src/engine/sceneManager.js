import { loadScene } from './contentLoader.js';

/**
 * Gets the active scene full structure.
 * @param {Object} gameState - The current game state.
 * @returns {Object} Full scene object.
 */
export function getActiveScene(gameState) {
  const sceneId = gameState.currentScene || 'cueva_capullos';
  return loadScene(sceneId);
}

/**
 * Evaluates a single scene condition against game state.
 * @param {Object} condition - Condition object { tipo, flag, ... }
 * @param {Object} gameState - The current game state.
 * @returns {boolean} True if met.
 */
export function evaluateCondition(condition, gameState) {
  if (!condition) return true;
  if (condition.tipo === 'flag') {
    return !!gameState.flags[condition.flag];
  }
  return false;
}

/**
 * Resolves the currently enabled commands for a scene.
 * @param {Object} scene - Full scene object.
 * @param {Object} gameState - The current game state.
 * @returns {string[]} List of active commands.
 */
export function getActiveCommands(scene, gameState) {
  const commands = new Set(scene.comandos_iniciales || []);

  if (scene.desbloqueos) {
    for (const d of scene.desbloqueos) {
      if (evaluateCondition(d.condicion, gameState)) {
        if (d.desbloquea_comandos) {
          d.desbloquea_comandos.forEach(cmd => commands.add(cmd));
        }
      }
    }
  }

  return Array.from(commands);
}

/**
 * Gets the currently available/visible objects in the scene.
 * Merges static objects with dynamic objects from state, excluding taken ones.
 * @param {Object} scene - Full scene object.
 * @param {Object} gameState - The current game state.
 * @returns {Object[]} List of visible object definitions.
 */
export function getAvailableObjects(scene, gameState) {
  const sceneId = scene.id;
  const staticObjs = scene.objetos || [];
  const sceneState = gameState.scenes?.[sceneId] || {};
  
  // Dynamic objects soltados por el jugador
  const dynamicObjs = sceneState.objetos_dinamicos || [];
  
  // Taken static objects IDs
  const takenIds = sceneState.objetos_tomados || [];

  // Filter out already taken static objects
  const activeStaticObjs = staticObjs.filter(obj => !takenIds.includes(obj.id));

  // Combine
  const allObjs = [...activeStaticObjs, ...dynamicObjs];

  // Filter by visibility conditions
  return allObjs.filter(obj => {
    if (obj.visible_desde_inicio === false) {
      if (obj.visible_con_flag) {
        return !!gameState.flags[obj.visible_con_flag];
      }
      return false;
    }
    return true;
  });
}

export default {
  getActiveScene,
  evaluateCondition,
  getActiveCommands,
  getAvailableObjects
};
