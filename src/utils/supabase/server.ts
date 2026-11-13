import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "../env";
import { Database } from "./types";

const FALLBACK_SUPABASE_URL = "https://rfmsstwvhuhsqlfgcnvg.supabase.co";
const FALLBACK_SUPABASE_KEY = "sb_publishable_fvvhJ8fmUdrl-8XYddycAw_nq_knozm";

export async function createClient(admin?: boolean) {
  const cookieStore = await cookies();

  const rawUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const url =
    rawUrl?.startsWith("http") &&
    !rawUrl.includes("your_supabase_url") &&
    !rawUrl.includes("placeholder.supabase.co")
      ? rawUrl
      : FALLBACK_SUPABASE_URL;

  const key = admin
    ? env.SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SUPABASE_KEY
    : (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.includes("placeholder"))
      ? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      : FALLBACK_SUPABASE_KEY;

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch (error) {
          console.error("Failed to set cookies:", error);
        }
      },
    },
  });
}
