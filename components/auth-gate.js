// ═══════════════════════════════════════════════════════════════════════════
// Auth Gate Component — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import { renderView, bindClick } from "../core/navigation.js";
import { loginWithGoogle, logout, getCurrentSession, getUserProfile, onAuthStateChange } from "../core/auth-service.js";
import { claimStudentCode } from "../core/admin-service.js";

const LOGO_URL = "./assets/img/logo-ueeh.png";
let globalOnAuthorizedCallback = null;

/**
 * Renderiza el estado de carga mientras se verifica la sesión en Supabase y el perfil.
 */
export function renderAuthLoadingView() {
  renderView(`
    <div class="min-h-screen bg-moodle-bg-light flex flex-col items-center justify-center p-4">
      <div class="bg-white rounded-3xl border border-neutral-200 shadow-xl p-8 max-w-md w-full text-center space-y-6">
        <div class="flex justify-center mb-2">
          <img src="${LOGO_URL}" alt="Logo UEEH" class="h-16 w-auto object-contain animate-pulse" />
        </div>
        <div class="space-y-2">
          <span class="text-[11px] font-bold tracking-widest text-moodle-text-gray uppercase">
            U.E. Emiliano Hinostroza
          </span>
          <h1 class="heading-font text-xl font-bold text-moodle-text-blue">
            Campus Matemático Digital · 3.º BGU
          </h1>
        </div>
        <div class="flex flex-col items-center justify-center py-4 space-y-3">
          <div class="w-10 h-10 border-4 border-moodle-orange/30 border-t-moodle-orange rounded-full animate-spin"></div>
          <p class="text-xs font-semibold text-moodle-text-gray tracking-wide">
            Verificando estado de sesión…
          </p>
        </div>
      </div>
    </div>
  `);
}

/**
 * Renderiza la pantalla de inicio de sesión integrada con el diseño del Campus UEEH.
 */
export function renderAuthLoginView() {
  renderView(`
    <div class="min-h-screen bg-neutral-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <!-- Decoración de fondo -->
      <div class="absolute -top-24 -right-24 w-96 h-96 bg-moodle-orange/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Cabecera -->
      <header class="w-full max-w-5xl mx-auto flex items-center justify-between py-2 z-10">
        <div class="flex items-center gap-3">
          <img src="${LOGO_URL}" alt="Logo UEEH" class="h-12 w-auto object-contain" />
          <div class="flex flex-col">
            <span class="text-[10px] font-bold tracking-widest text-moodle-text-gray uppercase">
              Unidad Educativa Emiliano Hinostroza
            </span>
            <span class="heading-font text-base font-bold text-moodle-text-blue">
              Campus Matemático Digital
            </span>
          </div>
        </div>
      </header>

      <!-- Tarjeta principal de Login -->
      <main class="w-full max-w-md mx-auto my-auto py-8 z-10">
        <div class="bg-white rounded-3xl border border-neutral-200/80 shadow-2xl p-6 sm:p-8 space-y-7">
          <div class="text-center space-y-2">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-moodle-orange/10 text-moodle-orange text-xs font-bold tracking-wide">
              <span>🎓</span> Portal de Estudiantes 3.º BGU
            </div>
            <h2 class="hero-font text-2xl sm:text-3xl font-bold text-moodle-text-blue leading-tight pt-1">
              Bienvenido al Saber
            </h2>
            <p class="text-xs sm:text-sm text-moodle-text-gray leading-relaxed max-w-xs mx-auto">
              Inicia sesión con tu cuenta de Google para acceder a las actividades educativas, lecciones y retos.
            </p>
          </div>

          <!-- Botón de Google OAuth -->
          <div class="space-y-4 pt-2">
            <button id="btn-google-login"
                    class="w-full min-h-[52px] bg-white hover:bg-neutral-50 active:bg-neutral-100 text-moodle-text-blue font-semibold border-2 border-neutral-200 rounded-2xl px-5 py-3 flex items-center justify-center gap-3.5 shadow-sm hover:shadow-md transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-moodle-orange">
              <svg class="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24" width="24" height="24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span class="text-sm tracking-wide">Continuar con Google</span>
            </button>

            <div id="login-error-message" class="hidden rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 text-center font-medium">
            </div>
          </div>

          <!-- Mensaje de pie sobre seguridad -->
          <div class="border-t border-neutral-100 pt-4 text-center">
            <p class="text-[11px] text-moodle-text-gray leading-snug">
              🔒 Autenticación segura integrada con Supabase Auth & OAuth 2.0
            </p>
          </div>
        </div>
      </main>

      <!-- Pie de página -->
      <footer class="w-full max-w-5xl mx-auto text-center py-2 text-[11px] text-moodle-text-gray">
        © Unidad Educativa Emiliano Hinostroza — Todos los derechos reservados.
      </footer>
    </div>
  `);

  bindClick("#btn-google-login", async () => {
    const errorEl = document.getElementById("login-error-message");
    if (errorEl) errorEl.classList.add("hidden");

    try {
      await loginWithGoogle();
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = "No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.";
        errorEl.classList.remove("hidden");
      }
    }
  });
}

/**
 * Renderiza la pantalla para usuarios autenticados cuyo perfil es `unlinked`.
 */
export function renderAuthUnlinkedView(user, profile) {
  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email || "Estudiante";

  renderView(`
    <div class="min-h-screen bg-neutral-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <!-- Cabecera -->
      <header class="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <div class="flex items-center gap-3">
          <img src="${LOGO_URL}" alt="Logo UEEH" class="h-12 w-auto object-contain" />
          <div class="flex flex-col">
            <span class="text-[10px] font-bold tracking-widest text-moodle-text-gray uppercase">
              U.E. Emiliano Hinostroza
            </span>
            <span class="heading-font text-base font-bold text-moodle-text-blue">
              Campus Matemático Digital
            </span>
          </div>
        </div>
      </header>

      <!-- Tarjeta Unlinked -->
      <main class="w-full max-w-lg mx-auto my-auto py-6 z-10">
        <div class="bg-white rounded-3xl border border-neutral-200/80 shadow-2xl p-6 sm:p-8 space-y-6">
          <div class="text-center space-y-2">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
              <span>⚠️</span> Cuenta Autenticada — Vinculación Pendiente
            </div>
            <h2 class="hero-font text-2xl font-bold text-moodle-text-blue">
              ¡Hola, ${displayName}!
            </h2>
            <p class="text-xs text-moodle-text-gray">
              Identificador de cuenta: <code class="bg-neutral-100 px-1.5 py-0.5 rounded text-[11px] text-neutral-700">${user?.email || user?.id}</code>
            </p>
          </div>

          <!-- Formulario de Canje de Código de Activación -->
          <div class="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/80 p-5 space-y-4 shadow-sm">
            <div class="space-y-1">
              <h3 class="heading-font text-sm font-bold text-purple-900 flex items-center gap-2">
                <span>🔑</span> Ingrese su Código de Activación
              </h3>
              <p class="text-xs text-purple-800/80 leading-relaxed">
                Ingresa el código individual de 1 solo uso entregado por tu docente para vincular tu estudiante oficial de <strong>3.º BGU</strong>.
              </p>
            </div>

            <form id="form-claim-code" class="space-y-3">
              <div>
                <input type="text" id="input-claim-code" placeholder="UEEH-XXXX-XXXX-XXXX-XXXX" required
                       class="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-purple-950 uppercase placeholder:font-sans placeholder:font-normal placeholder:text-neutral-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20" />
              </div>

              <div id="claim-feedback-msg" class="hidden p-3 rounded-xl text-xs font-bold text-center"></div>

              <button type="submit" id="btn-submit-claim"
                      class="w-full min-h-[46px] bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold rounded-xl px-4 py-2.5 text-sm transition-colors duration-200 flex items-center justify-center gap-2 shadow-md">
                <span>✨</span> Vincular Cuenta de Estudiante
              </button>
            </form>
          </div>

          <!-- Nota de Seguridad -->
          <div class="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-[11px] text-moodle-text-gray space-y-1">
            <p class="font-bold text-moodle-text-blue">🔒 Validación de Seguridad Servidor:</p>
            <p>La verificación del código se procesa mediante firma digital en servidor PostgreSQL con limitación de tasa de intentos.</p>
          </div>

          <!-- Botón de Logout -->
          <div class="pt-2">
            <button id="btn-unlinked-logout"
                    class="w-full min-h-[46px] bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-moodle-text-blue font-bold rounded-xl px-4 py-2.5 text-sm transition-colors duration-200 flex items-center justify-center gap-2">
              <span>🚪</span> Cerrar sesión
            </button>
          </div>
        </div>
      </main>

      <footer class="w-full max-w-5xl mx-auto text-center py-2 text-[11px] text-moodle-text-gray">
        © Unidad Educativa Emiliano Hinostroza
      </footer>
    </div>
  `);

  bindClick("#btn-unlinked-logout", async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Error cerrando sesión:", err);
    }
  });

  const form = document.getElementById("form-claim-code");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("input-claim-code");
    const feedback = document.getElementById("claim-feedback-msg");
    const btn = document.getElementById("btn-submit-claim");

    const code = input?.value?.trim();
    if (!code) return;

    if (feedback) feedback.className = "hidden";
    if (btn) btn.disabled = true;

    try {
      const res = await claimStudentCode(code);

      if (res.success) {
        if (feedback) {
          feedback.textContent = `¡Excelente! Bienvenido ${res.student_name}. Ingresando al Campus…`;
          feedback.className = "p-3 rounded-xl text-xs font-bold text-center bg-emerald-100 text-emerald-800 border border-emerald-300";
        }
        setTimeout(async () => {
          const session = await getCurrentSession();
          if (globalOnAuthorizedCallback && session) {
            const freshProfile = await getUserProfile(session.user.id);
            if (freshProfile && (freshProfile.role === "student" || freshProfile.role === "admin")) {
              globalOnAuthorizedCallback(session.user, freshProfile);
            }
          }
        }, 1200);
      } else {
        if (feedback) {
          feedback.textContent = res.error || "No se pudo validar el código.";
          feedback.className = "p-3 rounded-xl text-xs font-bold text-center bg-red-50 text-red-700 border border-red-200";
        }
      }
    } catch (err) {
      if (feedback) {
        feedback.textContent = err.message || "Error al procesar el código.";
        feedback.className = "p-3 rounded-xl text-xs font-bold text-center bg-red-50 text-red-700 border border-red-200";
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

/**
 * Renderiza la pantalla para estudiantes cuya cuenta institucional está inactiva.
 */
export function renderAuthInactiveView(user) {
  renderView(`
    <div class="min-h-screen bg-neutral-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <div class="w-full max-w-md mx-auto my-auto py-8 z-10">
        <div class="bg-white rounded-3xl border border-amber-200/80 shadow-2xl p-6 sm:p-8 space-y-6 text-center">
          <div class="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            ⚠️
          </div>
          <div class="space-y-2">
            <h2 class="heading-font text-2xl font-bold text-moodle-text-blue">
              Cuenta Académica Inactiva
            </h2>
            <p class="text-xs sm:text-sm text-moodle-text-gray leading-relaxed">
              Tu cuenta de estudiante se encuentra inactiva en la plataforma. Por favor contacta al docente o administrador institucional para solicitar su reactivación.
            </p>
          </div>
          <div class="pt-4 border-t border-neutral-100">
            <button id="btn-inactive-logout" class="w-full py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-moodle-text-blue font-bold text-xs transition-colors">
              🚪 Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  `);

  bindClick("#btn-inactive-logout", () => logout());
}

/**
 * Inicializa la puerta de autenticación centralizada y escucha cambios de sesión.
 */
export async function initAuthGate(onAuthorized) {
  globalOnAuthorizedCallback = onAuthorized;
  renderAuthLoadingView();

  let currentHandledUserId = null;

  const handleStateChange = async (session, forceRefresh = false) => {
    if (!session) {
      currentHandledUserId = null;
      renderAuthLoginView();
      return;
    }

    const userId = session.user.id;

    if (currentHandledUserId === userId && !forceRefresh) {
      return;
    }

    const profile = await getUserProfile(userId);

    if (!profile || profile.role === "unlinked") {
      currentHandledUserId = userId;
      renderAuthUnlinkedView(session.user, profile);
      return;
    }

    if (profile.role === "student") {
      const { data: studentRecord } = await supabase
        .from("students")
        .select("status")
        .eq("linked_user_id", userId)
        .maybeSingle();

      if (studentRecord && studentRecord.status === "inactive") {
        currentHandledUserId = userId;
        renderAuthInactiveView(session.user);
        return;
      }

      currentHandledUserId = userId;
      if (typeof onAuthorized === "function") {
        onAuthorized(session.user, profile);
      }
    } else if (profile.role === "admin") {
      currentHandledUserId = userId;
      if (typeof onAuthorized === "function") {
        onAuthorized(session.user, profile);
      }
    } else {
      currentHandledUserId = userId;
      renderAuthUnlinkedView(session.user, profile);
    }
  };

  const session = await getCurrentSession();
  await handleStateChange(session);

  onAuthStateChange(async (event, currentSession) => {
    if (event === "SIGNED_OUT" || !currentSession) {
      currentHandledUserId = null;
      sessionStorage.removeItem("ueeh_active_view");
      renderAuthLoginView();
    } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
      const isNewUser = !currentHandledUserId || currentHandledUserId !== currentSession.user.id;
      await handleStateChange(currentSession, isNewUser);
    }
  });
}

