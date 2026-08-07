"use client";

import Image from "next/image";
import { posterUrl } from "@/lib/tmdb";
import type { TmdbCompany } from "@/lib/types";

interface CompanyLogosProps {
  title: string;
  companies?: TmdbCompany[];
}

// Renders a row of studio/network logos — used for both TV `networks` and
// movie/TV `production_companies`, which TMDB returns in the identical
// { id, name, logo_path } shape. Entries without a logo_path (common for
// smaller companies) are skipped rather than shown as broken images.
export default function CompanyLogos({ title, companies }: CompanyLogosProps) {
  const withLogo = (companies ?? []).filter((c) => c.logo_path);
  if (withLogo.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-sm font-semibold text-neutral-200">{title}</h3>
      <div className="flex flex-wrap gap-3">
        {withLogo.map((c) => (
          <div
            key={c.id}
            title={c.name}
            className="relative flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-white/90 ring-1 ring-white/10 transition hover:scale-105 hover:bg-white"
          >
            <Image
              src={posterUrl(c.logo_path, "w185") ?? ""}
              alt={c.name}
              fill
              className="object-contain p-2.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
