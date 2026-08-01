"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import {
  isBayflixApiConfigured,
  getProfiles,
  createProfile as createProfileApi,
  deleteProfile as deleteProfileApi,
} from "./bayflix-api";
import type { Profile } from "./types";

const STORAGE_PREFIX = "bayflix:active-profile:";

interface ProfileContextValue {
  configured: boolean;
  loading: boolean;
  profiles: Profile[];
  activeProfile: Profile | null;
  selectProfile: (id: string) => void;
  clearActiveProfile: () => void;
  addProfile: (name: string, avatarColor: string, avatarEmoji: string) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const configured = isBayflixApiConfigured();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const storageKey = currentUser ? `${STORAGE_PREFIX}${currentUser.uid}` : null;

  const refresh = useCallback(async () => {
    if (!configured || !currentUser) {
      setProfiles([]);
      setActiveId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const list = await getProfiles();
    setProfiles(list);
    const key = `${STORAGE_PREFIX}${currentUser.uid}`;
    const stored = localStorage.getItem(key);
    setActiveId(stored && list.some((p) => p.id === stored) ? stored : null);
    setLoading(false);
  }, [configured, currentUser]);

  useEffect(() => {
    // Responds to auth signing in/out — reloads (or clears) the profile
    // list, which isn't derivable from render-time values alone.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const selectProfile = useCallback(
    (id: string) => {
      setActiveId(id);
      if (storageKey) localStorage.setItem(storageKey, id);
    },
    [storageKey]
  );

  const clearActiveProfile = useCallback(() => {
    setActiveId(null);
    if (storageKey) localStorage.removeItem(storageKey);
  }, [storageKey]);

  const addProfile = useCallback(async (name: string, avatarColor: string, avatarEmoji: string) => {
    const created = await createProfileApi(name, avatarColor, avatarEmoji);
    if (created) setProfiles((list) => [...list, created]);
  }, []);

  const removeProfile = useCallback(
    async (id: string) => {
      await deleteProfileApi(id);
      setProfiles((list) => list.filter((p) => p.id !== id));
      if (activeId === id) clearActiveProfile();
    },
    [activeId, clearActiveProfile]
  );

  const activeProfile = useMemo(() => profiles.find((p) => p.id === activeId) ?? null, [profiles, activeId]);

  const value: ProfileContextValue = {
    configured,
    loading,
    profiles,
    activeProfile,
    selectProfile,
    clearActiveProfile,
    addProfile,
    removeProfile,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfiles() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfiles must be used within a ProfileProvider");
  return ctx;
}
