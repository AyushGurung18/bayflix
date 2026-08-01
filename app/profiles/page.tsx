"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useProfiles } from "@/lib/profile-context";
import ProfilePicker from "@/components/ProfilePicker";
import LoadingScreen from "@/components/LoadingScreen";

// Deliberately outside the (app) route group: RequireAuth (used by every
// (app) route) redirects here when no profile is active yet, so this page
// can't itself be wrapped in that same check without an infinite loop.
export default function ProfilesPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { configured } = useProfiles();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !currentUser) router.replace("/signin");
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    if (!configured) router.replace("/browse");
  }, [configured, router]);

  if (authLoading || !currentUser || !configured) return <LoadingScreen />;

  return <ProfilePicker />;
}
