"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Search, X, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";

const NAV_LINKS = [
  { href: "/browse", label: "Home" },
  { href: "/category/popular", label: "Popular" },
  { href: "/category/trending", label: "Trending" },
  { href: "/category/top-rated", label: "Top Rated" },
  { href: "/category/upcoming", label: "Upcoming" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logOut } = useAuth();
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleLogout = async () => {
    await logOut();
    router.push("/");
  };

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3 transition-colors duration-300 sm:px-10",
        scrolled || menuOpen ? "bg-ink shadow-lg shadow-black/40" : "bg-gradient-to-b from-black/80 to-transparent"
      )}
    >
      <div className="flex items-center gap-8">
        <Link href="/browse" className="text-2xl font-black italic tracking-tight text-brand">
          BAYFLIX
        </Link>
        <nav className="hidden items-center gap-5 text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "transition hover:text-neutral-300",
                pathname === link.href ? "font-semibold text-white" : "text-neutral-300"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <form onSubmit={submitSearch} className="flex items-center">
          <div
            className={clsx(
              "flex items-center overflow-hidden rounded border border-white/70 bg-black/70 transition-all duration-300",
              searchOpen ? "w-40 px-2 sm:w-64" : "w-0 border-transparent px-0"
            )}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Titles, people, genres"
              className="w-full bg-transparent py-1.5 text-sm text-white outline-none placeholder-neutral-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="p-1.5 text-white"
            aria-label="Toggle search"
          >
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
        </form>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5"
          >
            <span className="relative h-8 w-8 overflow-hidden rounded bg-brand">
              {currentUser?.photoURL ? (
                <Image src={currentUser.photoURL} alt="" fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                  {(currentUser?.displayName || currentUser?.email || "U")[0].toUpperCase()}
                </span>
              )}
            </span>
            <ChevronDown
              size={16}
              className={clsx("hidden text-white transition sm:block", menuOpen && "rotate-180")}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-3 w-48 animate-scale-in rounded-sm border border-neutral-700 bg-ink-raised/95 py-2 text-sm shadow-xl">
              <Link
                href="/profile"
                className="block px-4 py-2 text-neutral-200 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-left text-neutral-200 hover:bg-white/5"
              >
                Sign out of Bayflix
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
