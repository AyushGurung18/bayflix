"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import LoadingScreen from "./LoadingScreen";

export default function RequireAuth({ children }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace("/signin");
    }
  }, [loading, currentUser, router]);

  if (loading || !currentUser) {
    return <LoadingScreen />;
  }

  return children;
}
