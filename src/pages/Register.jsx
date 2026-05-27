import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

// Access code generator excluding ambiguous characters (0, O, I, 1)
const generateAccessCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const Register = ({ onComplete, onCancel }) => {
  const store = useGameStore();
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [generatedCode, setGeneratedCode] = useState(null);

  // Identify which gene was mutated (the one > 0.31)
  const getMutatedGene = () => {
    const defaultVal = 0.31;
    const genes = store.genes;
    let maxGene = 'cognition';
    let maxVal = defaultVal;

    Object.entries(genes).forEach(([key, val]) => {
      if (val > maxVal) {
        maxVal = val;
        maxGene = key;
      }
    });

    return maxGene;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const mutatedGene = getMutatedGene();
    const code = generateAccessCode();

    try {
      const result = await store.registerAndMigrate(email, code, mutatedGene);
      if (result.success) {
        setGeneratedCode(code);
      } else {
        if (result.error === 'email_already_exists') {
          setErrorMsg('Este correo electrónico ya está registrado.');
        } else {
          setErrorMsg('Error en el servidor al registrar. Revisa tu conexión.');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar registrar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !accessCode.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await store.login(email, accessCode);
      if (result.success) {
        onComplete();
      } else {
        if (result.error === 'invalid_credentials') {
          setErrorMsg('Credenciales inválidas. Comprueba el email y código.');
        } else {
          setErrorMsg('Error en el servidor al iniciar sesión.');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar conectar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mutatedGeneLabel = () => {
    const gene = getMutatedGene();
    const mapping = {
      cognition: 'Cognición (Humanoide)',
      adaptability: 'Adaptabilidad (Humanoide)',
      cohesion: 'Cohesión (Insectoide)',
      metabolism: 'Metabolismo (Insectoide)',
      substrate: 'Sustrato (Androide)',
      collectiveMemory: 'Memoria Colectiva (Androide)'
    };
    return mapping[gene] || gene;
  };

  if (generatedCode) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black p-4 text-terminal-text font-terminal crt-screen">
        <div className="scanline"></div>
        <div className="w-full max-w-md p-6 border border-terminal-accent bg-terminal-bg rounded shadow-[0_0_20px_var(--color-terminal-glow)] space-y-6 text-center">
          <h2 className="text-2xl font-bold text-terminal-accent glow-text tracking-widest uppercase">
            REGISTRO COMPLETADO
          </h2>
          <div className="border border-terminal-border/40 p-4 bg-black/40 rounded space-y-2">
            <p className="text-xs text-terminal-muted">TU CÓDIGO DE ACCESO ÚNICO:</p>
            <div className="text-3xl font-extrabold text-terminal-accent tracking-widest glow-text select-all">
              {generatedCode}
            </div>
            <p className="text-[10px] text-red-400">
              Guarda este código. Lo necesitarás para iniciar sesión de nuevo.
            </p>
          </div>
          <p className="text-xs text-terminal-muted leading-relaxed">
            Hemos guardado tu perfil de **{store.dominantPhenotype}** y tu genoma en el servidor.
            Se ha enviado un correo electrónico a **{email}** con tu código.
          </p>
          <button
            onClick={onComplete}
            className="w-full py-3 bg-terminal-accent/10 border border-terminal-accent text-terminal-accent font-bold uppercase rounded hover:bg-terminal-accent hover:text-black transition-all duration-300 cursor-pointer shadow-[0_0_8px_var(--color-terminal-border)]"
          >
            Cruzar el umbral y continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black p-4 text-terminal-text font-terminal crt-screen">
      <div className="scanline"></div>
      <div className="w-full max-w-md p-6 border border-terminal-accent bg-terminal-bg rounded shadow-[0_0_20px_var(--color-terminal-glow)] space-y-6">
        <div className="text-center space-y-2">
          {onCancel && (
            <div className="flex justify-end -mb-4">
              <button 
                onClick={onCancel}
                className="text-[10px] text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-0.5 rounded cursor-pointer uppercase transition-colors"
              >
                Volver
              </button>
            </div>
          )}
          <h2 className="text-2xl font-bold text-terminal-accent glow-text tracking-widest uppercase">
            {isLoginMode ? 'INICIAR SESIÓN' : 'CONSOLIDACIÓN GENÉTICA'}
          </h2>
          <p className="text-xs text-terminal-muted leading-relaxed">
            {isLoginMode 
              ? 'Introduce tu email y código de acceso para recuperar tu partida guardada.'
              : 'Para salir de la cueva y guardar tu progreso evolutivo en la nube, registra tu email.'
            }
          </p>
        </div>

        {!isLoginMode && (
          <div className="border border-terminal-border/20 p-3 bg-black/30 rounded text-xs space-y-1">
            <div className="text-terminal-muted">Fenotipo Dominante:</div>
            <div className="text-terminal-accent font-bold uppercase">{store.dominantPhenotype}</div>
            <div className="text-terminal-muted mt-2">Mutación Inicial:</div>
            <div className="text-terminal-text font-semibold">{mutatedGeneLabel()}</div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-950/40 border border-red-500/50 text-red-400 p-3 rounded text-xs text-center">
            {errorMsg}
          </div>
        )}

        {isLoginMode ? (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-terminal-muted uppercase tracking-wider block">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@correo.com"
                disabled={isSubmitting}
                className="w-full bg-black/50 border border-terminal-border/60 p-3 text-terminal-text font-terminal placeholder-terminal-muted/40 rounded focus:border-terminal-accent focus:ring-0 focus:outline-none text-sm"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-terminal-muted uppercase tracking-wider block">
                Código de Acceso (6 letras)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="A3X9KM"
                disabled={isSubmitting}
                className="w-full bg-black/50 border border-terminal-border/60 p-3 text-terminal-text font-terminal tracking-widest placeholder-terminal-muted/40 rounded focus:border-terminal-accent focus:ring-0 focus:outline-none text-sm font-bold text-center"
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email || !accessCode}
              className={`w-full py-3 font-bold uppercase rounded border transition-all duration-300 ${
                email && accessCode && !isSubmitting
                  ? "bg-terminal-accent/10 border-terminal-accent text-terminal-accent hover:bg-terminal-accent hover:text-black cursor-pointer shadow-[0_0_8px_var(--color-terminal-border)]"
                  : "border-terminal-border/30 text-terminal-muted/40 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? 'Sincronizando núcleo...' : 'Conectar y Reanudar'}
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-terminal-muted uppercase tracking-wider block">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@correo.com"
                disabled={isSubmitting}
                className="w-full bg-black/50 border border-terminal-border/60 p-3 text-terminal-text font-terminal placeholder-terminal-muted/40 rounded focus:border-terminal-accent focus:ring-0 focus:outline-none text-sm"
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email}
              className={`w-full py-3 font-bold uppercase rounded border transition-all duration-300 ${
                email && !isSubmitting
                  ? "bg-terminal-accent/10 border-terminal-accent text-terminal-accent hover:bg-terminal-accent hover:text-black cursor-pointer shadow-[0_0_8px_var(--color-terminal-border)]"
                  : "border-terminal-border/30 text-terminal-muted/40 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? 'Estabilizando núcleo...' : 'Registrar y Guardar'}
            </button>
          </form>
        )}

        {/* Form mode toggle switcher */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMsg(null);
              setAccessCode('');
            }}
            className="text-xs text-terminal-accent underline hover:text-terminal-text transition-colors duration-300 cursor-pointer"
          >
            {isLoginMode ? '¿No tienes cuenta? Registra tu evolución local' : '¿Ya tienes un código? Carga tu partida'}
          </button>
        </div>

        <div className="text-[9px] text-terminal-muted/70 text-center leading-relaxed">
          * Al registrarte, recibirás un código de acceso único gratuito. No se solicitan contraseñas ni datos adicionales de pago.
        </div>
      </div>
    </div>
  );
};

export default Register;
