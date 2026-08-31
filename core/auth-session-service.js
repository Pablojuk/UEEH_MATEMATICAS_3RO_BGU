// ═══════════════════════════════════════════════════════════════════════════
// Sesión autenticada vigente — servicio puro y compartido
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_EXPIRY_SKEW_SECONDS = 30;

export function isSessionTokenExpired(session, nowMs = Date.now(), skewSeconds = DEFAULT_EXPIRY_SKEW_SECONDS) {
  if (!session || typeof session.expires_at !== "number") return false;
  return session.expires_at <= Math.floor(nowMs / 1000) + skewSeconds;
}

/**
 * Obtiene la sesión actual, renueva únicamente si el JWT está vencido o a
 * punto de vencer y valida la sesión contra Supabase Auth antes de usarla.
 * Nunca devuelve ni persiste tokens fuera del objeto Session de supabase-js.
 */
export async function getCurrentValidSession(auth, options = {}) {
  const now = typeof options.now === "function" ? options.now : Date.now;
  const skewSeconds = Number.isFinite(options.skewSeconds)
    ? options.skewSeconds
    : DEFAULT_EXPIRY_SKEW_SECONDS;

  const { data: sessionData, error: sessionError } = await auth.getSession();
  let session = sessionData?.session || null;

  if (sessionError || !session) {
    return { session: null, user: null, refreshed: false, error: sessionError || new Error("SESSION_MISSING") };
  }

  let refreshed = false;
  if (isSessionTokenExpired(session, now(), skewSeconds)) {
    const { data: refreshData, error: refreshError } = await auth.refreshSession();
    session = refreshData?.session || null;
    if (refreshError || !session) {
      return { session: null, user: null, refreshed: false, error: refreshError || new Error("SESSION_REFRESH_FAILED") };
    }
    refreshed = true;
  }

  const { data: userData, error: userError } = await auth.getUser(session.access_token);
  const user = userData?.user || null;
  if (userError || !user || user.id !== session.user?.id) {
    return { session: null, user: null, refreshed, error: userError || new Error("SESSION_USER_MISMATCH") };
  }

  return { session, user, refreshed, error: null };
}
