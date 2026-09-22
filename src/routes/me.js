const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const spotify = require('../spotifyClient');

const router = express.Router();
router.use(requireAuth);

// Profil du parent connecté
router.get('/', async (req, res, next) => {
  try {
    const [user] = await db.rows('SELECT id, name, email FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Compte introuvable.' });
    }
    res.json(user);
  } catch (e) {
    next(e);
  }
});

// Connexion Spotify du parent : l'API fait l'échange OAuth et le rafraîchissement des jetons,
// l'appareil ne stocke jamais de refresh_token (voir aussi routes/spotify.js pour le retour Spotify).

// URL à ouvrir dans le navigateur pour que le parent autorise l'appli.
router.get('/spotify/authorize-url', async (req, res, next) => {
  try {
    // Ménage best-effort des états abandonnés (parent qui n'a jamais terminé l'autorisation).
    await db.run('DELETE FROM spotify_oauth_states WHERE created_at < NOW() - INTERVAL 10 MINUTE');
    const state = crypto.randomBytes(24).toString('base64url');
    await db.run('INSERT INTO spotify_oauth_states (state, user_id) VALUES (?, ?)', [state, req.userId]);
    res.json({ url: spotify.authorizeUrl(state) });
  } catch (e) {
    next(e);
  }
});

router.get('/spotify/status', async (req, res, next) => {
  try {
    const [user] = await db.rows('SELECT spotify_refresh_token FROM users WHERE id = ?', [req.userId]);
    res.json({ connected: Boolean(user && user.spotify_refresh_token) });
  } catch (e) {
    next(e);
  }
});

// Jeton d'accès valide pour l'API Web Spotify (en cache si non expiré, sinon rafraîchi ici).
router.get('/spotify/access-token', async (req, res, next) => {
  try {
    const [user] = await db.rows(
      'SELECT spotify_refresh_token, spotify_access_token, spotify_access_token_expires_at FROM users WHERE id = ?',
      [req.userId]
    );
    if (!user || !user.spotify_refresh_token) {
      return res.status(409).json({ error: 'not_connected', message: 'Spotify non connecté.' });
    }

    const stillValid = user.spotify_access_token
      && user.spotify_access_token_expires_at
      && new Date(user.spotify_access_token_expires_at).getTime() > Date.now();
    if (stillValid) {
      return res.json({ token: user.spotify_access_token });
    }

    let tokens;
    try {
      tokens = await spotify.refreshAccessToken(user.spotify_refresh_token);
    } catch (e) {
      if (!(e instanceof spotify.SpotifyAuthError)) throw e;
      // Autorisation révoquée côté Spotify : on efface, il faudra reconnecter.
      await db.run(
        `UPDATE users SET spotify_refresh_token = NULL, spotify_access_token = NULL,
         spotify_access_token_expires_at = NULL WHERE id = ?`,
        [req.userId]
      );
      return res.status(409).json({ error: 'not_connected', message: 'Autorisation Spotify révoquée.' });
    }

    await db.run(
      `UPDATE users SET spotify_refresh_token = ?, spotify_access_token = ?,
       spotify_access_token_expires_at = ? WHERE id = ?`,
      [tokens.refreshToken, tokens.accessToken, spotify.expiryDate(tokens.expiresIn), req.userId]
    );
    res.json({ token: tokens.accessToken });
  } catch (e) {
    next(e);
  }
});

// Déconnecte Spotify (le parent part, ou veut réautoriser depuis zéro).
router.delete('/spotify', async (req, res, next) => {
  try {
    await db.run(
      `UPDATE users SET spotify_refresh_token = NULL, spotify_access_token = NULL,
       spotify_access_token_expires_at = NULL WHERE id = ?`,
      [req.userId]
    );
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

module.exports = router;
