import { parseFrontmatter } from './frontmatterParser';

/**
 * Parses and filters a Markdown scene content based on the active phenotype.
 */
export const filterContentByPhenotype = (content, phenotype) => {
  if (!content) return '';
  
  if (!content.includes('<!-- phenotype:') && !content.includes('<!-- fenotipo:')) {
    return content.trim();
  }

  const lines = content.split('\n');
  const blocks = {};
  let currentActivePheno = 'all';
  let currentBlock = [];

  for (const line of lines) {
    const matchMarker = line.match(/<!--\s*(phenotype|fenotipo):([a-zA-Z0-9_-]+)\s*-->/);
    if (matchMarker) {
      // Save current block
      if (currentBlock.length > 0) {
        blocks[currentActivePheno] = currentBlock.join('\n').trim();
      }
      currentActivePheno = matchMarker[2].trim().toLowerCase();
      // Map Spanish 'todos' to 'all'
      if (currentActivePheno === 'todos') {
        currentActivePheno = 'all';
      }
      currentBlock = [];
    } else {
      currentBlock.push(line);
    }
  }
  
  if (currentBlock.length > 0) {
    blocks[currentActivePheno] = currentBlock.join('\n').trim();
  }

  // Format active phenotype to match markers: "Emerging Insectoid" -> "insectoid_emerging" (or "insectoide_emergente")
  const formattedPheno = phenotype ? phenotype.toLowerCase().replace(/\s+/g, '_') : 'all';

  // 1. Direct match: e.g. "insectoid_emerging" or "emerging_insectoid"
  if (blocks[formattedPheno]) {
    return blocks[formattedPheno];
  }

  // 2. Transposed match (emerging_insectoid vs insectoid_emerging)
  const parts = formattedPheno.split('_');
  if (parts.length === 2) {
    const transposed = `${parts[1]}_${parts[0]}`; // e.g. "emerging_insectoid" -> "insectoid_emerging"
    if (blocks[transposed]) {
      return blocks[transposed];
    }
  }

  // 3. Base class match: e.g., matches "insectoid" or "humanoid" or "android"
  const baseMatch = parts.find(p => ['insectoid', 'humanoid', 'android', 'insectoide', 'humanoide', 'androide'].includes(p));
  if (baseMatch && blocks[baseMatch]) {
    return blocks[baseMatch];
  }

  // 4. Fallback to all/todos
  return blocks['all'] || blocks['todos'] || content.trim();
};

/**
 * Parses full scene raw Markdown text, extracts frontmatter and filters body by phenotype.
 */
export const parseSceneContent = (rawMarkdown, phenotype) => {
  const { data, content } = parseFrontmatter(rawMarkdown);
  const filteredBody = filterContentByPhenotype(content, phenotype);
  
  return {
    metadata: data,
    body: filteredBody
  };
};
