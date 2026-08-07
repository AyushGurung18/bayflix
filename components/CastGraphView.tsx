"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
// cytoscape ships as `export =` + `export as namespace` — there's no
// top-level named export for its types, only the default value plus the
// merged `cytoscape.X` namespace (hence `cytoscape.Core` etc. below rather
// than `import { Core } from "cytoscape"`).
import cytoscape from "cytoscape";
import { IMAGE_BASE } from "@/lib/tmdb";
import type { CytoscapeElements } from "@/lib/graph-adapters";

type GraphLayout = "breadthfirst" | "concentric" | "cose";

interface CastGraphViewProps {
  elements: CytoscapeElements;
  /** "breadthfirst" suits a linear A->...->B connection chain, "concentric" suits a title-centered star graph, "cose" is a general-purpose fallback. */
  layout?: GraphLayout;
  /** Node id to root the breadthfirst/concentric layout on (the title node in star mode, actor A in connection mode). */
  rootId?: string;
  height?: number;
}

const imageOf = (ele: cytoscape.NodeSingular): string => {
  const path = ele.data("image");
  return path ? `${IMAGE_BASE}/w185${path}` : "none";
};

// Thin, purpose-built cytoscape.js wrapper — deliberately not the
// react-cytoscapejs community package, since it doesn't ship its own
// types and its React 19 compatibility is unverified; a plain useEffect +
// ref gives full control with cytoscape's own (first-party typed) API.
export default function CastGraphView({ elements, layout = "cose", rootId, height = 520 }: CastGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current) return;

    const nodeDefs: cytoscape.ElementDefinition[] = elements.nodes.map((n) => ({
      data: n.data,
      classes: String(n.data.type ?? ""),
    }));
    const edgeDefs: cytoscape.ElementDefinition[] = elements.edges.map((e) => ({ data: e.data }));

    const style: cytoscape.StylesheetCSS[] = [
      {
        selector: "node",
        css: {
          "background-color": "#1f1f1f",
          "background-image": imageOf,
          "background-fit": "cover",
          "border-width": 2,
          "border-color": "#e50914",
          label: "data(label)",
          color: "#ffffff",
          "font-size": 10,
          "text-valign": "bottom",
          "text-margin-y": 8,
          "text-wrap": "wrap",
          "text-max-width": "80px",
          width: 56,
          height: 56,
        } as cytoscape.StylesheetCSS["css"],
      },
      {
        selector: "node.title",
        css: {
          shape: "round-rectangle",
          "border-color": "#b0060f",
          width: 64,
          height: 90,
        } as cytoscape.StylesheetCSS["css"],
      },
      {
        selector: "edge",
        css: {
          width: 1.5,
          "line-color": "#525252",
          "curve-style": "bezier",
          label: "data(label)",
          "font-size": 9,
          color: "#a3a3a3",
          "text-background-color": "#0b0b0b",
          "text-background-opacity": 1,
          "text-background-padding": "2px",
        } as cytoscape.StylesheetCSS["css"],
      },
    ];

    const cy: cytoscape.Core = cytoscape({
      container: containerRef.current,
      elements: [...nodeDefs, ...edgeDefs],
      style,
      layout: buildLayout(layout, rootId),
      wheelSensitivity: 0.3,
      minZoom: 0.3,
      maxZoom: 2.5,
    });

    cy.on("tap", "node", (evt) => {
      const data = evt.target.data();
      if (data.type === "person") router.push(`/person/${data.tmdbId}`);
      else if (data.mediaType) router.push(`/${data.mediaType}/${data.tmdbId}`);
    });

    return () => {
      cy.destroy();
    };
  }, [elements, layout, rootId, router]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full overflow-hidden rounded-xl border border-white/10 bg-ink-card"
    />
  );
}

// Layout option shapes differ per algorithm (breadthfirst/concentric add
// fields the base LayoutOptions type doesn't declare) — kept loosely typed
// here rather than fighting cytoscape's per-layout typings for a small,
// self-contained helper.
function buildLayout(layout: GraphLayout, rootId?: string): cytoscape.LayoutOptions {
  if (layout === "breadthfirst") {
    return {
      name: "breadthfirst",
      roots: rootId ? [rootId] : undefined,
      directed: true,
      spacingFactor: 1.5,
      animate: true,
    } as unknown as cytoscape.LayoutOptions;
  }
  if (layout === "concentric") {
    return {
      name: "concentric",
      concentric: (n: cytoscape.NodeSingular) => (n.id() === rootId ? 10 : 1),
      levelWidth: () => 2,
      animate: true,
    } as unknown as cytoscape.LayoutOptions;
  }
  return {
    name: "cose",
    animate: true,
    idealEdgeLength: () => 120,
    nodeRepulsion: () => 8000,
  } as unknown as cytoscape.LayoutOptions;
}
