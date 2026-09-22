# Child App

Application de gestion des minuteurs brossage de dents / douche pour enfants,
avec intégration Spotify. Composée de :
- `src/` : l'API REST (Node.js + Express + MySQL), seule source de vérité
  métier (validation, règles, données).
- `web/` : le client React (PWA), interface uniquement — aucune logique
  métier n'y est dupliquée, tout passe par l'API.

En production, l'API sert aussi le build du client React : un seul serveur à
déployer/mettre à jour (voir « Build et déploiement » plus bas).

## Démarrage local (développement)

Deux process en parallèle :
```
copy .env.exemple .env    # renseigne DB_* et JWT_SECRET
npm install
npm run dev                # API sur http://localhost:3000

npm run install:web        # une seule fois
npm run dev:web             # client React sur http://localhost:5173 (proxy /api -> :3000)
```
Ouvre http://localhost:5173. Au démarrage, l'API crée les tables si besoin (`sql/schema.sql`).

## Build et déploiement

```
npm run install:web
npm run build               # build le client React dans web/dist
NODE_ENV=production npm start   # une seule appli, sert l'API et le client sur le même port
```

## Authentification
`POST /api/auth/register` et `POST /api/auth/login` renvoient `{ token, user }`.
Toutes les autres routes exigent `Authorization: Bearer <token>` (jeton valable 30 jours)
et ne donnent accès qu'aux données du parent connecté (404 sinon).

## Routes

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/health` | Statut de l'API et de la base |
| POST | `/api/auth/register` | `{ name, email, password }` (mot de passe 8 à 72 caractères) |
| POST | `/api/auth/login` | `{ email, password }` |
| GET | `/api/me` | Parent connecté |
| GET | `/api/me/spotify/authorize-url` | URL d'autorisation Spotify (`{ url }`) |
| GET | `/api/me/spotify/status` | `{ connected }` |
| GET | `/api/me/spotify/access-token` | Jeton d'accès Spotify Web API valide (`{ token }`) |
| DELETE | `/api/me/spotify` | Déconnecte Spotify |
| GET | `/api/children` | Enfants du parent |
| POST | `/api/children` | `{ firstName, age?, playlistName?, brushingTime?, showerSoakTime?, showerSoapTime?, showerRinseTime? }` |
| PUT | `/api/children/:id` | Mêmes champs |
| DELETE | `/api/children/:id` | Supprime l'enfant et son historique |
| POST | `/api/children/:id/sessions` | `{ type: "brushing" ou "shower", durationSeconds? }` → `{ id }` |
| POST | `/api/children/:id/sessions/:sessionId/complete` | Marque la session terminée |
| GET | `/api/children/:id/sessions?limit=50` | Historique |
| GET | `/api/children/:id/stats` | `{ brushing: { total, completed }, shower: { … } }` |

Erreurs : `{ "error": "code_technique", "message": "Message en français" }`.
Durées de douche : 10 à 1800 secondes. Âge : 0 à 18.

## Sécurité
- Mots de passe hachés avec bcrypt, jamais renvoyés.
- Requêtes SQL paramétrées (pas d'injection).
- Limitation des essais sur `/api/auth` (30 par 15 min et par IP).
- `JWT_SECRET` obligatoire (32 caractères minimum) : l'API refuse de démarrer sans.
