import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { loadScene } from '../engine/contentLoader.js';

// Garantiza esquema (http/https) y sin barra final; evita que una env var sin
// "https://" se interprete como ruta relativa al frontend (404). Ver gameStore.js.
const RAW_API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');
const API_URL = /^https?:\/\//i.test(RAW_API_URL) ? RAW_API_URL : `https://${RAW_API_URL}`;

export const useGame = () => {
  const store = useGameStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchScene = useCallback(async () => {
    const { currentScene, dominantPhenotype, token } = store;
    setIsLoading(true);
    setError(null);

    const isLocalScene = ['cueva_capullos', 'cueva_enemigo', 'cueva_salida'].includes(currentScene);

    // Scenario 1: Offline scenes (Scenes 1-3)
    if (!token || isLocalScene) {
      try {
        const scene = loadScene(currentScene);
        let arrivalText = scene.textos['llegada'] || '';
        
        // Handle cueva_enemigo reload after defeat to avoid showing combat arrival
        if (currentScene === 'cueva_enemigo' && store.flags.first_enemy_defeated) {
          const hasPezuna = store.inventory.some(item => item.id === 'pezuna');
          const hasGanglio = store.inventory.some(item => item.id === 'ganglio');
          let textKey = 'observar_cadaver_sin_examinar';
          if (store.flags.body_examined) {
            if (hasPezuna && hasGanglio) {
              textKey = 'observar_cadaver_examinado_sin_objetos';
            } else {
              textKey = 'observar_cadaver_examinado_con_objetos';
            }
          }
          arrivalText = scene.textos[textKey] || arrivalText;

          // In case the corpse was examined and items are untaken, modify notice
          if (textKey === 'observar_cadaver_examinado_con_objetos') {
            const corpseItemNames = [];
            if (!hasPezuna) corpseItemNames.push('pezuña');
            if (!hasGanglio) corpseItemNames.push('ganglio');
            if (corpseItemNames.length > 0) {
              arrivalText = arrivalText.replace(
                'Todavía puedes TOMAR los objetos que dejaste.',
                `Todavía puedes TOMAR los objetos que dejaste: ${corpseItemNames.join(' y ')}.`
              );
            }
          }

          // Append available takeable objects on the floor
          const staticObjs = scene.objetos || [];
          const sceneState = store.scenes?.[currentScene] || {};
          const dynamicObjs = sceneState.objetos_dinamicos || [];
          const takenIds = sceneState.objetos_tomados || [];
          const untakenStaticObjs = staticObjs.filter(obj => !takenIds.includes(obj.id));
          const allObjs = [...untakenStaticObjs, ...dynamicObjs];
          const visibleTakeables = allObjs.filter(obj => {
            if (obj.visible_desde_inicio === false) {
              if (obj.visible_con_flag) {
                return !!store.flags[obj.visible_con_flag];
              }
              return false;
            }
            return true;
          }).filter(obj => obj.tomable);

          if (visibleTakeables.length > 0) {
            const names = visibleTakeables.map(o => o.nombre || o.name).join(', ');
            arrivalText += `\n\nEn el suelo ves: ${names}.`;
          }
        }
        
        // Read live state (not the render snapshot) so a reset that leaves the
        // scene unchanged still detects the freshly-cleared, empty history.
        const liveHistory = useGameStore.getState().textHistory;
        const updates = {
          activeSceneContent: {
            metadata: scene,
            body: arrivalText
          }
        };
        // Only seed the terminal with the arrival text when the history is empty
        // (first load or after a reset). Navigation appends its own text instead.
        if (liveHistory.length === 0) {
          updates.textHistory = [{ type: 'output', text: arrivalText }];
        }
        store.updateState(updates);
      } catch (err) {
        console.error('Failed to load local scene:', err);
        setError('Error al cargar la escena local.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Scenario 2: Online scenes (Scenes 4+)
    if (token) {
      try {
        const res = await fetch(`${API_URL}/api/content/escena/${currentScene}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.texto) {
            // Clear history and initialize with the new scene body
            store.updateState({
              activeSceneContent: {
                metadata: {
                  id: data.id,
                  commands: data.comandos_disponibles,
                  next: data.siguiente
                },
                body: data.texto
              },
              textHistory: [
                { type: 'output', text: data.texto }
              ]
            });
          } else {
            setError('La escena devuelta por el servidor está vacía o es incorrecta.');
          }
        } else {
          setError(`Acceso restringido: no puedes cargar la escena "${currentScene}".`);
        }
      } catch (err) {
        console.error('Failed to fetch online scene:', err);
        setError('Error de conexión con el servidor.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
      setError(`Escena "${currentScene}" no disponible en modo offline.`);
    }
  }, [store.currentScene, store.dominantPhenotype, store.token]);

  // Fetch scene whenever scene, phenotype changes, or history is cleared (e.g. reset)
  const isHistoryEmpty = store.textHistory.length === 0;
  useEffect(() => {
    fetchScene();
  }, [fetchScene, isHistoryEmpty]);

  return {
    ...store,
    sceneData: store.activeSceneContent,
    isLoading,
    error,
    refreshScene: fetchScene
  };
};
