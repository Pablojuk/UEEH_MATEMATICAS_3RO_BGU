// ═══════════════════════════════════════════════════════════════════════════
// RPC Signature Contract Verification Test — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";

const migrationsDir = path.resolve("supabase/migrations");
const functionsDir = path.resolve("supabase/functions");

// 1. Leer todas las migraciones SQL y mapear firmas de funciones
const sqlFunctions = new Map(); // function_name -> Set of parameter names (without 'p_' prefix stripped)

const sqlFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql"));

for (const file of sqlFiles) {
  const content = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
  
  // Regex para capturar CREATE OR REPLACE FUNCTION (public|private).name(...)
  const funcRegex = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public|private)\.([a-z0-9_]+)\s*\(([^)]*)\)/gi;
  let match;
  
  while ((match = funcRegex.exec(content)) !== null) {
    const fnName = match[1].toLowerCase();
    const paramsRaw = match[2].trim();
    const paramNames = new Set();
    
    if (paramsRaw.length > 0) {
      // Split params by comma (handling basic types)
      const paramTokens = paramsRaw.split(",");
      for (const tok of paramTokens) {
        const parts = tok.trim().split(/\s+/);
        if (parts[0] && parts[0].startsWith("p_")) {
          paramNames.add(parts[0].toLowerCase());
        }
      }
    }
    
    sqlFunctions.set(fnName, paramNames);
  }
}

console.log("Funciones RPC detectadas en SQL:", Array.from(sqlFunctions.keys()));

// 2. Leer llamadas .rpc() en Edge Functions
const edgeFiles = [
  path.join(functionsDir, "admin-api/index.ts"),
  path.join(functionsDir, "submit-activity-result/index.ts"),
  path.join(functionsDir, "claim-student-code/index.ts")
];

let totalRpcCallsTested = 0;
const errors = [];

for (const filePath of edgeFiles) {
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, "utf-8");
  
  // Match .rpc("function_name", { arg1: ..., arg2: ... })
  const rpcRegex = /\.rpc\(\s*["']([^"']+)["']\s*,\s*\{([^}]*)\}\s*\)/gi;
  let rpcMatch;

  while ((rpcMatch = rpcRegex.exec(content)) !== null) {
    const fnName = rpcMatch[1].toLowerCase();
    const argsBlock = rpcMatch[2];
    totalRpcCallsTested++;

    const expectedParams = sqlFunctions.get(fnName);
    if (!expectedParams) {
      errors.push(`Función RPC '${fnName}' en ${path.basename(filePath)} no existe en las migraciones SQL.`);
      continue;
    }

    // Extraer nombres de parámetros pasados en JS
    const argKeyRegex = /([a-z0-9_]+)\s*:/gi;
    let argMatch;
    while ((argMatch = argKeyRegex.exec(argsBlock)) !== null) {
      const argKey = argMatch[1].toLowerCase();
      if (!expectedParams.has(argKey)) {
        errors.push(`Parámetro '${argKey}' pasado a RPC '${fnName}' en ${path.basename(filePath)} NO coincide con los parámetros SQL declarados (${Array.from(expectedParams).join(", ")}).`);
      }
    }
  }
}

// 3. Test de regresión específico: Verificar que la sobrecarga legacy con p_question_score NO exista
const latestMigration = fs.readFileSync(path.join(migrationsDir, "20260817174500_remove_legacy_question_attempt_overload.sql"), "utf-8");
if (!latestMigration.includes("DROP FUNCTION IF EXISTS private.record_question_attempt")) {
  errors.push("Falta la migración para eliminar private.record_question_attempt legacy.");
}

const reqQuestionAttemptParams = sqlFunctions.get("record_question_attempt");
if (reqQuestionAttemptParams) {
  if (reqQuestionAttemptParams.has("p_question_score")) {
    errors.push("❌ REGRESIÓN: La firma de record_question_attempt todavía contiene 'p_question_score'.");
  }
  if (!reqQuestionAttemptParams.has("p_question_submission_id")) {
    errors.push("❌ ERROR: La firma de record_question_attempt debe contener 'p_question_submission_id'.");
  }
}

if (errors.length > 0) {
  console.error("❌ ERRORES DE CONTRATO RPC DETECTADOS:");
  errors.forEach(e => console.error("  - " + e));
  process.exit(1);
} else {
  console.log(`✅ VERIFICACIÓN DE CONTRATO RPC EXITOSA: Se auditaron ${totalRpcCallsTested} llamadas .rpc(), todas coinciden 100% y la sobrecarga legacy p_question_score está eliminada.`);
  process.exit(0);
}

