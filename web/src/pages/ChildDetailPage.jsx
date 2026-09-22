import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, History, Music, Droplet, SoapDispenserDroplet, ShowerHead } from 'lucide-react';
import { listChildren } from '../api/children.js';
import { getSpotifyAccessToken, getSpotifyStatus } from '../api/me.js';
import {
  findPlaylistByName,
  getCurrentlyPlaying,
  listDevices,
  pausePlayback,
  resumePlayback,
  startPlaybackOnDevice
} from '../api/spotifyWeb.js';
import TimerRunner from '../components/TimerRunner.jsx';

export default function ChildDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: children } = useQuery({ queryKey: ['children'], queryFn: listChildren });
  const child = children?.find((c) => String(c.id) === id);

  // Programme la pause Spotify pile à la fin du morceau en cours (voir stopSpotifyAtSongEnd).
  const songEndTimeoutRef = useRef(null);
  useEffect(() => () => clearTimeout(songEndTimeoutRef.current), []);

  function refreshHistory() {
    queryClient.invalidateQueries({ queryKey: ['stats', id] });
    queryClient.invalidateQueries({ queryKey: ['sessions', id] });
  }

  // Démarre la playlist de l'enfant en arrière-plan via Spotify Connect (si Spotify
  // est connecté et qu'une playlist du même nom existe côté parent), sans faire
  // passer l'app Spotify au premier plan. Si aucun appareil Spotify n'est
  // disponible (app jamais ouverte), on ouvre l'app en dernier recours pour
  // qu'elle s'enregistre comme appareil. Best-effort : une erreur ou l'absence
  // de connexion Spotify ne doit jamais bloquer le minuteur.
  async function playChildPlaylist() {
    if (!child.playlistName) return;
    clearTimeout(songEndTimeoutRef.current);
    try {
      const status = await getSpotifyStatus();
      if (!status.connected) return;
      const { token } = await getSpotifyAccessToken();
      const playlist = await findPlaylistByName(token, child.playlistName);
      if (!playlist?.uri) return;

      const devices = await listDevices(token);
      if (devices.length > 0) {
        const started = await startPlaybackOnDevice(token, {
          contextUri: playlist.uri,
          deviceId: devices.find((d) => d.is_active)?.id ?? devices[0].id
        });
        if (started) return;
      }

      // Repli : aucun appareil dispo ou lecture refusée (ex. compte non Premium).
      window.location.href = playlist.uri;
    } catch {
      // Musique optionnelle : on ignore silencieusement.
    }
  }

  // Met Spotify en pause (bouton pause ou annuler du minuteur). Best-effort.
  async function pauseChildPlaylist() {
    clearTimeout(songEndTimeoutRef.current);
    try {
      const status = await getSpotifyStatus();
      if (!status.connected) return;
      const { token } = await getSpotifyAccessToken();
      await pausePlayback(token);
    } catch {
      // Musique optionnelle : on ignore silencieusement.
    }
  }

  // Reprend Spotify là où c'était (bouton reprendre du minuteur). Best-effort.
  async function resumeChildPlaylist() {
    try {
      const status = await getSpotifyStatus();
      if (!status.connected) return;
      const { token } = await getSpotifyAccessToken();
      await resumePlayback(token);
    } catch {
      // Musique optionnelle : on ignore silencieusement.
    }
  }

  // Fin du minuteur : on laisse le morceau en cours se terminer, puis on coupe
  // la lecture (pas d'enchaînement sur le morceau suivant de la playlist).
  async function stopSpotifyAtSongEnd() {
    try {
      const status = await getSpotifyStatus();
      if (!status.connected) return;
      const { token } = await getSpotifyAccessToken();
      const playing = await getCurrentlyPlaying(token);
      if (!playing?.is_playing || !playing.item) return;
      const remainingMs = Math.max(playing.item.duration_ms - playing.progress_ms, 0);
      clearTimeout(songEndTimeoutRef.current);
      songEndTimeoutRef.current = setTimeout(() => {
        pausePlayback(token).catch(() => {});
      }, remainingMs);
    } catch {
      // Musique optionnelle : on ignore silencieusement.
    }
  }

  function handleBrushingDone() {
    refreshHistory();
    stopSpotifyAtSongEnd();
  }

  if (!child) return <p className="text-slate-500">Chargement…</p>;

  const showerTotal = child.showerSoakTime + child.showerSoapTime + child.showerRinseTime;
  const showerPhases = [
    { label: 'Mouillage', upTo: child.showerSoakTime, icon: Droplet },
    { label: 'Savonnage', upTo: child.showerSoakTime + child.showerSoapTime, icon: SoapDispenserDroplet },
    { label: 'Rinçage', upTo: showerTotal, icon: ShowerHead }
  ];

  return (
    <div className="-m-4 min-h-[calc(100vh-56px)] bg-gradient-to-b from-sky-400 to-sky-300 p-5 space-y-5">
      <div className="flex items-center justify-end gap-2">
        <Link
          to={`/children/${id}/history`}
          className="flex items-center gap-1.5 bg-white/25 hover:bg-white/35 transition-colors text-white rounded-full px-3 py-1.5 text-sm font-medium"
        >
          <History size={16} />
          Historique
        </Link>
        <Link
          to={`/children/${id}/edit`}
          className="flex items-center gap-1.5 bg-white/25 hover:bg-white/35 transition-colors text-white rounded-full px-3 py-1.5 text-sm font-medium"
        >
          <Pencil size={16} />
          Modifier
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold text-white drop-shadow">Salut {child.firstName} ! 👋</h1>
        {child.playlistName && (
          <p className="flex items-center gap-1.5 text-white/90 text-sm mt-2">
            <Music size={14} />
            {child.playlistName}
          </p>
        )}
      </div>

      <div className="space-y-4 pt-2">
        <TimerRunner
          childId={id}
          type="brushing"
          label="Brossage de dents"
          emoji="🪥"
          accent="pink"
          totalSeconds={child.brushingTime}
          onStart={playChildPlaylist}
          onPause={pauseChildPlaylist}
          onResume={resumeChildPlaylist}
          onDone={handleBrushingDone}
        />

        <TimerRunner
          childId={id}
          type="shower"
          label="Douche"
          emoji="🚿"
          accent="teal"
          totalSeconds={showerTotal}
          phases={showerPhases}
          onDone={refreshHistory}
        />
      </div>

      <p className="text-center text-white font-medium pt-4">✨ Fais du super boulot ! ✨</p>
    </div>
  );
}
