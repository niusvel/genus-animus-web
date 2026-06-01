// Evaluador genérico de condiciones declarativas.
//
// Reemplaza a la antigua `checkCondition` hardcodeada por escena. Las tablas
// `logica_*` de cada `definicion.json` declaran sus condiciones como objetos, de
// modo que el motor es el mismo para todas las escenas (locales y servidas por el
// backend) sin lógica específica en código.
//
// Gramática de una condición:
//   {}  o  ausente                  → siempre verdadero (caso por defecto)
//   { flag: "x" }                   → la flag x está activa
//   { no: <cond> }                  → negación
//   { y: [<cond>, ...] }            → conjunción (todas verdaderas)
//   { o: [<cond>, ...] }            → disyunción (alguna verdadera)
//   { inventario_tiene: "id" }      → el inventario contiene el objeto id
//   { fragmentos_min: n }           → fragmentos de ADN >= n
//   { fragmentos_max: n }           → fragmentos de ADN <= n
//   { objetivo: "x" | ["x","y"] }   → el argumento del comando coincide
//   { gen: "cognition", min: 0.5 }  → valor del gen dentro del umbral (min/max)

// Normaliza texto para comparaciones (minúsculas, sin acentos).
export function normalizeText(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function evalCondition(cond, state, target) {
  // Sin condición → caso por defecto.
  if (cond === undefined || cond === null || cond === true) return true;
  if (typeof cond !== 'object') return false;

  const flags = state.flags || {};
  const inventory = state.inventory || [];

  // Combinadores
  if ('no' in cond) return !evalCondition(cond.no, state, target);
  if ('y' in cond) return (cond.y || []).every((c) => evalCondition(c, state, target));
  if ('o' in cond) return (cond.o || []).some((c) => evalCondition(c, state, target));

  // Predicados atómicos
  if ('flag' in cond) return !!flags[cond.flag];

  if ('inventario_tiene' in cond) {
    const id = normalizeText(cond.inventario_tiene);
    return inventory.some((it) => normalizeText(it.id) === id);
  }

  if ('fragmentos_min' in cond) return (state.dnaFragments || 0) >= cond.fragmentos_min;
  if ('fragmentos_max' in cond) return (state.dnaFragments || 0) <= cond.fragmentos_max;

  if ('objetivo' in cond) {
    const t = normalizeText(target);
    const opciones = Array.isArray(cond.objetivo) ? cond.objetivo : [cond.objetivo];
    return opciones.map(normalizeText).includes(t);
  }

  if ('gen' in cond) {
    const val = (state.genes || {})[cond.gen];
    if (typeof val !== 'number') return false;
    if (typeof cond.min === 'number' && val < cond.min) return false;
    if (typeof cond.max === 'number' && val > cond.max) return false;
    return true;
  }

  // Objeto vacío {} → caso por defecto.
  if (Object.keys(cond).length === 0) return true;

  return false;
}

// Resuelve una tabla de lógica basada en `casos`: devuelve el `texto` (id de
// bloque narrativo) del primer caso cuya condición `si` se cumple, o null.
// Un caso sin `si` actúa como caso por defecto.
export function resolverCasos(logicBlock, state, target) {
  const casos = (logicBlock && logicBlock.casos) || [];
  for (const caso of casos) {
    if (evalCondition(caso.si, state, target)) {
      return caso.texto || null;
    }
  }
  return null;
}
