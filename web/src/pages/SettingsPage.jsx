import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { SlidersHorizontal, UserRound, Music, CheckCircle2, CircleOff, Link2, Unlink } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { disconnectSpotify, getSpotifyAuthorizeUrl, getSpotifyStatus } from '../api/me.js';

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const { data: spotify } = useQuery({ queryKey: ['spotify-status'], queryFn: getSpotifyStatus });

  async function handleConnect() {
    setError(null);
    setPending(true);
    try {
      const { url } = await getSpotifyAuthorizeUrl();
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  }

  async function handleDisconnect() {
    setError(null);
    setPending(true);
    try {
      await disconnectSpotify();
      await queryClient.invalidateQueries({ queryKey: ['spotify-status'] });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <SlidersHorizontal size={20} className="text-indigo-600" />
        Réglages
      </h1>

      <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
        <span className="bg-indigo-100 text-indigo-600 rounded-full p-2.5 shrink-0">
          <UserRound size={20} />
        </span>
        <div>
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm text-slate-500">{user?.email}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <p className="font-semibold flex items-center gap-2">
          <Music size={18} className="text-green-600" />
          Spotify
        </p>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}
        <p className="flex items-center gap-1.5 text-sm text-slate-600">
          {spotify?.connected
            ? <><CheckCircle2 size={16} className="text-green-500" /> Connecté</>
            : <><CircleOff size={16} className="text-slate-400" /> Non connecté</>}
        </p>
        <button
          type="button"
          onClick={spotify?.connected ? handleDisconnect : handleConnect}
          disabled={pending}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
            spotify?.connected ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {spotify?.connected ? <Unlink size={16} /> : <Link2 size={16} />}
          {spotify?.connected ? 'Déconnecter Spotify' : 'Connecter Spotify'}
        </button>
      </div>
    </div>
  );
}
