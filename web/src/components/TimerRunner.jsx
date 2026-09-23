import { useEffect, useRef, useState } from 'react';
import { Pause, Play, X, RotateCcw, CheckCircle2, SkipForward } from 'lucide-react';
import { completeSession, startSession } from '../api/children.js';

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// AudioContext partagé, créé/débloqué au tap de démarrage (les navigateurs,
// iOS surtout, bloquent l'audio lancé hors geste utilisateur).
let sharedAudioCtx = null;
function getAudioContext() {
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
  return sharedAudioCtx;
}

const BEEPS_DURATION_MS = 1100;

/**
 * 3 bips forts synthétisés (Web Audio API, pas de fichier son à charger). Best-effort.
 * La promesse se résout quand les bips sont finis.
 */
function playBeeps() {
  try {
    const audioCtx = getAudioContext();
    const now = audioCtx.currentTime;
    [0, 0.4, 0.8].forEach((offset) => {
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      // Onde carrée : bien plus perçante qu'une sinusoïde à volume égal (audible sous la douche).
      oscillator.type = 'square';
      oscillator.frequency.value = 1000;
      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.8, now + offset + 0.01);
      gain.gain.setValueAtTime(0.8, now + offset + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.28);
    });
  } catch {
    // Son optionnel : on ignore silencieusement si l'audio n'est pas disponible.
  }
  return new Promise((resolve) => setTimeout(resolve, BEEPS_DURATION_MS));
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
 * successivement pendant le décompte, avec des bips à chaque changement
 * d'étape. `onBeepStart` est attendu avant les bips (ex. couper la musique)
 * et sa valeur de retour est passée à `onBeepEnd` une fois les bips finis.
 */
export default function TimerRunner({ childId, type, label, emoji, accent = 'pink', totalSeconds, phases, onStart, onPause, onResume, onBeepStart, onBeepEnd, onDone }) {
  const [sessionId, setSessionId] = useState(null);
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  // Ne rejette jamais : la musique autour des bips est optionnelle.
  async function beepWithMusicPaused() {
    let beepContext;
    try {
      beepContext = await onBeepStart?.();
    } catch {
      // On bipe quand même.
    }
    await playBeeps();
    try {
      await onBeepEnd?.(beepContext);
    } catch {
      // Ignoré.
    }
  }

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
    if (phases) {
      try {
        getAudioContext();
      } catch {
        // Pas d'audio disponible : les bips seront simplement ignorés.
      }
    }
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
      // onDone attend la fin des bips (et la reprise de la musique) pour que
      // l'arrêt Spotify en fin de morceau se base sur une lecture en cours.
      const beeps = phases ? beepWithMusicPaused() : Promise.resolve();
      Promise.all([completeSession(childId, sessionId), beeps])
        .then(() => onDone?.())
        .catch((err) => setError(err.message));
    }
  }, [remaining, running, paused, sessionId, childId, onDone, phases]);

  // Bips à chaque changement d'étape (mouillage -> savonnage -> rinçage).
  // La fin de la dernière étape est couverte par l'effet ci-dessus.
  const phaseIndex = phases ? phases.findIndex((p) => totalSeconds - remaining < p.upTo) : -1;
  const prevPhaseIndexRef = useRef(phaseIndex);
  useEffect(() => {
    const prev = prevPhaseIndexRef.current;
    prevPhaseIndexRef.current = phaseIndex;
    if (running && phaseIndex > prev && prev !== -1) beepWithMusicPaused();
  }, [phaseIndex, running]);

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
