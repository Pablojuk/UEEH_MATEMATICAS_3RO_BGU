# UEEH Matemáticas — 3.º BGU

Plataforma web educativa modular, interactiva y mobile-first para el aprendizaje y evaluación de Matemáticas en Tercero de Bachillerato General Unificado (BGU) de la **Unidad Educativa Emiliano Hinostroza (UEEH)**.

Desplegada estáticamente en **GitHub Pages** e impulsada por una infraestructura académica segura en **Supabase Cloud**.

---

## 1. Arquitectura Actual

```text
GitHub Pages (Hosting Estático)
      ↓
Frontend HTML5 / CSS3 / JavaScript (SPA Modular Vanilla)
      ↓
Supabase Auth (Google OAuth + Vinculación Institucional)
      ↓
Edge Functions (Deno / TypeScript con JWT Verify)
      ↓
PostgreSQL con RLS + Esquema Privado (private)
```

Para una explicación técnica exhaustiva, consulta:
- **[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)**: Arquitectura general de la plataforma.
- **[`docs/UNIT5_ARCHITECTURE.md`](./docs/UNIT5_ARCHITECTURE.md)**: Arquitectura maestra de la Unidad 5 (plantilla para futuras unidades).

---

## 2. Autenticación y Perfiles de Usuario

- **Inicio de Sesión**: Acceso exclusivo mediante **Google OAuth** gestionado por Supabase Auth.
- **Perfiles (`public.profiles`)**: Creación automática del perfil de usuario con control de roles (`student` y `admin`).
- **Vinculación por Código Institucional (`claim-student-code`)**: En el primer acceso, el estudiante ingresa un código de activación de un solo uso para enlazar su cuenta con su registro permanente (`public.students`).
- **Identificador Permanente**: Cada estudiante cuenta con un código único inmutable (`student_code`, ej. `UEEH-STU-000001`).
- **Seguridad**: No se exponen credenciales privadas, tokens de servicio ni secretos en el cliente.

---

## 3. Sistema Académico y Evaluación

- **Fuente Oficial de Verdad**: **Supabase Cloud** es la única fuente autorizada de calificaciones. El frontend no calcula notas oficiales ni depende de `localStorage`.
- **Evaluación 100% Server-Side**:
  - Validación de respuestas en tiempo real mediante la Edge Function `check-activity-answer`.
  - Calificación y registro de entregas completas mediante la Edge Function `submit-activity-result`.
- **Pautas Privadas**: Las respuestas correctas, opciones válidas y fórmulas de calificación residen en el esquema protegido `private.activity_grading_configs`.
- **Escala de Calificación**:
  - Calificación oficial sobre **10.00 puntos**.
  - **Calificación Mínima Institucional**: `minimum_score = 1.00` garantizado para entregas procesadas o no entregas tras el cierre.
- **Múltiples Intentos y Mejor Nota**: El sistema registra el historial completo en `public.activity_attempts` y consolida la nota más alta en `public.activity_results` (`best_score`).
- **Idempotencia de Entregas (`submission_id`)**: Cada intento genera un identificador único. Los reintentos por inestabilidad de red no duplican intentos ni alteran el puntaje previo.
- **Finalización Automática de Actividades Vencidas (Cron)**:
  - Función programada `ueeh-finalize-overdue-activities` que cierra automáticamente las actividades cumplida la fecha límite (`due_at`) y asigna la nota mínima reglamentaria (`1.00/10.00`) con estado `not_submitted` a estudiantes sin entrega.

---

## 4. Panel de Administración Docente

Ubicado en `components/admin/` y respaldado por la Edge Function `admin-api`:

- **Dashboard**: Indicadores de estudiantes matriculados, actividades activas y entregas.
- **Estudiantes**: Creación, edición, activación/desactivación y regeneración de códigos de activación.
- **Matrículas**: Asignación de estudiantes a cursos, paralelos y años lectivos.
- **Años Lectivos**: Gestión de periodos escolares y selección del año lectivo activo.
- **Actividades & Notas por Estudiante**: Matriz interactiva de calificaciones en tiempo real por unidad y estudiante, con control de fechas de apertura y cierre.
- **Auditoría**: Bitácora inmutable (`private.audit_logs`) que registra todas las operaciones administrativas.
- **Exportaciones**:
  - Descarga en formato CSV.
  - Generación de libros **Microsoft Excel (.xlsx)** binarios reales (OpenXML PK-ZIP) con formato y estilos mediante la librería local SheetJS (`assets/vendor/xlsx.full.min.js`), sin dependencias de CDN externas.

---

## 5. Estructura del Repositorio

```text
/
├── index.html                           # Entrada principal SPA
├── README.md                            # Documentación general
├── package.json                         # Configuración y scripts de test
├── assets/
│   ├── css/styles.css                   # Estilos visuales de la plataforma
│   ├── js/main.js                       # Punto de arranque del frontend
│   ├── img/                             # Recursos gráficos e isotipos institucionales
│   └── vendor/
│       └── xlsx.full.min.js             # Librería local SheetJS (OpenXML .xlsx)
├── core/
│   ├── activity-service.js              # Gestión de actividades, entregas e idempotencia
│   ├── admin-service.js                 # Cliente para la Edge Function admin-api
│   ├── app.js                           # Orquestador del Campus y renderizado data-driven
│   ├── auth-service.js                  # Control de autenticación y sesiones Supabase
│   ├── curriculum-config.js             # Catálogo maestro data-driven de unidades curriculares
│   ├── navigation.js                    # Enrutador de vistas SPA y renderizado MathJax
│   ├── scoring.js                       # Utilidades de conversión y escalas
│   ├── storage.js                       # Almacenamiento local para caché no sensible
│   ├── supabase-client.js               # Instancia singleton del cliente Supabase
│   └── supabase-config.js               # Parámetros públicos de conexión Supabase
├── components/
│   ├── activity-summary.js              # Resumen y reporte de notas desde Supabase
│   ├── auth-gate.js                     # Modal de verificación y acceso por autenticación
│   ├── feedback-box.js                  # Retroalimentación interactiva
│   ├── game-shell.js                    # Contenedor para módulos de gamificación
│   ├── html-lesson-viewer.js            # Visor embebido para lecciones y presentaciones
│   ├── result-panel.js                  # Panel de desglose de puntajes
│   ├── slide-viewer.js                  # Visor de diapositivas formativas
│   └── admin/                           # Vistas del Panel Administrativo
│       ├── admin-shell.js               # Navegación y marco administrativo
│       ├── admin-dashboard.js           # Vista general y métricas
│       ├── admin-students.js            # Gestión de estudiantes
│       ├── admin-student-detail.js      # Detalle individual de estudiante
│       ├── admin-enrollments.js         # Matrículas por sección
│       ├── admin-academic-years.js      # Periodos lectivos
│       ├── admin-activities.js          # Actividades y Matriz de Notas
│       ├── admin-audit.js               # Registro de auditoría
│       └── admin-exports.js             # Exportación de reportes
├── topics/
│   ├── unit5-determinantes/             # Unidad 5 (Plantilla Maestra)
│   │   ├── presentation.html            # Presentación de clase (22 slides)
│   │   ├── gamificacion.html            # Odisea Espacial (6 planetas)
│   │   └── deber.html                   # Deber (14 iniciales + 8 recuperación)
│   ├── introduccion-derivadas/          # Unidad 1 (Derivadas)
│   ├── operaciones-matrices/            # Unidad 3 (Operaciones)
│   ├── producto-matrices/               # Unidad 4 (Producto)
│   └── plantilla-tema/                  # Plantilla base para nuevos temas
├── supabase/
│   ├── functions/                       # Edge Functions Deno / TypeScript
│   │   ├── admin-api/                   # API para operaciones administrativas
│   │   ├── check-activity-answer/       # Validación de respuestas individuales
│   │   ├── claim-student-code/          # Vinculación de código de activación
│   │   └── submit-activity-result/      # Procesamiento y registro de entregas
│   └── migrations/                      # Migraciones PostgreSQL y esquemas RLS
├── docs/
│   ├── ARCHITECTURE.md                  # Documentación de arquitectura técnica
│   ├── UNIT5_ARCHITECTURE.md            # Guía y plantilla maestra de la Unidad 5
│   └── arquitectura.md                  # Archivo histórico (Fase 1)
└── tests/                               # Suite de pruebas automatizadas
    ├── activity-service.test.mjs
    ├── admin-activities.test.mjs
    ├── admin-contract.test.mjs
    ├── app-data-driven.test.mjs
    ├── auth-gate.test.mjs
    ├── curriculum-config.test.mjs
    ├── game-shell.test.mjs
    ├── immutable-grading.test.mjs
    ├── rpc-contract.test.mjs
    ├── unit5-classwork-submit-guard.test.mjs
    ├── unit5-deber-feedback.test.mjs
    ├── unit5-deber.test.mjs
    ├── unit5-gamification-submit-guard.test.mjs
    ├── unit5-hints-no-answers.test.mjs
    └── xlsx-export.test.mjs
```

---

## 6. Unidad 5 como Plantilla Arquitectónica

La **Unidad 5 (Determinantes de Matrices 2×2 y 3×3)** inaugura el estándar arquitectónico de evaluación server-side, submit guards contra clics repetidos, pistas orientativas sin filtración de respuestas y matriz de calificaciones en tiempo real. 

Para consultar los lineamientos para crear la Unidad 6 y unidades posteriores, revisa **[`docs/UNIT5_ARCHITECTURE.md`](./docs/UNIT5_ARCHITECTURE.md)**.

---

## 7. Seguridad

- **Row Level Security (RLS)**: Activado en todas las tablas de PostgreSQL. Los estudiantes solo pueden leer y modificar sus propios registros autorizados.
- **Aislamiento de Pautas**: Esquema `private` no accesible directamente desde clientes web ni tokens anónimos.
- **Tokens JWT y Edge Functions**: Todas las Edge Functions validan la firma criptográfica del token JWT (`verify_jwt = true`).
- **Rol `service_role`**: Exclusivo para operaciones de backend en Edge Functions; nunca expuesto al frontend.
- **CORS Restringido**: Encabezados de control de origen configurados en las funciones server-side.

---

## 8. Desarrollo Local

Para ejecutar la plataforma en un entorno local:

```bash
# 1. Clonar el repositorio
git clone https://github.com/Pablojuk/UEEH_MATEMATICAS_3RO_BGU.git

# 2. Navegar al directorio
cd UEEH_MATEMATICAS_3RO_BGU

# 3. Iniciar un servidor HTTP local (Python o Live Server)
python -m http.server 5500
```

Abrir en el navegador:
```text
http://localhost:5500/
```

> **Nota**: Debido al uso de módulos ES (`import`/`export`), se requiere un servidor HTTP local y no abrir directamente mediante el protocolo `file://`.

---

## 9. Pruebas Automatizadas

El proyecto incluye una suite completa de pruebas unitarias y de integración sobre contratos RPC, servicios y componentes:

```bash
# Ejecutar todas las pruebas del sistema
node tests/auth-gate.test.mjs
node tests/game-shell.test.mjs
node tests/admin-contract.test.mjs
node tests/admin-activities.test.mjs
node tests/rpc-contract.test.mjs
node tests/activity-service.test.mjs
node tests/xlsx-export.test.mjs
node tests/immutable-grading.test.mjs
node tests/unit5-deber.test.mjs
node tests/unit5-classwork-submit-guard.test.mjs
node tests/unit5-hints-no-answers.test.mjs
```
