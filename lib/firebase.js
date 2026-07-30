"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { isSupported, getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// "use client" only marks this module as part of the client bundle graph —
// Next.js still evaluates client components' modules once during SSR to
// render the initial HTML. getAuth()/getFirestore() throw synchronously on
// an empty/invalid apiKey, which would otherwise crash that server-side pass
// whenever real Firebase keys aren't configured yet. The server and browser
// bundles are separate module instances, so gating on `window` here means
// the server copy stays inert while the browser copy initializes for real —
// every actual call site (onAuthStateChanged, signIn, etc.) only ever runs
// client-side anyway, from an effect or event handler.
const app =
  typeof window !== "undefined"
    ? getApps().length
      ? getApp()
      : initializeApp(firebaseConfig)
    : undefined;

export const auth = app ? getAuth(app) : undefined;
export const googleProvider = new GoogleAuthProvider();
export const db = app ? getFirestore(app) : undefined;

// Analytics needs a browser (indexedDB) and a measurementId — both firebase.js
// itself (client SDK) and this guard are required, or `getAnalytics` throws
// during server-side rendering / when the measurement ID isn't configured.
export async function getFirebaseAnalytics() {
  if (!app || !firebaseConfig.measurementId) return null;
  if (!(await isSupported())) return null;
  return getAnalytics(app);
}
