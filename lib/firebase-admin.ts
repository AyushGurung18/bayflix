import type { NextRequest } from "next/server";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );
}

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0]!;
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Vercel env vars can't store literal newlines, so the key is pasted
      // in with escaped "\n" sequences and unescaped here before use.
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

// Verifies the caller's own identity from their Firebase ID token — used by
// routes that must know *who's asking* (change-email, verify-email) rather
// than trusting a client-supplied email/uid, which would let anyone request
// an action link for someone else's account.
export async function requireAuthedUser(
  request: NextRequest
): Promise<{ uid: string; email: string | null } | null> {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
}
