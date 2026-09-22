const API_BASE = 'https://api.spotify.com/v1';

/**
 * Cherche, parmi les playlists du parent connecté, celle dont le nom
 * correspond exactement (insensible à la casse) à `name`. Renvoie l'objet
 * playlist Spotify (avec `uri`) ou null si non trouvée / erreur.
 */
export async function findPlaylistByName(accessToken, name) {
  const target = name.trim().toLowerCase();
  let url = `${API_BASE}/me/playlists?limit=50`;

  for (let page = 0; page < 4 && url; page += 1) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return null;
    const data = await response.json();
    const match = data.items?.find((p) => p.name?.trim().toLowerCase() === target);
    if (match) return match;
    url = data.next;
  }
  return null;
}

/**
 * Liste les appareils Spotify Connect actuellement visibles pour le parent
 * (l'app Spotify doit avoir tourné récemment sur au moins un appareil).
 */
export async function listDevices(accessToken) {
  const response = await fetch(`${API_BASE}/me/player/devices`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) return [];
  const data = await response.json();
  return data.devices || [];
}

/**
 * Démarre la lecture d'une playlist en arrière-plan via Spotify Connect, sans
 * ouvrir l'app Spotify au premier plan. Nécessite un compte Premium et qu'un
 * appareil Spotify soit disponible (`listDevices`). Renvoie true si la
 * lecture a bien été lancée.
 */
export async function startPlaybackOnDevice(accessToken, { contextUri, deviceId }) {
  const url = deviceId
    ? `${API_BASE}/me/player/play?device_id=${encodeURIComponent(deviceId)}`
    : `${API_BASE}/me/player/play`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ context_uri: contextUri })
  });
  return response.status === 204;
}

/** Met la lecture en pause (best-effort : si rien ne joue déjà, Spotify renvoie 403, sans conséquence). */
export async function pausePlayback(accessToken) {
  const response = await fetch(`${API_BASE}/me/player/pause`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.status === 204;
}

/** Reprend la lecture là où elle a été mise en pause (pas de contexte = pas de redémarrage de playlist). */
export async function resumePlayback(accessToken) {
  const response = await fetch(`${API_BASE}/me/player/play`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.status === 204;
}

/** Morceau en cours de lecture (titre, progression). Renvoie null si rien ne joue. */
export async function getCurrentlyPlaying(accessToken) {
  const response = await fetch(`${API_BASE}/me/player/currently-playing`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (response.status !== 200) return null;
  return response.json();
}
