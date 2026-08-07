"use client";

import type { CastGraph, MediaType } from "./types";

export { toCytoscapeElements, toD3Graph } from "./graph-adapters";
export type { CastGraph, CastGraphNode, CastGraphEdge, CastGraphNodeType } from "./types";

export type GraphFormat = "cytoscape" | "d3";

interface TitleGraphArgs {
  mediaType: MediaType;
  id: number | string;
  /** How many top-billed cast members to fan out around the title (default 20, server clamps to 1-50). */
  castLimit?: number;
  format?: GraphFormat;
}

// Star graph: one title in the center, its cast around it — the shared
// connection between everyone in the graph *is* that title.
export async function fetchTitleCastGraph<T = CastGraph>({
  mediaType,
  id,
  castLimit,
  format,
}: TitleGraphArgs): Promise<T> {
  const params = new URLSearchParams({ mode: "title", mediaType, id: String(id) });
  if (castLimit) params.set("limit", String(castLimit));
  if (format) params.set("format", format);
  const res = await fetch(`/api/cast-graph?${params}`);
  if (!res.ok) throw new Error(`cast-graph request failed (${res.status})`);
  return res.json();
}

interface ConnectionGraphArgs {
  actorId1: number | string;
  actorId2: number | string;
  /** "Degrees of separation" to search out to before giving up (default 3, server clamps to 1-4). */
  maxHops?: number;
  /** Titles explored per person, ranked by popularity (default 12, server clamps to 3-20). */
  perPersonLimit?: number;
  /** Cast explored per title, ranked by billing order (default 10, server clamps to 3-20). */
  perTitleLimit?: number;
  /** Hard cap on total TMDB calls for the search (default 60, server clamps to 10-100). */
  budget?: number;
  format?: GraphFormat;
}

// Six-degrees-of-separation style search: finds the shortest chain of
// shared titles/co-stars connecting the two actors, returns just that
// chain (not the full search fan-out) as nodes/edges.
export async function fetchActorConnectionGraph<T = CastGraph>({
  actorId1,
  actorId2,
  maxHops,
  perPersonLimit,
  perTitleLimit,
  budget,
  format,
}: ConnectionGraphArgs): Promise<T> {
  const params = new URLSearchParams({
    mode: "connection",
    actorId1: String(actorId1),
    actorId2: String(actorId2),
  });
  if (maxHops) params.set("maxHops", String(maxHops));
  if (perPersonLimit) params.set("perPersonLimit", String(perPersonLimit));
  if (perTitleLimit) params.set("perTitleLimit", String(perTitleLimit));
  if (budget) params.set("budget", String(budget));
  if (format) params.set("format", format);
  const res = await fetch(`/api/cast-graph?${params}`);
  if (!res.ok) throw new Error(`cast-graph request failed (${res.status})`);
  return res.json();
}
