// ═══════════════════════════════════════════════════════════════════════════
// Admin Contract Verification Test — UEEH Matemáticas 3ro BGU
// ═══════════════════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";

const adminServicePath = path.resolve("core/admin-service.js");
const adminApiPath = path.resolve("supabase/functions/admin-api/index.ts");

const serviceContent = fs.readFileSync(adminServicePath, "utf-8");
const apiContent = fs.readFileSync(adminApiPath, "utf-8");

// Extraer todas las acciones invocadas en admin-service.js
const serviceActionRegex = /invokeAdminApi\(\s*["']([^"']+)["']/g;
const serviceActions = new Set();
let match;

while ((match = serviceActionRegex.exec(serviceContent)) !== null) {
  serviceActions.add(match[1]);
}

// Extraer todas las acciones soportadas en admin-api/index.ts
const apiActionRegex = /action\s*===\s*["']([^"']+)["']/g;
const apiActions = new Set();

while ((match = apiActionRegex.exec(apiContent)) !== null) {
  apiActions.add(match[1]);
}

console.log("Acciones detectadas en core/admin-service.js:", Array.from(serviceActions));
console.log("Acciones soportadas en admin-api/index.ts:", Array.from(apiActions));

const missing = [];
for (const act of serviceActions) {
  if (!apiActions.has(act)) {
    missing.push(act);
  }
}

if (missing.length > 0) {
  console.error("❌ ERROR DE CONTRATO: Las siguientes acciones de admin-service no están soportadas en admin-api:", missing);
  process.exit(1);
} else {
  console.log("✅ VERIFICACIÓN DE CONTRATO ADMIN EXITOSA: Todas las acciones requeridas por el frontend son soportadas por admin-api v6.");
  process.exit(0);
}
