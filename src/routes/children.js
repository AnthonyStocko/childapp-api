const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const CHILD_COLUMNS =
  'id, first_name, age, playlist_name, brushing_time, shower_soak_time, shower_soap_time, shower_rinse_time, created_at';

const toChild = (r) => ({
  id: r.id,
  firstName: r.first_name,
  age: r.age,
  playlistName: r.playlist_name,
  brushingTime: r.brushing_time,
  showerSoakTime: r.shower_soak_time,
  showerSoapTime: r.shower_soap_time,
  showerRinseTime: r.shower_rinse_time,
  createdAt: r.created_at
});

const toSession = (r) => ({
  id: r.id,
  type: r.type,
  durationSeconds: r.duration_seconds,
  completed: r.completed === 1,
  startedAt: r.started_at,
  completedAt: r.completed_at
});

const invalid = (res, message) => res.status(400).json({ error: 'invalid_input', message });

/** Valide le corps d'un enfant. Renvoie { value } ou { error }. */
function parseChild(body) {
  const firstName = String(body.firstName ?? '').trim();
  if (!firstName || firstName.length > 100) return { error: 'Prénom invalide.' };

  let age = null;
  if (body.age !== null && body.age !== undefined && body.age !== '') {
    age = Number(body.age);
    if (!Number.isInteger(age) || age < 0 || age > 18) return { error: 'Âge invalide (0 à 18).' };
  }

  const playlistName = String(body.playlistName ?? '').trim().slice(0, 200) || null;

  const seconds = (raw, fallback) => {
    if (raw === undefined || raw === null) return fallback;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 10 && n <= 1800 ? n : NaN;
  };
  const brushingTime = seconds(body.brushingTime, 120);
  const showerSoakTime = seconds(body.showerSoakTime, 60);
  const showerSoapTime = seconds(body.showerSoapTime, 120);
  const showerRinseTime = seconds(body.showerRinseTime, 60);
  if ([brushingTime, showerSoakTime, showerSoapTime, showerRinseTime].some(Number.isNaN)) {
    return { error: 'Durée invalide (10 à 1800 secondes).' };
  }

  return { value: { firstName, age, playlistName, brushingTime, showerSoakTime, showerSoapTime, showerRinseTime } };
}

/**
 * Vérifie que l'enfant :id appartient au parent connecté.
 * Renvoie l'id, ou répond 404 et renvoie null (404 aussi pour l'enfant d'un autre parent,
 * pour ne pas révéler son existence).
 */
async function ownChildId(req, res) {
  const id = Number(req.params.id);
  if (Number.isInteger(id) && id > 0) {
    const [child] = await db.rows('SELECT id FROM children WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (child) return child.id;
  }
  res.status(404).json({ error: 'not_found', message: 'Enfant introuvable.' });
  return null;
}

// ============= ENFANTS =============

router.get('/', async (req, res, next) => {
  try {
    const list = await db.rows(
      `SELECT ${CHILD_COLUMNS} FROM children WHERE user_id = ? ORDER BY created_at, id`,
      [req.userId]
    );
    res.json(list.map(toChild));
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { value, error } = parseChild(req.body);
    if (error) return invalid(res, error);

    const { insertId } = await db.run(
      `INSERT INTO children
         (user_id, first_name, age, playlist_name, brushing_time, shower_soak_time, shower_soap_time, shower_rinse_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, value.firstName, value.age, value.playlistName,
        value.brushingTime, value.showerSoakTime, value.showerSoapTime, value.showerRinseTime]
    );
    const [row] = await db.rows(`SELECT ${CHILD_COLUMNS} FROM children WHERE id = ?`, [insertId]);
    res.status(201).json(toChild(row));
  } catch (e) {
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = await ownChildId(req, res);
    if (id === null) return;
    const { value, error } = parseChild(req.body);
    if (error) return invalid(res, error);

    await db.run(
      `UPDATE children
          SET first_name = ?, age = ?, playlist_name = ?, brushing_time = ?,
              shower_soak_time = ?, shower_soap_time = ?, shower_rinse_time = ?
        WHERE id = ?`,
      [value.firstName, value.age, value.playlistName, value.brushingTime,
        value.showerSoakTime, value.showerSoapTime, value.showerRinseTime, id]
    );
    const [row] = await db.rows(`SELECT ${CHILD_COLUMNS} FROM children WHERE id = ?`, [id]);
    res.json(toChild(row));
  } catch (e) {
    next(e);
  }
});

// L'historique de l'enfant est supprimé avec lui (ON DELETE CASCADE).
router.delete('/:id', async (req, res, next) => {
  try {
    const id = await ownChildId(req, res);
    if (id === null) return;
    await db.run('DELETE FROM children WHERE id = ?', [id]);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ============= MINUTEURS =============

router.post('/:id/sessions', async (req, res, next) => {
  try {
    const childId = await ownChildId(req, res);
    if (childId === null) return;

    const { type } = req.body;
    if (type !== 'brushing' && type !== 'shower') {
      return invalid(res, "type doit valoir 'brushing' ou 'shower'.");
    }
    let duration = null;
    if (req.body.durationSeconds !== null && req.body.durationSeconds !== undefined) {
      duration = Number(req.body.durationSeconds);
      if (!Number.isInteger(duration) || duration < 1 || duration > 65535) {
        return invalid(res, 'durationSeconds invalide.');
      }
    }

    const { insertId } = await db.run(
      'INSERT INTO timer_sessions (child_id, type, duration_seconds) VALUES (?, ?, ?)',
      [childId, type, duration]
    );
    res.status(201).json({ id: insertId });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/sessions/:sessionId/complete', async (req, res, next) => {
  try {
    const childId = await ownChildId(req, res);
    if (childId === null) return;

    const { affectedRows } = await db.run(
      'UPDATE timer_sessions SET completed = 1, completed_at = NOW() WHERE id = ? AND child_id = ?',
      [Number(req.params.sessionId), childId]
    );
    if (affectedRows === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Session introuvable.' });
    }
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

router.get('/:id/sessions', async (req, res, next) => {
  try {
    const childId = await ownChildId(req, res);
    if (childId === null) return;

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const list = await db.rows(
      `SELECT id, type, duration_seconds, completed, started_at, completed_at
         FROM timer_sessions WHERE child_id = ? ORDER BY started_at DESC, id DESC LIMIT ?`,
      [childId, limit]
    );
    res.json(list.map(toSession));
  } catch (e) {
    next(e);
  }
});

router.get('/:id/stats', async (req, res, next) => {
  try {
    const childId = await ownChildId(req, res);
    if (childId === null) return;

    const grouped = await db.rows(
      `SELECT type, COUNT(*) AS total, SUM(completed) AS completed
         FROM timer_sessions WHERE child_id = ? GROUP BY type`,
      [childId]
    );
    const stat = (type) => {
      const r = grouped.find((g) => g.type === type);
      return { total: r ? Number(r.total) : 0, completed: r ? Number(r.completed) : 0 };
    };
    res.json({ brushing: stat('brushing'), shower: stat('shower') });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
