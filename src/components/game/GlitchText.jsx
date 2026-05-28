import React, { useState, useEffect } from 'react';

const GLITCH_CHARS = '!<>-_\\\\/[]{}—=+*^?#█▒░▓┼┘┐┌├';

const GlitchText = ({ text, active, as: Component = 'span', className = '', ...props }) => {
  const [glitchedContent, setGlitchedContent] = useState(text);

  useEffect(() => {
    if (!active || text === undefined || text === null) {
      setGlitchedContent(text);
      return;
    }

    const textStr = String(text);

    const intervalId = setInterval(() => {
      const chars = textStr.split('');
      const newChars = chars.map((char) => {
        if (char === ' ' || char === '\n') return char;
        // 40% chance to glitch a character
        if (Math.random() < 0.4) {
          const randChar = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          // 15% chance to alter the size of this glitched char
          if (Math.random() < 0.15) {
            const scale = 0.6 + Math.random() * 0.8; // 0.6 to 1.4
            return <span style={{ fontSize: `${scale}em`, opacity: 0.5 + Math.random() * 0.5 }}>{randChar}</span>;
          }
          return randChar;
        }
        return char;
      });
      setGlitchedContent(newChars);
    }, 50);

    return () => clearInterval(intervalId);
  }, [text, active]);

  if (!active) {
    return <Component className={className} {...props}>{text}</Component>;
  }

  return (
    <Component className={className} {...props}>
      {Array.isArray(glitchedContent) ? glitchedContent.map((c, i) => (
        <React.Fragment key={i}>{c}</React.Fragment>
      )) : glitchedContent}
    </Component>
  );
};

export default GlitchText;
