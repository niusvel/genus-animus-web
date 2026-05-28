import re

with open('../docs/genus-animus-paletas.md', 'r') as f:
    content = f.read()

# Extract all css blocks
css_blocks = re.findall(r'```css\n(.*?)```', content, re.DOTALL)

with open('palettes.css', 'w') as f:
    for block in css_blocks:
        # Ignore the classes examples and default palette instructions if any
        if '[data-phenotype=' in block or ':root' in block:
            f.write(block + '\n')
