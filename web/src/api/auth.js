import { apiFetch } from './client.js';

export const register = (name, email, password) =>
  apiFetch('/auth/register', { method: 'POST', body: { name, email, password } });

export const login = (email, password) =>
  apiFetch('/auth/login', { method: 'POST', body: { email, password } });
