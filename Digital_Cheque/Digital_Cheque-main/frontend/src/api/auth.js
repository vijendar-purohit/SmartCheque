/**
 * Auth API — wraps /auth/register, /auth/login, /auth/me.
 *
 * The backend returns a single AuthResponse payload with {access_token, user,
 * account}. We surface the same shape to callers.
 */
import client from './client';

export async function register(payload) {
  // payload: {full_name, email, password, mobile, role}
  const { data } = await client.post('/auth/register', payload);
  return data;
}

export async function login(payload) {
  // payload: {email, password}
  const { data } = await client.post('/auth/login', payload);
  return data;
}

export async function me() {
  const { data } = await client.get('/auth/me');
  return data;
}

/**
 * Map backend user.role → frontend dashboard route prefix.
 */
export function dashboardPathForRole(role) {
  if (role === 'BANK_OFFICER') return '/official/dashboard';
  return '/customer/dashboard';
}