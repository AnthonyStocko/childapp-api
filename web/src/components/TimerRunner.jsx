import { useEffect, useRef, useState } from 'react';
import { Pause, Play, X, RotateCcw, CheckCircle2, SkipForward } from 'lucide-react';
import { completeSession, startSession } from '../api/children.js';

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Classes Tailwind statiques (le JIT ne détecte pas les noms construits dynamiquement).
const ACCENTS = {
  pink: {
    card: 'bg-pink-500',
    cardActive: 'bg-pink-600',
    bar: 'bg-white/60'
  },
  teal: {
    card: 'bg-teal-500',
    cardActive: 'bg-teal-600',
    bar: 'bg-white/60'
  }
};

/**
 * Gros bouton/minuteur façon appli enfant : un tap démarre la session cote
 * API (et appelle `onStart`, ex. pour lancer Spotify), décompte localement
 * avec pause/reprise, puis marque la session terminée à 0. `phases`
 * (optionnel, pour la douche) découpe le total en étapes affichées
 * successivement pendant le décompte.
 */
export default function TimerRunner({ childId, type, label, emoji, accent = 'pink', totalSeconds, phases, onStart, onPause, onResume, onDone }) {
  const [sessionId, setSessionId] = useState(null);
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  function tick() {
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }

  async function handleStart() {
    setError(null);
    try {
      const { id } = await startSession(childId, type, totalSeconds);
      setSessionId(id);
      setRemaining(totalSeconds);
      setRunning(true);
      setPaused(false);
      tick();
      onStart?.();
    } catch (err) {
      setError(err.message);
    }
  }

  function handlePause(e) {
    e.stopPropagation();
    clearInterval(intervalRef.current);
    setPaused(true);
    onPause?.();
  }

  function handleResume(e) {
    e.stopPropagation();
    setPaused(false);
    tick();
    onResume?.();
  }

  useEffect(() => {
    if (running && !paused && remaining === 0 && sessionId) {
      setRunning(false);
      completeSession(childId, sessionId)
        .then(() => onDone?.())
        .catch((err) => setError(err.message));
    }
  }, [remaining, running, paused, sessionId, childId, onDone]);

  // Saute directement à la fin de la phase en cours (ex. mouillage -> savonnage).
  function handleSkipPhase(e) {
    e.stopPropagation();
    const currentElapsed = totalSeconds - remaining;
    const current = phases?.find((p) => currentElapsed < p.upTo);
    if (!current) return;
    setRemaining(totalSeconds - current.upTo);
  }

  function handleReset(e) {
    e.stopPropagation();
    clearInterval(intervalRef.current);
    setRunning(false);
    setPaused(false);
    setSessionId(null);
    setRemaining(totalSeconds);
    onPause?.();
  }

  const elapsed = totalSeconds - remaining;
  const currentPhase = phases?.find((p) => elapsed < p.upTo);
  const progress = Math.round((elapsed / totalSeconds) * 100);
  const idle = !running && remaining === totalSeconds;
  const done = !running && remaining === 0;
  const a = ACCENTS[accent] ?? ACCENTS.pink;

  return (
    <button
      type="button"
      onClick={idle ? handleStart : undefined}
      className={`w-full text-left ${idle ? a.card : a.cardActive} text-white rounded-2xl shadow-lg p-6 transition-colors ${idle ? 'active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-center gap-4">
        <span className="text-5xl leading-none drop-shadow">
          {currentPhase?.icon ? <currentPhase.icon size={40} strokeWidth={2} /> : emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-xl">{label}</p>
          {idle && <p className="text-white/80 text-base">Appuie pour démarrer</p>}
          {running && (
            <p className="text-white/90 text-base">
              {paused ? 'En pause' : phases ? (currentPhase?.label ?? 'Terminé') : 'En cours…'}
            </p>
          )}
          {done && <p className="text-white/90 text-base">Terminé !</p>}
        </div>
        {!idle && <span className="text-3xl font-mono tabular-nums">{formatTime(remaining)}</span>}
      </div>

      {(running || done) && (
        <div className="h-2 w-full bg-black/15 rounded-full overflow-hidden mt-4">
          <div className={`h-full ${a.bar} transition-all duration-1000 ease-linear`} style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <p className="text-base text-white bg-black/20 rounded-md px-3 py-2 mt-4">{error}</p>}

      {running && (() => {
        const pauseResumeButton = paused ? (
          <button
            type="button"
            onClick={handleResume}
            className="flex items-center gap-2 bg-black/20 hover:bg-black/30 transition-colors rounded-full px-5 py-2.5 text-base font-semibold"
          >
            <Play size={18} />
            Reprendre
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePause}
            className="flex items-center gap-2 bg-black/20 hover:bg-black/30 transition-colors rounded-full px-5 py-2.5 text-base font-semibold"
          >
            <Pause size={18} />
            Pause
          </button>
        );

        const skipButton = phases && !paused && (
          <button
            type="button"
            onClick={handleSkipPhase}
            className="flex items-center gap-2 bg-black/20 hover:bg-black/30 transition-colors rounded-full px-5 py-2.5 text-base font-semibold"
          >
            <SkipForward size={18} />
            Étape suivante
          </button>
        );

        const cancelButton = (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 bg-black/15 hover:bg-black/25 transition-colors rounded-full px-5 py-2.5 text-base font-semibold"
          >
            <X size={18} />
            Annuler
          </button>
        );

        // Douche (avec phases) : 2 lignes pour ne pas surcharger la carte avec 3 boutons.
        return phases ? (
          <div className="mt-4 space-y-3">
            <div className="flex gap-3">{pauseResumeButton}{skipButton}</div>
            <div className="flex gap-3">{cancelButton}</div>
          </div>
        ) : (
          <div className="mt-4 flex gap-3">{pauseResumeButton}{cancelButton}</div>
        );
      })()}
      {done && (
        <div className="mt-4 flex items-center gap-3">
          <span className="flex items-center gap-2 text-base font-semibold">
            <CheckCircle2 size={20} />
            Bravo !
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 bg-black/15 hover:bg-black/25 transition-colors rounded-full px-5 py-2.5 text-base font-semibold"
          >
            <RotateCcw size={18} />
            Refaire
          </button>
        </div>
      )}
    </button>
  );
}
