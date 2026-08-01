"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Compass, Bookmark, User } from "lucide-react";
import clsx from "clsx";
import { isBayflixApiConfigured } from "@/lib/bayflix-api";

const TABS = [
  { href: "/browse", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/category/popular", label: "Browse", icon: Compass },
  ...(isBayflixApiConfigured() ? [{ href: "/watchlist", label: "My List", icon: Bookmark }] : []),
  { href: "/profile", label: "Profile", icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-neutral-800 bg-ink/95 backdrop-blur-lg md:hidden">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium"
          >
            <Icon size={20} className={clsx(active ? "text-brand" : "text-neutral-400")} />
            <span className={clsx(active ? "text-white" : "text-neutral-500")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
