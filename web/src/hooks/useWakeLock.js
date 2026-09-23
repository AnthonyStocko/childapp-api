import { useEffect } from 'react';

/**
 * Garde l'écran allumé tant que `active` est vrai (Screen Wake Lock API).
 * Écran éteint, le téléphone gèle la page : minuteur, bips et commandes
 * Spotify programmées ne partiraient plus. Le verrou saute quand la page
 * passe en arrière-plan, on le redemande donc à son retour. Best-effort.
 */
export default function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;
    let sentinel = null;
    let cancelled = false;

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) lock.release();
        else sentinel = lock;
      } catch {
        // Refusé (batterie faible, page cachée…) : on réessaiera au retour de la page.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') acquire();
    }

    acquire();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
