// ═══════════════════════════════════════════════════════════════════════════
// Configuración Central de Supabase — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

export const SUPABASE_URL = "https://fetfzizgkrdmocnlkgco.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Ydcq5guZJdArnwHjSPyNug_AnyfoGKC";

/**
 * Calcula la URL de redirección dinámica para OAuth 2.0.
 * Compatible tanto con GitHub Pages (/UEEH_MATEMATICAS_3RO_BGU/)
 * como con entornos de desarrollo local (localhost:5500, 127.0.0.1:5500).
 */
export function getOAuthRedirectUrl() {
  const origin = window.location.origin;
  let pathname = window.location.pathname;

  // Asegurar que el pathname termine en /
  if (!pathname.endsWith("/")) {
    // Si la ruta termina en index.html, remover index.html
    if (pathname.endsWith("/index.html")) {
      pathname = pathname.slice(0, -10);
    } else {
      pathname += "/";
    }
  }

  return origin + pathname;
}
