/**
 * Phenotype Calculator for Genus Animus
 * Computes cluster averages and maps them to one of the 21 Spanish phenotypes
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
 * Maps a phenotype string to a CSS class name
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
