import { createBrowserClient } from "@supabase/ssr";
import { env } from "../env";
import { Database } from "./types";

const FALLBACK_SUPABASE_URL = "https://rfmsstwvhuhsqlfgcnvg.supabase.co";
const FALLBACK_SUPABASE_KEY = "sb_publishable_fvvhJ8fmUdrl-8XYddycAw_nq_knozm";

export function createClient() {
  const rawUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const url =
    rawUrl?.startsWith("http") &&
    !rawUrl.includes("your_supabase_url") &&
    !rawUrl.includes("placeholder.supabase.co")
      ? rawUrl
      : FALLBACK_SUPABASE_URL;
  const rawKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const key =
    rawKey && !rawKey.includes("placeholder") && !rawKey.includes("dummy")
      ? rawKey
      : FALLBACK_SUPABASE_KEY;

  return createBrowserClient<Database>(url, key);
}
