const narratives = {};
const definitions = {};

/**
 * Registers a scene's narrative and definition data.
 * @param {string} sceneId - The unique scene ID.
 * @param {string} narrative - The raw narrative markdown.
 * @param {Object} definition - The JSON scene definition.
 */
export function registerScene(sceneId, narrative, definition) {
  narratives[sceneId] = narrative;
  definitions[sceneId] = definition;
}

/**
 * Parses markdown narrative text into an object indexed by block keys.
 * A block is defined by <!-- key --> comment markers.
 * @param {string} markdownText - The raw narrative markdown content.
 * @returns {Object} An object mapping block keys to trimmed narrative text.
 */
export function parseNarrative(markdownText) {
  const texts = {};
  if (!markdownText) return texts;

  // Match all <!-- key --> occurrences
  const regex = /<!--\s*([a-zA-Z0-9_-]+)\s*-->/g;
  const matches = [];
  let match;

  while ((match = regex.exec(markdownText)) !== null) {
    matches.push({
      key: match[1],
      index: match.index,
      length: match[0].length
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const startIndex = current.index + current.length;
    const endIndex = next ? next.index : markdownText.length;
    texts[current.key] = markdownText.substring(startIndex, endIndex).trim();
  }

  return texts;
}

/**
 * Loads and merges the definition and parsed narrative of a registered scene.
 * @param {string} sceneId - The scene ID to load.
 * @returns {Object} The complete scene object.
 */
export function loadScene(sceneId) {
  const narrative = narratives[sceneId];
  const definition = definitions[sceneId];

  if (!narrative || !definition) {
    throw new Error(`Scene ${sceneId} is not registered in content database.`);
  }

  const texts = parseNarrative(narrative);

  return {
    ...definition,
    textos: texts
  };
}

export default {
  registerScene,
  parseNarrative,
  loadScene
};
