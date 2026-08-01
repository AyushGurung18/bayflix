"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useProfiles } from "@/lib/profile-context";
import LoadingScreen from "./LoadingScreen";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth();
  const { configured, loading: profilesLoading, activeProfile } = useProfiles();
  const router = useRouter();

  const needsProfilePick = configured && !profilesLoading && !activeProfile;

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace("/signin");
    } else if (!loading && currentUser && needsProfilePick) {
      router.replace("/profiles");
    }
  }, [loading, currentUser, needsProfilePick, router]);

  if (loading || !currentUser || needsProfilePick) {
    return <LoadingScreen />;
  }

  return children;
}
