const express = require('express');
const db = require('../db');
const spotify = require('../spotifyClient');

const router = express.Router();

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

// Le client React (servi par cette meme appli, voir server.js) ecoute cette route
// pour recuperer le resultat de l'autorisation Spotify (voir pages/SpotifyCallbackPage.jsx).
// Chemin relatif : fonctionne quelle que soit l'origine (prod comme dev derriere le proxy Vite).
function redirectToApp(res, params) {
  res.redirect(`/spotify-callback?${new URLSearchParams(params).toString()}`);
}

// Retour du navigateur après que le parent a autorisé (ou refusé) l'accès dans Spotify.
// Route publique (pas de JWT) : le navigateur ne connaît pas la session de l'appli, d'où le `state`.
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) return redirectToApp(res, { error: String(error) });
    if (!code || !state) return redirectToApp(res, { error: 'invalid_response' });

    const [pending] = await db.rows(
      'SELECT user_id, created_at FROM spotify_oauth_states WHERE state = ?',
      [state]
    );
    await db.run('DELETE FROM spotify_oauth_states WHERE state = ?', [state]); // usage unique

    if (!pending || Date.now() - new Date(pending.created_at).getTime() > STATE_MAX_AGE_MS) {
      return redirectToApp(res, { error: 'expired_state' });
    }

    const tokens = await spotify.exchangeCode(String(code));
    await db.run(
      'UPDATE users SET spotify_refresh_token = ?, spotify_access_token = ?, spotify_access_token_expires_at = ? WHERE id = ?',
      [tokens.refreshToken, tokens.accessToken, spotify.expiryDate(tokens.expiresIn), pending.user_id]
    );
    redirectToApp(res, { connected: '1' });
  } catch (e) {
    console.error('Erreur callback Spotify :', e);
    redirectToApp(res, { error: 'server_error' });
  }
});

module.exports = router;
