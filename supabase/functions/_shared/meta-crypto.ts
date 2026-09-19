// AES-GCM token encryption for connected ad accounts.
// The key lives only in edge-function secrets (AD_TOKEN_ENCRYPTION_KEY) and
// the ciphertext columns are never SELECT-able by the browser (column-level
// GRANTs restrict authenticated reads to non-token columns).

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let _keyPromise: Promise<CryptoKey> | null = null;

function getKey(): Promise<CryptoKey> {
  if (!_keyPromise) {
    const raw = Deno.env.get("AD_TOKEN_ENCRYPTION_KEY") ?? "";
    if (!raw) throw new Error("AD_TOKEN_ENCRYPTION_KEY is not configured");
    _keyPromise = crypto.subtle
      .digest("SHA-256", encoder.encode(raw))
      .then((hash) => crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]));
  }
  return _keyPromise;
}

function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Encrypt a plaintext token. Returns base64(iv || ciphertext). */
export async function encryptToken(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plain)),
  );
  const buf = new Uint8Array(iv.length + ct.length);
  buf.set(iv, 0);
  buf.set(ct, iv.length);
  return toB64(buf);
}

/** Decrypt a token produced by encryptToken. Throws if the ciphertext is invalid. */
export async function decryptToken(encoded: string): Promise<string> {
  const key = await getKey();
  const buf = fromB64(encoded);
  const iv = buf.slice(0, 12);
  const ct = buf.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return decoder.decode(plain);
}
