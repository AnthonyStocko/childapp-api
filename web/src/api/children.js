import { apiFetch } from './client.js';

export const listChildren = () => apiFetch('/children');
export const getChildStats = (id) => apiFetch(`/children/${id}/stats`);
export const getChildSessions = (id, limit = 50) => apiFetch(`/children/${id}/sessions?limit=${limit}`);

export const createChild = (child) => apiFetch('/children', { method: 'POST', body: child });
export const updateChild = (id, child) => apiFetch(`/children/${id}`, { method: 'PUT', body: child });
export const deleteChild = (id) => apiFetch(`/children/${id}`, { method: 'DELETE' });

export const startSession = (childId, type, durationSeconds) =>
  apiFetch(`/children/${childId}/sessions`, { method: 'POST', body: { type, durationSeconds } });

export const completeSession = (childId, sessionId) =>
  apiFetch(`/children/${childId}/sessions/${sessionId}/complete`, { method: 'POST' });
