import { apiFetch } from './client.js';

export const getMe = () => apiFetch('/me');

export const getSpotifyStatus = () => apiFetch('/me/spotify/status');
export const getSpotifyAuthorizeUrl = () => apiFetch('/me/spotify/authorize-url');
export const getSpotifyAccessToken = () => apiFetch('/me/spotify/access-token');
export const disconnectSpotify = () => apiFetch('/me/spotify', { method: 'DELETE' });
