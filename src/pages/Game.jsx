import React, { useEffect, useState } from 'react';
import { useGame } from '../hooks/useGame';
import { useCommands } from '../hooks/useCommands';
import Terminal from '../components/game/Terminal';
import CommandInput from '../components/game/CommandInput';
import StatusBar from '../components/game/StatusBar';
import Register from './Register';
import { getThemeFromPhenotype, getPhenotypeId } from '../engine/phenotypeCalculator';
import PhenotypeTransition from '../components/game/PhenotypeTransition';
import MorphologyModal from '../components/game/MorphologyModal';
import PhenotypeIcon from '../components/game/PhenotypeIcon';

export const Game = () => {
  const game = useGame();
  const { executeCommand } = useCommands();
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [showStatsMobile, setShowStatsMobile] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);

  // Transition state
  const [currentPhenotype, setCurrentPhenotype] = useState(null);
  const [transitionData, setTransitionData] = useState(null);
  const [showMorphologyModal, setShowMorphologyModal] = useState(false);

  // Initialize game on mount
  useEffect(() => {
    game.initializeGame();
  }, []);

  // Sync phenotype initially and detect changes
  useEffect(() => {
    if (game.dominantPhenotype) {
      if (!currentPhenotype) {
        // Initial set
        setCurrentPhenotype(game.dominantPhenotype);
        document.documentElement.setAttribute('data-phenotype', getPhenotypeId(game.dominantPhenotype));
      } else if (game.dominantPhenotype !== currentPhenotype && !transitionData) {
        // Phenotype changed, trigger transition!
        const nameParts = game.dominantPhenotype.split('_');
        const formattedName = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
        
        setTransitionData({
          oldPhenotype: currentPhenotype,
          newPhenotype: game.dominantPhenotype,
          name: formattedName
        });
      }
    }
  }, [game.dominantPhenotype, currentPhenotype, transitionData]);

  // Check for available morphology points
  useEffect(() => {
    if (transitionData) {
      setShowMorphologyModal(false);
      return;
    }

    if (game.morfologia && game.dominantPhenotype) {
      const { puntosEstructuralesGanados, puntosEstructuralesGastados, puntosRefuerzoGanados, puntosRefuerzoGastados } = game.morfologia;
      const isAndroid = game.dominantPhenotype.toLowerCase().includes('androide');
      
      let shouldShow = false;
      if (isAndroid && puntosRefuerzoGanados > puntosRefuerzoGastados) shouldShow = true;
      if (!isAndroid && puntosEstructuralesGanados > puntosEstructuralesGastados) shouldShow = true;
      
      setShowMorphologyModal(shouldShow);
    } else {
      setShowMorphologyModal(false);
    }
  }, [transitionData, game.morfologia, game.dominantPhenotype]);

  const handleRegistrationComplete = () => {
    const updatedFlags = { ...game.flags, triggerRegistration: false };
    game.updateState({
      flags: updatedFlags,
      currentScene: 'bosque_amanecer'
    });
  };

  const handleRegistrationCancel = () => {
    const updatedFlags = { ...game.flags, triggerRegistration: false };
    game.updateState({
      flags: updatedFlags
    });
  };

  // Intercept and show registration screen if the hero tries to exit cueva or manually loads
  if (game.flags?.triggerRegistration) {
    return (
      <Register 
        onComplete={handleRegistrationComplete} 
        onCancel={handleRegistrationCancel} 
      />
    );
  }

  const activeThemeClass = getThemeFromPhenotype(currentPhenotype || game.dominantPhenotype);

  return (
    <>
      <div 
        className={`min-h-[100dvh] bg-black flex items-center justify-center p-0 md:p-4 transition-all duration-500 ${activeThemeClass} game-root ${isGlitching ? 'glitch-active' : ''}`}
        data-phenotype={getPhenotypeId(currentPhenotype || game.dominantPhenotype)}
      >
        <div className="w-full max-w-7xl h-[100dvh] md:h-[90vh] flex flex-col crt-container glow-border overflow-hidden md:rounded-lg border border-terminal-border bg-terminal-bg">
        {/* CRT Scanline and curvature overlays */}
        <div className="scanline"></div>
        
        {/* Top Navigation Bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-terminal-border bg-black/40 glow-border select-none">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-accent animate-pulse-slow"></span>
            <h1 className="font-terminal font-bold text-base md:text-lg text-terminal-accent glow-text tracking-widest uppercase terminal-title">
              GENUS ANIMUS
            </h1>
          </div>
          <div className="flex items-center space-x-4 text-xs font-terminal">
            <div className="hidden sm:flex items-center space-x-1.5 text-terminal-muted">
              <span>STATUS:</span>
              <span className="text-terminal-text font-bold">
                {game.token ? 'ONLINE' : 'LOCAL'}
              </span>
            </div>
            {game.token && (
              <>
                <button
                  onClick={() => {
                    game.fetchCheckpoints();
                    setShowCheckpointModal(true);
                  }}
                  className="px-2 py-1 border border-terminal-border hover:border-terminal-accent/50 hover:text-terminal-accent rounded cursor-pointer transition-colors duration-300 mr-2"
                >
                  Checkpoints
                </button>
                <button
                  onClick={() => game.logout()}
                  className="px-2 py-1 border border-terminal-border hover:border-red-500/50 hover:text-red-400 rounded cursor-pointer transition-colors duration-300"
                >
                  Cerrar Sesión
                </button>
              </>
            )}
            {!game.token && (
              <>
                <button
                  onClick={() => game.updateState({ flags: { ...game.flags, triggerRegistration: true } })}
                  className="px-2 py-1 border border-terminal-border hover:border-terminal-accent/50 hover:text-terminal-accent rounded cursor-pointer transition-colors duration-300"
                >
                  Cargar Partida
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('¿Deseas reiniciar toda tu evolución local?')) {
                      game.resetGame();
                    }
                  }}
                  className="px-2 py-1 border border-terminal-border hover:border-red-500/50 hover:text-red-400 rounded cursor-pointer transition-colors duration-300"
                >
                  Reiniciar
                </button>
              </>
            )}
            <button
              onClick={() => setShowStatsMobile(!showStatsMobile)}
              className="lg:hidden px-2 py-1 border border-terminal-border hover:border-terminal-accent/50 hover:text-terminal-accent rounded cursor-pointer transition-colors duration-300 text-[10px] md:text-xs"
            >
              {showStatsMobile ? 'TERMINAL' : 'ESTADO'}
            </button>
          </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Narrative Terminal screen */}
          <div className={`flex-1 flex flex-col overflow-hidden min-h-0 relative ${showStatsMobile ? 'hidden lg:flex' : 'flex'}`}>
            {(currentPhenotype || game.dominantPhenotype) && (
              <PhenotypeIcon 
                phenotype={currentPhenotype || game.dominantPhenotype} 
                morfologia={game.morfologia} 
                className="absolute inset-0 m-auto w-3/4 max-w-md h-auto opacity-[0.03] pointer-events-none text-terminal-accent"
              />
            )}
            <Terminal 
              textHistory={game.textHistory}
              currentSceneBody={game.sceneData?.body}
              isLoading={game.isLoading}
              isGlitching={isGlitching}
              dominantPhenotype={currentPhenotype || game.dominantPhenotype}
              morfologia={game.morfologia}
            />
          </div>

          {/* Stats Readout Panel */}
          <div className={`lg:flex ${showStatsMobile ? 'flex flex-1 overflow-hidden min-h-0' : 'hidden'} lg:w-80`}>
            <StatusBar 
              genes={game.genes}
              dnaFragments={game.dnaFragments}
              dominantPhenotype={game.dominantPhenotype}
              isGlitching={isGlitching}
            />
          </div>
        </div>

        {/* Command Line Input */}
        <CommandInput 
          onExecute={executeCommand} 
          disabled={game.isLoading}
        />


      </div>
      {showCheckpointModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 font-terminal text-terminal-text backdrop-blur-sm crt-screen">
          <div className="scanline"></div>
          <div className="w-full max-w-lg p-6 border border-terminal-accent bg-terminal-bg rounded shadow-[0_0_20px_var(--color-terminal-glow)] space-y-6">
            <div className="flex justify-between items-center border-b border-terminal-border pb-3">
              <h2 className="text-xl font-bold text-terminal-accent glow-text tracking-widest uppercase">
                Puntos de Control (Checkpoints)
              </h2>
              <button 
                onClick={() => setShowCheckpointModal(false)}
                className="text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-0.5 rounded cursor-pointer text-xs uppercase transition-colors"
              >
                Cerrar
              </button>
            </div>

            <p className="text-xs text-terminal-muted leading-relaxed">
              Selecciona un punto de control guardado en el nexo para restaurar tu genoma y estado. Los checkpoints se cargan de forma no destructiva y conservan el historial.
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 border border-terminal-border/20 p-2 bg-black/40 rounded">
              {!game.checkpoints || game.checkpoints.length === 0 ? (
                <div className="text-center py-6 text-xs text-terminal-muted italic">
                  No hay ningún checkpoint guardado en el servidor para este usuario.
                </div>
              ) : (
                game.checkpoints.map((cp) => {
                  const sceneNames = {
                    'cueva_capullos': 'Los Nueve Capullos',
                    'cueva_enemigo': 'El Primer Enemigo',
                    'cueva_salida': 'La Salida',
                    'bosque_amanecer': 'El Bosque del Amanecer'
                  };
                  const name = sceneNames[cp.checkpoint_name] || cp.checkpoint_name;
                  const formattedName = name.replace(/_/g, ' ');
                  
                  const formatDate = (isoStr) => {
                    try {
                      const d = new Date(isoStr);
                      return d.toLocaleString('es-ES', { hour12: false });
                    } catch (e) {
                      return isoStr;
                    }
                  };

                  return (
                    <div 
                      key={cp.id}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border border-terminal-border/40 hover:border-terminal-accent hover:bg-terminal-accent/5 rounded transition-all duration-300 space-y-2 sm:space-y-0"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-terminal-text uppercase tracking-wide">
                          {formattedName}
                        </span>
                        <span className="text-[10px] text-terminal-muted">
                          Fenotipo: {cp.dominant_phenotype} | ADN: {cp.dna_fragments} | {formatDate(cp.created_at)}
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          if (window.confirm(`¿Seguro que deseas cargar el checkpoint en "${formattedName}"? Tu avance actual no guardado se perderá.`)) {
                            const res = await game.loadCheckpointAction(cp.id);
                            if (res.success) {
                              setShowCheckpointModal(false);
                              game.refreshScene();
                            } else {
                              alert(`Error al cargar checkpoint: ${res.error}`);
                            }
                          }
                        }}
                        className="px-3 py-1 bg-terminal-accent/15 border border-terminal-accent/40 text-terminal-accent hover:bg-terminal-accent hover:text-black rounded text-xs font-bold uppercase transition-all duration-300 cursor-pointer"
                      >
                        Cargar
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {transitionData && (
        <PhenotypeTransition
          fenotipoAnterior={transitionData.oldPhenotype}
          fenotipoNuevo={transitionData.newPhenotype}
          nombreFenotipo={transitionData.name}
          onApplyPhenotype={(phenotype) => setCurrentPhenotype(phenotype)}
          onGlitchStart={() => setIsGlitching(true)}
          onGlitchEnd={() => setIsGlitching(false)}
          onComplete={() => setTransitionData(null)}
        />
      )}

      {showMorphologyModal && (
        <MorphologyModal 
          morfologia={game.morfologia} 
          dominantPhenotype={game.dominantPhenotype}
          onSelectOption={(newMorfologia) => {
            game.updateState({ morfologia: newMorfologia });
          }} 
        />
      )}
      </div>
    </>
  );
};

export default Game;
