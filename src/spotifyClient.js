const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const SCOPES = 'playlist-read-private playlist-read-collaborative user-read-playback-state user-modify-playback-state';

/** Erreur levée quand Spotify refuse un jeton (autorisation révoquée) : il faut la redonner. */
class SpotifyAuthError extends Error {}

function basicAuthHeader() {
  const raw = `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

/** URL vers laquelle envoyer le parent pour qu'il autorise l'appli (state = anti-CSRF, lié au parent). */
function authorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    scope: SCOPES,
    state
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

async function tokenRequest(body) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(body)
  });
  const text = await response.text();
  if (response.status === 400 && text.includes('invalid_grant')) {
    throw new SpotifyAuthError('Jeton Spotify expiré ou révoqué');
  }
  if (!response.ok) {
    throw new Error(`Spotify a répondu ${response.status} : ${text}`);
  }
  return JSON.parse(text);
}

/** Échange le code d'autorisation reçu sur /callback contre les jetons. */
async function exchangeCode(code) {
  const json = await tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI
  });
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in
  };
}

/** Renouvelle l'access_token à partir du refresh_token stocké. Lève SpotifyAuthError s'il est révoqué. */
async function refreshAccessToken(refreshToken) {
  const json = await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  return {
    accessToken: json.access_token,
    // Spotify ne renvoie pas toujours un nouveau refresh_token : on garde l'ancien si absent.
    refreshToken: json.refresh_token || refreshToken,
    expiresIn: json.expires_in
  };
}

/** Date d'expiration d'un access_token, avec une marge d'une minute pour ne pas en utiliser un périmé. */
function expiryDate(expiresInSeconds) {
  return new Date(Date.now() + expiresInSeconds * 1000 - 60_000);
}

module.exports = { authorizeUrl, exchangeCode, refreshAccessToken, expiryDate, SpotifyAuthError };
