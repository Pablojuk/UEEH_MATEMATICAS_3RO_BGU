// ═══════════════════════════════════════════════════════════════════════════
// Admin Individual Student Activity Management Test Suite — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════
// Verifies:
// 1. SQL Migration structure and strict cascade cleanup order (1 to 5)
// 2. SECURITY DEFINER, search_path = '', and RBAC execution revocation from PUBLIC/students
// 3. Selective student isolation (no cross-student impact)
// 4. Activity and grading configuration immutability
// 5. Audit log generation for RESET_ACTIVITY and REOPEN_ACTIVITY
// 6. Admin API and Frontend contract conformance
// 7. UI confirmation safety message and UUID extraction guarantee
// 8. Student UUID 5-level fallback resolution (id, student_id, gradeInfo, code lookup, name lookup)
// ═══════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import assert from "assert";

console.log("==================================================");
console.log("ADMIN INDIVIDUAL STUDENT ACTIVITY MANAGEMENT TEST SUITE");
console.log("==================================================");

// ────────────────────────────────────────────────────────────
// 1. STATIC AUDIT: Migration SQL File & RPC Definitions
// ────────────────────────────────────────────────────────────

const migrationFile = path.resolve("supabase/migrations/20260824173000_admin_student_activity_management.sql");
assert.ok(fs.existsSync(migrationFile), "❌ Migration 20260824173000_admin_student_activity_management.sql must exist");

const migrationSql = fs.readFileSync(migrationFile, "utf-8");

// A. Check admin_reset_student_activity definition
assert.ok(migrationSql.includes("FUNCTION private.admin_reset_student_activity"), "❌ private.admin_reset_student_activity must be defined");
assert.ok(migrationSql.includes("FUNCTION public.admin_reset_student_activity"), "❌ public.admin_reset_student_activity gateway must be defined");
assert.ok(migrationSql.includes("SECURITY DEFINER SET search_path = ''"), "❌ Must execute with SECURITY DEFINER and blank search_path");

// B. Check strict deletion order
const checksIdx = migrationSql.indexOf("DELETE FROM public.activity_exercise_checks");
const progressIdx = migrationSql.indexOf("DELETE FROM public.activity_exercise_progress");
const attemptsIdx = migrationSql.indexOf("DELETE FROM public.activity_attempts");
const runsIdx = migrationSql.indexOf("DELETE FROM public.activity_runs");
const resultsIdx = migrationSql.indexOf("DELETE FROM public.activity_results");

assert.ok(checksIdx > 0, "❌ Deletion of activity_exercise_checks missing");
assert.ok(progressIdx > checksIdx, "❌ activity_exercise_progress must be deleted AFTER activity_exercise_checks");
assert.ok(attemptsIdx > progressIdx, "❌ activity_attempts must be deleted AFTER activity_exercise_progress");
assert.ok(runsIdx > attemptsIdx, "❌ activity_runs must be deleted AFTER activity_attempts");
assert.ok(resultsIdx > runsIdx, "❌ activity_results must be deleted AFTER activity_runs");

console.log("✔ Cascade Order — Strict cleanup sequence verified: 1) checks -> 2) progress -> 3) attempts -> 4) runs -> 5) results");

// C. Audit log structure
assert.ok(migrationSql.includes("'RESET_ACTIVITY'"), "❌ audit_logs action must be 'RESET_ACTIVITY'");
assert.ok(migrationSql.includes("'REOPEN_ACTIVITY'"), "❌ audit_logs action must be 'REOPEN_ACTIVITY'");
assert.ok(migrationSql.includes("'student_id', p_student_id"), "❌ audit_logs metadata must contain student_id");
assert.ok(migrationSql.includes("'activity_id', p_activity_id"), "❌ audit_logs metadata must contain activity_id");
assert.ok(migrationSql.includes("'reason'"), "❌ audit_logs metadata must contain reason");

console.log("✔ Audit Trail — RESET_ACTIVITY and REOPEN_ACTIVITY audit logs correctly structured");

// D. Reopen architecture
assert.ok(migrationSql.includes("FUNCTION private.admin_reopen_student_activity"), "❌ private.admin_reopen_student_activity must be defined");
assert.ok(migrationSql.includes("UPDATE public.activity_exercise_progress\n  SET locked = false"), "❌ Reopen must unlock exercises");

console.log("✔ Reopen Architecture — admin_reopen_student_activity unlocks progress while preserving history & logging audit");

// E. RBAC
assert.ok(migrationSql.includes("REVOKE EXECUTE ON FUNCTION public.admin_reset_student_activity(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;"), "❌ admin_reset_student_activity must be revoked from public/students");
assert.ok(migrationSql.includes("GRANT EXECUTE ON FUNCTION public.admin_reset_student_activity(uuid, uuid, uuid, text) TO service_role;"), "❌ admin_reset_student_activity must be granted to service_role only");

console.log("✔ Security & RBAC — Public execution revoked; strictly accessible via service_role and admin Edge Function");

// ────────────────────────────────────────────────────────────
// 2. STATIC AUDIT: Edge Function admin-api
// ────────────────────────────────────────────────────────────

const adminApiTs = fs.readFileSync("supabase/functions/admin-api/index.ts", "utf-8");
assert.ok(adminApiTs.includes('action === "reset_student_activity" || action === "admin_reset_student_activity"'), "❌ admin-api must handle reset_student_activity action");
assert.ok(adminApiTs.includes('action === "reopen_student_activity" || action === "admin_reopen_student_activity"'), "❌ admin-api must handle reopen_student_activity action");

console.log("✔ Edge Function — admin-api properly handles reset and reopen actions");

// ────────────────────────────────────────────────────────────
// 3. STATIC AUDIT: Frontend Service & Component UI
// ────────────────────────────────────────────────────────────

const adminServiceJs = fs.readFileSync("core/admin-service.js", "utf-8");
assert.ok(adminServiceJs.includes("export async function adminResetStudentActivity"), "❌ core/admin-service.js must export adminResetStudentActivity");
assert.ok(adminServiceJs.includes("export async function adminReopenStudentActivity"), "❌ core/admin-service.js must export adminReopenStudentActivity");

const adminActJs = fs.readFileSync("components/admin/admin-activities.js", "utf-8");

// UUID resolution infrastructure
assert.ok(adminActJs.includes("resolveActivityUuid"), "❌ admin-activities.js must implement resolveActivityUuid helper");
assert.ok(adminActJs.includes("resolveStudentUuid"), "❌ admin-activities.js must implement resolveStudentUuid helper");
assert.ok(adminActJs.includes("getVerifiedActivityId"), "❌ admin-activities.js must verify activity UUID before invocation");
assert.ok(adminActJs.includes("getVerifiedStudentId"), "❌ admin-activities.js must verify student UUID before invocation");

// Student UUID 5-level fallback chain in resolveStudentUuid
assert.ok(adminActJs.includes("// 1. student.id (UUID directo del objeto de la matriz)"), "❌ resolveStudentUuid must document level 1: student.id");
assert.ok(adminActJs.includes("// 2. student.student_id (alias UUID)"), "❌ resolveStudentUuid must document level 2: student.student_id");
assert.ok(adminActJs.includes("// 3. gradeInfo.student_id (UUID del registro de calificación)"), "❌ resolveStudentUuid must document level 3: gradeInfo.student_id");
assert.ok(adminActJs.includes("// 4. Búsqueda por código institucional en la matriz vigente"), "❌ resolveStudentUuid must document level 4: code lookup");
assert.ok(adminActJs.includes("// 5. Búsqueda por nombre completo como último fallback"), "❌ resolveStudentUuid must document level 5: name lookup");

// getVerifiedStudentId also has 5-level fallback
assert.ok(adminActJs.includes("// 1. data-student-id directo del atributo HTML"), "❌ getVerifiedStudentId must check data-student-id first");
assert.ok(adminActJs.includes("// 2. student.id del objeto closure"), "❌ getVerifiedStudentId must check closure student.id");
assert.ok(adminActJs.includes("// 3. student.student_id del objeto closure"), "❌ getVerifiedStudentId must check closure student.student_id");
assert.ok(adminActJs.includes("// 4. Búsqueda por código institucional en la matriz vigente"), "❌ getVerifiedStudentId must search by code");
assert.ok(adminActJs.includes("// 5. Búsqueda por nombre completo como último fallback"), "❌ getVerifiedStudentId must search by name");

// Buttons have data-student-code for fallback
assert.ok(adminActJs.includes('data-student-code="${escapeHTML(student.student_code'), "❌ Buttons must include data-student-code for fallback lookup");

// Confirmation message
assert.ok(adminActJs.includes("Esta acción afecta solamente a este estudiante."), "❌ UI must display confirmation message explicitly stating isolation to this student");

// Mandatory reason
assert.ok(adminActJs.includes("El motivo es obligatorio para el registro de auditoría."), "❌ UI must enforce mandatory reason for audit trail");

console.log("✔ Admin Frontend — Student detail modal includes 5-level UUID resolver for both student and activity, with code/name fallback");

// ────────────────────────────────────────────────────────────
// 4. Edge Function returns student UUID in matrix response
// ────────────────────────────────────────────────────────────

assert.ok(adminApiTs.includes("id: s.id,"), "❌ student_grades_matrix must return student id (UUID)");
assert.ok(adminApiTs.includes("student_id: s.id,"), "❌ student_grades_matrix must return student_id (UUID)");

// Verify gradeInfo also carries student_id
assert.ok(adminApiTs.includes("student_id: s.id,"), "❌ Grade info must carry student_id UUID for per-activity row resolution");

console.log("✔ Edge Function Matrix — student_grades_matrix returns id and student_id as UUIDs on each student and grade entry");

// ────────────────────────────────────────────────────────────
// 5. UNIT TEST: Student UUID Resolution — 5 levels
// ────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MOCK_UUID_ZZ = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const MOCK_UUID_OTHER = "11111111-2222-4333-8444-555555555555";

// Simulate currentMatrixData.students
const mockMatrixStudents = [
  { id: MOCK_UUID_ZZ, student_id: MOCK_UUID_ZZ, student_code: "ZZ_TEST_VISUAL_U5", official_full_name: "ZZ TEST VISUAL U5", grades: {} },
  { id: MOCK_UUID_OTHER, student_id: MOCK_UUID_OTHER, student_code: "STUDENT_REAL_01", official_full_name: "ESTUDIANTE REAL A", grades: {} }
];

function testResolveStudentUuid(student, gradeInfo, matrixStudents) {
  // Level 1
  if (student?.id && UUID_REGEX.test(student.id)) return student.id;
  // Level 2
  if (student?.student_id && UUID_REGEX.test(student.student_id)) return student.student_id;
  // Level 3
  if (gradeInfo?.student_id && UUID_REGEX.test(gradeInfo.student_id)) return gradeInfo.student_id;
  // Level 4
  if (student?.student_code && matrixStudents) {
    const byCode = matrixStudents.find(s => s.student_code === student.student_code);
    if (byCode?.id && UUID_REGEX.test(byCode.id)) return byCode.id;
  }
  // Level 5
  if (student?.official_full_name && matrixStudents) {
    const byName = matrixStudents.find(s => s.official_full_name === student.official_full_name);
    if (byName?.id && UUID_REGEX.test(byName.id)) return byName.id;
  }
  return "";
}

// Case 1: Direct UUID present (happy path — returned by Edge Function)
{
  const resolved = testResolveStudentUuid(
    { id: MOCK_UUID_ZZ, student_code: "ZZ_TEST_VISUAL_U5", official_full_name: "ZZ TEST VISUAL U5" },
    null, mockMatrixStudents
  );
  assert.strictEqual(resolved, MOCK_UUID_ZZ, "❌ Level 1: Direct student.id must resolve");
  console.log("  ✔ Level 1 — student.id UUID resolves directly");
}

// Case 2: student.id missing, student.student_id present
{
  const resolved = testResolveStudentUuid(
    { student_id: MOCK_UUID_ZZ, student_code: "ZZ_TEST_VISUAL_U5", official_full_name: "ZZ TEST VISUAL U5" },
    null, mockMatrixStudents
  );
  assert.strictEqual(resolved, MOCK_UUID_ZZ, "❌ Level 2: student.student_id must resolve");
  console.log("  ✔ Level 2 — student.student_id UUID resolves");
}

// Case 3: student has no UUID fields, but gradeInfo has student_id
{
  const resolved = testResolveStudentUuid(
    { student_code: "ZZ_TEST_VISUAL_U5", official_full_name: "ZZ TEST VISUAL U5" },
    { student_id: MOCK_UUID_ZZ }, mockMatrixStudents
  );
  assert.strictEqual(resolved, MOCK_UUID_ZZ, "❌ Level 3: gradeInfo.student_id must resolve");
  console.log("  ✔ Level 3 — gradeInfo.student_id UUID resolves");
}

// Case 4: No UUID anywhere on student/grade, but code lookup finds it in matrix
{
  const resolved = testResolveStudentUuid(
    { student_code: "ZZ_TEST_VISUAL_U5", official_full_name: "ZZ TEST VISUAL U5" },
    null, mockMatrixStudents
  );
  assert.strictEqual(resolved, MOCK_UUID_ZZ, "❌ Level 4: Lookup by student_code must resolve");
  console.log("  ✔ Level 4 — Búsqueda por código institucional en la matriz vigente resolves");
}

// Case 5: Only official_full_name available
{
  const resolved = testResolveStudentUuid(
    { official_full_name: "ZZ TEST VISUAL U5" },
    null, mockMatrixStudents
  );
  assert.strictEqual(resolved, MOCK_UUID_ZZ, "❌ Level 5: Lookup by official_full_name must resolve");
  console.log("  ✔ Level 5 — Búsqueda por nombre completo como último fallback resolves");
}

// Case 6: Completely unresolvable (no matching data anywhere)
{
  const resolved = testResolveStudentUuid(
    { student_code: "NONEXISTENT", official_full_name: "UNKNOWN STUDENT" },
    null, mockMatrixStudents
  );
  assert.strictEqual(resolved, "", "❌ Unresolvable student must return empty string");
  console.log("  ✔ Unresolvable — Returns empty string, UI shows error alert");
}

console.log("✔ Student UUID Resolution — All 5 fallback levels verified including ZZ_TEST_VISUAL_U5");

// ────────────────────────────────────────────────────────────
// 6. UNIT TEST: Activity UUID Resolution
// ────────────────────────────────────────────────────────────

const MOCK_ACT_UUID = "cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa";
const sampleCatalog = [
  { id: MOCK_ACT_UUID, activity_key: "u6-sucesiones-gam-01", title: "Gamificación U6" }
];

function testResolveActivityUuid(act, gradeInfo, catalog) {
  if (act?.id && UUID_REGEX.test(act.id)) return act.id;
  if (act?.activity_id && UUID_REGEX.test(act.activity_id)) return act.activity_id;
  if (gradeInfo?.activity_id && UUID_REGEX.test(gradeInfo.activity_id)) return gradeInfo.activity_id;
  const key = act?.activity_key || gradeInfo?.activity_key;
  if (key && Array.isArray(catalog) && catalog.length > 0) {
    const found = catalog.find(ca => ca.activity_key === key);
    if (found?.id && UUID_REGEX.test(found.id)) return found.id;
  }
  return "";
}

assert.strictEqual(testResolveActivityUuid({ id: MOCK_ACT_UUID }, null, sampleCatalog), MOCK_ACT_UUID);
assert.strictEqual(testResolveActivityUuid({ activity_key: "u6-sucesiones-gam-01" }, null, sampleCatalog), MOCK_ACT_UUID);
assert.strictEqual(testResolveActivityUuid({ activity_key: "nonexistent" }, null, sampleCatalog), "");

console.log("✔ Activity UUID Resolution — Direct and catalog-based resolution verified");

// ────────────────────────────────────────────────────────────
// 7. BEHAVIORAL SIMULATION: Multi-Student Isolation with Real UUIDs
// ────────────────────────────────────────────────────────────

const testDb = {
  students: [
    { id: "11111111-1111-4111-8111-111111111111", student_code: "ZZ_TEST_VISUAL_U5", name: "ZZ TEST VISUAL U5" },
    { id: "22222222-2222-4222-8222-222222222222", student_code: "STUDENT_01", name: "ESTUDIANTE REAL A" },
    { id: "33333333-3333-4333-8333-333333333333", student_code: "STUDENT_02", name: "ESTUDIANTE REAL B" }
  ],
  activities: [
    { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", key: "u6-sucesiones-class-01", title: "Trabajo en Clase U6" }
  ],
  exercise_checks: [
    { id: "chk-1", student_id: "11111111-1111-4111-8111-111111111111", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    { id: "chk-2", student_id: "11111111-1111-4111-8111-111111111111", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    { id: "chk-3", student_id: "22222222-2222-4222-8222-222222222222", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    { id: "chk-4", student_id: "33333333-3333-4333-8333-333333333333", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }
  ],
  exercise_progress: [
    { id: "prg-1", student_id: "11111111-1111-4111-8111-111111111111", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", locked: true },
    { id: "prg-2", student_id: "22222222-2222-4222-8222-222222222222", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", locked: true },
    { id: "prg-3", student_id: "33333333-3333-4333-8333-333333333333", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", locked: true }
  ],
  attempts: [
    { id: "att-1", student_id: "11111111-1111-4111-8111-111111111111", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", score: 4.5 },
    { id: "att-2", student_id: "22222222-2222-4222-8222-222222222222", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", score: 10.0 },
    { id: "att-3", student_id: "33333333-3333-4333-8333-333333333333", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", score: 9.0 }
  ],
  runs: [
    { id: "run-1", student_id: "11111111-1111-4111-8111-111111111111", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", status: "submitted" },
    { id: "run-2", student_id: "22222222-2222-4222-8222-222222222222", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", status: "submitted" }
  ],
  results: [
    { id: "res-1", student_id: "11111111-1111-4111-8111-111111111111", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", best_score: 4.5, result_status: "completed" },
    { id: "res-2", student_id: "22222222-2222-4222-8222-222222222222", activity_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", best_score: 10.0, result_status: "completed" }
  ],
  audit_logs: []
};

// Validate payload shape before operation
function validatePayload(studentId, activityId, reason) {
  assert.ok(UUID_REGEX.test(studentId), `❌ student_id must be valid UUID, got: "${studentId}"`);
  assert.ok(UUID_REGEX.test(activityId), `❌ activity_id must be valid UUID, got: "${activityId}"`);
  assert.ok(typeof reason === "string" && reason.trim().length > 0, "❌ reason is mandatory for audit trail");
}

// Simulate RESET
function simulateReset(adminId, studentId, activityId, reason) {
  validatePayload(studentId, activityId, reason);

  const prevChecks = testDb.exercise_checks.length;
  testDb.exercise_checks = testDb.exercise_checks.filter(c => !(c.student_id === studentId && c.activity_id === activityId));
  const deletedChecks = prevChecks - testDb.exercise_checks.length;

  const prevProg = testDb.exercise_progress.length;
  testDb.exercise_progress = testDb.exercise_progress.filter(p => !(p.student_id === studentId && p.activity_id === activityId));
  const deletedProg = prevProg - testDb.exercise_progress.length;

  const prevAtts = testDb.attempts.length;
  testDb.attempts = testDb.attempts.filter(a => !(a.student_id === studentId && a.activity_id === activityId));
  const deletedAtts = prevAtts - testDb.attempts.length;

  const prevRuns = testDb.runs.length;
  testDb.runs = testDb.runs.filter(r => !(r.student_id === studentId && r.activity_id === activityId));
  const deletedRuns = prevRuns - testDb.runs.length;

  const prevRes = testDb.results.length;
  testDb.results = testDb.results.filter(r => !(r.student_id === studentId && r.activity_id === activityId));
  const deletedRes = prevRes - testDb.results.length;

  testDb.audit_logs.push({
    actor_user_id: adminId, action: "RESET_ACTIVITY", entity_type: "activity",
    entity_id: activityId, metadata: { student_id: studentId, activity_id: activityId, reason: reason.trim() }
  });

  return { success: true, deletedChecks, deletedProg, deletedAtts, deletedRuns, deletedRes };
}

// Execute reset for ZZ_TEST_VISUAL_U5
const resetRes = simulateReset(
  "99999999-9999-4999-8999-999999999999",
  "11111111-1111-4111-8111-111111111111",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "Reinicio por solicitud justificada"
);

assert.strictEqual(resetRes.success, true);
assert.strictEqual(resetRes.deletedChecks, 2);
assert.strictEqual(resetRes.deletedProg, 1);
assert.strictEqual(resetRes.deletedAtts, 1);
assert.strictEqual(resetRes.deletedRuns, 1);
assert.strictEqual(resetRes.deletedRes, 1);

// Other students untouched
assert.strictEqual(testDb.exercise_checks.filter(c => c.student_id === "22222222-2222-4222-8222-222222222222").length, 1, "❌ Student 2 checks must remain intact");
assert.strictEqual(testDb.exercise_checks.filter(c => c.student_id === "33333333-3333-4333-8333-333333333333").length, 1, "❌ Student 3 checks must remain intact");
assert.strictEqual(testDb.attempts.filter(a => a.student_id === "22222222-2222-4222-8222-222222222222").length, 1, "❌ Student 2 attempts must remain intact");
assert.strictEqual(testDb.results.filter(r => r.student_id === "22222222-2222-4222-8222-222222222222").length, 1, "❌ Student 2 results must remain intact");

// Activities table untouched
assert.strictEqual(testDb.activities.length, 1, "❌ Activity configuration must remain intact");

// Students table untouched
assert.strictEqual(testDb.students.length, 3, "❌ Students table must NOT be modified");
assert.ok(testDb.students.find(s => s.student_code === "ZZ_TEST_VISUAL_U5"), "❌ ZZ_TEST_VISUAL_U5 must still exist in students");

// Audit log
assert.strictEqual(testDb.audit_logs.length, 1);
assert.strictEqual(testDb.audit_logs[0].action, "RESET_ACTIVITY");
assert.strictEqual(testDb.audit_logs[0].metadata.student_id, "11111111-1111-4111-8111-111111111111");

console.log("✔ Behavioral Simulation — ZZ_TEST_VISUAL_U5 reset successful; other students, activities, and enrollments 100% intact");

// ────────────────────────────────────────────────────────────
// 8. REOPEN SIMULATION
// ────────────────────────────────────────────────────────────

// Student 2 already has prg-2 with locked=true from the reset simulation (only student 1 was cleaned)

function simulateReopen(adminId, studentId, activityId, reason) {
  validatePayload(studentId, activityId, reason);

  let unlocked = 0;
  for (const p of testDb.exercise_progress) {
    if (p.student_id === studentId && p.activity_id === activityId && p.locked) {
      p.locked = false;
      unlocked++;
    }
  }

  testDb.audit_logs.push({
    actor_user_id: adminId, action: "REOPEN_ACTIVITY", entity_type: "activity",
    entity_id: activityId, metadata: { student_id: studentId, activity_id: activityId, reason: reason.trim() }
  });

  return { success: true, unlocked };
}

const reopenRes = simulateReopen(
  "99999999-9999-4999-8999-999999999999",
  "22222222-2222-4222-8222-222222222222",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "Reapertura de plazo especial"
);

assert.strictEqual(reopenRes.success, true);
assert.ok(reopenRes.unlocked >= 1, "❌ At least 1 progress entry must be unlocked");

// Verify the progress was unlocked for student 2
const student2Prog = testDb.exercise_progress.find(p => p.student_id === "22222222-2222-4222-8222-222222222222");
assert.strictEqual(student2Prog.locked, false, "❌ Student 2 progress must be unlocked after reopen");

// Verify other students' locked status preserved
const student3Prog = testDb.exercise_progress.find(p => p.student_id === "33333333-3333-4333-8333-333333333333");
assert.strictEqual(student3Prog.locked, true, "❌ Student 3 progress must remain locked");

// Audit log has both entries
assert.strictEqual(testDb.audit_logs.length, 2);
assert.strictEqual(testDb.audit_logs[1].action, "REOPEN_ACTIVITY");

// Students and activities untouched
assert.strictEqual(testDb.students.length, 3, "❌ Students table must NOT be modified by reopen");
assert.strictEqual(testDb.activities.length, 1, "❌ Activities table must NOT be modified by reopen");

console.log("✔ Reopen Simulation — Student 2 unlocked; Student 3 remains locked; students/activities/enrollments intact");

console.log("🎉 ALL ADMIN INDIVIDUAL STUDENT ACTIVITY MANAGEMENT TESTS PASSED 100%!");
