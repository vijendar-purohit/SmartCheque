/**
 * WebAuthn wrapper.
 *
 * Tries navigator.credentials.create() with a self-attested secp256r1 key
 * when the browser supports it. Falls back to a password-re-prompt modal
 * upstream when WebAuthn isn't available (e.g. insecure context, no
 * authenticator, or browser lacks the API).
 *
 * Backend doesn't yet verify WebAuthn (it's a Phase-5 TODO in the
 * cheque router), so we return the credential to the caller and let the
 * caller decide what to do. For now, we surface `webauthn_attempted` in the
 * payload so the backend can log it.
 */

const WEBAUTHN_SUPPORTED =
  typeof window !== 'undefined' &&
  !!window.PublicKeyCredential &&
  typeof window.PublicKeyCredential === 'function' &&
  !!navigator?.credentials?.create;

export function isWebAuthnSupported() {
  return WEBAUTHN_SUPPORTED;
}

/**
 * Attempt to create a fresh WebAuthn credential.
 *
 * Returns one of:
 *   { ok: true,  credential: { id, rawId, type, response: {attestationObject, clientDataJSON} } }
 *   { ok: false, reason: 'unsupported' | 'cancelled' | 'error', message }
 *
 * We generate a synthetic challenge from a UUID. In production this would
 * come from the server's challenge endpoint.
 */
export async function trySignWithWebAuthn() {
  if (!WEBAUTHN_SUPPORTED) {
    return { ok: false, reason: 'unsupported', message: 'WebAuthn not available in this browser/context.' };
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const publicKey = {
    challenge,
    rp: { name: 'SmartCheque' },
    user: {
      id: userId,
      name: 'smartcheque-user@local',
      displayName: 'SmartCheque User',
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256 (P-256)
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  };

  try {
    const credential = await navigator.credentials.create({ publicKey });
    if (!credential) {
      return { ok: false, reason: 'cancelled', message: 'User cancelled biometric prompt.' };
    }
    // Serialize credential for transport.
    const id = credential.id;
    const rawId = credential.rawId ? btoa(String.fromCharCode(...new Uint8Array(credential.rawId))) : null;
    const response = credential.response || {};
    const clientDataJSON = response.clientDataJSON
      ? btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON)))
      : null;
    const attestationObject = response.attestationObject
      ? btoa(String.fromCharCode(...new Uint8Array(response.attestationObject)))
      : null;

    return {
      ok: true,
      credential: {
        id,
        rawId,
        type: credential.type,
        response: { clientDataJSON, attestationObject },
      },
    };
  } catch (err) {
    return {
      ok: false,
      reason: 'error',
      message: err?.message || 'WebAuthn signing failed.',
    };
  }
}