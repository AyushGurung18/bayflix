"use client";

import { useState } from "react";
import Image from "next/image";
import { Tv } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";
import type { WatchProviderCountry, WatchProviderEntry } from "@/lib/types";

interface WatchProvidersProps {
  results?: Record<string, WatchProviderCountry>;
}

function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function detectCountry(available: string[]): string {
  if (typeof navigator === "undefined") return available[0] ?? "US";
  const region = navigator.language?.split("-")[1]?.toUpperCase();
  if (region && available.includes(region)) return region;
  return available.includes("US") ? "US" : (available[0] ?? "US");
}

export default function WatchProviders({ results }: WatchProvidersProps) {
  const countries = Object.keys(results ?? {}).sort();
  const [countryOverride, setCountryOverride] = useState<string | null>(null);

  if (countries.length === 0) return null;

  const country = countryOverride && countries.includes(countryOverride) ? countryOverride : detectCountry(countries);

  const entry = results?.[country];
  const groups: { label: string; items?: WatchProviderEntry[] }[] = [
    { label: "Stream", items: entry?.flatrate },
    { label: "Rent", items: entry?.rent },
    { label: "Buy", items: entry?.buy },
  ].filter((g) => g.items && g.items.length > 0);

  return (
    <div className="mt-8 sm:max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
          <Tv size={16} className="text-brand" /> Where to Watch{" "}
          <span aria-hidden>{flagEmoji(country)}</span>
        </h3>
        {countries.length > 1 && (
          <select
            value={country}
            onChange={(e) => setCountryOverride(e.target.value)}
            className="rounded border border-white/10 bg-ink-card px-2 py-1 text-xs text-neutral-300 outline-none focus:border-white/30"
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {flagEmoji(c)} {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-neutral-500">Not currently available to stream in {country}.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <div key={g.label} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {g.label}
              </span>
              <div className="flex flex-wrap gap-2">
                {g.items!.map((p) => (
                  <a
                    key={p.provider_id}
                    href={entry?.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={p.provider_name}
                    className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10 transition hover:scale-110 hover:ring-white/40"
                  >
                    <Image src={posterUrl(p.logo_path, "w92") ?? ""} alt={p.provider_name} fill className="object-cover" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-neutral-600">
        Streaming availability data provided by{" "}
        <a
          href={entry?.link ?? "https://www.justwatch.com"}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-neutral-400"
        >
          JustWatch
        </a>
        .
      </p>
    </div>
  );
}
