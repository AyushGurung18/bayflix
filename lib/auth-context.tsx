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
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Password-based signup is the one path with no built-in proof the person
  // typing the email actually controls it (unlike the magic-link and Google
  // paths, both inherently verified) — send Firebase's verification email so
  // RequireAuth has something real to gate on before letting them into the app.
  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const credential = await createUserWithEmailAndPassword(auth!, email, password);
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }
    await sendEmailVerification(credential.user);
    return credential;
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth?.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  }, []);

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
  const sendMagicLink = useCallback(async (email: string) => {
    await sendSignInLinkToEmail(auth!, email, {
      url: `${window.location.origin}/auth/finish`,
      handleCodeInApp: true,
    });
    localStorage.setItem(MAGIC_EMAIL_KEY, email);
  }, []);

  const isMagicLinkUrl = useCallback((url: string) => isSignInWithEmailLink(auth!, url), []);

  const completeMagicLinkSignIn = useCallback(async (email: string, url: string) => {
    const credential = await signInWithEmailLink(auth!, email, url);
    localStorage.removeItem(MAGIC_EMAIL_KEY);
    return credential;
  }, []);

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
