import React, { useEffect, useCallback } from 'react';

const MorphologyModal = ({ morfologia, dominantPhenotype, onSelectOption }) => {
  if (!morfologia || !dominantPhenotype) return null;

  const {
    ramaBloqueada,
    puntosEstructuralesGanados,
    puntosEstructuralesGastados,
    puntosRefuerzoGanados,
    puntosRefuerzoGastados,
    partes,
    refuerzos
  } = morfologia;

  const puntosEstDisp = puntosEstructuralesGanados - puntosEstructuralesGastados;
  const puntosRefDisp = puntosRefuerzoGanados - puntosRefuerzoGastados;

  const isAndroid = dominantPhenotype.toLowerCase().includes('androide');

  if (isAndroid && puntosRefDisp <= 0) return null;
  if (!isAndroid && puntosEstDisp <= 0) return null;

  const availableOptions = [];

  if (isAndroid) {
    // Androides can reinforce previously acquired parts
    if (partes.piernas > 0 && refuerzos.piernas < partes.piernas) availableOptions.push({ id: 'piernas', label: 'Reforzar Piernas', type: 'refuerzo' });
    if (partes.brazos > 0 && refuerzos.brazos < partes.brazos) availableOptions.push({ id: 'brazos', label: 'Reforzar Brazos', type: 'refuerzo' });
    if (partes.cuernos > 0 && refuerzos.cuernos < partes.cuernos) availableOptions.push({ id: 'cuernos', label: 'Reforzar Cuernos', type: 'refuerzo' });
    if (partes.piel && !refuerzos.piel) availableOptions.push({ id: 'piel', label: 'Reforzar Piel', type: 'refuerzo' });
    
    if (partes.patas > 0 && refuerzos.patas < partes.patas) availableOptions.push({ id: 'patas', label: 'Reforzar Patas', type: 'refuerzo' });
    if (partes.alas > 0 && refuerzos.alas < partes.alas) availableOptions.push({ id: 'alas', label: 'Reforzar Alas', type: 'refuerzo' });
    if (partes.caparazon && !refuerzos.caparazon) availableOptions.push({ id: 'caparazon', label: 'Reforzar Caparazón', type: 'refuerzo' });
  } else {
    // Biologics can acquire new parts
    if (ramaBloqueada === 'Humanoide') {
      if (partes.piernas < 6) availableOptions.push({ id: 'piernas', label: 'Añadir 2 Piernas', type: 'parte' });
      if (partes.brazos < 4) availableOptions.push({ id: 'brazos', label: 'Añadir 2 Brazos', type: 'parte' });
      if (partes.cuernos < 2) availableOptions.push({ id: 'cuernos', label: 'Añadir 2 Cuernos', type: 'parte' });
      if (!partes.piel) availableOptions.push({ id: 'piel', label: 'Endurecimiento de Piel', type: 'parte' });
    } else if (ramaBloqueada === 'Insectoide') {
      if (partes.patas < 8) availableOptions.push({ id: 'patas', label: 'Añadir 2 Patas', type: 'parte' });
      if (partes.alas < 4) availableOptions.push({ id: 'alas', label: 'Añadir 2 Alas', type: 'parte' });
      if (!partes.caparazon) availableOptions.push({ id: 'caparazon', label: 'Desarrollar Caparazón', type: 'parte' });
    }
  }

  const handleSelect = (option) => {
    const newMorfologia = JSON.parse(JSON.stringify(morfologia));
    
    if (option.type === 'refuerzo') {
      newMorfologia.puntosRefuerzoGastados += 1;
      if (option.id === 'piel' || option.id === 'caparazon') {
        newMorfologia.refuerzos[option.id] = true;
      } else {
        newMorfologia.refuerzos[option.id] += 2;
      }
    } else {
      newMorfologia.puntosEstructuralesGastados += 1;
      if (option.id === 'piel' || option.id === 'caparazon') {
        newMorfologia.partes[option.id] = true;
      } else {
        newMorfologia.partes[option.id] += 2;
      }
    }
    onSelectOption(newMorfologia);
  };

  const handleDiscard = useCallback(() => {
    const newMorfologia = JSON.parse(JSON.stringify(morfologia));
    if (isAndroid) {
      newMorfologia.puntosRefuerzoGastados += 1;
    } else {
      newMorfologia.puntosEstructuralesGastados += 1;
    }
    onSelectOption(newMorfologia);
  }, [morfologia, isAndroid, onSelectOption]);

  useEffect(() => {
    if (availableOptions.length === 0) {
      // Small timeout to avoid React state update warnings during render
      const timer = setTimeout(() => {
        handleDiscard();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [availableOptions.length, handleDiscard]);

  if (availableOptions.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-terminal-bg border-2 border-terminal-accent crt-container p-6 md:p-8 rounded-lg max-w-lg w-full glow-border">
        <h2 className="font-terminal font-bold text-2xl text-terminal-accent mb-4 text-center">
          EVOLUCIÓN MORFOLÓGICA
        </h2>
        <p className="font-terminal text-terminal-text text-sm md:text-base mb-6 text-center">
          {isAndroid 
            ? "Tus sistemas mecánicos te permiten reforzar tu estructura biológica actual. Elige qué parte mejorar."
            : "Tu genoma se ha consolidado lo suficiente como para manifestar cambios físicos permanentes. Elige tu evolución."}
        </p>

        <div className="space-y-3">
          {availableOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt)}
              className="w-full font-terminal text-left px-4 py-3 border border-terminal-border text-terminal-text hover:bg-terminal-accent hover:text-black transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MorphologyModal;
