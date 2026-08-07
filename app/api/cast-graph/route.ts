import { NextResponse, type NextRequest } from "next/server";
import { toCytoscapeElements, toD3Graph } from "@/lib/graph-adapters";
import type { CastGraph, CastGraphEdge, CastGraphNode, MediaType } from "@/lib/types";

const TMDB_BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org";

// Builds two kinds of cast-connection graphs from TMDB data:
//   ?mode=title&mediaType=movie&id=550         -> star graph: one title, its cast around it
//   ?mode=connection&actorId1=..&actorId2=..   -> shortest "how are they connected" chain
// Optional &format=cytoscape|d3 returns the graph pre-shaped for that
// library (see lib/graph-adapters.ts); omit it for the neutral CastGraph
// JSON.

// ---- Loose shapes for the handful of TMDB fields we actually read off
// much larger payloads — not worth promoting to lib/types.ts since nothing
// outside this route touches them. ----
interface TmdbPersonBasic {
  id: number;
  name: string;
  profile_path: string | null;
}
interface TmdbCastCredit {
  id: number;
  media_type?: "movie" | "tv";
  title?: string;
  name?: string;
  character?: string;
  poster_path?: string | null;
  profile_path?: string | null;
  popularity?: number;
  order?: number;
}
interface TmdbTitleBasic {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
}

const personKey = (id: number) => `person:${id}`;
const titleKey = (mediaType: MediaType, id: number) => `title:${mediaType}:${id}`;

// Wraps TMDB fetches with an in-request cache (the same person/title can be
// reached from both BFS frontiers) and a hard call-count ceiling, so one
// slow client request can't run away and hammer TMDB indefinitely.
class TmdbClient {
  private cache = new Map<string, unknown>();
  requests = 0;
  constructor(
    private apiKey: string,
    private budget: number
  ) {}

  get exhausted() {
    return this.requests >= this.budget;
  }

  async get<T>(path: string): Promise<T> {
    const cached = this.cache.get(path);
    if (cached) return cached as T;
    if (this.exhausted) throw new Error("request budget exhausted");
    this.requests++;
    const res = await fetch(`${TMDB_BASE_URL}/3/${path}?api_key=${this.apiKey}`, {
      next: { revalidate: 60 * 60 },
    });
    if (!res.ok) throw new Error(`TMDB ${path} failed (${res.status})`);
    const data = (await res.json()) as T;
    this.cache.set(path, data);
    return data;
  }
}

interface Neighbor {
  key: string;
  node: CastGraphNode;
  edgeLabel?: string;
}

// A person's neighbors in the bipartite person<->title graph are the
// titles they've appeared in — combined_credits covers movies and TV in
// one call, ranked by popularity so the most recognizable work is explored
// first (cheap, effective pruning for a fan-out that's otherwise unbounded).
async function personNeighbors(client: TmdbClient, id: number, limit: number): Promise<Neighbor[]> {
  const data = await client.get<{ cast: TmdbCastCredit[] }>(`person/${id}/combined_credits`);
  const cast = (data.cast ?? [])
    .filter((c) => c.id && (c.title || c.name) && (c.media_type === "movie" || c.media_type === "tv"))
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, limit);
  return cast.map((c) => {
    const mediaType = c.media_type as MediaType;
    return {
      key: titleKey(mediaType, c.id),
      edgeLabel: c.character,
      node: {
        id: titleKey(mediaType, c.id),
        type: "title",
        tmdbId: c.id,
        mediaType,
        label: c.title || c.name || "Untitled",
        imagePath: c.poster_path ?? null,
      },
    };
  });
}

// A title's neighbors are its cast, ranked by billing order (top-billed
// first) rather than popularity — order is the more meaningful signal for
// "who's actually a co-star" than a popularity score.
async function titleNeighbors(
  client: TmdbClient,
  mediaType: MediaType,
  id: number,
  limit: number
): Promise<Neighbor[]> {
  const data = await client.get<{ cast: TmdbCastCredit[] }>(`${mediaType}/${id}/credits`);
  const cast = (data.cast ?? [])
    .filter((c) => c.id && c.name)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, limit);
  return cast.map((c) => ({
    key: personKey(c.id),
    edgeLabel: c.character,
    node: {
      id: personKey(c.id),
      type: "person",
      tmdbId: c.id,
      label: c.name || "Unknown",
      imagePath: c.profile_path ?? null,
    },
  }));
}

interface VisitEntry {
  parentKey: string | null;
  edgeLabel?: string;
  node: CastGraphNode;
}

function reconstructChain(visited: Map<string, VisitEntry>, key: string): string[] {
  const chain: string[] = [];
  let cur: string | null = key;
  while (cur) {
    chain.push(cur);
    cur = visited.get(cur)?.parentKey ?? null;
  }
  return chain.reverse(); // root -> ... -> key
}

interface ConnectionOptions {
  maxHops: number;
  perPersonLimit: number;
  perTitleLimit: number;
}

// Bidirectional BFS over the person<->title graph: alternately expands
// whichever frontier (A's side or B's side) is currently smaller, so the
// two searches meet in the middle instead of one side doing all the work —
// the standard trick for keeping a Kevin-Bacon-style search tractable.
// maxHops is in "person degrees" (co-starring once = 1); the loop runs up
// to maxHops*2 expansions since each degree costs one person->title step
// and one title->person step.
async function findConnection(
  client: TmdbClient,
  actorAId: number,
  actorBId: number,
  opts: ConnectionOptions
): Promise<CastGraph> {
  const { maxHops, perPersonLimit, perTitleLimit } = opts;
  const rootAKey = personKey(actorAId);
  const rootBKey = personKey(actorBId);

  const [personA, personB] = await Promise.all([
    client.get<TmdbPersonBasic>(`person/${actorAId}`),
    client.get<TmdbPersonBasic>(`person/${actorBId}`),
  ]);

  const nodeA: CastGraphNode = {
    id: rootAKey,
    type: "person",
    tmdbId: actorAId,
    label: personA.name,
    imagePath: personA.profile_path,
  };
  const nodeB: CastGraphNode = {
    id: rootBKey,
    type: "person",
    tmdbId: actorBId,
    label: personB.name,
    imagePath: personB.profile_path,
  };

  if (actorAId === actorBId) {
    return { nodes: [nodeA], edges: [], connected: true, degrees: 0 };
  }

  const visitedA = new Map<string, VisitEntry>([[rootAKey, { parentKey: null, node: nodeA }]]);
  const visitedB = new Map<string, VisitEntry>([[rootBKey, { parentKey: null, node: nodeB }]]);
  let frontierA = [rootAKey];
  let frontierB = [rootBKey];
  let meetingKey: string | null = null;

  outer: for (let hop = 0; hop < maxHops * 2; hop++) {
    if (client.exhausted || frontierA.length === 0 || frontierB.length === 0) break;

    const expandA = frontierA.length <= frontierB.length;
    const frontier = expandA ? frontierA : frontierB;
    const visited = expandA ? visitedA : visitedB;
    const otherVisited = expandA ? visitedB : visitedA;
    const nextFrontier: string[] = [];

    for (const key of frontier) {
      if (client.exhausted) break;
      let neighbors: Neighbor[];
      try {
        if (key.startsWith("person:")) {
          neighbors = await personNeighbors(client, Number(key.split(":")[1]), perPersonLimit);
        } else {
          const [, mt, id] = key.split(":");
          neighbors = await titleNeighbors(client, mt as MediaType, Number(id), perTitleLimit);
        }
      } catch {
        continue; // one unreachable/deleted TMDB record shouldn't kill the whole search
      }

      for (const nb of neighbors) {
        if (visited.has(nb.key)) continue;
        visited.set(nb.key, { parentKey: key, edgeLabel: nb.edgeLabel, node: nb.node });
        nextFrontier.push(nb.key);
        if (otherVisited.has(nb.key)) {
          meetingKey = nb.key;
          break outer;
        }
      }
    }

    if (expandA) frontierA = nextFrontier;
    else frontierB = nextFrontier;
  }

  if (!meetingKey) {
    return { nodes: [nodeA, nodeB], edges: [], connected: false, degrees: null, truncated: client.exhausted };
  }

  const chainA = reconstructChain(visitedA, meetingKey); // rootA -> ... -> meeting
  const chainB = reconstructChain(visitedB, meetingKey); // rootB -> ... -> meeting
  const fullChain = [...chainA, ...chainB.slice(0, -1).reverse()]; // rootA -> ... -> meeting -> ... -> rootB

  const nodes: CastGraphNode[] = [];
  const edges: CastGraphEdge[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < fullChain.length; i++) {
    const key = fullChain[i];
    const entry = visitedA.get(key) ?? visitedB.get(key);
    if (!entry) continue;
    if (!seen.has(key)) {
      seen.add(key);
      nodes.push(entry.node);
    }
    if (i > 0) {
      const prevKey = fullChain[i - 1];
      // Whichever of the pair has the other as its BFS parent is the one
      // holding the correct edge label (the character played in that title).
      const entryHere = visitedA.get(key) ?? visitedB.get(key);
      const entryPrev = visitedA.get(prevKey) ?? visitedB.get(prevKey);
      const label = entryHere?.parentKey === prevKey ? entryHere.edgeLabel : entryPrev?.edgeLabel;
      edges.push({ id: `${prevKey}--${key}`, source: prevKey, target: key, label });
    }
  }

  // "Degrees of separation" = how many other people stand between them —
  // 0 co-stars in between means they worked together directly (degree 1).
  const degrees = nodes.filter((n) => n.type === "person").length - 1;

  return { nodes, edges, connected: true, degrees, truncated: client.exhausted };
}

// The simple case: one title, its cast fanned out around it — the shared
// connection *is* the title itself, so no search is needed.
async function buildTitleGraph(
  client: TmdbClient,
  mediaType: MediaType,
  id: number,
  castLimit: number
): Promise<CastGraph> {
  const [details, credits] = await Promise.all([
    client.get<TmdbTitleBasic>(`${mediaType}/${id}`),
    client.get<{ cast: TmdbCastCredit[] }>(`${mediaType}/${id}/credits`),
  ]);

  const centerKey = titleKey(mediaType, id);
  const centerNode: CastGraphNode = {
    id: centerKey,
    type: "title",
    tmdbId: id,
    mediaType,
    label: details.title || details.name || "Untitled",
    imagePath: details.poster_path,
  };

  const cast = (credits.cast ?? []).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)).slice(0, castLimit);
  const nodes: CastGraphNode[] = [centerNode];
  const edges: CastGraphEdge[] = [];
  for (const c of cast) {
    const pKey = personKey(c.id);
    nodes.push({ id: pKey, type: "person", tmdbId: c.id, label: c.name || "Unknown", imagePath: c.profile_path ?? null });
    edges.push({ id: `${centerKey}--${pKey}`, source: centerKey, target: pKey, label: c.character });
  }

  return { nodes, edges, connected: true, degrees: 1 };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB_API_KEY is not configured on the server" }, { status: 500 });
  }

  const search = new URL(request.url).searchParams;
  const mode = search.get("mode");
  const format = search.get("format"); // "cytoscape" | "d3" | null (neutral CastGraph)

  try {
    let graph: CastGraph;

    if (mode === "title") {
      const mediaType: MediaType = search.get("mediaType") === "tv" ? "tv" : "movie";
      const id = Number(search.get("id"));
      if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
      const castLimit = clamp(Number(search.get("limit") ?? 20), 1, 50);
      const client = new TmdbClient(apiKey, 10);
      graph = await buildTitleGraph(client, mediaType, id, castLimit);
    } else if (mode === "connection") {
      const actorAId = Number(search.get("actorId1"));
      const actorBId = Number(search.get("actorId2"));
      if (!actorAId || !actorBId) {
        return NextResponse.json({ error: "actorId1 and actorId2 are required" }, { status: 400 });
      }
      const maxHops = clamp(Number(search.get("maxHops") ?? 3), 1, 4);
      const perPersonLimit = clamp(Number(search.get("perPersonLimit") ?? 12), 3, 20);
      const perTitleLimit = clamp(Number(search.get("perTitleLimit") ?? 10), 3, 20);
      const budget = clamp(Number(search.get("budget") ?? 60), 10, 100);
      const client = new TmdbClient(apiKey, budget);
      graph = await findConnection(client, actorAId, actorBId, { maxHops, perPersonLimit, perTitleLimit });
    } else {
      return NextResponse.json({ error: "mode must be 'title' or 'connection'" }, { status: 400 });
    }

    if (format === "cytoscape") return NextResponse.json(toCytoscapeElements(graph));
    if (format === "d3") return NextResponse.json(toD3Graph(graph));
    return NextResponse.json(graph);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to build cast graph", detail: (error as Error).message },
      { status: 502 }
    );
  }
}
