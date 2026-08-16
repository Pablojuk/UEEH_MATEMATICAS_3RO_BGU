import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://pablojuk.github.io"
];

const GENERIC_ADMIN_ERROR = "No se pudo completar la operación administrativa.";
const MAX_ADMIN_PAYLOAD_BYTES = 65536; // 64 KB limit
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVITY_KEY_REGEX = /^[a-z0-9-]+$/;

serve(async (req) => {
  const origin = req.headers.get("origin");

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
    // 0. Validar cabecera y acumulador streaming de tamaño del payload
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_ADMIN_PAYLOAD_BYTES) {
      return new Response(JSON.stringify({ success: false, error: "Payload administrativo demasiado grande" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > MAX_ADMIN_PAYLOAD_BYTES) {
            await reader.cancel();
            return new Response(JSON.stringify({ success: false, error: "Payload administrativo demasiado grande" }), {
              status: 413,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          chunks.push(value);
        }
      }
    }

    const rawBuffer = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      rawBuffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // 1. Validar JWT de usuario
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Sesión no válida o expirada" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verificar rol Admin en tabla profiles
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: profile, error: profError } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profError || !profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ success: false, error: "Acceso denegado: Se requieren permisos administrativos" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Procesar acción administrativa
    const bodyText = new TextDecoder().decode(rawBuffer);
    const body = JSON.parse(bodyText);
    const { action, payload } = body;

    // --- ACCIÓN: DASHBOARD SUMMARY (Contrato completo con backward compatibility) ---
    if (action === "dashboard_summary") {
      const { count: studentsCount } = await serviceClient.from("students").select("*", { count: "exact", head: true });
      const { count: linkedCount } = await serviceClient.from("students").select("*", { count: "exact", head: true }).not("linked_user_id", "is", null);

      const nowIso = new Date().toISOString();
      const { count: activeCodesCount } = await serviceClient
        .from("student_claim_codes")
        .select("*", { count: "exact", head: true })
        .is("used_at", null)
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

      const { count: enrollmentsCount } = await serviceClient.from("enrollments").select("*", { count: "exact", head: true }).eq("status", "active");

      const { data: activeYear } = await serviceClient
        .from("academic_years")
        .select("id, name")
        .eq("is_active", true)
        .maybeSingle();

      return new Response(JSON.stringify({
        success: true,
        data: {
          activeYear: activeYear?.name || "Sin año activo",
          activeYearId: activeYear?.id || null,
          totalStudents: studentsCount || 0,
          linkedStudents: linkedCount || 0,
          pendingStudents: (studentsCount || 0) - (linkedCount || 0),
          activeCodes: activeCodesCount || 0,
          totalEnrollments: enrollmentsCount || 0,
          activeEnrollments: enrollmentsCount || 0
        }
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- ACCIÓN: STUDENTS ADMIN LIST & DETAIL (Robust code_status agrupado) ---
    if (action === "students_admin_list" || action === "student_admin_detail") {
      const targetStudentId = payload?.student_id || payload?.id;

      // Si se solicita el detalle de un estudiante específico
      if (targetStudentId) {
        if (!UUID_REGEX.test(targetStudentId)) {
          return new Response(JSON.stringify({ success: false, error: "ID de estudiante no válido" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const { data: student, error: stErr } = await serviceClient
          .from("students")
          .select(`
            id,
            student_code,
            official_full_name,
            status,
            linked_user_id,
            created_at,
            enrollments (
              id,
              status,
              enrolled_at,
              class_sections (
                id,
                grade_number,
                education_level,
                parallel,
                academic_years ( id, name, is_active )
              )
            )
          `)
          .eq("id", targetStudentId)
          .single();

        if (stErr || !student) throw new Error("STUDENT_NOT_FOUND");

        // Consultar historial de códigos para evaluar code_status exacto
        const { data: studentCodes } = await serviceClient
          .from("student_claim_codes")
          .select("id, used_at, revoked_at, expires_at, created_at")
          .eq("student_id", targetStudentId)
          .order("created_at", { ascending: false });

        const now = new Date();
        let codeStatus = "no_code";
        if (student.linked_user_id) {
          codeStatus = "used";
        } else if (studentCodes && studentCodes.length > 0) {
          const hasActiveCode = studentCodes.some(c => !c.used_at && !c.revoked_at && (!c.expires_at || new Date(c.expires_at) > now));
          const hasUsedCode = studentCodes.some(c => !!c.used_at);
          if (hasActiveCode) codeStatus = "active";
          else if (hasUsedCode) codeStatus = "used";
          else codeStatus = "revoked";
        }

        // Consultar historial de cuenta
        const { data: history } = await serviceClient
          .from("student_account_history")
          .select("id, event_type, details, created_at")
          .eq("student_id", targetStudentId)
          .order("created_at", { ascending: false });

        const activeEnc = (student.enrollments || []).find((e: any) => e.status === "active");
        const rawSec = activeEnc?.class_sections;
        const sec: any = Array.isArray(rawSec) ? rawSec[0] : rawSec;

        return new Response(JSON.stringify({
          success: true,
          data: {
            id: student.id,
            student_code: student.student_code,
            official_full_name: student.official_full_name,
            status: student.status,
            is_linked: !!student.linked_user_id,
            grade: sec ? `${sec.grade_number}.º ${sec.education_level || "BGU"}` : "N/A",
            parallel: sec?.parallel || "N/A",
            year_name: sec?.academic_years?.name || "N/A",
            code_status: codeStatus,
            created_at: student.created_at,
            enrollments: student.enrollments || [],
            history: history || []
          }
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Listado general de estudiantes
      let query = serviceClient
        .from("students")
        .select(`
          id,
          student_code,
          official_full_name,
          status,
          linked_user_id,
          created_at,
          enrollments (
            status,
            class_sections (
              grade_number,
              education_level,
              parallel,
              academic_years ( name )
            )
          )
        `)
        .order("official_full_name", { ascending: true });

      if (payload?.status) {
        query = query.eq("status", payload.status);
      }

      const { data: students, error: stErr } = await query;
      if (stErr) throw new Error("ADMIN_FETCH_STUDENTS_FAILED");

      // Consultar TODOS los códigos agrupados por student_id para no depender del orden
      const { data: allCodes } = await serviceClient
        .from("student_claim_codes")
        .select("student_id, used_at, revoked_at, expires_at");

      const codesByStudent = new Map<string, any[]>();
      for (const c of allCodes || []) {
        const arr = codesByStudent.get(c.student_id) || [];
        arr.push(c);
        codesByStudent.set(c.student_id, arr);
      }

      const now = new Date();
      let sanitizedStudents = (students || []).map((s: any) => {
        const activeEnc = (s.enrollments || []).find((e: any) => e.status === "active");
        const rawSec = activeEnc?.class_sections;
        const sec: any = Array.isArray(rawSec) ? rawSec[0] : rawSec;

        const studentCodes = codesByStudent.get(s.id) || [];
        let code_status = "no_code";

        if (s.linked_user_id) {
          code_status = "used";
        } else if (studentCodes.length > 0) {
          const hasActiveCode = studentCodes.some(c => !c.used_at && !c.revoked_at && (!c.expires_at || new Date(c.expires_at) > now));
          const hasUsedCode = studentCodes.some(c => !!c.used_at);
          if (hasActiveCode) code_status = "active";
          else if (hasUsedCode) code_status = "used";
          else code_status = "revoked";
        }

        return {
          id: s.id,
          student_code: s.student_code,
          official_full_name: s.official_full_name,
          status: s.status,
          is_linked: !!s.linked_user_id, // Retorna boolean, sin exponer UUID
          grade: sec ? `${sec.grade_number}.º ${sec.education_level || "BGU"}` : "N/A",
          parallel: sec?.parallel || "N/A",
          year_name: sec?.academic_years?.name || "N/A",
          code_status: code_status,
          created_at: s.created_at
        };
      });

      if (payload?.search && typeof payload.search === "string" && payload.search.trim().length > 0) {
        const searchLow = payload.search.toLowerCase().trim();
        sanitizedStudents = sanitizedStudents.filter(s =>
          s.official_full_name.toLowerCase().includes(searchLow) ||
          s.student_code.toLowerCase().includes(searchLow)
        );
      }

      return new Response(JSON.stringify({ success: true, data: sanitizedStudents }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- ACCIÓN: ACTIVITIES ADMIN LIST (Excluye grading_config) ---
    if (action === "activities_admin_list") {
      const { data: activities, error: actErr } = await serviceClient
        .from("activities")
        .select(`
          id,
          activity_key,
          title,
          activity_type,
          unit_number,
          max_score,
          minimum_score,
          source_path,
          display_order,
          is_active,
          opens_at,
          due_at,
          created_at,
          updated_at,
          class_sections (
            id,
            grade_number,
            education_level,
            parallel,
            academic_years ( id, name, is_active )
          ),
          academic_terms ( id, term_number, name )
        `)
        .order("unit_number", { ascending: true })
        .order("display_order", { ascending: true });

      if (actErr) throw new Error("ADMIN_FETCH_ACTIVITIES_FAILED");

      // Consultar contadores agregados por actividad
      const { data: attempts } = await serviceClient.from("activity_attempts").select("activity_id");
      const { data: results } = await serviceClient.from("activity_results").select("activity_id, result_status");

      const attemptCountMap = new Map();
      for (const att of attempts || []) {
        attemptCountMap.set(att.activity_id, (attemptCountMap.get(att.activity_id) || 0) + 1);
      }

      const resultMap = new Map();
      for (const res of results || []) {
        const curr = resultMap.get(res.activity_id) || { total: 0, completed: 0, not_submitted: 0 };
        curr.total++;
        if (res.result_status === "completed") curr.completed++;
        if (res.result_status === "not_submitted") curr.not_submitted++;
        resultMap.set(res.activity_id, curr);
      }

      const formattedActivities = (activities || []).map((a: any) => {
        const sec = a.class_sections;
        const term = a.academic_terms;
        const resStats = resultMap.get(a.id) || { total: 0, completed: 0, not_submitted: 0 };

        return {
          id: a.id,
          activity_key: a.activity_key,
          title: a.title,
          activity_type: a.activity_type,
          unit_number: a.unit_number,
          max_score: Number(a.max_score),
          minimum_score: Number(a.minimum_score),
          source_path: a.source_path,
          display_order: a.display_order,
          is_active: a.is_active,
          opens_at: a.opens_at,
          due_at: a.due_at,
          created_at: a.created_at,
          updated_at: a.updated_at,
          class_section_id: sec?.id,
          section_name: sec ? `${sec.grade_number}.º ${sec.education_level || "BGU"} - Paralelo ${sec.parallel}` : "N/A",
          academic_year_id: sec?.academic_years?.id,
          academic_year_name: sec?.academic_years?.name || "N/A",
          academic_term_id: term?.id,
          academic_term_name: term ? `${term.term_number}.º Trimestre (${term.name})` : "N/A",
          attempts_count: attemptCountMap.get(a.id) || 0,
          results_count: resStats.total,
          completed_count: resStats.completed,
          not_submitted_count: resStats.not_submitted
        };
      });

      return new Response(JSON.stringify({ success: true, data: formattedActivities }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- ACCIÓN: ACTIVITY ADMIN DETAIL ---
    if (action === "activity_admin_detail") {
      const activity_id = payload?.activity_id || payload?.id;
      if (!activity_id || !UUID_REGEX.test(activity_id)) {
        return new Response(JSON.stringify({ success: false, error: "ID de actividad no válido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: activity, error: actErr } = await serviceClient
        .from("activities")
        .select(`
          *,
          class_sections (
            id,
            grade_number,
            education_level,
            parallel,
            academic_year_id,
            academic_years ( id, name, is_active )
          ),
          academic_terms ( id, term_number, name )
        `)
        .eq("id", activity_id)
        .single();

      if (actErr || !activity) throw new Error("ACTIVITY_NOT_FOUND");

      const { data: cfgData } = await serviceClient
        .rpc("get_activity_grading_config", { p_activity_id: activity_id });

      const { count: attemptsCount } = await serviceClient
        .from("activity_attempts")
        .select("*", { count: "exact", head: true })
        .eq("activity_id", activity_id);

      const { count: completedCount } = await serviceClient
        .from("activity_results")
        .select("*", { count: "exact", head: true })
        .eq("activity_id", activity_id)
        .eq("result_status", "completed");

      return new Response(JSON.stringify({
        success: true,
        data: {
          ...activity,
          grader_type: cfgData?.grader_type || "auto_mcq",
          grading_config: cfgData?.config || { answers: {} },
          has_history: (attemptsCount || 0) > 0 || (completedCount || 0) > 0
        }
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- ACCIÓN: UPSERT ACTIVITY (Validaciones estrictas de entrada) ---
    if (action === "upsert_activity" || action === "admin_upsert_activity") {
      const {
        id: actId,
        activity_key,
        title,
        activity_type,
        class_section_id,
        academic_term_id,
        unit_number,
        max_score,
        minimum_score,
        source_path,
        display_order,
        is_active,
        opens_at,
        due_at,
        grader_type,
        grading_config
      } = payload || {};

      if (actId && !UUID_REGEX.test(actId)) {
        return new Response(JSON.stringify({ success: false, error: "ID de actividad no válido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!activity_key || typeof activity_key !== "string" || !ACTIVITY_KEY_REGEX.test(activity_key.trim())) {
        return new Response(JSON.stringify({ success: false, error: "Clave de actividad no válida (solo minúsculas, números y guiones)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return new Response(JSON.stringify({ success: false, error: "Título de la actividad requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!class_section_id || !UUID_REGEX.test(class_section_id) || !academic_term_id || !UUID_REGEX.test(academic_term_id)) {
        return new Response(JSON.stringify({ success: false, error: "Sección de clase o periodo académico no válido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!unit_number || unit_number < 5) {
        return new Response(JSON.stringify({ success: false, error: "El número de unidad debe ser >= 5" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!max_score || max_score <= 0 || !minimum_score || minimum_score <= 0 || minimum_score > max_score) {
        return new Response(JSON.stringify({ success: false, error: "Notas no válidas: Se exige minimum_score > 0 y <= max_score" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Validar source_path seguro
      if (source_path && typeof source_path === "string") {
        const cleanPath = source_path.trim();
        if (cleanPath.includes("..") || /^(https?:\/\/|javascript:|data:|\/\/)/i.test(cleanPath)) {
          return new Response(JSON.stringify({ success: false, error: "Ruta de origen (source_path) no válida o insegura" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      if (opens_at && due_at && new Date(due_at) <= new Date(opens_at)) {
        return new Response(JSON.stringify({ success: false, error: "La fecha de cierre debe ser posterior a la fecha de apertura" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: rpcRes, error: rpcErr } = await serviceClient.rpc("admin_upsert_activity", {
        p_admin_user_id: user.id,
        p_activity_id: actId || null,
        p_activity_key: activity_key.trim(),
        p_title: title.trim(),
        p_activity_type: activity_type || "gamification",
        p_class_section_id: class_section_id,
        p_academic_term_id: academic_term_id,
        p_unit_number: Number(unit_number),
        p_max_score: Number(max_score),
        p_minimum_score: Number(minimum_score),
        p_source_path: source_path ? source_path.trim() : null,
        p_display_order: Number(display_order || 1),
        p_is_active: is_active ?? true,
        p_opens_at: opens_at ? new Date(opens_at).toISOString() : null,
        p_due_at: due_at ? new Date(due_at).toISOString() : null,
        p_grader_type: grader_type || "auto_mcq",
        p_grading_config: grading_config || { answers: {} }
      });

      if (rpcErr || !rpcRes) {
        console.error("Error RPC admin_upsert_activity:", rpcErr);
        throw new Error("ADMIN_OPERATION_FAILED");
      }

      return new Response(JSON.stringify({ success: true, data: rpcRes }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- ACCIÓN: SET ACTIVITY ACTIVE ---
    if (action === "set_activity_active" || action === "admin_set_activity_active") {
      const { activity_id, is_active } = payload || {};
      if (!activity_id || !UUID_REGEX.test(activity_id)) {
        return new Response(JSON.stringify({ success: false, error: "ID de actividad no válido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: rpcRes, error: rpcErr } = await serviceClient.rpc("admin_set_activity_active", {
        p_admin_user_id: user.id,
        p_activity_id: activity_id,
        p_is_active: !!is_active
      });

      if (rpcErr || !rpcRes) {
        console.error("Error RPC admin_set_activity_active:", rpcErr);
        throw new Error("ADMIN_OPERATION_FAILED");
      }

      return new Response(JSON.stringify({ success: true, data: rpcRes }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- ACCIÓN: REOPEN ACTIVITY ---
    if (action === "reopen_activity" || action === "admin_reopen_activity") {
      const { activity_id, new_due_at } = payload || {};
      if (!activity_id || !UUID_REGEX.test(activity_id)) {
        return new Response(JSON.stringify({ success: false, error: "ID de actividad no válido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!new_due_at || new Date(new_due_at) <= new Date()) {
        return new Response(JSON.stringify({ success: false, error: "La nueva fecha de cierre debe ser posterior a la hora actual" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: rpcRes, error: rpcErr } = await serviceClient.rpc("admin_reopen_activity", {
        p_admin_user_id: user.id,
        p_activity_id: activity_id,
        p_new_due_at: new Date(new_due_at).toISOString()
      });

      if (rpcErr || !rpcRes) {
        console.error("Error RPC admin_reopen_activity:", rpcErr);
        throw new Error("ADMIN_OPERATION_FAILED");
      }

      return new Response(JSON.stringify({ success: true, data: rpcRes }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- ACCIÓN: GRADEBOOK DATA ---
    if (action === "gradebook_data" || action === "admin_get_gradebook_data") {
      const { data: rpcRes, error: rpcErr } = await serviceClient.rpc("admin_get_gradebook_data", {
        p_admin_user_id: user.id
      });

      if (rpcErr || !rpcRes) {
        console.error("Error RPC admin_get_gradebook_data:", rpcErr);
        throw new Error("ADMIN_OPERATION_FAILED");
      }

      return new Response(JSON.stringify({ success: true, data: rpcRes }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- ALIASES RESTAURADOS PARA ESTUDIANTES ---
    if (action === "create_student" || action === "admin_create_student") {
      const { data: rpcRes, error: rpcErr } = await serviceClient.rpc("admin_create_student", {
        p_admin_user_id: user.id,
        p_full_name: payload.official_full_name || payload.p_full_name,
        p_class_section_id: payload.class_section_id || payload.p_class_section_id,
        p_auto_enroll: payload.auto_enroll !== false,
        p_auto_generate_code: payload.auto_generate_code !== false,
        p_confirm_homonym: payload.confirm_homonym || false
      });
      if (rpcErr || !rpcRes) throw new Error("ADMIN_OPERATION_FAILED");
      return new Response(JSON.stringify({ success: true, data: rpcRes }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "generate_claim_code" || action === "admin_generate_claim_code") {
      const { data: rpcRes, error: rpcErr } = await serviceClient.rpc("admin_generate_claim_code", {
        p_admin_user_id: user.id,
        p_student_id: payload.student_id || payload.p_student_id
      });
      if (rpcErr || !rpcRes) throw new Error("ADMIN_OPERATION_FAILED");
      return new Response(JSON.stringify({ success: true, data: rpcRes }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reset_access" || action === "admin_reset_student_access") {
      const { data: rpcRes, error: rpcErr } = await serviceClient.rpc("admin_reset_student_access", {
        p_admin_user_id: user.id,
        p_student_id: payload.student_id || payload.p_student_id,
        p_reason: payload.reason || "Restablecimiento por solicitud del administrador"
      });
      if (rpcErr || !rpcRes) throw new Error("ADMIN_OPERATION_FAILED");
      return new Response(JSON.stringify({ success: true, data: rpcRes }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "enroll_student" || action === "admin_enroll_student") {
      const { data: rpcRes, error: rpcErr } = await serviceClient.rpc("admin_enroll_student", {
        p_admin_user_id: user.id,
        p_student_id: payload.student_id || payload.p_student_id,
        p_class_section_id: payload.class_section_id || payload.p_class_section_id
      });
      if (rpcErr || !rpcRes) throw new Error("ADMIN_OPERATION_FAILED");
      return new Response(JSON.stringify({ success: true, data: rpcRes }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "deactivate_student" || action === "admin_deactivate_student") {
      const { data: rpcRes, error: rpcErr } = await serviceClient.rpc("admin_deactivate_student", {
        p_admin_user_id: user.id,
        p_student_id: payload.student_id || payload.p_student_id
      });
      if (rpcErr || !rpcRes) throw new Error("ADMIN_OPERATION_FAILED");
      return new Response(JSON.stringify({ success: true, data: rpcRes }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reactivate_student" || action === "admin_reactivate_student") {
      const { data: rpcRes, error: rpcErr } = await serviceClient.rpc("admin_reactivate_student", {
        p_admin_user_id: user.id,
        p_student_id: payload.student_id || payload.p_student_id
      });
      if (rpcErr || !rpcRes) throw new Error("ADMIN_OPERATION_FAILED");
      return new Response(JSON.stringify({ success: true, data: rpcRes }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- ALIASES RESTAURADOS PARA AÑOS Y SECCIONES ---
    if (action === "set_active_year" || action === "admin_set_active_academic_year") {
      const yearId = payload.year_id || payload.academic_year_id || payload.p_academic_year_id;
      if (!yearId || !UUID_REGEX.test(yearId)) {
        return new Response(JSON.stringify({ success: false, error: "ID de año lectivo no válido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: rpcRes, error: rpcErr } = await serviceClient.rpc("admin_set_active_academic_year", {
        p_admin_user_id: user.id,
        p_year_id: yearId
      });
      if (rpcErr || !rpcRes) throw new Error("ADMIN_OPERATION_FAILED");
      return new Response(JSON.stringify({ success: true, data: rpcRes }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create_academic_year" || action === "admin_create_academic_year") {
      const { data: rpcRes, error: rpcErr } = await serviceClient.rpc("admin_create_academic_year", {
        p_admin_user_id: user.id,
        p_name: payload.name,
        p_set_active: payload.set_active || false,
        p_create_terms: payload.create_terms !== false
      });
      if (rpcErr || !rpcRes) throw new Error("ADMIN_OPERATION_FAILED");
      return new Response(JSON.stringify({ success: true, data: rpcRes }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create_class_section" || action === "admin_create_class_section") {
      const { data: rpcRes, error: rpcErr } = await serviceClient.rpc("admin_create_class_section", {
        p_admin_user_id: user.id,
        p_academic_year_id: payload.academic_year_id,
        p_grade_number: payload.grade_number,
        p_education_level: payload.education_level || "BGU",
        p_parallel: payload.parallel || "A"
      });
      if (rpcErr || !rpcRes) throw new Error("ADMIN_OPERATION_FAILED");
      return new Response(JSON.stringify({ success: true, data: rpcRes }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- ACCIONES DE LECTURA ---
    if (action === "fetch_enrollments" || action === "enrollments_admin_list") {
      const { data: enrollments, error: enErr } = await serviceClient
        .from("enrollments")
        .select(`
          id,
          enrolled_at,
          status,
          students ( student_code, official_full_name ),
          class_sections (
            grade_number,
            education_level,
            parallel,
            academic_years ( name )
          )
        `)
        .eq("status", "active")
        .order("enrolled_at", { ascending: false });

      if (enErr) throw new Error("ADMIN_FETCH_ENROLLMENTS_FAILED");

      return new Response(JSON.stringify({ success: true, data: enrollments || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "fetch_academic_years" || action === "academic_years_admin_list") {
      const { data: years, error: yErr } = await serviceClient
        .from("academic_years")
        .select(`*, academic_terms (*), class_sections (*)`)
        .order("created_at", { ascending: false });

      if (yErr) throw new Error("ADMIN_FETCH_YEARS_FAILED");

      return new Response(JSON.stringify({ success: true, data: years || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "fetch_audit_logs" || action === "audit_logs_admin_list") {
      const { data: logs, error: lErr } = await serviceClient
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (lErr) throw new Error("ADMIN_FETCH_AUDIT_FAILED");

      return new Response(JSON.stringify({ success: true, data: logs || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: false, error: "Acción administrativa no reconocida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    console.error("Excepción en Edge Function admin-api:", err);
    return new Response(JSON.stringify({ success: false, error: GENERIC_ADMIN_ERROR }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
