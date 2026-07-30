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

function average(vectors) {
  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  return sum.map((x) => x / vectors.length);
}

/**
 * Builds a "taste vector" from a user's recently watched titles — reusing
 * their already-indexed vectors when available, falling back to embedding
 * on the fly (from the title/overview stashed in D1) for anything not yet
 * in Vectorize.
 */
export async function tasteVectorFromWatched(env, watchedRows) {
  if (watchedRows.length === 0) return null;

  const ids = watchedRows.map((row) => vectorId(row.media_type, row.tmdb_id));
  const existing = await env.VECTORIZE_INDEX.getByIds(ids);
  const foundIds = new Set(existing.map((v) => v.id));

  const missing = watchedRows.filter((row) => !foundIds.has(vectorId(row.media_type, row.tmdb_id)));
  const missingVectors = await Promise.all(
    missing.map((row) =>
      embedText(env, embeddingText({ title: row.title, overview: row.overview }))
    )
  );

  const vectors = [...existing.map((v) => v.values), ...missingVectors];
  return average(vectors);
}
