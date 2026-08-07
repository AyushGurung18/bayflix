"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, SlidersHorizontal, Network } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { useProfiles } from "@/lib/profile-context";
import { isBayflixApiConfigured } from "@/lib/bayflix-api";
import SearchOverlay from "./SearchOverlay";

const NAV_LINKS = [
  { href: "/browse", label: "Home" },
  { href: "/category/popular", label: "Popular" },
  { href: "/category/trending", label: "Trending" },
  { href: "/category/top-rated", label: "Top Rated" },
  { href: "/category/upcoming", label: "Upcoming" },
  { href: "/discover", label: "Discover" },
  ...(isBayflixApiConfigured() ? [{ href: "/watchlist", label: "My List" }] : []),
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logOut } = useAuth();
  const { activeProfile } = useProfiles();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await logOut();
    router.push("/");
  };

  return (
    <>
      <header
        className={clsx(
          "fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 transition-all duration-300 sm:px-10",
          scrolled || menuOpen
            ? "bg-ink py-2 shadow-lg shadow-black/40"
            : "bg-gradient-to-b from-black/80 to-transparent py-3 sm:py-4"
        )}
      >
        <div className="flex items-center gap-8">
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link
              href="/browse"
              className={clsx(
                "font-black italic tracking-tight text-brand transition-all duration-300",
                scrolled ? "text-xl" : "text-2xl"
              )}
            >
              BAYFLIX
            </Link>
          </motion.div>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative py-1 transition hover:text-neutral-300"
                >
                  <span className={clsx(active ? "font-semibold text-white" : "text-neutral-300")}>
                    {link.label}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="nav-active-underline"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 rounded bg-brand"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSearchOpen(true)}
            className="p-1.5 text-white"
            aria-label="Open search"
          >
            <Search size={20} />
          </motion.button>

          <div ref={menuRef} className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-1.5">
              <motion.span
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded text-base"
                style={{ backgroundColor: activeProfile?.avatar_color || "var(--color-brand)" }}
              >
                {activeProfile ? (
                  activeProfile.avatar_emoji
                ) : currentUser?.photoURL ? (
                  <Image src={currentUser.photoURL} alt="" fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                    {(currentUser?.displayName || currentUser?.email || "U")[0].toUpperCase()}
                  </span>
                )}
              </motion.span>
              <ChevronDown
                size={16}
                className={clsx("hidden text-white transition sm:block", menuOpen && "rotate-180")}
              />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-3 w-48 rounded-sm border border-neutral-700 bg-ink-raised/95 py-2 text-sm shadow-xl"
                >
                  {activeProfile && (
                    <Link
                      href="/profiles"
                      className="block px-4 py-2 text-neutral-200 transition hover:bg-white/5"
                      onClick={() => setMenuOpen(false)}
                    >
                      Switch Profiles
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-neutral-200 transition hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    Account Settings
                  </Link>
                  {/* Also in the mobile bottom bar's account menu, not just
                      the desktop nav — the bottom tab bar's 5 fixed slots
                      have no room for these, but this dropdown renders on
                      every screen size, so it's the one place both desktop
                      and mobile can always reach them. */}
                  <Link
                    href="/discover"
                    className="flex items-center gap-2 px-4 py-2 text-neutral-200 transition hover:bg-white/5 md:hidden"
                    onClick={() => setMenuOpen(false)}
                  >
                    <SlidersHorizontal size={15} /> Advanced Search
                  </Link>
                  <Link
                    href="/cast-graph"
                    className="flex items-center gap-2 px-4 py-2 text-neutral-200 transition hover:bg-white/5"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Network size={15} /> Cast Connections
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-neutral-200 transition hover:bg-white/5"
                  >
                    Sign out of Bayflix
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
