/**
 * Genetic Engine for Genus Animus
 * Manages gene mutation, costs, antagonist penalties, and phenotype calculation.
 */

export const ANTAGONISTS = {
  cognition: { target: 'substrate', weak: true },
  adaptability: { target: 'cohesion', weak: false },
  cohesion: { target: 'adaptability', weak: false },
  metabolism: { target: 'collectiveMemory', weak: false },
  substrate: { target: 'cognition', weak: true },
  collectiveMemory: { target: 'metabolism', weak: false }
};

/**
 * Calculates the mutation cost and increments/decrements for a gene based on its current value.
 */
export const getMutationDetails = (currentValue, isWeakTension = false) => {
  let cost = 10;
  let increase = 0.10;
  let decrease = 0.03;

  if (currentValue >= 0.80) {
    cost = 30;
    decrease = 0.05;
  } else if (currentValue >= 0.60) {
    cost = 20;
    decrease = 0.04;
  }

  // If weak tension, reduce the antagonist penalty by half (e.g. -0.015 instead of -0.03)
  if (isWeakTension) {
    decrease = Math.round((decrease / 2) * 1000) / 1000;
  }

  return { cost, increase, decrease };
};

/**
 * Mutates a gene. Returns the updated genes and cost if successful, or an error.
 */
export const mutateGene = (genes, geneName, dnaFragments) => {
  const currentVal = genes[geneName];
  if (currentVal >= 1.00) {
    return { error: 'gene_already_maximized' };
  }

  const antagonistInfo = ANTAGONISTS[geneName];
  const { cost, increase, decrease } = getMutationDetails(currentVal, antagonistInfo?.weak);

  if (dnaFragments < cost) {
    return { error: 'insufficient_fragments' };
  }

  const newGenes = { ...genes };
  
  // Apply increase
  newGenes[geneName] = Math.min(1.00, Math.round((currentVal + increase) * 100) / 100);

  // Apply antagonist penalty if applicable
  if (antagonistInfo) {
    const antName = antagonistInfo.target;
    const antVal = genes[antName];
    const newAntVal = Math.max(0.01, Math.round((antVal - decrease) * 100) / 100);
    newGenes[antName] = newAntVal;
  }

  return {
    genes: newGenes,
    cost
  };
};

/**
 * Computes cluster averages and maps them to one of the 21 Spanish phenotypes.
 */
export const calculatePhenotype = (genes) => {
  const { cognition, adaptability, cohesion, metabolism, substrate, collectiveMemory } = genes;

  // 1. Calculate cluster averages
  const metabolic = (cognition + adaptability) / 2;
  const structural = (cohesion + metabolism) / 2;
  const synthetic = (substrate + collectiveMemory) / 2;

  const clusters = [
    { name: 'metabolic', value: metabolic, base: 'Humanoide' },
    { name: 'structural', value: structural, base: 'Insectoide' },
    { name: 'synthetic', value: synthetic, base: 'Androide' }
  ];

  // Sort to find dominant and secondary clusters
  clusters.sort((a, b) => b.value - a.value);

  const dominant = clusters[0];
  const secondary1 = clusters[1];
  const secondary2 = clusters[2];

  // 2. Primordial rules (if no cluster average > 0.50)
  if (metabolic <= 0.50 && structural <= 0.50 && synthetic <= 0.50) {
    const allGenes = [cognition, adaptability, cohesion, metabolism, substrate, collectiveMemory];
    const maxGene = Math.max(...allGenes);

    if (maxGene < 0.40) {
      return 'Primordial Latente';
    } else if (maxGene >= 0.40 && maxGene <= 0.50) {
      const diffDominantSecondary = Math.round((dominant.value - secondary1.value) * 10000) / 10000;
      if (diffDominantSecondary <= 0.05) {
        return 'Primordial Despertado';
      }
      return 'Primordial en Transición';
    } else {
      return 'Primordial en Transición';
    }
  }

  // 3. Dominant cluster determines base
  const base = dominant.base;
  const val = dominant.value;

  // Grade based on dominant value
  let grade = '';
  if (val >= 0.50 && val <= 0.60) {
    grade = 'Emergente';
  } else if (val > 0.60 && val <= 0.75) {
    grade = 'Consolidado';
  } else {
    grade = 'Avanzado';
  }

  // Check secondary modifiers (if they exceed 0.45)
  const sec1Active = secondary1.value > 0.45;
  const sec2Active = secondary2.value > 0.45;

  if (base === 'Humanoide') {
    if (sec1Active && sec2Active) {
      return 'Humanoide Pleno';
    }
    if (sec1Active || sec2Active) {
      const activeSecName = sec1Active ? secondary1.name : secondary2.name;
      if (activeSecName === 'structural') return 'Humanoide Adaptado';
      if (activeSecName === 'synthetic') return 'Humanoide Integrado';
    }
    return `Humanoide ${grade}`;
  }

  if (base === 'Insectoide') {
    if (sec1Active && sec2Active) {
      return 'Insectoide Supremo';
    }
    if (sec1Active || sec2Active) {
      const activeSecName = sec1Active ? secondary1.name : secondary2.name;
      if (activeSecName === 'metabolic') return 'Insectoide Pensante';
      if (activeSecName === 'synthetic') return 'Insectoide Sintético';
    }
    return `Insectoide ${grade}`;
  }

  if (base === 'Androide') {
    if (sec1Active && sec2Active) {
      return 'Androide Supremo';
    }
    if (sec1Active || sec2Active) {
      const activeSecName = sec1Active ? secondary1.name : secondary2.name;
      if (activeSecName === 'metabolic') return 'Androide Orgánico';
      if (activeSecName === 'structural') return 'Androide Enjambre';
    }
    return `Androide ${grade}`;
  }

  return 'Primordial Latente';
};

/**
 * Maps a phenotype string to a CSS class name.
 */
export const getThemeFromPhenotype = (phenotype) => {
  if (!phenotype) return 'theme-primordial';
  
  const lower = phenotype.toLowerCase();
  if (lower.includes('humanoide') || lower.includes('humanoid')) {
    return 'theme-humanoid';
  }
  if (lower.includes('insectoide') || lower.includes('insectoid')) {
    return 'theme-insectoid';
  }
  if (lower.includes('androide') || lower.includes('android')) {
    return 'theme-android';
  }
  return 'theme-primordial';
};

export const updateMorphologyState = (phenotype, currentState) => {
  let state = currentState;
  if (!state) {
    state = {
      ramaBloqueada: null,
      puntosEstructuralesGanados: 0,
      puntosEstructuralesGastados: 0,
      puntosRefuerzoGanados: 0,
      puntosRefuerzoGastados: 0,
      partes: { piernas: 0, brazos: 0, cuernos: 0, piel: false, patas: 0, alas: 0, caparazon: false },
      refuerzos: { piernas: 0, brazos: 0, cuernos: 0, piel: false, patas: 0, alas: 0, caparazon: false }
    };
  } else {
    state = JSON.parse(JSON.stringify(currentState));
  }

  const lower = phenotype.toLowerCase();
  let base = null;
  if (lower.includes('humanoide')) base = 'Humanoide';
  else if (lower.includes('insectoide')) base = 'Insectoide';
  else if (lower.includes('androide')) base = 'Androide';

  if (!base) return state;

  let grade = 0;
  if (lower.includes('emergente')) grade = 1;
  else if (lower.includes('consolidado')) grade = 2;
  else if (lower.includes('avanzado')) grade = 3;
  else if (lower.includes('pleno') || lower.includes('supremo')) grade = 5;
  else grade = 4; // Adaptado, Integrado, Pensante, Sintetico, Organico, Enjambre

  const expectedPoints = Math.max(0, grade - 1);

  if (base === 'Androide') {
    if (expectedPoints > state.puntosRefuerzoGanados) {
      state.puntosRefuerzoGanados = expectedPoints;
    }
  } else {
    if (state.ramaBloqueada && state.ramaBloqueada !== base) {
      // Radical Change Reset
      state.ramaBloqueada = base;
      state.puntosEstructuralesGanados = expectedPoints;
      state.puntosEstructuralesGastados = 0;
      state.partes = { piernas: 0, brazos: 0, cuernos: 0, piel: false, patas: 0, alas: 0, caparazon: false };
      state.puntosRefuerzoGanados = 0;
      state.puntosRefuerzoGastados = 0;
      state.refuerzos = { piernas: 0, brazos: 0, cuernos: 0, piel: false, patas: 0, alas: 0, caparazon: false };
    } else {
      if (!state.ramaBloqueada && grade >= 2) {
        state.ramaBloqueada = base;
      }
      if (state.ramaBloqueada === base && expectedPoints > state.puntosEstructuralesGanados) {
        state.puntosEstructuralesGanados = expectedPoints;
      }
    }
  }

  return state;
};

export default {
  ANTAGONISTS,
  getMutationDetails,
  mutateGene,
  calculatePhenotype,
  getThemeFromPhenotype,
  updateMorphologyState
};
