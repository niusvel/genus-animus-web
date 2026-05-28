import React from 'react';

const PhenotypeIcon = ({ phenotype = '', morfologia = {}, className = '' }) => {
  const isAndroid = phenotype.toLowerCase().includes('androide') || phenotype.toLowerCase().includes('android');
  const isInsectoid = phenotype.toLowerCase().includes('insectoide') || phenotype.toLowerCase().includes('insectoid');
  const isHumanoid = phenotype.toLowerCase().includes('humanoide') || phenotype.toLowerCase().includes('humanoid');
  
  const partes = morfologia?.partes || { piernas: 0, brazos: 0, cuernos: 0, piel: false, patas: 0, alas: 0, caparazon: false };

  let base = 'primordial';
  if (isHumanoid) base = 'humanoide';
  if (isInsectoid) base = 'insectoide';
  if (isAndroid) {
    if (partes.patas > 0 || partes.alas > 0 || partes.caparazon) base = 'insectoide';
    else if (partes.piernas > 0 || partes.brazos > 0 || partes.cuernos > 0 || partes.piel) base = 'humanoide';
    else base = 'androide_puro';
  }

  // Estilo estricto geométrico retro-HUD
  const strokeStyle = { 
    strokeLinejoin: isAndroid ? "miter" : "round", 
    strokeLinecap: isAndroid ? "square" : "round" 
  };

  return (
    <svg 
      viewBox="0 0 100 100" 
      className={`fill-none stroke-current drop-shadow-[0_0_8px_currentColor] transition-all duration-1000 ${className}`}
      style={strokeStyle}
    >
      {/* --------------------
          BASE PRIMORDIAL (Bio-Orgánico, basado en arte conceptual)
          -------------------- */}
      {base === 'primordial' && (
        <g strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          {phenotype.includes('Latente') && (
            <g className="animate-[pulse_4s_ease-in-out_infinite]">
              {/* Silueta principal (Masa bulbosa con cola y garras) */}
              <path 
                d="
                  M 20 55
                  C 5 55, 5 65, 20 65
                  C 30 65, 35 75, 45 75
                  Q 50 85, 55 90
                  Q 55 80, 60 75
                  Q 65 85, 68 85
                  C 65 75, 65 65, 75 55
                  L 85 55 L 80 45
                  L 92 45 L 82 35
                  C 85 10, 50 5, 45 30
                  C 40 55, 30 55, 20 55
                  Z
                "
                fill="currentColor"
                fillOpacity="0.1"
              />
              {/* Pliegue de la capucha frontal */}
              <path d="M 45 30 Q 55 35, 75 55" strokeWidth="1.5" opacity="0.8" />
              {/* Volumen del bulto superior */}
              <path d="M 50 13 Q 65 20, 65 45" strokeWidth="1" opacity="0.5" />
              {/* Zarcillo/Cola secundaria */}
              <path d="M 35 70 Q 25 80, 15 75" strokeWidth="1.5" opacity="0.7" />
            </g>
          )}
          {phenotype.includes('Despertado') && (
            <>
              <circle cx="50" cy="50" r="20" strokeDasharray="10 5" opacity="0.8" className="animate-[spin_10s_linear_infinite]" />
              <circle cx="50" cy="50" r="35" strokeWidth="1" strokeDasharray="2 8" opacity="0.4" className="animate-[spin_15s_linear_reverse_infinite]" />
            </>
          )}
          {phenotype.includes('Transición') && (
            <>
              {/* Estructura celular dividiéndose */}
              <circle cx="35" cy="50" r="20" opacity="0.8" strokeDasharray="5 5" />
              <circle cx="65" cy="50" r="20" opacity="0.8" strokeDasharray="5 5" />
              <circle cx="50" cy="50" r="40" strokeWidth="1" opacity="0.3" className="animate-[spin_15s_linear_infinite]" />
            </>
          )}
          {!phenotype.includes('Latente') && !phenotype.includes('Despertado') && !phenotype.includes('Transición') && (
             <circle cx="50" cy="50" r="25" strokeDasharray="5 10" opacity="0.6" />
          )}
        </g>
      )}

      {/* --------------------
          BASE HUMANOIDE (Wireframe anatómico, Hombre de Vitruvio HUD)
          -------------------- */}
      {base === 'humanoide' && (
        <g strokeWidth={isAndroid ? "1.5" : "2"}>
          {/* Cabeza (Círculo o Rombo) */}
          {isAndroid ? <polygon points="50,15 58,25 50,35 42,25" /> : <circle cx="50" cy="25" r="10" />}
          
          {/* Torso (Triángulo invertido) */}
          <polygon points="50,35 65,60 35,60" />
          
          {/* Columna */}
          <line x1="50" x2="50" y1="60" y2="75" />

          {/* Piernas */}
          {partes.piernas > 0 && (
            <>
              <polyline points="50,75 35,95" />
              <polyline points="50,75 65,95" />
            </>
          )}

          {/* Brazos */}
          {partes.brazos > 0 && (
            <>
              <polyline points="35,45 15,35 5,50" />
              <polyline points="65,45 85,35 95,50" />
            </>
          )}

          {/* Cuernos */}
          {partes.cuernos > 0 && (
            <>
              <polyline points="45,18 35,5 40,22" strokeWidth="1.5" />
              <polyline points="55,18 65,5 60,22" strokeWidth="1.5" />
            </>
          )}

          {/* Piel Gruesa (Aura/Escudo perimetral) */}
          {partes.piel && (
            <polygon points="50,5 80,35 75,70 50,100 25,70 20,35" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
          )}
        </g>
      )}

      {/* --------------------
          BASE INSECTOIDE (Geometría de enjambre, hexágonos perfectos)
          -------------------- */}
      {base === 'insectoide' && (
        <g strokeWidth={isAndroid ? "1.5" : "2"}>
          {/* Tórax Hexagonal */}
          <polygon points="50,25 65,40 65,65 50,80 35,65 35,40" />
          
          {/* Línea central segmentada */}
          <line x1="50" x2="50" y1="25" y2="80" strokeDasharray="5 5" opacity="0.5" />

          {/* Patas (Articulaciones rígidas) */}
          {partes.patas > 0 && (
            <>
              {/* Patas Superiores */}
              <polyline points="35,45 15,35 5,50" />
              <polyline points="65,45 85,35 95,50" />
              {/* Patas Inferiores */}
              <polyline points="35,60 15,70 10,90" />
              <polyline points="65,60 85,70 90,90" />
            </>
          )}

          {/* Alas (Vectores triangulares afilados) */}
          {partes.alas > 0 && (
            <>
              <polygon points="35,40 10,10 45,35" opacity="0.8" />
              <polygon points="65,40 90,10 55,35" opacity="0.8" />
            </>
          )}

          {/* Caparazón (Hexágono defensivo exterior) */}
          {partes.caparazon && (
            <polygon points="50,15 75,35 75,70 50,90 25,70 25,35" strokeWidth="3" opacity="0.5" />
          )}
        </g>
      )}

      {/* --------------------
          BASE ANDROIDE PURO (Unidad lógica sin partes previas)
          -------------------- */}
      {base === 'androide_puro' && (
        <g strokeWidth="2">
          {/* CPU Core */}
          <rect x="35" y="35" width="30" height="30" />
          <rect x="42" y="42" width="16" height="16" fill="currentColor" fillOpacity="0.2" />
          
          {/* Nodos de conexión */}
          <polyline points="35,50 15,50 15,30" strokeWidth="1" />
          <polyline points="65,50 85,50 85,70" strokeWidth="1" />
          <polyline points="50,35 50,15 70,15" strokeWidth="1" />
          <polyline points="50,65 50,85 30,85" strokeWidth="1" />
        </g>
      )}

      {/* --------------------
          OVERRIDE CIBERNÉTICO HUD (Se sobrepone si isAndroid es true)
          -------------------- */}
      {isAndroid && (
        <g strokeWidth="1">
          {/* Crosshair / Retícula militar */}
          <line x1="50" x2="50" y1="0" y2="100" strokeDasharray="2 10" opacity="0.3" />
          <line x1="0" x2="100" y1="50" y2="50" strokeDasharray="2 10" opacity="0.3" />
          
          {/* Ojo visor (Targeting system) */}
          <circle cx="50" cy="50" r="6" strokeWidth="2" opacity="0.8" />
          <circle cx="50" cy="50" r="2" fill="currentColor" className="animate-ping" />
          
          {/* Marco HUD delimitador exterior */}
          <path d="M10 20 L10 10 L20 10 M80 10 L90 10 L90 20 M90 80 L90 90 L80 90 M20 90 L10 90 L10 80" opacity="0.5" />
        </g>
      )}
    </svg>
  );
};

export default PhenotypeIcon;
