"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useProfiles } from "@/lib/profile-context";
import LoadingScreen from "./LoadingScreen";
import VerifyEmailGate from "./VerifyEmailGate";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { currentUser, loading, emailVerified } = useAuth();
  const { configured, loading: profilesLoading, activeProfile } = useProfiles();
  const router = useRouter();

  // Magic-link and Google accounts are inherently already verified —
  // this only ever gates the password-signup path, where nothing else
  // confirms the person typing the email actually controls it.
  const needsVerification = !!currentUser && !emailVerified;
  const needsProfilePick = configured && !profilesLoading && !activeProfile && !needsVerification;

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace("/signin");
    } else if (!loading && currentUser && !needsVerification && needsProfilePick) {
      router.replace("/profiles");
    }
  }, [loading, currentUser, needsVerification, needsProfilePick, router]);

  if (loading || !currentUser) {
    return <LoadingScreen />;
  }
  if (needsVerification) {
    return <VerifyEmailGate />;
  }
  if (needsProfilePick) {
    return <LoadingScreen />;
  }

  return children;
}
