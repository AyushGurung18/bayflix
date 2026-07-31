"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, LogOut, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const { currentUser, logOut } = useAuth();
  const router = useRouter();

  if (!currentUser) return null;

  const handleLogout = async () => {
    await logOut();
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-12 sm:px-0">
      <h1 className="mb-8 text-2xl font-bold sm:text-3xl">Account</h1>

      <div className="flex items-center gap-6 rounded-lg bg-ink-card p-6">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-brand sm:h-28 sm:w-28">
          {currentUser.photoURL ? (
            <Image src={currentUser.photoURL} alt="" fill className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <User size={40} className="text-white" />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">
            {currentUser.displayName || "Bayflix Member"}
          </p>
          <p className="mt-1 flex items-center gap-2 truncate text-sm text-neutral-400">
            <Mail size={14} /> {currentUser.email}
          </p>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="mt-6 flex items-center gap-2 rounded border border-neutral-600 px-5 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-white hover:text-white"
      >
        <LogOut size={16} /> Sign out of Bayflix
      </button>
    </div>
  );
}
