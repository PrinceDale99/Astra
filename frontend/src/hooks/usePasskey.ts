'use client';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://astra-9mg6.onrender.com';

/**
 * Converts an ArrayBuffer to a base64url string for transmission.
 */
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Converts a base64url string back to Uint8Array.
 */
function base64urlToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Registers a Secp256r1 (WebAuthn / FIDO2) passkey for the given wallet address.
 *
 * Flow:
 *  1. navigator.credentials.create() → OS biometric prompt (FaceID / TouchID / Windows Hello)
 *  2. POST /api/v1/passkey/register → backend returns contract call args
 *  3. User submits the register_passkey() tx via Freighter (only done once)
 *
 * @param walletAddress  The Stellar G... public key to link the passkey to.
 * @returns              The credential ID for future sign operations.
 */
export async function registerPasskey(walletAddress: string): Promise<string> {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser.');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer>;

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: challenge as unknown as ArrayBuffer,
      rp: { name: 'Astra Protocol', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(walletAddress) as unknown as ArrayBuffer,
        name: walletAddress,
        displayName: `${walletAddress.substring(0, 8)}...`,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256 (Secp256r1 / P-256)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // prefer FaceID/TouchID/Windows Hello
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'none',
    },
  }) as PublicKeyCredential | null;

  if (!credential) throw new Error('Passkey registration was cancelled.');

  const response = credential.response as AuthenticatorAttestationResponse;
  const credentialId = bufferToBase64url(credential.rawId);
  const publicKeyBuffer = response.getPublicKey();

  if (!publicKeyBuffer) throw new Error('Could not extract public key from attestation.');

  const publicKeyB64 = bufferToBase64url(publicKeyBuffer);

  // Send to backend — it returns the contract call params for Freighter to sign
  const res = await fetch(`${BACKEND_URL}/api/v1/passkey/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, credentialId, publicKey: publicKeyB64 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Passkey registration failed on backend.');
  }

  // Persist credential ID locally for future sign operations
  localStorage.setItem(`astra_passkey_${walletAddress}`, credentialId);

  return credentialId;
}

/**
 * Signs a challenge using a previously registered passkey (biometric).
 *
 * Flow:
 *  1. navigator.credentials.get() → OS biometric prompt (sub-1-second)
 *  2. Returns DER-encoded P-256 signature for SorobanAuthorizationEntry injection.
 *
 * @param walletAddress  The Stellar G... public key whose passkey to use.
 * @param challenge      32-byte challenge (e.g. transaction hash bytes).
 * @returns              { signature, credentialId }
 */
export async function signWithPasskey(
  walletAddress: string,
  challenge: Uint8Array
): Promise<{ signature: Uint8Array; credentialId: string }> {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser.');
  }

  const storedCredentialId = localStorage.getItem(`astra_passkey_${walletAddress}`);
  if (!storedCredentialId) {
    throw new Error('No passkey registered for this address. Please register first.');
  }

  const allowCredentials: PublicKeyCredentialDescriptor[] = [
    { type: 'public-key', id: base64urlToBuffer(storedCredentialId) as Uint8Array<ArrayBuffer> },
  ];

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: challenge as Uint8Array<ArrayBuffer>,
      allowCredentials,
      userVerification: 'required',
      timeout: 60000,
    },
  }) as PublicKeyCredential | null;

  if (!assertion) throw new Error('Passkey signing was cancelled.');

  const response = assertion.response as AuthenticatorAssertionResponse;
  const signature = new Uint8Array(response.signature);
  const credentialId = bufferToBase64url(assertion.rawId);

  return { signature, credentialId };
}

/**
 * Returns true if the given wallet address has a passkey registered locally.
 */
export function hasPasskey(walletAddress: string): boolean {
  return !!localStorage.getItem(`astra_passkey_${walletAddress}`);
}
