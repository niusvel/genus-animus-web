/**
 * Browser-safe Frontmatter parser.
 * Reads YAML frontmatter from a Markdown string.
 * Avoids browser bundling issues with Node-dependent libraries like gray-matter.
 */
export const parseFrontmatter = (mdString) => {
  if (!mdString) return { data: {}, content: '' };

  const match = mdString.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: mdString };
  }

  const yamlBlock = match[1];
  const content = match[2];
  const data = {};

  const lines = yamlBlock.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim();
    let value = trimmed.substring(colonIndex + 1).trim();

    // Parse array e.g., [OBSERVE, LISTEN, HELP] or [all]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          // Unquote strings in array if they are quoted
          if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
            return s.slice(1, -1);
          }
          return s;
        });
    } else {
      // Unquote value if it's a quoted string
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (!isNaN(value) && value !== '') {
        value = Number(value);
      }
    }

    data[key] = value;
  }

  return { data, content };
};
