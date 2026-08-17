# Matemáticas de Tercero de BGU

Plataforma web educativa estática, modular y mobile-first para estudiantes de 3ro de BGU, pensada para publicarse en GitHub Pages.

## Objetivo del proyecto

Construir una mini app educativa moderna que permita:

- registro básico de estudiantes,
- aprendizaje guiado por slides,
- gamificación,
- deber evaluado,
- recuperación automática,
- cálculo de notas y reporte final,
- futura integración con Google Sheets.

## Público objetivo

- Estudiantes de Tercero de BGU.
- Docentes que requieren seguimiento de avance y resultados.

## Estado actual

✅ **Unidad 5+ Arquitectura Académica Desplegada (Release Estable):**
- **Supabase Cloud (`fetfzizgkrdmocnlkgco`)**: Fuente única y oficial de calificaciones.
- **Autenticación**: Google Auth exclusivo con flujo de vinculación por código institucional (`UEEH-STU-XXXXXX`) y código de activación de un solo uso.
- **Calificación Server-side**: Evaluación 100% en backend (Edge Function `submit-activity-result`) con pautas privadas en esquema `private`.
- **Regla Académica Institucional**: Calificación oficial mínima de `1.00/10.00` para entregas procesadas o no entregas por vencimiento de plazo.
- **Seguridad de Evaluaciones**: Las configuraciones y pautas privadas de evaluación se provisionan de forma segura fuera del repositorio público en el esquema privado del servidor de base de datos (`private.activity_grading_configs`).
- **Exportación Excel Real (.xlsx)**: Generación binaria OpenXML PK-ZIP mediante vendor estático SheetJS (`assets/vendor/xlsx.full.min.js`), sin dependencias CDN externas.

## Comandos de Pruebas Automatizadas

```bash
# Ejecutar verificación de contratos RPC y firmas PostgreSQL
node tests/rpc-contract.test.mjs

# Ejecutar verificación de acciones del panel de administración
node tests/admin-contract.test.mjs

# Ejecutar pruebas unitarias de activity-service y 5 estados de resumen
node tests/activity-service.test.mjs

# Ejecutar verificación de generación binaria de Excel OpenXML (.xlsx)
node tests/xlsx-export.test.mjs

# Ejecutar verificación de sintaxis TypeScript / Deno en Edge Functions
npx -y deno check supabase/functions/claim-student-code/index.ts
npx -y deno check supabase/functions/admin-api/index.ts
npx -y deno check supabase/functions/submit-activity-result/index.ts
```

## Estructura de carpetas

```text
/
├── index.html
├── README.md
├── assets/
│   ├── css/styles.css
│   ├── js/main.js
│   └── vendor/xlsx.full.min.js (SheetJS v0.18.5)
├── core/
│   ├── activity-service.js
│   ├── admin-service.js
│   ├── auth-service.js
│   ├── supabase-client.js
│   └── supabase-config.js
├── components/
│   ├── activity-summary.js
│   ├── auth-gate.js
│   └── admin/
│       ├── admin-shell.js
│       ├── admin-activities.js
│       ├── admin-students.js
│       ├── admin-student-detail.js
│       ├── admin-enrollments.js
│       ├── admin-academic-years.js
│       └── admin-exports.js
├── supabase/
│   ├── functions/ (claim-student-code, admin-api, submit-activity-result)
│   └── migrations/ (Unidad 5+ esquema, seguridad, plazos, administración)
└── tests/
    ├── rpc-contract.test.mjs
    ├── admin-contract.test.mjs
    ├── activity-service.test.mjs
    └── xlsx-export.test.mjs
```


## Tecnologías usadas

- HTML5
- CSS3
- JavaScript Vanilla (módulos ES)
- Tailwind CSS por CDN
- MathJax por CDN
- localStorage
- GitHub Pages

## Cómo abrir el proyecto

1. Clona o descarga el repositorio.
2. Abre la carpeta en VS Code o Cursor.
3. Ejecuta `index.html` con **Live Server** (recomendado).

## Cómo publicarlo en GitHub Pages

1. Sube cambios a GitHub.
2. Ve a `Settings` → `Pages`.
3. Selecciona la rama `main` (o la rama de despliegue) y carpeta `/root`.
4. Guarda y espera el enlace público.

## Fases del desarrollo

1. Arquitectura base.
2. Slides interactivas.
3. Gamificación.
4. Deber interactivo.
5. Recuperación automática.
6. Integración real con Google Sheets.
7. Optimización final y pruebas.

---

Para más detalle técnico y explicación en lenguaje sencillo, revisa `docs/arquitectura.md`.

## Deploy de Google Apps Script
1. Colocar el ID real del Google Sheet en `SPREADSHEET_ID`.
2. Ir a **Implementar > Nueva implementación**.
3. Tipo: **Aplicación web**.
4. Ejecutar como: **Yo**.
5. Quién tiene acceso: **Cualquier persona**.
6. Implementar.
7. Autorizar permisos.
8. Copiar la URL `/exec`.
9. Si cambia la URL, actualizar `APPS_SCRIPT_URL` en `core/sheets-api.js` y en los HTML autónomos.
