import { create } from 'zustand';
import { loadState, saveState, clearState, INITIAL_STATE } from '../engine/localStorage.js';
import { calculatePhenotype, mutateGene } from '../engine/geneticEngine.js';

// API base URL helper.
// Garantiza que la URL tenga esquema (http/https) y sin barra final. Si la env var
// se configura sin "https://" (p.ej. "mi-api.up.railway.app"), fetch la trataría como
// ruta relativa y apuntaría al propio frontend, devolviendo un 404.
const RAW_API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').trim().replace(/\/+$/, '');
const API_URL = /^https?:\/\//i.test(RAW_API_URL) ? RAW_API_URL : `https://${RAW_API_URL}`;

const local = loadState();

export const useGameStore = create((set, get) => ({
  // Authentication state
  token: localStorage.getItem('genus_animus_token') || null,
  user: localStorage.getItem('genus_animus_user') ? JSON.parse(localStorage.getItem('genus_animus_user')) : null,

  // Game state (in English)
  currentScene: local.currentScene,
  dominantPhenotype: local.dominantPhenotype,
  dnaFragments: local.dnaFragments,
  genes: { ...local.genes },
  inventory: [...local.inventory],
  flags: { ...local.flags },
  textHistory: [...local.textHistory],
  defeatedEnemies: local.defeatedEnemies,
  activeSceneContent: { metadata: {}, body: '' },
  checkpoints: [],

  // Setters and Actions
  setToken: (token) => {
    if (token) {
      localStorage.setItem('genus_animus_token', token);
    } else {
      localStorage.removeItem('genus_animus_token');
    }
    set({ token });
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('genus_animus_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('genus_animus_user');
    }
    set({ user });
  },

  initializeGame: async () => {
    const { token } = get();
    if (token) {
      // Authenticated: Fetch state from server
      try {
        const res = await fetch(`${API_URL}/api/game/state`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const serverState = await res.json();
          set({
            currentScene: serverState.current_scene || 'bosque_amanecer',
            dominantPhenotype: serverState.fenotipo_dominante || 'Primordial Despertado',
            dnaFragments: serverState.fragmentos_adn || 0,
            genes: {
              cognition: serverState.genes?.cognicion ?? 0.31,
              adaptability: serverState.genes?.adaptabilidad ?? 0.31,
              cohesion: serverState.genes?.cohesion ?? 0.31,
              metabolism: serverState.genes?.metabolismo ?? 0.31,
              substrate: serverState.genes?.sustrato ?? 0.31,
              collectiveMemory: serverState.genes?.memoria_colectiva ?? 0.31,
            },
            inventory: serverState.inventario || [],
            flags: serverState.flags || {},
            defeatedEnemies: serverState.enemigos_derrotados || 1,
            // Keep text history local
            textHistory: [
              { type: 'output', text: 'Conexión con el servidor establecida. Progreso sincronizado.' }
            ]
          });
          return;
        } else if (res.status === 401) {
          // Token expired or invalid
          get().logout();
        }
      } catch (err) {
        console.error('Failed to sync game state with server:', err);
      }
    }

    // Fallback: Local offline state from localStorage
    const localData = loadState();
    set({
      currentScene: localData.currentScene,
      dominantPhenotype: localData.dominantPhenotype,
      dnaFragments: localData.dnaFragments,
      genes: localData.genes,
      inventory: localData.inventory || [],
      flags: localData.flags || {},
      morfologia: localData.morfologia || null,
      textHistory: localData.textHistory || [],
      defeatedEnemies: localData.defeatedEnemies,
    });
  },

  updateState: (changes) => {
    set((state) => {
      const newState = { ...state, ...changes };
      
      const localFormat = {
        version: 1,
        currentScene: newState.currentScene,
        dominantPhenotype: newState.dominantPhenotype,
        dnaFragments: newState.dnaFragments,
        genes: newState.genes,
        inventory: newState.inventory,
        flags: newState.flags,
        morfologia: newState.morfologia,
        textHistory: newState.textHistory,
        defeatedEnemies: newState.defeatedEnemies,
      };
      saveState(localFormat);
      
      return changes;
    });
  },

  addOutput: (text) => {
    const history = get().textHistory;
    get().updateState({
      textHistory: [...history, { type: 'output', text }]
    });
  },

  addInput: (text) => {
    const history = get().textHistory;
    get().updateState({
      textHistory: [...history, { type: 'input', text }]
    });
  },

  clearTextHistory: () => {
    get().updateState({ textHistory: [] });
  },

  mutateGeneAction: async (geneName) => {
    const { genes, dnaFragments, token } = get();

    if (token) {
      // Authenticated mutation via server
      try {
        const res = await fetch(`${API_URL}/api/game/mutate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ gen: geneName })
        });
        if (res.ok) {
          const data = await res.json();
          // Map backend response back to frontend state
          const updatedGenes = {
            cognition: data.genes?.cognicion ?? genes.cognition,
            adaptability: data.genes?.adaptabilidad ?? genes.adaptability,
            cohesion: data.genes?.cohesion ?? genes.cohesion,
            metabolism: data.genes?.metabolismo ?? genes.metabolism,
            substrate: data.genes?.sustrato ?? genes.substrate,
            collectiveMemory: data.genes?.memoria_colectiva ?? genes.collectiveMemory,
          };
          const updatedPhenotype = data.fenotipo_dominante;
          
          get().updateState({
            genes: updatedGenes,
            dnaFragments: data.fragmentos_adn,
            dominantPhenotype: updatedPhenotype
          });
          return { success: true };
        } else {
          const errData = await res.json();
          return { error: errData.error || 'mutation_failed' };
        }
      } catch (err) {
        console.error('Failed mutation API call:', err);
        return { error: 'network_error' };
      }
    } else {
      // Offline mutation
      const result = mutateGene(genes, geneName, dnaFragments);
      if (result.error) {
        return { error: result.error };
      }
      
      const newPhenotype = calculatePhenotype(result.genes);
      get().updateState({
        genes: result.genes,
        dnaFragments: dnaFragments - result.cost,
        dominantPhenotype: newPhenotype
      });

      return { success: true };
    }
  },

  registerAndMigrate: async (email, code, genName) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          codigo: code,
          gen_mutated: genName // will be mapped on backend
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        return { error: errData.error || 'registration_failed' };
      }

      const data = await res.json();
      
      // Store token and user
      get().setToken(data.token);
      get().setUser(data.user);

      // Clear offline state
      clearState();

      // Load server-calculated state
      await get().initializeGame();

      return { success: true };
    } catch (err) {
      console.error('Failed registration process:', err);
      return { error: 'network_error' };
    }
  },

  login: async (email, code) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, codigo: code })
      });

      if (!res.ok) {
        const errData = await res.json();
        return { error: errData.error || 'login_failed' };
      }

      const data = await res.json();
      get().setToken(data.token);
      get().setUser(data.user);

      // Load state from server
      await get().initializeGame();

      return { success: true };
    } catch (err) {
      console.error('Failed login process:', err);
      return { error: 'network_error' };
    }
  },

  logout: () => {
    get().setToken(null);
    get().setUser(null);
    // Clear and reset local store to INITIAL_STATE
    set({
      currentScene: INITIAL_STATE.currentScene,
      dominantPhenotype: INITIAL_STATE.dominantPhenotype,
      dnaFragments: INITIAL_STATE.dnaFragments,
      genes: { ...INITIAL_STATE.genes },
      inventory: [...INITIAL_STATE.inventory],
      flags: { ...INITIAL_STATE.flags },
      morfologia: INITIAL_STATE.morfologia,
      textHistory: [],
      defeatedEnemies: INITIAL_STATE.defeatedEnemies,
      activeSceneContent: { metadata: {}, body: '' },
    });
    clearState();
  },

  saveCheckpointAction: async () => {
    const { token, currentScene, defeatedEnemies, genes, dnaFragments, dominantPhenotype, morfologia, inventory, flags } = get();
    if (!token) return { error: 'unauthenticated' };

    try {
      const res = await fetch(`${API_URL}/api/game/checkpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_scene: currentScene,
          defeated_enemies: defeatedEnemies,
          genes,
          dna_fragments: dnaFragments,
          dominant_phenotype: dominantPhenotype,
          morfologia,
          inventory,
          flags
        })
      });

      if (res.ok) {
        const data = await res.json();
        await get().fetchCheckpoints();
        return { success: true, checkpointName: data.checkpointName };
      } else {
        const errData = await res.json();
        return { error: errData.error || 'save_failed' };
      }
    } catch (err) {
      console.error('Failed to save checkpoint:', err);
      return { error: 'network_error' };
    }
  },

  fetchCheckpoints: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/game/checkpoints`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        set({ checkpoints: data });
      }
    } catch (err) {
      console.error('Failed to fetch checkpoints:', err);
    }
  },

  loadCheckpointAction: async (checkpointId) => {
    const { token } = get();
    if (!token) return { error: 'unauthenticated' };

    try {
      const res = await fetch(`${API_URL}/api/game/checkpoints/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ checkpointId })
      });

      if (res.ok) {
        const data = await res.json();
        
        set({
          currentScene: data.escena_actual,
          dominantPhenotype: data.fenotipo_dominante,
          dnaFragments: data.fragmentos_adn,
          genes: {
            cognition: data.genes?.cognicion ?? 0.31,
            adaptability: data.genes?.adaptabilidad ?? 0.31,
            cohesion: data.genes?.cohesion ?? 0.31,
            metabolism: data.genes?.metabolismo ?? 0.31,
            substrate: data.genes?.sustrato ?? 0.31,
            collectiveMemory: data.genes?.memoria_colectiva ?? 0.31,
          },
          inventory: data.inventario || [],
          flags: data.flags || {},
          morfologia: data.morfologia || null,
          defeatedEnemies: data.enemigos_derrotados || 1,
          textHistory: []
        });

        clearState();

        const localFormat = {
          version: 1,
          currentScene: data.escena_actual,
          dominantPhenotype: data.fenotipo_dominante,
          dnaFragments: data.fragmentos_adn,
          genes: {
            cognition: data.genes?.cognicion ?? 0.31,
            adaptability: data.genes?.adaptabilidad ?? 0.31,
            cohesion: data.genes?.cohesion ?? 0.31,
            metabolism: data.genes?.metabolismo ?? 0.31,
            substrate: data.genes?.sustrato ?? 0.31,
            collectiveMemory: data.genes?.memoria_colectiva ?? 0.31,
          },
          inventory: data.inventario || [],
          flags: data.flags || {},
          morfologia: data.morfologia || null,
          textHistory: [],
          defeatedEnemies: data.enemigos_derrotados || 1,
        };
        saveState(localFormat);

        return { success: true };
      } else {
        const errData = await res.json();
        return { error: errData.error || 'load_failed' };
      }
    } catch (err) {
      console.error('Failed to load checkpoint:', err);
      return { error: 'network_error' };
    }
  },

  resetGame: () => {
    get().logout();
    get().initializeGame();
  }
}));
