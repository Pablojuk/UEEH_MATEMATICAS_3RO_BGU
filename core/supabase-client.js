// ═══════════════════════════════════════════════════════════════════════════
// Cliente Único de Supabase — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

/**
 * Cliente Supabase único y reutilizable para toda la plataforma UEEH.
 * Utiliza la Publishable Key pública y respeta Row Level Security (RLS).
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
