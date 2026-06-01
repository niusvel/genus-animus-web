import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Constructor de Escenas — genera definicion.json + narrativa.md en el formato
// que consume el motor unificado (casos declarativos, examinar por objeto,
// bloqueos por salida). Accesible en /config.
// ─────────────────────────────────────────────────────────────────────────────

const COMANDOS = [
  'OBSERVAR', 'ESCUCHAR', 'EXAMINAR', 'IR', 'TOMAR', 'SOLTAR', 'EQUIPAR', 'DESEQUIPAR',
  'USAR', 'INVENTARIO', 'FRAGMENTOS', 'INVESTIGAR', 'MUTAR', 'CANCELAR', 'ATACAR',
  'DEFENDER', 'DESCANSAR', 'ESTADO', 'RECORDAR', 'GUARDAR', 'AYUDA'
];

// Verbos que admiten lógica por `casos`.
const VERBOS_LOGICA = [
  { key: 'observar', label: 'OBSERVAR' },
  { key: 'escuchar', label: 'ESCUCHAR' },
  { key: 'defender', label: 'DEFENDER' },
  { key: 'descansar', label: 'DESCANSAR' },
  { key: 'estado', label: 'ESTADO' },
  { key: 'investigar', label: 'INVESTIGAR' },
  { key: 'cancelar', label: 'CANCELAR' }
];

const COND_TIPOS = [
  { v: 'default', label: 'Siempre (por defecto)' },
  { v: 'flag', label: 'Flag activa' },
  { v: 'noflag', label: 'Flag NO activa' },
  { v: 'tiene', label: 'Tiene objeto' },
  { v: 'notiene', label: 'NO tiene objeto' },
  { v: 'frag_min', label: 'Fragmentos ≥' },
  { v: 'json', label: 'Avanzado (JSON)' }
];

// Convierte el formulario de un caso a la condición declarativa real.
function buildCondicion(caso) {
  switch (caso.tipo) {
    case 'flag': return { flag: caso.valor };
    case 'noflag': return { no: { flag: caso.valor } };
    case 'tiene': return { inventario_tiene: caso.valor };
    case 'notiene': return { no: { inventario_tiene: caso.valor } };
    case 'frag_min': return { fragmentos_min: Number(caso.valor) || 0 };
    case 'json':
      try { return JSON.parse(caso.valor); } catch { return null; }
    case 'default':
    default:
      return undefined; // caso por defecto: sin `si`
  }
}

// Inversa de buildCondicion: condición declarativa → formulario del caso.
function inverseCond(si) {
  if (si === undefined || si === null) return { tipo: 'default', valor: '' };
  if (si.flag) return { tipo: 'flag', valor: si.flag };
  if (si.no && si.no.flag) return { tipo: 'noflag', valor: si.no.flag };
  if (si.inventario_tiene) return { tipo: 'tiene', valor: si.inventario_tiene };
  if (si.no && si.no.inventario_tiene) return { tipo: 'notiene', valor: si.no.inventario_tiene };
  if (si.fragmentos_min !== undefined) return { tipo: 'frag_min', valor: String(si.fragmentos_min) };
  return { tipo: 'json', valor: JSON.stringify(si) };
}

// Divide narrativa.md en { clave: texto } por las marcas <!-- clave -->.
function parseNarrativaBlocks(md) {
  const textos = {};
  if (!md) return textos;
  const regex = /<!--\s*([a-zA-Z0-9_-]+)\s*-->/g;
  const matches = [];
  let m;
  while ((m = regex.exec(md)) !== null) matches.push({ key: m[1], index: m.index, length: m[0].length });
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i], nxt = matches[i + 1];
    textos[cur.key] = md.substring(cur.index + cur.length, nxt ? nxt.index : md.length).trim();
  }
  return textos;
}

const csv = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

// ── Helpers de UI ────────────────────────────────────────────────────────────
const fieldCls = 'w-full bg-black/40 border border-terminal-border text-terminal-text rounded px-2 py-1 text-sm focus:border-terminal-accent outline-none';
const labelCls = 'block text-[11px] uppercase tracking-wide text-terminal-muted mb-1';
const btnCls = 'px-3 py-1 border border-terminal-border text-terminal-text hover:border-terminal-accent hover:text-terminal-accent rounded text-xs uppercase transition-colors cursor-pointer';

function Section({ title, children }) {
  return (
    <section className="border border-terminal-border/50 rounded p-4 bg-black/20 space-y-3">
      <h2 className="text-terminal-accent font-bold uppercase tracking-widest text-sm border-b border-terminal-border/40 pb-2">{title}</h2>
      {children}
    </section>
  );
}

export default function SceneBuilder() {
  // Datos básicos
  const [meta, setMeta] = useState({ id: '', nombre: '', zona: '', checkpoint: false });
  const [flagsRequiere, setFlagsRequiere] = useState('');
  const [flagsOtorga, setFlagsOtorga] = useState('');
  const [comandosIniciales, setComandosIniciales] = useState([]);
  const [comandosDesbloqueables, setComandosDesbloqueables] = useState([]);

  const [objetos, setObjetos] = useState([]);
  const [salidas, setSalidas] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [desbloqueos, setDesbloqueos] = useState([]);
  const [logicas, setLogicas] = useState({}); // { verbo: { flag_que_otorga, casos:[{tipo,valor,texto}] } }
  const [textos, setTextos] = useState({}); // { clave: texto }

  const [saveMsg, setSaveMsg] = useState('');

  // Campos del JSON que el formulario no modela (enemigos, contadores, logica_mutacion,
  // logica_tomar/soltar...). Se conservan al cargar y se re-emiten al generar.
  const [preservados, setPreservados] = useState({});
  // Escenas conocidas para autocompletar origen/destino.
  const [knownScenes, setKnownScenes] = useState([]);

  const bundledScenes = useMemo(() => {
    try {
      return Object.keys(import.meta.glob('../content/scenes/*/definicion.json'))
        .map((p) => (p.match(/scenes\/([^/]+)\//) || [])[1])
        .filter(Boolean);
    } catch { return []; }
  }, []);
  const escenasSugeridas = useMemo(
    () => Array.from(new Set([...bundledScenes, ...knownScenes])).sort(),
    [bundledScenes, knownScenes]
  );

  const toggle = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  // ── Listas dinámicas ──
  const addObjeto = () => setObjetos([...objetos, {
    id: '', nombre: '', descripcion_corta: '', tomable: false, examinable: true,
    usos_examinar: 1, fragmentos_adn: 0, visible_desde_inicio: true, visible_con_flag: '',
    equipable: false, toxico: false, efecto_al_tomar: ''
  }]);
  const updObjeto = (i, k, v) => setObjetos(objetos.map((o, j) => j === i ? { ...o, [k]: v } : o));
  const delObjeto = (i) => setObjetos(objetos.filter((_, j) => j !== i));

  const addSalida = () => setSalidas([...salidas, {
    id: '', palabra_clave: '', destino: '', requiere_flag: '',
    texto_bloqueado_id: '', texto_transicion_id: '', bloqueos: []
  }]);
  const updSalida = (i, k, v) => setSalidas(salidas.map((s, j) => j === i ? { ...s, [k]: v } : s));
  const delSalida = (i) => setSalidas(salidas.filter((_, j) => j !== i));

  const addEntrada = () => setEntradas([...entradas, { origen: '', texto_llegada_id: 'llegada' }]);
  const updEntrada = (i, k, v) => setEntradas(entradas.map((e, j) => j === i ? { ...e, [k]: v } : e));
  const delEntrada = (i) => setEntradas(entradas.filter((_, j) => j !== i));

  const addDesbloqueo = () => setDesbloqueos([...desbloqueos, {
    id: '', flag: '', desbloquea_comandos: '', texto_id: '', se_repite: false
  }]);
  const updDesbloqueo = (i, k, v) => setDesbloqueos(desbloqueos.map((d, j) => j === i ? { ...d, [k]: v } : d));
  const delDesbloqueo = (i) => setDesbloqueos(desbloqueos.filter((_, j) => j !== i));

  const toggleLogica = (verbo) => {
    setLogicas((prev) => {
      const next = { ...prev };
      if (next[verbo]) delete next[verbo];
      else next[verbo] = { flag_que_otorga: '', casos: [{ tipo: 'default', valor: '', texto: '' }] };
      return next;
    });
  };
  const updLogica = (verbo, patch) => setLogicas((p) => ({ ...p, [verbo]: { ...p[verbo], ...patch } }));
  const addCaso = (verbo) => updLogica(verbo, { casos: [...logicas[verbo].casos, { tipo: 'default', valor: '', texto: '' }] });
  const updCaso = (verbo, i, k, v) => updLogica(verbo, { casos: logicas[verbo].casos.map((c, j) => j === i ? { ...c, [k]: v } : c) });
  const delCaso = (verbo, i) => updLogica(verbo, { casos: logicas[verbo].casos.filter((_, j) => j !== i) });

  // ── Cargar una escena existente desde disco ──
  const VERBO_KEYS = VERBOS_LOGICA.map((v) => v.key);

  const poblarFormulario = (def, nar, dirName) => {
    setMeta({ id: def.id || dirName || '', nombre: def.nombre || '', zona: def.zona || '', checkpoint: !!def.checkpoint });
    setFlagsRequiere((def.flags_que_requiere || []).join(', '));
    setFlagsOtorga((def.flags_que_otorga || []).join(', '));
    setComandosIniciales(def.comandos_iniciales || []);
    setComandosDesbloqueables(def.comandos_desbloqueables || []);
    setObjetos((def.objetos || []).map((o) => ({
      id: o.id || '', nombre: o.nombre || '', descripcion_corta: o.descripcion_corta || '',
      tomable: !!o.tomable, examinable: !!o.examinable, usos_examinar: o.usos_examinar ?? 1,
      fragmentos_adn: o.fragmentos_adn ?? 0, visible_desde_inicio: o.visible_desde_inicio !== false,
      visible_con_flag: o.visible_con_flag || '', equipable: !!o.equipable, toxico: !!o.toxico,
      efecto_al_tomar: o.efecto_al_tomar || ''
    })));
    setSalidas((def.salidas || []).map((s) => ({
      id: s.id || '', palabra_clave: s.palabra_clave || '', destino: s.destino || '',
      requiere_flag: s.requiere_flag || '', texto_bloqueado_id: s.texto_bloqueado_id || '',
      texto_transicion_id: s.texto_transicion_id || '',
      bloqueos: (s.bloqueos || []).map((b) => ({ ...inverseCond(b.si), texto: b.texto || '' }))
    })));
    setEntradas((def.entradas || []).map((e) => ({ origen: e.origen || '', texto_llegada_id: e.texto_llegada_id || 'llegada' })));
    setDesbloqueos((def.desbloqueos || []).map((d) => ({
      id: d.id || '', flag: (d.condicion && d.condicion.flag) || '',
      desbloquea_comandos: (d.desbloquea_comandos || []).join(', '), texto_id: d.texto_id || '', se_repite: !!d.se_repite
    })));
    const lg = {};
    for (const key of VERBO_KEYS) {
      const b = def[`logica_${key}`];
      if (b && Array.isArray(b.casos)) {
        lg[key] = { flag_que_otorga: b.flag_que_otorga || '', casos: b.casos.map((c) => ({ ...inverseCond(c.si), texto: c.texto || '' })) };
      }
    }
    setLogicas(lg);
    setTextos(parseNarrativaBlocks(nar));

    // Conservar las claves que el formulario no gestiona (logica_examinar se regenera).
    const gestionadas = new Set([
      'id', 'zona', 'nombre', 'checkpoint', 'flags_que_requiere', 'flags_que_otorga',
      'comandos_iniciales', 'comandos_desbloqueables', 'objetos', 'salidas', 'entradas',
      'desbloqueos', 'logica_examinar', ...VERBO_KEYS.map((k) => `logica_${k}`)
    ]);
    const pres = {};
    Object.keys(def).forEach((k) => { if (!gestionadas.has(k)) pres[k] = def[k]; });
    setPreservados(pres);

    const refs = [def.id, ...(def.entradas || []).map((e) => e.origen), ...(def.salidas || []).map((s) => s.destino)].filter(Boolean);
    setKnownScenes((prev) => Array.from(new Set([...prev, ...refs])));
  };

  const cargarEscena = async () => {
    setSaveMsg('');
    if (!window.showDirectoryPicker) {
      setSaveMsg('Tu navegador no permite leer carpetas. Usa Chrome o Edge para cargar escenas.');
      return;
    }
    try {
      const dir = await window.showDirectoryPicker();
      const defFile = await (await dir.getFileHandle('definicion.json')).getFile();
      const def = JSON.parse(await defFile.text());
      let nar = '';
      try {
        const narFile = await (await dir.getFileHandle('narrativa.md')).getFile();
        nar = await narFile.text();
      } catch { /* la escena puede no tener narrativa.md aún */ }
      poblarFormulario(def, nar, dir.name);
      setSaveMsg(`Escena "${def.id || dir.name}" cargada. Edita y vuelve a guardar.`);
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      setSaveMsg('Error al cargar: ' + (err?.message || err));
    }
  };

  // ── Construcción del definicion.json ──
  const definicion = useMemo(() => {
    const def = {
      id: meta.id || 'nueva_escena',
      zona: meta.zona || '',
      nombre: meta.nombre || '',
      checkpoint: !!meta.checkpoint,
      flags_que_requiere: csv(flagsRequiere),
      flags_que_otorga: csv(flagsOtorga),
      comandos_iniciales: comandosIniciales,
      comandos_desbloqueables: comandosDesbloqueables,
      objetos: objetos.map((o) => {
        const obj = {
          id: o.id, nombre: o.nombre, descripcion_corta: o.descripcion_corta,
          tomable: !!o.tomable, examinable: !!o.examinable, visible_desde_inicio: !!o.visible_desde_inicio
        };
        if (o.examinable) obj.usos_examinar = Number(o.usos_examinar) || 1;
        if (Number(o.fragmentos_adn) > 0) obj.fragmentos_adn = Number(o.fragmentos_adn);
        if (!o.visible_desde_inicio && o.visible_con_flag) obj.visible_con_flag = o.visible_con_flag;
        if (o.equipable) obj.equipable = true;
        if (o.toxico) obj.toxico = true;
        if (o.efecto_al_tomar) obj.efecto_al_tomar = o.efecto_al_tomar;
        return obj;
      }),
      desbloqueos: desbloqueos.map((d) => ({
        id: d.id,
        condicion: { tipo: 'flag', flag: d.flag },
        desbloquea_comandos: csv(d.desbloquea_comandos),
        flags_que_otorga: [],
        texto_id: d.texto_id || null,
        se_repite: !!d.se_repite
      })),
      salidas: salidas.map((s) => {
        const sal = {
          id: s.id, comando: 'IR', palabra_clave: s.palabra_clave, destino: s.destino,
          requiere_flag: s.requiere_flag || null
        };
        if (s.bloqueos && s.bloqueos.length) {
          sal.bloqueos = s.bloqueos
            .map((b) => ({ si: buildCondicion(b), texto: b.texto }))
            .filter((b) => b.si !== null);
        }
        sal.texto_bloqueado_id = s.texto_bloqueado_id || null;
        sal.texto_transicion_id = s.texto_transicion_id || null;
        return sal;
      }),
      entradas: entradas.map((e) => ({ origen: e.origen, texto_llegada_id: e.texto_llegada_id })),
    };

    // Lógicas por casos
    for (const verbo of Object.keys(logicas)) {
      const l = logicas[verbo];
      const block = {};
      if (l.flag_que_otorga) block.flag_que_otorga = l.flag_que_otorga;
      block.casos = l.casos
        .map((c) => {
          const si = buildCondicion(c);
          const caso = { texto: c.texto };
          if (si !== undefined && si !== null) caso.si = si;
          return caso;
        });
      def[`logica_${verbo}`] = block;
    }

    // Lógica examinar derivada de los objetos examinables
    const examinables = objetos.filter((o) => o.examinable && o.id);
    if (examinables.length) {
      const le = {};
      for (const o of examinables) {
        le[`${o.id}_disponible`] = `examinar_${o.id}`;
        le[`${o.id}_agotado`] = `examinar_${o.id}_agotado`;
      }
      def.logica_examinar = le;
    }

    // Campos no gestionados por el formulario (preservados de una carga) primero,
    // para que lo definido aquí tenga prioridad.
    return { ...preservados, ...def };
  }, [meta, flagsRequiere, flagsOtorga, comandosIniciales, comandosDesbloqueables, objetos, salidas, entradas, desbloqueos, logicas, preservados]);

  // ── Bloques de narrativa referenciados ──
  const clavesNarrativa = useMemo(() => {
    const ids = new Set(['llegada']);
    entradas.forEach((e) => e.texto_llegada_id && ids.add(e.texto_llegada_id));
    salidas.forEach((s) => {
      if (s.texto_transicion_id) ids.add(s.texto_transicion_id);
      if (s.texto_bloqueado_id) ids.add(s.texto_bloqueado_id);
      (s.bloqueos || []).forEach((b) => b.texto && ids.add(b.texto));
    });
    desbloqueos.forEach((d) => d.texto_id && ids.add(d.texto_id));
    Object.values(logicas).forEach((l) => l.casos.forEach((c) => c.texto && ids.add(c.texto)));
    objetos.filter((o) => o.examinable && o.id).forEach((o) => {
      ids.add(`examinar_${o.id}`);
      ids.add(`examinar_${o.id}_agotado`);
    });
    return Array.from(ids);
  }, [entradas, salidas, desbloqueos, logicas, objetos]);

  // ── Archivos generados ──
  const definicionStr = useMemo(() => JSON.stringify(definicion, null, 2), [definicion]);
  const narrativaStr = useMemo(() => {
    let md = `---\nid: ${meta.id || 'nueva_escena'}\n---\n\n`;
    for (const clave of clavesNarrativa) {
      md += `<!-- ${clave} -->\n${(textos[clave] || '').trim()}\n\n`;
    }
    return md.trimEnd() + '\n';
  }, [meta.id, clavesNarrativa, textos]);

  // ── Guardado ──
  const carpeta = meta.id || 'nueva_escena';

  const guardarEnCarpeta = async () => {
    setSaveMsg('');
    if (!window.showDirectoryPicker) {
      descargar();
      setSaveMsg('Tu navegador no soporta guardar en carpeta; se descargaron los archivos. Colócalos en una carpeta "' + carpeta + '".');
      return;
    }
    try {
      const root = await window.showDirectoryPicker();
      const dir = await root.getDirectoryHandle(carpeta, { create: true });
      for (const [nombre, contenido] of [['definicion.json', definicionStr], ['narrativa.md', narrativaStr]]) {
        const fh = await dir.getFileHandle(nombre, { create: true });
        const w = await fh.createWritable();
        await w.write(contenido);
        await w.close();
      }
      setSaveMsg(`Guardado en la carpeta "${carpeta}/" (definicion.json + narrativa.md).`);
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      setSaveMsg('Error al guardar: ' + (err?.message || err));
    }
  };

  const descargar = async () => {
    const archivos = [
      ['definicion.json', definicionStr, 'application/json'],
      ['narrativa.md', narrativaStr, 'text/markdown']
    ];
    for (const [nombre, contenido, tipo] of archivos) {
      const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revocar con margen para no cancelar la descarga en curso.
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      // Pausa entre descargas para que el navegador no descarte la primera.
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  return (
    <div className="min-h-screen bg-black text-terminal-text font-terminal p-4 md:p-8" data-phenotype="primordial_latente">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-terminal-border pb-3">
          <h1 className="text-terminal-accent font-bold text-xl md:text-2xl tracking-widest uppercase glow-text">
            Constructor de Escenas
          </h1>
          <div className="flex gap-2">
            <button className={btnCls} onClick={cargarEscena}>📂 Cargar escena</button>
            <Link to="/" className={btnCls}>← Volver al juego</Link>
          </div>
        </header>

        {/* Sugerencias de escenas conocidas (bundle del cliente + cargadas) */}
        <datalist id="escenas-sugeridas">
          {escenasSugeridas.map((s) => <option key={s} value={s} />)}
        </datalist>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ─── Formulario ─── */}
          <div className="space-y-5">
            <Section title="Datos básicos">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>ID (carpeta)</label>
                  <input className={fieldCls} value={meta.id} placeholder="bosque_profundo"
                    onChange={(e) => setMeta({ ...meta, id: e.target.value.trim().toLowerCase().replace(/\s+/g, '_') })} />
                </div>
                <div>
                  <label className={labelCls}>Nombre</label>
                  <input className={fieldCls} value={meta.nombre} placeholder="El Bosque Profundo"
                    onChange={(e) => setMeta({ ...meta, nombre: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Zona</label>
                  <input className={fieldCls} value={meta.zona} placeholder="bosque_exterior"
                    onChange={(e) => setMeta({ ...meta, zona: e.target.value })} />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <input id="cp" type="checkbox" checked={meta.checkpoint}
                    onChange={(e) => setMeta({ ...meta, checkpoint: e.target.checked })} />
                  <label htmlFor="cp" className="text-sm">Es checkpoint (permite GUARDAR)</label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Flags que requiere (coma)</label>
                  <input className={fieldCls} value={flagsRequiere} placeholder="first_mutation_completed"
                    onChange={(e) => setFlagsRequiere(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Flags que otorga (coma)</label>
                  <input className={fieldCls} value={flagsOtorga} placeholder="bosque_profundo_visitado"
                    onChange={(e) => setFlagsOtorga(e.target.value)} />
                </div>
              </div>
            </Section>

            <Section title="Comandos">
              <div>
                <label className={labelCls}>Iniciales</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMANDOS.map((c) => (
                    <button key={c} type="button"
                      onClick={() => toggle(comandosIniciales, setComandosIniciales, c)}
                      className={`px-2 py-0.5 rounded text-[11px] border ${comandosIniciales.includes(c) ? 'border-terminal-accent text-terminal-accent bg-terminal-accent/10' : 'border-terminal-border text-terminal-muted'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Desbloqueables</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMANDOS.map((c) => (
                    <button key={c} type="button"
                      onClick={() => toggle(comandosDesbloqueables, setComandosDesbloqueables, c)}
                      className={`px-2 py-0.5 rounded text-[11px] border ${comandosDesbloqueables.includes(c) ? 'border-terminal-accent text-terminal-accent bg-terminal-accent/10' : 'border-terminal-border text-terminal-muted'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Objetos">
              {objetos.map((o, i) => (
                <div key={i} className="border border-terminal-border/40 rounded p-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input className={fieldCls} placeholder="id (arbol)" value={o.id} onChange={(e) => updObjeto(i, 'id', e.target.value.trim().toLowerCase())} />
                    <input className={fieldCls} placeholder="nombre (árbol)" value={o.nombre} onChange={(e) => updObjeto(i, 'nombre', e.target.value)} />
                  </div>
                  <input className={fieldCls} placeholder="descripción corta" value={o.descripcion_corta} onChange={(e) => updObjeto(i, 'descripcion_corta', e.target.value)} />
                  <div className="flex flex-wrap gap-3 text-[11px] text-terminal-muted">
                    <label className="flex gap-1"><input type="checkbox" checked={o.examinable} onChange={(e) => updObjeto(i, 'examinable', e.target.checked)} />examinable</label>
                    <label className="flex gap-1"><input type="checkbox" checked={o.tomable} onChange={(e) => updObjeto(i, 'tomable', e.target.checked)} />tomable</label>
                    <label className="flex gap-1"><input type="checkbox" checked={o.equipable} onChange={(e) => updObjeto(i, 'equipable', e.target.checked)} />equipable</label>
                    <label className="flex gap-1"><input type="checkbox" checked={o.toxico} onChange={(e) => updObjeto(i, 'toxico', e.target.checked)} />tóxico</label>
                    <label className="flex gap-1"><input type="checkbox" checked={o.visible_desde_inicio} onChange={(e) => updObjeto(i, 'visible_desde_inicio', e.target.checked)} />visible desde inicio</label>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className={labelCls}>usos examinar</label><input className={fieldCls} type="number" value={o.usos_examinar} onChange={(e) => updObjeto(i, 'usos_examinar', e.target.value)} /></div>
                    <div><label className={labelCls}>fragmentos ADN</label><input className={fieldCls} type="number" value={o.fragmentos_adn} onChange={(e) => updObjeto(i, 'fragmentos_adn', e.target.value)} /></div>
                    <div><label className={labelCls}>visible con flag</label><input className={fieldCls} value={o.visible_con_flag} disabled={o.visible_desde_inicio} onChange={(e) => updObjeto(i, 'visible_con_flag', e.target.value)} /></div>
                  </div>
                  <button className="text-red-400 text-xs" onClick={() => delObjeto(i)}>✕ eliminar objeto</button>
                </div>
              ))}
              <button className={btnCls} onClick={addObjeto}>+ Objeto</button>
            </Section>

            <Section title="Salidas (IR)">
              {salidas.map((s, i) => (
                <div key={i} className="border border-terminal-border/40 rounded p-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input className={fieldCls} placeholder="id (salida_sendero)" value={s.id} onChange={(e) => updSalida(i, 'id', e.target.value)} />
                    <input className={fieldCls} placeholder="palabra clave (sendero)" value={s.palabra_clave} onChange={(e) => updSalida(i, 'palabra_clave', e.target.value)} />
                    <input className={fieldCls} list="escenas-sugeridas" placeholder="destino (otra_escena)" value={s.destino} onChange={(e) => updSalida(i, 'destino', e.target.value)} />
                    <input className={fieldCls} placeholder="requiere flag (opcional)" value={s.requiere_flag} onChange={(e) => updSalida(i, 'requiere_flag', e.target.value)} />
                    <input className={fieldCls} placeholder="texto transición id" value={s.texto_transicion_id} onChange={(e) => updSalida(i, 'texto_transicion_id', e.target.value)} />
                    <input className={fieldCls} placeholder="texto bloqueado id" value={s.texto_bloqueado_id} onChange={(e) => updSalida(i, 'texto_bloqueado_id', e.target.value)} />
                  </div>
                  <button className="text-red-400 text-xs" onClick={() => delSalida(i)}>✕ eliminar salida</button>
                </div>
              ))}
              <button className={btnCls} onClick={addSalida}>+ Salida</button>
            </Section>

            <Section title="Entradas (texto de llegada por origen)">
              {entradas.map((e, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <input className={fieldCls} list="escenas-sugeridas" placeholder="origen (escena previa)" value={e.origen} onChange={(ev) => updEntrada(i, 'origen', ev.target.value)} />
                  <input className={fieldCls} placeholder="texto_llegada_id (llegada)" value={e.texto_llegada_id} onChange={(ev) => updEntrada(i, 'texto_llegada_id', ev.target.value)} />
                  <button className="text-red-400 text-xs" onClick={() => delEntrada(i)}>✕</button>
                </div>
              ))}
              <button className={btnCls} onClick={addEntrada}>+ Entrada</button>
            </Section>

            <Section title="Desbloqueos (comandos por flag)">
              {desbloqueos.map((d, i) => (
                <div key={i} className="border border-terminal-border/40 rounded p-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input className={fieldCls} placeholder="id (desbloqueo_ir)" value={d.id} onChange={(e) => updDesbloqueo(i, 'id', e.target.value)} />
                    <input className={fieldCls} placeholder="flag requerido" value={d.flag} onChange={(e) => updDesbloqueo(i, 'flag', e.target.value)} />
                    <input className={fieldCls} placeholder="desbloquea comandos (coma)" value={d.desbloquea_comandos} onChange={(e) => updDesbloqueo(i, 'desbloquea_comandos', e.target.value)} />
                    <input className={fieldCls} placeholder="texto_id (opcional)" value={d.texto_id} onChange={(e) => updDesbloqueo(i, 'texto_id', e.target.value)} />
                  </div>
                  <label className="flex gap-1 text-[11px] text-terminal-muted"><input type="checkbox" checked={d.se_repite} onChange={(e) => updDesbloqueo(i, 'se_repite', e.target.checked)} />se repite</label>
                  <button className="text-red-400 text-xs" onClick={() => delDesbloqueo(i)}>✕ eliminar desbloqueo</button>
                </div>
              ))}
              <button className={btnCls} onClick={addDesbloqueo}>+ Desbloqueo</button>
            </Section>

            <Section title="Lógica por comando (casos)">
              <div className="flex flex-wrap gap-1.5">
                {VERBOS_LOGICA.map((v) => (
                  <button key={v.key} type="button" onClick={() => toggleLogica(v.key)}
                    className={`px-2 py-0.5 rounded text-[11px] border ${logicas[v.key] ? 'border-terminal-accent text-terminal-accent bg-terminal-accent/10' : 'border-terminal-border text-terminal-muted'}`}>
                    {v.label}
                  </button>
                ))}
              </div>
              {Object.keys(logicas).map((verbo) => (
                <div key={verbo} className="border border-terminal-border/40 rounded p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-terminal-accent text-xs uppercase">{verbo}</span>
                    <input className="bg-black/40 border border-terminal-border rounded px-2 py-0.5 text-xs" placeholder="flag_que_otorga (opcional)"
                      value={logicas[verbo].flag_que_otorga} onChange={(e) => updLogica(verbo, { flag_que_otorga: e.target.value })} />
                  </div>
                  {logicas[verbo].casos.map((c, i) => (
                    <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                      <select className="bg-black/40 border border-terminal-border rounded px-1 py-1 text-xs" value={c.tipo} onChange={(e) => updCaso(verbo, i, 'tipo', e.target.value)}>
                        {COND_TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                      </select>
                      <input className={fieldCls} placeholder={c.tipo === 'json' ? '{"no":{"flag":"x"}}' : c.tipo === 'default' ? '(sin valor)' : 'valor (flag/objeto/número)'}
                        value={c.valor} disabled={c.tipo === 'default'} onChange={(e) => updCaso(verbo, i, 'valor', e.target.value)} />
                      <input className={fieldCls} placeholder="texto id (observar_1)" value={c.texto} onChange={(e) => updCaso(verbo, i, 'texto', e.target.value)} />
                      <button className="text-red-400 text-xs" onClick={() => delCaso(verbo, i)}>✕</button>
                    </div>
                  ))}
                  <button className={btnCls} onClick={() => addCaso(verbo)}>+ Caso</button>
                </div>
              ))}
            </Section>

            <Section title="Narrativa (texto de cada bloque)">
              <p className="text-[11px] text-terminal-muted">Bloques detectados a partir de la lógica y salidas. Rellena el texto de cada uno.</p>
              {clavesNarrativa.map((clave) => (
                <div key={clave}>
                  <label className={labelCls}>{clave}</label>
                  <textarea className={`${fieldCls} h-20 resize-y`} value={textos[clave] || ''}
                    onChange={(e) => setTextos({ ...textos, [clave]: e.target.value })} />
                </div>
              ))}
            </Section>
          </div>

          {/* ─── Previsualización + guardado ─── */}
          <div className="space-y-4 lg:sticky lg:top-4 self-start">
            <Section title={`Previsualización — ${carpeta}/`}>
              <div className="flex gap-2 mb-2">
                <button className="px-3 py-1.5 bg-terminal-accent/15 border border-terminal-accent text-terminal-accent hover:bg-terminal-accent hover:text-black rounded text-xs uppercase font-bold transition-colors" onClick={guardarEnCarpeta}>
                  💾 Guardar en carpeta
                </button>
                <button className={btnCls} onClick={descargar}>⬇ Descargar archivos</button>
              </div>
              {saveMsg && <p className="text-[11px] text-terminal-accent">{saveMsg}</p>}
              <div>
                <div className="text-[11px] text-terminal-muted uppercase mb-1">definicion.json</div>
                <pre className="bg-black/50 border border-terminal-border/40 rounded p-2 text-[11px] overflow-auto max-h-72 text-terminal-text">{definicionStr}</pre>
              </div>
              <div>
                <div className="text-[11px] text-terminal-muted uppercase mb-1">narrativa.md</div>
                <pre className="bg-black/50 border border-terminal-border/40 rounded p-2 text-[11px] overflow-auto max-h-72 text-terminal-text">{narrativaStr}</pre>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
