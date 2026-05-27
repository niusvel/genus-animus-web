import React, { useState } from 'react';
import { ANTAGONISTS, getMutationDetails } from '../../engine/geneticEngine';

const GeneCard = ({ name, label, value, availableFragments, onMutate, isMutating }) => {
  const antInfo = ANTAGONISTS[name];
  const { cost, increase, decrease } = getMutationDetails(value, antInfo?.weak);
  
  const canAfford = availableFragments >= cost;
  const isMaxed = value >= 1.00;

  // Antagonist label in Spanish
  const antLabelMapping = {
    cognition: 'Cognición',
    adaptability: 'Adaptabilidad',
    cohesion: 'Cohesión',
    metabolism: 'Metabolismo',
    substrate: 'Sustrato',
    collectiveMemory: 'Memoria Col.'
  };

  const antagonistLabel = antInfo ? antLabelMapping[antInfo.target] : 'Ninguno';

  return (
    <div className="border border-terminal-border/40 p-4 bg-black/70 rounded flex flex-col justify-between space-y-4 hover:border-terminal-accent/70 transition-all duration-300">
      <div>
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-terminal-accent text-sm md:text-base capitalize tracking-wide">{label}</h4>
          <span className="font-mono text-lg font-extrabold text-terminal-text">{value.toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-terminal-muted/80 mt-1">
          {name === 'cognition' && 'Capacidad analítica, planificación y aprendizaje.'}
          {name === 'adaptability' && 'Versatilidad para cumplir múltiples funciones biológicas.'}
          {name === 'cohesion' && 'Comportamiento colectivo y efectividad coordinada.'}
          {name === 'metabolism' && 'Producción de energía, consumo y recuperación física.'}
          {name === 'substrate' && 'Integración con tecnología y sustrato bio-sintético.'}
          {name === 'collectiveMemory' && 'Multiplicador del techo de mejora de tus estadísticas.'}
        </p>
      </div>

      <div className="border-t border-terminal-border/20 pt-3 space-y-2 text-xs">
        <div className="flex justify-between text-terminal-muted">
          <span>Incremento:</span>
          <span className="text-terminal-accent font-semibold">+{increase.toFixed(2)}</span>
        </div>
        {antInfo && (
          <div className="flex justify-between text-terminal-muted">
            <span>Antagonista:</span>
            <span className="text-red-500 font-semibold">{antagonistLabel} (-{decrease.toFixed(3)})</span>
          </div>
        )}
        <div className="flex justify-between text-terminal-muted border-t border-terminal-border/10 pt-2">
          <span>Coste:</span>
          <span className={canAfford ? "text-terminal-accent font-bold" : "text-red-400 font-bold"}>
            {cost} ADN
          </span>
        </div>
      </div>

      {isMaxed ? (
        <div className="w-full text-center py-2 bg-terminal-border/20 text-terminal-muted text-xs rounded border border-terminal-border/20 uppercase select-none">
          Maximizado
        </div>
      ) : (
        <button
          onClick={() => onMutate(name)}
          disabled={!canAfford || isMutating}
          className={`w-full py-2 text-xs font-bold uppercase rounded border transition-all duration-300 ${
            canAfford && !isMutating
              ? "bg-terminal-accent/10 border-terminal-accent text-terminal-accent hover:bg-terminal-accent hover:text-black cursor-pointer shadow-[0_0_8px_var(--color-terminal-border)]"
              : "border-terminal-border/30 text-terminal-muted/40 cursor-not-allowed"
          }`}
        >
          {isMutating ? 'Mutando...' : 'Asimilar Mutación'}
        </button>
      )}
    </div>
  );
};

export const GenePanel = ({ genes, dnaFragments, onMutate, onClose }) => {
  const [isMutating, setIsMutating] = useState(false);
  const [mutateError, setMutateError] = useState(null);

  const handleMutate = async (geneName) => {
    setIsMutating(true);
    setMutateError(null);
    try {
      const result = await onMutate(geneName);
      if (result && result.error) {
        if (result.error === 'insufficient_fragments') {
          setMutateError('Fragmentos de ADN insuficientes para asimilar esta mutación.');
        } else if (result.error === 'gene_already_maximized') {
          setMutateError('Este gen ya ha alcanzado su límite de especialización.');
        } else {
          setMutateError('Error al asimilar la mutación.');
        }
      }
    } catch (err) {
      console.error(err);
      setMutateError('Error de red.');
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-terminal-bg border border-terminal-accent p-6 rounded shadow-[0_0_40px_var(--color-terminal-glow)] flex flex-col max-h-[90vh] overflow-hidden font-terminal text-terminal-text crt-screen">
        <div className="scanline"></div>
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-terminal-border pb-4 mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-terminal-accent glow-text tracking-wider uppercase">
              INVESTIGACIÓN GENÓMICA
            </h2>
            <p className="text-xs text-terminal-muted">
              Moldea tus clústeres genéticos consumiendo fragmentos de ADN recolectados.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-black rounded text-xs uppercase transition-all duration-300 cursor-pointer"
          >
            Cerrar [ESC]
          </button>
        </div>

        {/* DNA Counter */}
        <div className="flex justify-between items-center bg-terminal-border/10 p-3 rounded border border-terminal-border/30 mb-6">
          <span className="text-xs md:text-sm text-terminal-text font-semibold uppercase">
            Reservas de ADN disponibles:
          </span>
          <span className="text-2xl md:text-3xl font-extrabold text-terminal-accent glow-text">
            {dnaFragments} Fragmentos
          </span>
        </div>

        {mutateError && (
          <div className="bg-red-950/40 border border-red-500/50 text-red-400 p-3 rounded text-xs mb-6 text-center">
            {mutateError}
          </div>
        )}

        {/* Clusters grid */}
        <div className="flex-1 overflow-y-auto space-y-8 pr-2">
          {/* 1. Metabolic Cluster */}
          <div className="space-y-4">
            <h3 className="text-xs md:text-sm uppercase tracking-widest text-terminal-accent border-b border-terminal-border/30 pb-1">
              Clúster Metabólico <span className="text-[10px] text-terminal-muted">(Orientación Humanoide)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GeneCard 
                name="cognition" 
                label="Cognición" 
                value={genes.cognition} 
                availableFragments={dnaFragments} 
                onMutate={handleMutate}
                isMutating={isMutating}
              />
              <GeneCard 
                name="adaptability" 
                label="Adaptabilidad" 
                value={genes.adaptability} 
                availableFragments={dnaFragments} 
                onMutate={handleMutate}
                isMutating={isMutating}
              />
            </div>
          </div>

          {/* 2. Structural Cluster */}
          <div className="space-y-4">
            <h3 className="text-xs md:text-sm uppercase tracking-widest text-terminal-accent border-b border-terminal-border/30 pb-1">
              Clúster Estructural <span className="text-[10px] text-terminal-muted">(Orientación Insectoide)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GeneCard 
                name="cohesion" 
                label="Cohesión" 
                value={genes.cohesion} 
                availableFragments={dnaFragments} 
                onMutate={handleMutate}
                isMutating={isMutating}
              />
              <GeneCard 
                name="metabolism" 
                label="Metabolismo" 
                value={genes.metabolism} 
                availableFragments={dnaFragments} 
                onMutate={handleMutate}
                isMutating={isMutating}
              />
            </div>
          </div>

          {/* 3. Synthetic Cluster */}
          <div className="space-y-4">
            <h3 className="text-xs md:text-sm uppercase tracking-widest text-terminal-accent border-b border-terminal-border/30 pb-1">
              Clúster Sintético <span className="text-[10px] text-terminal-muted">(Orientación Androide)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GeneCard 
                name="substrate" 
                label="Sustrato" 
                value={genes.substrate} 
                availableFragments={dnaFragments} 
                onMutate={handleMutate}
                isMutating={isMutating}
              />
              <GeneCard 
                name="collectiveMemory" 
                label="Memoria Colectiva" 
                value={genes.collectiveMemory} 
                availableFragments={dnaFragments} 
                onMutate={handleMutate}
                isMutating={isMutating}
              />
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-terminal-border pt-4 mt-6 text-[10px] text-terminal-muted flex flex-col md:flex-row justify-between space-y-2 md:space-y-0">
          <span>* La especialización en un gen disminuye su antagonista genómico correspondiente.</span>
          <span>* Piso genético absoluto: 0.01 // Techo máximo: 1.00</span>
        </div>
      </div>
    </div>
  );
};

export default GenePanel;
