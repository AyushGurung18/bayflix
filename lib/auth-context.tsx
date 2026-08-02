"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
  updateProfile,
  signOut,
  type User,
  type UserCredential,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

// Where sendSignInLinkToEmail stashes the address, since the link itself
// doesn't carry it — signInWithEmailLink needs it back to complete, and if
// the link is opened on the same browser/device it was requested from we
// can supply it automatically instead of asking the user to retype it.
const MAGIC_EMAIL_KEY = "bayflix:magic-link-email";

interface AuthContextValue {
  currentUser: User | null;
  loading: boolean;
  // Separate from currentUser.emailVerified: Firebase mutates that flag on
  // the existing User object in place after reload(), which onAuthStateChanged
  // won't refire for and React can't detect from an identical object
  // reference — this is tracked and refreshed independently instead.
  emailVerified: boolean;
  refreshEmailVerified: () => Promise<boolean>;
  resendVerificationEmail: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signInGoogle: () => Promise<UserCredential>;
  signUp: (email: string, password: string, displayName?: string) => Promise<UserCredential>;
  sendMagicLink: (email: string) => Promise<void>;
  isMagicLinkUrl: (url: string) => boolean;
  completeMagicLinkSignIn: (email: string, url: string) => Promise<UserCredential>;
  sendPasswordReset: (email: string) => Promise<void>;
  changeEmail: (newEmail: string) => Promise<void>;
  updateFirebaseProfile: (fields: { displayName?: string; photoURL?: string }) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  // updateProfile() mutates the SDK's User object in place rather than
  // replacing it, so setting displayName/photoURL doesn't by itself change
  // the `currentUser` reference — nothing re-renders to pick up the new
  // values. Bumping this after a successful update forces AuthProvider to
  // recreate its context `value` object, which is enough for consumers to
  // re-read the (already-mutated) fields off the same User object. Same
  // staleness class emailVerified already works around above.
  const [, setProfileVersion] = useState(0);

  useEffect(() => {
    // Only ever runs client-side (see lib/firebase.ts) — `auth` is guaranteed
    // to be initialized by the time an effect in a mounted component fires.
    const unsubscribe = onAuthStateChanged(auth!, (user) => {
      setCurrentUser(user);
      setEmailVerified(user?.emailVerified ?? false);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(
    (email: string, password: string) => signInWithEmailAndPassword(auth!, email, password),
    []
  );

  const signInGoogle = useCallback(() => signInWithPopup(auth!, googleProvider), []);

  // Same branded-send-with-fallback shape as sendMagicLink: mints the link
  // via our own route (Admin SDK + Resend) and falls back to Firebase's
  // client-side sendEmailVerification while that route is unconfigured.
  const sendVerificationEmailFor = useCallback(async (user: User) => {
    const token = await user.getIdToken();
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 501) {
      await sendEmailVerification(user);
    } else if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to send verification email.");
    }
  }, []);

  // Password-based signup is the one path with no built-in proof the person
  // typing the email actually controls it (unlike the magic-link and Google
  // paths, both inherently verified) — send a verification email so
  // RequireAuth has something real to gate on before letting them into the app.
  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const credential = await createUserWithEmailAndPassword(auth!, email, password);
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
      await sendVerificationEmailFor(credential.user);
      return credential;
    },
    [sendVerificationEmailFor]
  );

  const resendVerificationEmail = useCallback(async () => {
    if (!auth?.currentUser) return;
    await sendVerificationEmailFor(auth.currentUser);
  }, [sendVerificationEmailFor]);

  const refreshEmailVerified = useCallback(async () => {
    if (!auth?.currentUser) return false;
    await auth.currentUser.reload();
    const verified = auth.currentUser.emailVerified;
    setEmailVerified(verified);
    return verified;
  }, []);

  // Passwordless sign-in: emails a link that, when opened, signs the user
  // in — creating the account automatically if this address has never
  // signed in before. Same call for both "new" and "returning" users, which
  // is what lets the UI skip the old "check if this email exists, then
  // route to /signin or /signup" dance entirely.
  //
  // Sending goes through our own API route first, which mints the link via
  // the Admin SDK and emails a branded message from our own domain (avoids
  // Firebase's shared, spam-flagged firebaseapp.com sender). That route
  // responds 501 until its Resend/Admin SDK env vars are configured, in
  // which case this falls back to Firebase's built-in sender so sign-in
  // keeps working in the meantime.
  const sendMagicLink = useCallback(async (email: string) => {
    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.status === 501) {
      await sendSignInLinkToEmail(auth!, email, {
        url: `${window.location.origin}/auth/finish`,
        handleCodeInApp: true,
      });
    } else if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to send sign-in link.");
    }

    localStorage.setItem(MAGIC_EMAIL_KEY, email);
  }, []);

  const isMagicLinkUrl = useCallback((url: string) => isSignInWithEmailLink(auth!, url), []);

  const completeMagicLinkSignIn = useCallback(async (email: string, url: string) => {
    const credential = await signInWithEmailLink(auth!, email, url);
    localStorage.removeItem(MAGIC_EMAIL_KEY);
    return credential;
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.status === 501) {
      await sendPasswordResetEmail(auth!, email);
    } else if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to send reset link.");
    }
  }, []);

  const changeEmail = useCallback(async (newEmail: string) => {
    if (!auth?.currentUser) throw new Error("Not signed in.");
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("/api/auth/change-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ newEmail }),
    });

    if (res.status === 501) {
      await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
    } else if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to send confirmation email.");
    }
  }, []);

  const updateFirebaseProfile = useCallback(
    async (fields: { displayName?: string; photoURL?: string }) => {
      if (!auth?.currentUser) throw new Error("Not signed in.");
      await updateProfile(auth.currentUser, fields);
      setProfileVersion((v) => v + 1);
    },
    []
  );

  const logOut = useCallback(() => signOut(auth!), []);

  const value: AuthContextValue = {
    currentUser,
    loading,
    emailVerified,
    refreshEmailVerified,
    resendVerificationEmail,
    signIn,
    signInGoogle,
    signUp,
    sendMagicLink,
    isMagicLinkUrl,
    completeMagicLinkSignIn,
    sendPasswordReset,
    changeEmail,
    updateFirebaseProfile,
    logOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export { MAGIC_EMAIL_KEY };
