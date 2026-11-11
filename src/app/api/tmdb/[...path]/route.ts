import { NextRequest, NextResponse } from "next/server";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_MIRROR_BASE = "https://db.wecollege.net/3";

function getTmdbCredentials() {
  const bearer = (
    process.env.TMDB_ACCESS_TOKEN ||
    process.env.TMDB_API ||
    process.env.NEXT_PUBLIC_TMDB_ACCESS_TOKEN ||
    ""
  ).trim();
  const apiKey = (process.env.TMDB_API_KEY || "").trim();
  return { bearer, apiKey };
}

async function fetchFromBase(
  baseUrl: string,
  path: string,
  searchParams: URLSearchParams,
  creds: { bearer: string; apiKey: string },
  acceptHeader: string,
) {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`);
  searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  if (!creds.bearer && creds.apiKey && !url.searchParams.has("api_key")) {
    url.searchParams.set("api_key", creds.apiKey);
  }

  const headers: Record<string, string> = {
    Accept: acceptHeader || "application/json",
  };
  if (creds.bearer) {
    headers.Authorization = `Bearer ${creds.bearer}`;
  }

  return fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } },
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const pathSegments = resolvedParams?.path || [];
    const subPath = pathSegments.join("/");

    if (!subPath) {
      return NextResponse.json({ error: "Missing TMDB path" }, { status: 400 });
    }

    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const creds = getTmdbCredentials();
    const acceptHeader = request.headers.get("accept") || "application/json";

    let response: Response | null = null;

    if (creds.bearer || creds.apiKey) {
      try {
        const primaryRes = await fetchFromBase(
          TMDB_API_BASE,
          subPath,
          searchParams,
          creds,
          acceptHeader,
        );
        if (primaryRes.ok) {
          response = primaryRes;
        } else if (primaryRes.status !== 401 && primaryRes.status !== 403 && primaryRes.status < 500) {
          response = primaryRes;
        }
      } catch {
        // Fall through to mirror
      }
    }

    if (!response) {
      response = await fetchFromBase(
        TMDB_MIRROR_BASE,
        subPath,
        searchParams,
        creds,
        acceptHeader,
      );
    }

    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": response.ok
          ? "public, s-maxage=600, stale-while-revalidate=3600"
          : "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "TMDB proxy request failed", details: String(err) },
      { status: 500 },
    );
  }
}

