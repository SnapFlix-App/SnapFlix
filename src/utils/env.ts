import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const DEFAULT_SUPABASE_URL = "https://rfmsstwvhuhsqlfgcnvg.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_fvvhJ8fmUdrl-8XYddycAw_nq_knozm";
const DEFAULT_GOOGLE_CLIENT_ID = "27939111339-1mr56p0dq211sa4p92s8n526do16gl1a.apps.googleusercontent.com";

export const env = createEnv({
  server: {
    PROTECTED_PATHS: z.string().default("/auth/reset-password,/profile"),
    SUPABASE_SERVICE_ROLE_KEY: z.string().default("dummy-service-role-key"),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().default(DEFAULT_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().default(DEFAULT_SUPABASE_ANON_KEY),
    NEXT_PUBLIC_CAPTCHA_SITE_KEY: z.string().default("dummy-captcha-key"),
    NEXT_PUBLIC_AVATAR_PROVIDER_URL: z
      .string()
      .default("https://api.dicebear.com/7.x/bottts/svg?seed="),
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().default(DEFAULT_GOOGLE_CLIENT_ID),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_CAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY,
    NEXT_PUBLIC_AVATAR_PROVIDER_URL: process.env.NEXT_PUBLIC_AVATAR_PROVIDER_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID,
  },
});
