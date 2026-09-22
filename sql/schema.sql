-- Schema MySQL de Child App.
-- L'API l'execute automatiquement au demarrage (CREATE TABLE IF NOT EXISTS),
-- mais tu peux aussi l'importer a la main dans phpMyAdmin (alwaysdata).

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  spotify_token TEXT NULL, -- ancienne colonne (refresh token du flux PKCE côté appli), plus utilisée
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Connexion Spotify du parent, gérée entièrement côté API (voir routes/spotify.js et me.js).
ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_refresh_token TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_access_token TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_access_token_expires_at TIMESTAMP NULL;

-- États PKCE-free à usage unique pour relier le retour de Spotify (GET /api/spotify/callback,
-- sans JWT) au parent qui a initié la demande.
CREATE TABLE IF NOT EXISTS spotify_oauth_states (
  state      VARCHAR(64) NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (state),
  CONSTRAINT fk_spotify_states_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS children (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED NOT NULL,
  first_name        VARCHAR(100) NOT NULL,
  age               TINYINT UNSIGNED NULL,
  playlist_name     VARCHAR(200) NULL,
  shower_soak_time  SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  shower_soap_time  SMALLINT UNSIGNED NOT NULL DEFAULT 120,
  shower_rinse_time SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_children_user (user_id),
  CONSTRAINT fk_children_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Durée du brossage de dents, configurable par enfant (avant : fixe à 120s côté client).
ALTER TABLE children ADD COLUMN IF NOT EXISTS brushing_time SMALLINT UNSIGNED NOT NULL DEFAULT 120;

CREATE TABLE IF NOT EXISTS timer_sessions (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  child_id         INT UNSIGNED NOT NULL,
  type             ENUM('brushing','shower') NOT NULL,
  duration_seconds SMALLINT UNSIGNED NULL,
  completed        TINYINT(1) NOT NULL DEFAULT 0,
  started_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at     TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_sessions_child (child_id, started_at),
  CONSTRAINT fk_sessions_child FOREIGN KEY (child_id) REFERENCES children (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
