import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://pablojuk.github.io"
];

const GENERIC_INVALID_CODE_MSG = "El código no es válido, ya fue utilizado o no está disponible.";
const CODE_REGEX = /^UEEH-(?:[0-9A-F]{4}-){5}[0-9A-F]{4}$/;

serve(async (req) => {
  const origin = req.headers.get("origin");

  // Validación estricta de CORS Origin: si hay Origin y no está en la allowlist -> 403
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ success: false, error: "Origen no permitido" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": origin || ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Sesión no encontrada" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // 1. Validar identidad del usuario desde el JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Sesión de usuario no válida o expirada" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ success: false, error: GENERIC_INVALID_CODE_MSG }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalización y validación estricta por Regex (formato real de 6 grupos hexadecimales UEEH-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX)
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length > 50 || !CODE_REGEX.test(cleanCode)) {
      return new Response(JSON.stringify({ success: false, error: GENERIC_INVALID_CODE_MSG }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Invocar la RPC pública con clave service_role
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data, error } = await serviceClient.rpc("claim_student_code", {
      p_user_id: user.id,
      p_code_text: cleanCode
    });

    if (error) {
      console.error("Error en RPC claim_student_code:", error.message);
      return new Response(JSON.stringify({ success: false, error: GENERIC_INVALID_CODE_MSG }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Excepción en Edge Function claim-student-code:", err);
    return new Response(JSON.stringify({ success: false, error: GENERIC_INVALID_CODE_MSG }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
