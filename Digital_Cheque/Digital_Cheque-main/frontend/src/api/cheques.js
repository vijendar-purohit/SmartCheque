/**
 * Cheques + Verification API.
 *
 * Backend routes covered:
 *   POST   /cheques/create
 *   GET    /cheques/my-cheques
 *   GET    /cheques/received
 *   GET    /cheques/{id}/download
 *   GET    /cheques/{id}/risk-details
 *   POST   /cheques/{id}/present
 *   POST   /cheques/{id}/otp/respond
 */
import client from './client';

export async function createCheque(payload) {
  const { data } = await client.post('/cheques/create', payload);
  return data;
}

export async function listMyCheques() {
  const { data } = await client.get('/cheques/my-cheques');
  return data;
}

export async function listReceivedCheques() {
  const { data } = await client.get('/cheques/received');
  return data;
}

export async function getDownloadUrls(chequeId) {
  const { data } = await client.get(`/cheques/${chequeId}/download`);
  return data;
}

export async function getRiskDetails(chequeId) {
  const { data } = await client.get(`/cheques/${chequeId}/risk-details`);
  return data;
}

export async function presentCheque(chequeId) {
  const { data } = await client.post(`/cheques/${chequeId}/present`);
  return data;
}

export async function respondToOtp(chequeId, otp_code, response) {
  // response: 'APPROVE' | 'REJECT'
  const { data } = await client.post(`/cheques/${chequeId}/otp/respond`, {
    otp_code,
    response,
  });
  return data;
}