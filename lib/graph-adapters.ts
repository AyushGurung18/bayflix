import type { CastGraph } from "./types";

// Pure transforms from our neutral CastGraph shape into the two shapes real
// graph-viz libraries actually expect. D3's force layout and Cytoscape.js
// disagree on structure (Cytoscape wraps every node/edge in a `data` object
// and calls the collection `elements`; D3 wants a flat `nodes`/`links`
// array with `source`/`target` — no `data` wrapper) so there's no single
// shape that's simultaneously idiomatic for both. Deliberately no
// directive here (not "use client") — this file has zero browser-only
// APIs, so both the /api/cast-graph route (server) and graph-rendering
// client components can import it directly.

export interface CytoscapeElements {
  nodes: { data: Record<string, unknown> }[];
  edges: { data: Record<string, unknown> }[];
}

export function toCytoscapeElements(graph: CastGraph): CytoscapeElements {
  return {
    nodes: graph.nodes.map((n) => ({
      data: {
        id: n.id,
        label: n.label,
        type: n.type,
        mediaType: n.mediaType,
        tmdbId: n.tmdbId,
        image: n.imagePath,
      },
    })),
    edges: graph.edges.map((e) => ({
      data: { id: e.id, source: e.source, target: e.target, label: e.label },
    })),
  };
}

export interface D3Graph {
  nodes: Array<CastGraph["nodes"][number] & Record<string, unknown>>;
  links: Array<{ source: string; target: string } & Record<string, unknown>>;
}

export function toD3Graph(graph: CastGraph): D3Graph {
  return {
    nodes: graph.nodes.map((n) => ({ ...n })),
    links: graph.edges.map((e) => ({ ...e, source: e.source, target: e.target })),
  };
}
