"use client";

import { fetchTmdb } from "./tmdb";
import type { MediaType, TmdbItem, TmdbListResponse } from "./types";

export type SortDirection = "asc" | "desc";
// TMDB's with_X filters treat a comma-joined list as AND and a pipe-joined
// list as OR (e.g. with_genres=28,12 = "Action AND Adventure", 28|12 =
// "Action OR Adventure") — every list-accepting method below takes this.
export type CombineMode = "and" | "or";

type Id = number | string;
type IdList = Id | Id[];

function joinIds(ids: IdList, mode: CombineMode = "and"): string {
  if (!Array.isArray(ids)) return String(ids);
  return ids.join(mode === "or" ? "|" : ",");
}

// Accepts a raw, possibly-messy query string (copied from a browser bar, a
// curl command, Postman, or hand-typed notes) and turns it into a plain
// param map. Tolerates a leading URL, '&'/';'/newline pair separators,
// '='/':' key-value separators, quoted values, and stray whitespace.
export function parseMessyDiscoverQuery(input: string): Record<string, string> {
  const withoutUrl = input.replace(/^.*?\?/, "");
  const pairs = withoutUrl
    .split(/[&;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const result: Record<string, string> = {};
  for (const pair of pairs) {
    const sep = pair.match(/[=:]/);
    if (!sep || sep.index === undefined) continue;
    const rawKey = pair.slice(0, sep.index).trim().replace(/^["']|["']$/g, "");
    const rawValue = pair
      .slice(sep.index + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!rawKey) continue;
    try {
      result[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
    } catch {
      result[rawKey] = rawValue; // not URI-encoded — use it verbatim rather than dropping it
    }
  }
  return result;
}

interface NumericRange {
  gte?: number;
  lte?: number;
}

/**
 * Fluent builder over TMDB's /discover/movie and /discover/tv — covers
 * genres, people, companies, keywords, watch providers, numeric ranges
 * (runtime/votes/dates/certification), and the TV- and movie-specific
 * odds and ends, plus escape hatches (`.param()`, `.merge()`, `.raw()`)
 * for anything not wrapped in a named method or pasted in from elsewhere.
 *
 *   const { results } = await discoverMovies()
 *     .genres([28, 12])
 *     .voteAverage({ gte: 7 })
 *     .originalLanguage("en")
 *     .sortBy("popularity", "desc")
 *     .raw("with_watch_providers=8|9&watch_region=US") // pasted from somewhere messy
 *     .fetch();
 */
export class DiscoverQueryBuilder {
  private params: Record<string, string> = {};

  constructor(private mediaType: MediaType) {}

  // ---- escape hatches ----
  param(key: string, value: string | number | boolean): this {
    this.params[key] = String(value);
    return this;
  }
  merge(values: Record<string, string | number | boolean | undefined | null>): this {
    for (const [k, v] of Object.entries(values)) {
      if (v !== undefined && v !== null && v !== "") this.params[k] = String(v);
    }
    return this;
  }
  raw(input: string | Record<string, string | number | boolean>): this {
    return this.merge(typeof input === "string" ? parseMessyDiscoverQuery(input) : input);
  }

  // ---- paging / locale ----
  page(n: number): this {
    this.params.page = String(n);
    return this;
  }
  language(code: string): this {
    this.params.language = code;
    return this;
  }
  region(code: string): this {
    this.params.region = code;
    return this;
  }
  includeAdult(value = true): this {
    this.params.include_adult = String(value);
    return this;
  }
  includeVideo(value = true): this {
    this.params.include_video = String(value);
    return this;
  }

  // ---- sort ----
  sortBy(field: string, direction: SortDirection = "desc"): this {
    this.params.sort_by = `${field}.${direction}`;
    return this;
  }

  // ---- genres / people / companies / keywords ----
  genres(ids: IdList, mode: CombineMode = "and"): this {
    this.params.with_genres = joinIds(ids, mode);
    return this;
  }
  withoutGenres(ids: IdList): this {
    this.params.without_genres = joinIds(ids);
    return this;
  }
  cast(ids: IdList, mode: CombineMode = "and"): this {
    this.params.with_cast = joinIds(ids, mode);
    return this;
  }
  crew(ids: IdList, mode: CombineMode = "and"): this {
    this.params.with_crew = joinIds(ids, mode);
    return this;
  }
  people(ids: IdList, mode: CombineMode = "and"): this {
    this.params.with_people = joinIds(ids, mode);
    return this;
  }
  companies(ids: IdList, mode: CombineMode = "and"): this {
    this.params.with_companies = joinIds(ids, mode);
    return this;
  }
  withoutCompanies(ids: IdList): this {
    this.params.without_companies = joinIds(ids);
    return this;
  }
  keywords(ids: IdList, mode: CombineMode = "and"): this {
    this.params.with_keywords = joinIds(ids, mode);
    return this;
  }
  withoutKeywords(ids: IdList): this {
    this.params.without_keywords = joinIds(ids);
    return this;
  }
  /** TV only. */
  networks(ids: IdList): this {
    this.params.with_networks = joinIds(ids);
    return this;
  }

  // ---- language / origin ----
  originCountry(code: string): this {
    this.params.with_origin_country = code;
    return this;
  }
  originalLanguage(code: string): this {
    this.params.with_original_language = code;
    return this;
  }

  // ---- watch providers ----
  watchProviders(ids: IdList, mode: CombineMode = "or"): this {
    this.params.with_watch_providers = joinIds(ids, mode);
    return this;
  }
  withoutWatchProviders(ids: IdList): this {
    this.params.without_watch_providers = joinIds(ids);
    return this;
  }
  watchRegion(code: string): this {
    this.params.watch_region = code;
    return this;
  }
  /** e.g. "flatrate" | "free" | "ads" | "rent" | "buy" */
  monetizationTypes(types: IdList): this {
    this.params.with_watch_monetization_types = joinIds(types, "or");
    return this;
  }

  // ---- numeric ranges ----
  private range(base: string, opts: NumericRange): this {
    if (opts.gte !== undefined) this.params[`${base}.gte`] = String(opts.gte);
    if (opts.lte !== undefined) this.params[`${base}.lte`] = String(opts.lte);
    return this;
  }
  voteAverage(opts: NumericRange): this {
    return this.range("vote_average", opts);
  }
  voteCount(opts: NumericRange): this {
    return this.range("vote_count", opts);
  }
  runtime(opts: NumericRange): this {
    return this.range("with_runtime", opts);
  }
  /** Movie only — filters on ANY of a movie's release dates worldwide. */
  releaseDate(opts: NumericRange): this {
    return this.range("release_date", opts);
  }
  /** Movie only — filters on TMDB's single "primary" release date. */
  primaryReleaseDate(opts: NumericRange): this {
    return this.range("primary_release_date", opts);
  }
  /** TV only. */
  firstAirDate(opts: NumericRange): this {
    return this.range("first_air_date", opts);
  }
  /** TV only. */
  airDate(opts: NumericRange): this {
    return this.range("air_date", opts);
  }
  /** Movie only — ordinal certification range within certificationCountry(). */
  certificationRange(opts: NumericRange): this {
    return this.range("certification", opts);
  }

  // ---- exact year pins ----
  /** Movie only. */
  year(y: number): this {
    this.params.year = String(y);
    return this;
  }
  /** Movie only. */
  primaryReleaseYear(y: number): this {
    this.params.primary_release_year = String(y);
    return this;
  }
  /** TV only. */
  firstAirDateYear(y: number): this {
    this.params.first_air_date_year = String(y);
    return this;
  }

  // ---- certification (movie) ----
  certificationCountry(code: string): this {
    this.params.certification_country = code;
    return this;
  }
  certification(value: string): this {
    this.params.certification = value;
    return this;
  }

  // ---- movie-only release type: 1 Premiere, 2 Theatrical (limited), 3
  // Theatrical, 4 Digital, 5 Physical, 6 TV ----
  releaseType(types: IdList): this {
    this.params.with_release_type = joinIds(types, "or");
    return this;
  }

  // ---- TV-only odds and ends ----
  /** 0 Returning Series, 1 Planned, 2 In Production, 3 Ended, 4 Cancelled, 5 Pilot */
  status(values: IdList): this {
    this.params.with_status = joinIds(values, "or");
    return this;
  }
  /** 0 Documentary, 1 News, 2 Miniseries, 3 Reality, 4 Scripted, 5 Talk Show, 6 Video */
  type(values: IdList): this {
    this.params.with_type = joinIds(values, "or");
    return this;
  }
  screenedTheatrically(value = true): this {
    this.params.screened_theatrically = String(value);
    return this;
  }
  timezone(tz: string): this {
    this.params.timezone = tz;
    return this;
  }
  includeNullFirstAirDates(value = true): this {
    this.params.include_null_first_air_dates = String(value);
    return this;
  }

  // ---- terminal ----
  build(): Record<string, string> {
    return { ...this.params };
  }
  toQueryString(): string {
    return new URLSearchParams(this.params).toString();
  }
  toPath(): string {
    return `discover/${this.mediaType}?${this.toQueryString()}`;
  }
  clone(): DiscoverQueryBuilder {
    const copy = new DiscoverQueryBuilder(this.mediaType);
    copy.params = { ...this.params };
    return copy;
  }
  fetch<T = TmdbListResponse<TmdbItem>>(page?: number): Promise<T> {
    if (page) this.page(page);
    return fetchTmdb<T>(`discover/${this.mediaType}`, this.params);
  }
}

export const discoverMovies = (): DiscoverQueryBuilder => new DiscoverQueryBuilder("movie");
export const discoverSeries = (): DiscoverQueryBuilder => new DiscoverQueryBuilder("tv");
