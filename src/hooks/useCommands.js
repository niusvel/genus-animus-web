import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { processCommand } from '../engine/commandProcessor.js';

export const useCommands = () => {
  const store = useGameStore();

  const executeCommand = useCallback((inputText) => {
    if (!inputText || !inputText.trim()) return;

    // 1. Extract only the serializable state slice to avoid stringifying store functions
    const stateSlice = {
      token: store.token,
      currentScene: store.currentScene,
      dominantPhenotype: store.dominantPhenotype,
      dnaFragments: store.dnaFragments,
      genes: store.genes,
      inventory: store.inventory,
      flags: store.flags,
      textHistory: store.textHistory,
      defeatedEnemies: store.defeatedEnemies,
      unlocked_desbloqueos: store.unlocked_desbloqueos || [],
      scenes: store.scenes || {},
      activeSceneContent: store.activeSceneContent
    };

    // 2. Process command using current state slice
    const result = processCommand(inputText, stateSlice);

    // 2. Build new history (clearing the console of previous text)
    const newHistory = [
      { type: 'input', text: inputText }
    ];
    if (result.text) {
      newHistory.push({ type: 'output', text: result.text });
    }

    // 3. Update state with new history and state changes
    store.updateState({
      ...(result.newState || {}),
      textHistory: newHistory
    });

    // 4. Handle any async actions (like online mutation)
    if (result.asyncAction && result.asyncAction.type === 'mutate') {
      const { gene, rawName } = result.asyncAction;
      store.mutateGeneAction(gene).then(res => {
        if (res.success) {
          // Fetch updated store values after async mutation completes
          const updatedStore = useGameStore.getState();
          store.addOutput(`[Mutación Asimilada] El gen de "${rawName}" ha aumentado su valor. Tu fenotipo actual es: ${updatedStore.dominantPhenotype}.`);
        } else {
          let errorMsg = 'Error al asimilar la mutación.';
          if (res.error === 'insufficient_fragments') {
            errorMsg = 'Fragmentos de ADN insuficientes.';
          } else if (res.error === 'gene_already_maximized') {
            errorMsg = 'El gen ya está al máximo (1.00).';
          }
          store.addOutput(`[Error de Mutación] No se pudo asimilar el cambio: ${errorMsg}`);
        }
      }).catch(err => {
        store.addOutput(`[Error de Red] No se pudo conectar con el servidor: ${err.message}`);
      });
    }

    if (result.asyncAction && result.asyncAction.type === 'save_checkpoint') {
      store.saveCheckpointAction().then(res => {
        if (res.success) {
          const sceneNames = {
            'cueva_capullos': 'Los Nueve Capullos',
            'cueva_enemigo': 'El Primer Enemigo',
            'cueva_salida': 'La Salida',
            'bosque_amanecer': 'El Bosque del Amanecer'
          };
          const name = sceneNames[res.checkpointName] || res.checkpointName;
          store.addOutput(`[Sincronización Exitosa] Progreso guardado en el checkpoint: "${name}".`);
        } else {
          let errorMsg = 'Error al sincronizar con el nexo.';
          if (res.error === 'unauthenticated') {
            errorMsg = 'Debes estar conectado para guardar.';
          } else if (res.error === 'no_checkpoint_scene') {
            errorMsg = 'No es una zona de checkpoint válida.';
          }
          store.addOutput(`[Error de Sincronización] No se pudo guardar la partida: ${errorMsg}`);
        }
      }).catch(err => {
        store.addOutput(`[Error de Red] No se pudo conectar con el servidor: ${err.message}`);
      });
    }
  }, [store]);

  return {
    executeCommand
  };
};
export default useCommands;
