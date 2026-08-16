// ═══════════════════════════════════════════════════════════════════════════
// Servicio de Autenticación Supabase — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from "./supabase-client.js";
import { getOAuthRedirectUrl } from "./supabase-config.js";

/**
 * Inicia sesión con el proveedor de Google OAuth 2.0.
 */
export async function loginWithGoogle() {
  const redirectTo = getOAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo
    }
  });

  if (error) {
    console.error("Error al iniciar sesión con Google:", error.message);
    throw error;
  }

  return data;
}

/**
 * Cierra la sesión activa del usuario.
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error al cerrar sesión en Supabase:", error.message);
    throw error;
  }
}

/**
 * Obtiene la sesión activa actual.
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error al recuperar sesión:", error.message);
    return null;
  }
  return data.session;
}

/**
 * Suscribe un callback a los cambios en el estado de autenticación.
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    callback(event, session);
  });
}

/**
 * Consulta el perfil del usuario en public.profiles seleccionando únicamente
 * las columnas necesarias (id, display_name, role).
 *
 * Incluye reintentos breves controlados para solucionar la condición de carrera
 * producida mientras el trigger backend crea la fila tras el primer OAuth.
 */
export async function getUserProfile(userId, retries = 3, delayMs = 600) {
  if (!userId) return null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error(`Intento ${attempt + 1}: Error al consultar perfil:`, error.message);
      } else if (data) {
        return data;
      }
    } catch (err) {
      console.error(`Intento ${attempt + 1}: Excepción al consultar perfil:`, err);
    }

    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
}
