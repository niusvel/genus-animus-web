const STORAGE_KEY = 'genus_animus_state';
const VERSION = 1;

export const INITIAL_STATE = {
  version: VERSION,
  currentScene: 'cueva_capullos',
  dominantPhenotype: 'Primordial Latente',
  dnaFragments: 0,
  genes: {
    cognition: 0.31,
    adaptability: 0.31,
    cohesion: 0.31,
    metabolism: 0.31,
    substrate: 0.31,
    collectiveMemory: 0.31,
  },
  inventory: [], // Array of { id, name, equipped }
  flags: {}, // Map of flags
  textHistory: [], // Array of { type: 'input'|'output', text: string }
  defeatedEnemies: 0,
  scenes: {}, // Scene-specific states like dynamic objects, visited status, etc.
};

export const loadState = () => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (serializedState === null) {
      return INITIAL_STATE;
    }
    const state = JSON.parse(serializedState);
    if (state.version !== VERSION) {
      return INITIAL_STATE;
    }
    return state;
  } catch (err) {
    console.error('Failed to load local state:', err);
    return INITIAL_STATE;
  }
};

export const saveState = (state) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
};

export const clearState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear state from localStorage:', err);
  }
};
