"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  type User,
  type UserCredential,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

interface AuthContextValue {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signInGoogle: () => Promise<UserCredential>;
  signUp: (email: string, password: string, displayName?: string) => Promise<UserCredential>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only ever runs client-side (see lib/firebase.ts) — `auth` is guaranteed
    // to be initialized by the time an effect in a mounted component fires.
    const unsubscribe = onAuthStateChanged(auth!, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(
    (email: string, password: string) => signInWithEmailAndPassword(auth!, email, password),
    []
  );

  const signInGoogle = useCallback(() => signInWithPopup(auth!, googleProvider), []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const credential = await createUserWithEmailAndPassword(auth!, email, password);
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }
    return credential;
  }, []);

  const logOut = useCallback(() => signOut(auth!), []);

  const value: AuthContextValue = { currentUser, loading, signIn, signInGoogle, signUp, logOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
