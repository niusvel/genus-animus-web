import React from 'react';

const StatRow = ({ label, value, geneName }) => {
  const percentage = Math.round(value * 100);
  
  // Create segment bar representation: [||||||||..........]
  const totalSegments = 10;
  const activeSegments = Math.round(value * totalSegments);
  const segments = '█'.repeat(activeSegments) + '░'.repeat(totalSegments - activeSegments);

  return (
    <div className="flex flex-col space-y-1 py-1 border-b border-terminal-border/20 last:border-b-0">
      <div className="flex justify-between items-center text-xs md:text-sm">
        <span className="text-terminal-muted capitalize">{label} <span className="text-[10px] opacity-50">({geneName})</span></span>
        <span className="font-bold text-terminal-accent">{value.toFixed(2)}</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="font-mono text-xs text-terminal-text tracking-widest">{segments}</span>
        <span className="text-[10px] text-terminal-muted">{percentage}%</span>
      </div>
    </div>
  );
};

export const StatusBar = ({ genes, dnaFragments, dominantPhenotype }) => {
  if (!genes) return null;

  const { cognition, adaptability, cohesion, metabolism, substrate, collectiveMemory } = genes;

  // Calculate actual display stats as per GDD definitions
  const vigor = metabolism * 10;
  const perception = cognition * 10;
  const tacticalCohesion = cohesion * 10;
  const adaptation = adaptability * 10;
  const integration = substrate * 10;
  const multiplier = collectiveMemory * 10;

  return (
    <div className="flex flex-col h-full bg-black/50 p-4 border-l border-terminal-border flex-shrink-0 w-full lg:w-80 glow-border font-terminal text-terminal-text space-y-6">
      
      {/* Phenotype Panel */}
      <div className="border border-terminal-border p-3 bg-black/60 rounded glow-border">
        <div className="text-[10px] text-terminal-muted uppercase tracking-wider mb-1">Perfil Fenotípico</div>
        <div className="text-sm md:text-base font-bold text-terminal-accent glow-text tracking-wide uppercase truncate">
          {dominantPhenotype || 'Latent Primordial'}
        </div>
      </div>

      {/* DNA Fragments Counter */}
      <div className="flex justify-between items-center bg-terminal-border/10 p-3 border border-terminal-border/30 rounded">
        <div className="flex flex-col">
          <span className="text-[10px] text-terminal-muted uppercase tracking-wider">Fragmentos ADN</span>
          <span className="text-sm font-semibold text-terminal-text">Material genético</span>
        </div>
        <div className="text-3xl font-extrabold text-terminal-accent glow-text animate-pulse-slow">
          {dnaFragments}
        </div>
      </div>

      {/* Hero Stats */}
      <div className="flex-1 space-y-4">
        <div className="text-[10px] text-terminal-muted uppercase tracking-wider border-b border-terminal-border/50 pb-1 mb-2">
          Estadísticas Fisiológicas
        </div>
        <div className="space-y-3">
          <StatRow label="Vigor" value={metabolism} geneName="metabolismo" />
          <StatRow label="Percepción" value={cognition} geneName="cognición" />
          <StatRow label="Cohesión Táctica" value={cohesion} geneName="cohesión" />
          <StatRow label="Adaptación" value={adaptability} geneName="adaptabilidad" />
          <StatRow label="Integración" value={substrate} geneName="sustrato" />
        </div>
      </div>

      {/* Multiplier / Collective Memory */}
      <div className="border-t border-terminal-border/50 pt-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-terminal-muted">Memoria Colectiva (Multiplicador Techo)</span>
          <span className="font-bold text-terminal-accent">x{multiplier.toFixed(1)}</span>
        </div>
        <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-1.5 border border-terminal-border/30">
          <div 
            className="bg-terminal-accent h-full shadow-[0_0_8px_var(--color-terminal-accent)] transition-all duration-500"
            style={{ width: `${collectiveMemory * 100}%` }}
          />
        </div>
      </div>
      
    </div>
  );
};

export default StatusBar;
