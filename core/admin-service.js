// ═══════════════════════════════════════════════════════════════════════════
// Servicio Administrativo Central — UEEH Matemáticas 3ro BGU
// ARQUITECTURA SEGURA: Frontend -> Edge Functions -> RPC Gateway
// ESQUEMA REAL COMPATIBLE (grade_number, education_level, parallel)
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from "./supabase-client.js";

/**
 * Canjea un código de activación invocando la Edge Function 'claim-student-code'.
 */
export async function claimStudentCode(codeText) {
  try {
    const { data, error } = await supabase.functions.invoke("claim-student-code", {
      body: { code: codeText }
    });

    if (error) {
      console.error("Error al invocar Edge Function claim-student-code:", error.message);
      return { success: false, error: "El código no es válido, ya fue utilizado o no está disponible." };
    }

    return data || { success: false, error: "El código no es válido, ya fue utilizado o no está disponible." };
  } catch (err) {
    console.error("Excepción al canjear código:", err);
    return { success: false, error: "El código no es válido, ya fue utilizado o no está disponible." };
  }
}

/**
 * Helper privado para invocar la Edge Function 'admin-api'.
 */
async function invokeAdminApi(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action, payload }
  });

  if (error) {
    console.error(`Error en Edge Function admin-api [${action}]:`, error.message);
    throw new Error("No se pudo completar la operación administrativa.");
  }

  if (data && data.success === false) {
    if (data.requires_confirmation) {
      return data;
    }
    throw new Error(data.error || "No se pudo completar la operación administrativa.");
  }

  return data?.data || data;
}

export async function createStudent(payload) {
  return await invokeAdminApi("admin_create_student", {
    official_full_name: payload.official_full_name,
    class_section_id: payload.class_section_id || null,
    auto_enroll: payload.auto_enroll ?? true,
    auto_generate_code: payload.auto_generate_code ?? true,
    confirm_homonym: payload.confirm_homonym ?? false
  });
}

export async function generateClaimCode(studentId) {
  return await invokeAdminApi("admin_generate_claim_code", { student_id: studentId });
}

export async function resetStudentAccess(studentId, reason) {
  return await invokeAdminApi("admin_reset_student_access", {
    student_id: studentId,
    reason: reason || "Restablecimiento por pérdida de cuenta Google"
  });
}

export async function setActiveAcademicYear(yearId) {
  return await invokeAdminApi("admin_set_active_academic_year", { year_id: yearId });
}

export async function createAcademicYear(name, setActive = false, createTerms = true) {
  return await invokeAdminApi("admin_create_academic_year", {
    name,
    set_active: setActive,
    create_terms: createTerms
  });
}

export async function createEnrollment(studentId, classSectionId) {
  return await invokeAdminApi("admin_enroll_student", {
    student_id: studentId,
    class_section_id: classSectionId
  });
}

export async function createClassSection(academicYearId, gradeNumber, educationLevel = "BGU", parallel = "A") {
  return await invokeAdminApi("admin_create_class_section", {
    academic_year_id: academicYearId,
    grade_number: gradeNumber,
    education_level: educationLevel,
    parallel
  });
}

export async function toggleStudentStatus(studentId, newStatus) {
  if (newStatus === "inactive") {
    return await invokeAdminApi("admin_deactivate_student", { student_id: studentId });
  } else {
    return await invokeAdminApi("admin_reactivate_student", { student_id: studentId });
  }
}

/**
 * Obtiene métricas agregadas en tiempo real para el Dashboard Administrador mediante Edge Function segura.
 */
export async function fetchAdminDashboardStats() {
  try {
    return await invokeAdminApi("dashboard_summary", {});
  } catch (err) {
    console.error("Error al cargar estadísticas admin:", err);
    throw err;
  }
}

export async function fetchStudents(options = {}) {
  try {
    return await invokeAdminApi("students_admin_list", {
      status: options.status || null,
      search: options.search || null
    });
  } catch (err) {
    console.error("Error cargando estudiantes:", err);
    throw err;
  }
}

export async function fetchStudentDetail(studentId) {
  try {
    return await invokeAdminApi("students_admin_list", { student_id: studentId });
  } catch (err) {
    console.error("Error al obtener detalle del estudiante:", err);
    throw err;
  }
}

export async function fetchEnrollments() {
  try {
    return await invokeAdminApi("fetch_enrollments", {});
  } catch (err) {
    console.error("Error al obtener matrículas:", err);
    return [];
  }
}

export async function fetchAcademicYears() {
  try {
    return await invokeAdminApi("fetch_academic_years", {});
  } catch (err) {
    console.error("Error al obtener años lectivos:", err);
    return [];
  }
}

export async function fetchClassSections(academicYearId = null) {
  let query = supabase
    .from("class_sections")
    .select(`
      id,
      grade_number,
      education_level,
      parallel,
      academic_year_id,
      academic_years ( id, name, is_active )
    `);

  if (academicYearId) {
    query = query.eq("academic_year_id", academicYearId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function fetchAuditLogs(limit = 50) {
  try {
    return await invokeAdminApi("fetch_audit_logs", { limit });
  } catch (err) {
    console.error("Error al obtener auditoría:", err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÉTODOS DE GESTIÓN ADMINISTRATIVA DE ACTIVIDADES Y GRADEBOOK (UNIDAD 5+)
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchActivitiesAdminList() {
  try {
    return await invokeAdminApi("activities_admin_list", {});
  } catch (err) {
    console.error("Error al obtener lista de actividades admin:", err);
    throw err;
  }
}

export async function fetchActivityAdminDetail(activityId) {
  try {
    return await invokeAdminApi("activity_admin_detail", { activity_id: activityId });
  } catch (err) {
    console.error("Error al obtener detalle de actividad admin:", err);
    throw err;
  }
}

export async function upsertActivity(activityData) {
  return await invokeAdminApi("upsert_activity", activityData);
}

export async function setActivityActive(activityId, isActive) {
  return await invokeAdminApi("set_activity_active", { activity_id: activityId, is_active: isActive });
}

export async function reopenActivity(activityId, newDueAt) {
  return await invokeAdminApi("reopen_activity", { activity_id: activityId, new_due_at: newDueAt });
}

export async function fetchGradebookData() {
  try {
    return await invokeAdminApi("gradebook_data", {});
  } catch (err) {
    console.error("Error al obtener datos del libro de calificaciones:", err);
    throw err;
  }
}

export async function fetchStudentGradesMatrix(unitNumber = 5) {
  try {
    return await invokeAdminApi("student_grades_matrix", { unit_number: unitNumber });
  } catch (err) {
    console.error("Error al obtener matriz de notas por estudiante:", err);
    throw err;
  }
}

export async function adminResetStudentActivity(studentId, activityId, reason) {
  return await invokeAdminApi("admin_reset_student_activity", {
    student_id: studentId,
    activity_id: activityId,
    reason: reason || "Reinicio administrativo de actividad"
  });
}

export async function adminReopenStudentActivity(studentId, activityId, reason) {
  return await invokeAdminApi("admin_reopen_student_activity", {
    student_id: studentId,
    activity_id: activityId,
    reason: reason || "Reapertura administrativa de actividad"
  });
}

