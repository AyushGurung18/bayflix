// Verifies a Firebase Auth ID token from scratch (RS256 signature against
// Google's published JWKS + standard claim checks) — no JWT library needed,
// just fetch + Web Crypto, both native to Workers. This is the real check,
// not a decode-and-trust shortcut: a request with a tampered or expired
// token is rejected, not just one with a malformed token.

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const JWKS_TTL_MS = 60 * 60 * 1000;

interface Jwk extends JsonWebKey {
  kid: string;
}

export interface FirebaseTokenPayload {
  sub: string;
  exp?: number;
  iat?: number;
  aud?: string;
  iss?: string;
  [key: string]: unknown;
}

let cachedJwks: Jwk[] | null = null;
let cachedAt = 0;

async function getJwks(): Promise<Jwk[]> {
  const now = Date.now();
  if (cachedJwks && now - cachedAt < JWKS_TTL_MS) return cachedJwks;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error("Failed to fetch Firebase JWKS");
  const { keys } = (await res.json()) as { keys: Jwk[] };
  cachedJwks = keys;
  cachedAt = now;
  return keys;
}

function base64UrlToBytes(input: string): Uint8Array {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function base64UrlToString(input: string): string {
  return new TextDecoder().decode(base64UrlToBytes(input));
}

/**
 * Verifies `token` and returns its decoded payload (payload.sub is the
 * Firebase UID) on success. Throws on any failure — treat a throw as
 * "unauthenticated" (401), never fall back to trusting the token anyway.
 */
export async function verifyFirebaseToken(
  token: string,
  projectId: string
): Promise<FirebaseTokenPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = JSON.parse(base64UrlToString(headerB64));
  const payload = JSON.parse(base64UrlToString(payloadB64)) as FirebaseTokenPayload;

  if (header.alg !== "RS256") throw new Error("Unexpected algorithm");

  const jwks = await getJwks();
  const jwk = jwks.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("No matching signing key");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToBytes(signatureB64);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signedData);
  if (!valid) throw new Error("Invalid signature");

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) throw new Error("Token expired");
  if (payload.iat && payload.iat > now + 60) throw new Error("Token not yet valid");
  if (payload.aud !== projectId) throw new Error("Audience mismatch");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("Issuer mismatch");
  if (!payload.sub) throw new Error("Missing subject claim");

  return payload;
}
