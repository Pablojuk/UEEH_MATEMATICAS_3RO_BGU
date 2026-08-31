// ═══════════════════════════════════════════════════════════════════════════
// Cliente Único de Supabase — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const SUPABASE_CLIENT_KEY = Symbol.for("ueeh.supabase.client");

/**
 * Cliente Supabase único y reutilizable para toda la plataforma UEEH.
 * Utiliza la Publishable Key pública y respeta Row Level Security (RLS).
 */
export const supabase = globalThis[SUPABASE_CLIENT_KEY] || (
  globalThis[SUPABASE_CLIENT_KEY] = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
);
