const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5"; // 768-dim — must match the Vectorize index's --dimensions

export async function embedText(env, text) {
  const { data } = await env.AI.run(EMBEDDING_MODEL, { text: [text] });
  return data[0];
}

export function vectorId(mediaType, tmdbId) {
  return `${mediaType}:${tmdbId}`;
}

function embeddingText({ title, overview }) {
  return overview ? `${title}. ${overview}` : title;
}

/** Upserts a title into Vectorize so search/recommendations can find it. */
export async function indexTitle(env, item) {
  const vector = await embedText(env, embeddingText(item));
  await env.VECTORIZE_INDEX.upsert([
    {
      id: vectorId(item.mediaType, item.tmdbId),
      values: vector,
      metadata: {
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        posterPath: item.posterPath || "",
        backdropPath: item.backdropPath || "",
        releaseDate: item.releaseDate || "",
        voteAverage: item.voteAverage ?? 0,
      },
    },
  ]);
}

/** Shapes a Vectorize match's metadata back into a TMDB-list-item-like object. */
export function matchToCardItem(metadata) {
  const isTV = metadata.mediaType === "tv";
  return {
    id: metadata.tmdbId,
    media_type: metadata.mediaType,
    [isTV ? "name" : "title"]: metadata.title,
    poster_path: metadata.posterPath || null,
    backdrop_path: metadata.backdropPath || null,
    [isTV ? "first_air_date" : "release_date"]: metadata.releaseDate || null,
    vote_average: metadata.voteAverage || 0,
  };
}

function weightedAverage(vectors, weights) {
  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0);
  let totalWeight = 0;
  vectors.forEach((v, i) => {
    const w = weights[i];
    totalWeight += w;
    for (let d = 0; d < dim; d++) sum[d] += v[d] * w;
  });
  return sum.map((x) => x / totalWeight);
}

/**
 * Builds a "taste vector" from a user's watched history and star ratings —
 * reusing already-indexed vectors when available, falling back to embedding
 * on the fly (from the title/overview stashed in D1) for anything not yet
 * in Vectorize.
 *
 * Weighting: plain "watched" counts as 1.0. A star rating replaces that
 * weight with stars/5 — a 5-star title counts fully, a 1-star title counts
 * at 0.2x, so disliked titles barely pull the taste vector toward them
 * instead of being treated as equally strong a signal as something loved.
 */
export async function buildTasteVector(env, watchedRows, ratingRows) {
  const weights = new Map(); // vectorId -> weight
  const rowsById = new Map(); // vectorId -> row (for on-the-fly embedding text)

  for (const row of watchedRows) {
    const id = vectorId(row.media_type, row.tmdb_id);
    weights.set(id, 1.0);
    rowsById.set(id, row);
  }
  for (const row of ratingRows) {
    const id = vectorId(row.media_type, row.tmdb_id);
    weights.set(id, row.stars / 5); // a rating is a stronger signal than plain "watched"
    rowsById.set(id, row);
  }

  const ids = [...weights.keys()];
  if (ids.length === 0) return null;

  const existing = await env.VECTORIZE_INDEX.getByIds(ids);
  const vectorsById = new Map(existing.map((v) => [v.id, v.values]));

  const missingIds = ids.filter((id) => !vectorsById.has(id));
  const missingVectors = await Promise.all(
    missingIds.map((id) => embedText(env, embeddingText(rowsById.get(id))))
  );
  missingIds.forEach((id, i) => vectorsById.set(id, missingVectors[i]));

  return weightedAverage(
    ids.map((id) => vectorsById.get(id)),
    ids.map((id) => weights.get(id))
  );
}
