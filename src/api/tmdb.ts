import { TMDB } from "tmdb-ts";

const TMDB_API_PREFIX = "https://api.themoviedb.org/3";
const TMDB_MIRROR_PREFIX = "https://db.wecollege.net/3";

// Never read or bundle NEXT_PUBLIC_TMDB_ACCESS_TOKEN into client chunks.
// Browser calls go through /api/tmdb/...; server calls read Worker secrets at runtime.
const placeholderClientToken = "tmdb-proxy-client";

async function tmdbProxyFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  if (typeof window !== "undefined") {
    if (rawUrl.startsWith(TMDB_API_PREFIX)) {
      const proxiedUrl = `/api/tmdb${rawUrl.slice(TMDB_API_PREFIX.length)}`;
      const headers = new Headers(init?.headers);
      headers.delete("Authorization");
      return fetch(proxiedUrl, {
        ...init,
        headers,
      });
    }
    return fetch(input, init);
  }

  // Server-side execution: attach Worker secret / server env credentials and fallback to mirror if needed
  const publicFallbackKey = "NEXT_PUBLIC_TMDB_ACCESS_TOKEN";
  const serverBearer = (
    process.env.TMDB_ACCESS_TOKEN ||
    process.env.TMDB_API ||
    process.env[publicFallbackKey] ||
    ""
  ).trim();
  const serverApiKey = (process.env.TMDB_API_KEY || "").trim();

  if (rawUrl.startsWith(TMDB_API_PREFIX)) {
    const headers = new Headers(init?.headers);
    if (serverBearer) {
      headers.set("Authorization", `Bearer ${serverBearer}`);
    } else {
      headers.delete("Authorization");
    }

    const primaryUrl = new URL(rawUrl);
    if (!serverBearer && serverApiKey && !primaryUrl.searchParams.has("api_key")) {
      primaryUrl.searchParams.set("api_key", serverApiKey);
    }

    if (serverBearer || serverApiKey) {
      try {
        const res = await fetch(primaryUrl.toString(), { ...init, headers });
        if (res.ok || (res.status !== 401 && res.status !== 403 && res.status < 500)) {
          return res;
        }
      } catch {
        // Fall through to mirror
      }
    }

    const mirrorUrl = `${TMDB_MIRROR_PREFIX}${rawUrl.slice(TMDB_API_PREFIX.length)}`;
    return fetch(mirrorUrl, { ...init, headers });
  }

  return fetch(input, init);
}

export const tmdb = new TMDB(placeholderClientToken, { fetch: tmdbProxyFetch });
