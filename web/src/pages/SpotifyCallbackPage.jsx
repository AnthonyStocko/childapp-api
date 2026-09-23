import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';

// L'API redirige ici (meme origine) apres l'autorisation Spotify, voir
// src/routes/spotify.js#redirectToApp. On relaie juste vers /settings. Depuis
// l'appli Android, cette page s'ouvre dans le navigateur du téléphone (pas
// dans l'appli) : on invite donc à y revenir.
export default function SpotifyCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const error = searchParams.get('error');

  useEffect(() => {
    const timeout = setTimeout(() => navigate('/settings', { replace: true }), 3000);
    return () => clearTimeout(timeout);
  }, [navigate, error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
      {error
        ? <XCircle size={40} className="text-red-400" />
        : <CheckCircle2 size={40} className="text-green-500" />}
      <p className="text-slate-600">
        {error ? `Connexion Spotify impossible (${error}). Redirection…` : 'Connexion Spotify réussie !'}
      </p>
      {/* Depuis l'appli Android, l'autorisation se termine dans le navigateur. */}
      {!error && <p className="text-slate-500 text-sm">Tu peux revenir dans l'application Child App.</p>}
    </div>
  );
}
