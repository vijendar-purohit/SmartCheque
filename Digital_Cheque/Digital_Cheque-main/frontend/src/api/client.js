/**
 * Axios client with JWT injection + auto-logout on 401.
 *
 * - baseURL: the FastAPI backend.
 * - The JWT is held in a module-level variable (in-memory only).
 *   AuthContext is responsible for calling setAuthToken() on login / logout.
 * - On 401 we clear the token and post a 'smartcheque:auth:logout' event so
 *   the AuthContext can navigate to /login without a circular import.
 */
import axios from 'axios';

// Allow override via Vite env. Default to localhost:8000 (backend).
const BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8000';

let _token = null;

export function setAuthToken(token) {
  _token = token || null;
}

export function getAuthToken() {
  return _token;
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  if (_token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${_token}`;
  }
  return config;
});

client.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Token expired or invalid — force a logout.
      _token = null;
      try {
        window.dispatchEvent(new CustomEvent('smartcheque:auth:logout'));
      } catch (_) {
        /* no-op for non-browser env */
      }
    }
    return Promise.reject(error);
  }
);

export const API_BASE_URL = BASE_URL;
export default client;