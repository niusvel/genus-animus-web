import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';

// Configure marked options to be safe
marked.setOptions({
  breaks: true,
  gfm: true
});

const highlightCommands = (html) => {
  if (!html) return '';
  
  // Safe replace: only modify text nodes (even indexes), ignoring HTML tags (odd indexes)
  return html.split(/(<[^>]*>)/g).map((part, index) => {
    if (index % 2 === 0) {
      // Replaces [c:some command] with a glowing command span
      return part.replace(/\[c:([^\]]+)\]/g, '<span class="glow-command">$1</span>');
    }
    return part;
  }).join('');
};

const TypewriterText = ({ text, speed = 8, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText('');
    if (!text) {
      if (onComplete) onComplete();
      return;
    }

    let index = 0;
    let currentText = '';
    const interval = setInterval(() => {
      if (index < text.length) {
        currentText += text.charAt(index);
        setDisplayedText(currentText);
        index++;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  // Parse markdown content
  const htmlContent = highlightCommands(marked.parse(displayedText || ''));

  return (
    <div 
      className="prose prose-invert max-w-none text-terminal-text font-terminal glow-text leading-relaxed text-sm md:text-base mb-4 transition-all duration-300"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export const Terminal = ({ textHistory, currentSceneBody, isLoading }) => {
  const terminalEndRef = useRef(null);
  const containerRef = useRef(null);
  const [typingIndex, setTypingIndex] = useState(-1);

  // Scroll to bottom when text history changes
  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [textHistory, currentSceneBody]);

  // We want to apply the typewriter effect to the very latest output message
  // and currentSceneBody if it's new.
  useEffect(() => {
    if (textHistory.length > 0) {
      setTypingIndex(textHistory.length - 1);
    }
  }, [textHistory.length]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 font-terminal text-terminal-text crt-screen"
      style={{ minHeight: '300px' }}
    >
      <div className="scanline"></div>
      
      {/* Intro branding */}
      <div className="opacity-60 text-xs md:text-sm border-b border-terminal-border pb-2 mb-4">
        <div>SYSTEM STATUS: ACTIVE // BIO-VECTORS INITIALIZED</div>
        <div>PROT-CORE v0.98.24 // SECURE CONNECTION</div>
      </div>

      {/* Render Text History */}
      {textHistory.map((item, index) => {
        if (item.type === 'input') {
          return (
            <div key={index} className="flex items-start text-terminal-accent font-semibold mb-2">
              <span className="mr-2">&gt;</span>
              <span className="glow-text tracking-wide uppercase">{item.text}</span>
            </div>
          );
        } else {
          // If it is the last item and is an output, we can typewrite it
          const isLatest = index === typingIndex;
          if (isLatest) {
            return (
              <TypewriterText 
                key={index} 
                text={item.text} 
                onComplete={scrollToBottom}
              />
            );
          }

          // Otherwise render immediately
          return (
            <div 
              key={index}
              className="prose prose-invert max-w-none text-terminal-text glow-text leading-relaxed text-sm md:text-base mb-4"
              dangerouslySetInnerHTML={{ __html: highlightCommands(marked.parse(item.text || '')) }}
            />
          );
        }
      })}



      {isLoading && (
        <div className="flex items-center space-x-2 text-terminal-muted animate-pulse">
          <span>[Sincronizando impulsos con el planeta...]</span>
        </div>
      )}

      <div ref={terminalEndRef} />
    </div>
  );
};

export default Terminal;
