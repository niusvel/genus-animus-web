import re

with open('src/styles/global.css', 'r') as f:
    content = f.read()

with open('palettes.css', 'r') as f:
    palettes = f.read()

# Define the new theme structures for font and scanline
new_themes = """/* Theme Configurations */
:root {
  /* Default palette (Primordial Despertado) */
  --ga-bg:      #07100a;
  --ga-border:  #144020;
  --ga-title:   #1e6030;
  --ga-accent:  #2e8a45;
  --ga-text:    #48c068;

  /* Map new variables to old system */
  --color-terminal-bg: var(--ga-bg);
  --color-terminal-border: var(--ga-border);
  --color-terminal-accent: var(--ga-accent);
  --color-terminal-text: var(--ga-text);
  --color-terminal-glow: color-mix(in srgb, var(--ga-accent) 40%, transparent);
  --color-terminal-muted: color-mix(in srgb, var(--ga-text) 60%, transparent);
  
  --font-terminal: 'Fira Code', monospace;
  --crt-scanline-opacity: 0.08;
  --screen-curvature: 8px;
}

.theme-primordial {
  --font-terminal: 'Fira Code', monospace;
  --crt-scanline-opacity: 0.07;
  --screen-curvature: 12px;
}

.theme-humanoid {
  --font-terminal: 'VT323', monospace;
  --crt-scanline-opacity: 0.12;
  --screen-curvature: 20px;
}

.theme-insectoid {
  --font-terminal: 'Special Elite', cursive;
  --crt-scanline-opacity: 0.15;
  --screen-curvature: 4px;
}

.theme-android {
  --font-terminal: 'Share Tech Mono', monospace;
  --crt-scanline-opacity: 0.09;
  --screen-curvature: 0px;
}

/* --- Nuevas Paletas por Fenotipo --- */
""" + palettes + "\n/* --- Fin de Paletas --- */"

# We replace everything from /* Theme Configurations */ down to the end of .theme-android block.
# .theme-android ends with "}\n" before "/* CRT Screen Effects */"
pattern = r'/\* Theme Configurations \*/.*?\.theme-android\s*\{[^}]*\}'

new_content = re.sub(pattern, new_themes, content, flags=re.DOTALL)

with open('src/styles/global.css', 'w') as f:
    f.write(new_content)
