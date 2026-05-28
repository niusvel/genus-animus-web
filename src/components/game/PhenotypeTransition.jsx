import React, { useState, useEffect } from 'react';
import { getPhenotypeId } from '../../engine/phenotypeCalculator';
import GlitchText from './GlitchText';

const PhenotypeTransition = ({ fenotipoAnterior, fenotipoNuevo, nombreFenotipo, onApplyPhenotype, onGlitchStart, onGlitchEnd, onComplete }) => {
  const [phase, setPhase] = useState(1);
  const [showText, setShowText] = useState(false);
  const [fadeText, setFadeText] = useState(false);
  const [isGlitching, setIsGlitching] = useState(true);

  useEffect(() => {
    // Fase 1: Inicio del glitch
    if (onGlitchStart) onGlitchStart();

    // Fase 1 a Fase 2 (Colapso y cambio)
    const t1 = setTimeout(() => {
      setPhase(2);
    }, 1200);

    // Fase 2 a Fase 3 (Revelación)
    const t2 = setTimeout(() => {
      // Aplicar exactamente aquí el nuevo fenotipo
      document.documentElement.setAttribute('data-phenotype', getPhenotypeId(fenotipoNuevo));
      if (onApplyPhenotype) onApplyPhenotype(fenotipoNuevo);
      setPhase(3);
    }, 1600);

    // Mostrar el texto cuando la opacidad de la pantalla negra va por el 60% 
    const t3 = setTimeout(() => {
      setShowText(true);
    }, 2000);

    // Estabilizar la interfaz (fin del glitch)
    const t4 = setTimeout(() => {
      setIsGlitching(false);
      if (onGlitchEnd) onGlitchEnd();
    }, 3000);

    // Desvanecer el texto después de que el usuario lo haya leído bien (3 segundos extra)
    const t_fade = setTimeout(() => {
      setFadeText(true);
    }, 6000);

    // Fin de toda la secuencia
    const t5 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 6500);

    return () => {
      if (onGlitchEnd) onGlitchEnd();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t_fade);
      clearTimeout(t5);
    };
  }, []); // Empty dependency array to run only once on mount

  return (
    <>
      <style>{`
        @keyframes phenotype-shake {
          0% { transform: translate(2px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(0px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(2px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(2px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        .phenotype-shake {
          animation: phenotype-shake 0.1s infinite;
        }
        @keyframes phenotype-flashes {
          0% { opacity: 0; }
          15% { opacity: 0.8; }
          30% { opacity: 0; }
          45% { opacity: 0.9; }
          60% { opacity: 0; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-flashes {
          animation: phenotype-flashes 0.2s infinite;
        }
      `}</style>
      
      <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center overflow-hidden">
        
        {/* Onda de escaneo horizontal (Scanline Wave) */}
        {!fadeText && (
          <div className="absolute top-0 left-0 right-0 h-[10vh] bg-terminal-accent/20 animate-scanline-wave pointer-events-none z-0 blur-sm" />
        )}
        
        {/* Fase 2 & 3: Capa negra para el fade out/in de la interfaz */}
        <div 
          className="absolute inset-0 bg-black ease-in-out z-0"
          style={{
            opacity: phase === 1 || phase === 3 ? 0 : 1,
            transitionProperty: 'opacity',
            transitionDuration: phase === 2 ? '400ms' : (phase === 3 ? '1000ms' : '0ms')
          }}
        />

        {/* Texto de Revelación de Fenotipo */}
        {showText && (
          <div 
            className="relative z-10 text-center transition-opacity ease-in-out px-4"
            style={{
              opacity: fadeText ? 0 : 1,
              transitionDuration: '500ms'
            }}
          >
            <h1 
              className="font-terminal font-bold text-4xl md:text-5xl lg:text-7xl tracking-[0.2em] uppercase text-center"
              style={{ 
                color: 'var(--ga-accent, #ffffff)',
                textShadow: '0 0 15px var(--ga-accent, #ffffff), 0 0 30px var(--ga-accent, #ffffff)' 
              }}
            >
              <GlitchText text={nombreFenotipo} active={isGlitching} />
            </h1>
          </div>
        )}
      </div>
    </>
  );
};

export default PhenotypeTransition;
