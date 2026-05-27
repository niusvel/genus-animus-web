import React, { useState, useEffect, useRef } from 'react';

export const CommandInput = ({ onExecute, disabled }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Auto-focus input on mount and keep focused
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || disabled) return;

    onExecute(inputValue);
    setInputValue('');
  };

  // Focus input if clicked anywhere in terminal area (UX helper)
  const handleContainerClick = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      onClick={handleContainerClick}
      className="flex items-center border-t border-terminal-border p-4 bg-black/40 glow-border"
    >
      <span className="text-terminal-accent font-terminal font-bold text-lg md:text-xl mr-3 glow-text select-none animate-pulse-slow">
        &gt;
      </span>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={disabled}
        placeholder={disabled ? "Sincronizando..." : "Escribe un comando... (ej. AYUDA)"}
        className="flex-1 bg-transparent border-none outline-none font-terminal text-terminal-text placeholder-terminal-muted/40 glow-text text-sm md:text-base selection:bg-terminal-border focus:ring-0 focus:outline-none w-full"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      {inputValue.length === 0 && !disabled && (
        <span className="w-2.5 h-5 bg-terminal-text animate-cursor-blink mr-auto ml-1"></span>
      )}
    </form>
  );
};

export default CommandInput;
