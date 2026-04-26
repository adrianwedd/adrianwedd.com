/**
 * 128-bit cryptographically random nonce, base64-encoded, no padding.
 * Workers runtime exposes globalThis.crypto.getRandomValues per Web Crypto.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // btoa needs a binary string; build it without spreading (avoids
  // call-stack issues if size grows) and strip base64 padding.
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=+$/, '');
}
