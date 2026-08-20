# Arquitectura Técnica de la Plataforma — UEEH Matemáticas 3.º BGU

## 1. Visión General del Sistema

La plataforma **Campus Matemático Digital UEEH** es un sistema educativo integral desarrollado con una arquitectura desacoplada donde el frontend estático se aloja en **GitHub Pages** y el backend académico reside en **Supabase Cloud (PostgreSQL, Auth y Edge Functions)**.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                             GITHUB PAGES                                 │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │                      Frontend Web (SPA)                          │   │
│   │   • Vanilla JavaScript (Módulos ES)                              │   │
│   │   • Tailwind CSS (CDN) + MathJax 3 (LaTeX)                       │   │
│   │   • SheetJS (assets/vendor/xlsx.full.min.js)                     │   │
│   │   • Servicios Compartidos (core/) & Componentes (components/)    │   │
│   └────────────────────────────────┬─────────────────────────────────┘   │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │ HTTPS / JWT Bearer
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            SUPABASE CLOUD                                │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │               Edge Functions (Deno / TypeScript)                 │   │
│   │   • claim-student-code       • check-activity-answer             │   │
│   │   • submit-activity-result   • admin-api                         │   │
│   └────────────────────────────────┬─────────────────────────────────┘   │
│                                    │ Service Role / RPC                  │
│                                    ▼                                     │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │                  PostgreSQL con RLS & Esquemas                   │   │
│   │   • Esquema public: students, enrollments, activities, results   │   │
│   │   • Esquema private: grading_configs, question_attempts, audit   │   │
│   └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Flujo de Identidad y Autenticación

El ciclo de vida del usuario sigue una secuencia estricta de validación y vinculación:

```text
Google OAuth
     ↓
Supabase Auth (auth.users)
     ↓
Perfiles (public.profiles)
     ↓
Código de Activación Único (claim-student-code)
     ↓
Estudiante Vinculado (public.students + student_code)
     ↓
Matrícula Activa (public.enrollments + class_sections)
     ↓
Acceso Académico (public.activities)
```

1. **Autenticación**: El estudiante inicia sesión mediante Google OAuth a través de Supabase Auth.
2. **Creación de Perfil**: Se genera automáticamente un registro en `public.profiles` con rol por defecto `student`.
3. **Reclamación de Código Institucional**: En el primer ingreso, el estudiante ingresa su código de activación institucional (`claim-student-code`). La Edge Function valida el código y asocia de forma permanente el `auth.uid()` con el registro oficial en `public.students`.
4. **Matrícula y Permisos**: El estudiante accede a las actividades de su sección académica (`class_sections`) y año lectivo activo (`academic_years`).

---

## 3. Servicios Compartidos (`core/`)

La capa `core/` proporciona los módulos reutilizables para toda la aplicación:

- **`supabase-client.js`**: Instancia singleton del cliente Supabase conectada con la clave pública anónima (`SUPABASE_PUBLISHABLE_KEY`).
- **`supabase-config.js`**: Configuración centralizada de URL y credenciales públicas del proyecto.
- **`auth-service.js`**: Control de sesiones, suscripción a eventos de autenticación (`onAuthStateChange`), inicio/cierre de sesión y carga del perfil activo.
- **`activity-service.js`**: Gestión de ciclo de vida de actividades académicas, manejo de `sessionStorage` para borradores, generación de identificadores idempotentes (`submission_id`), envío a `submit-activity-result` y cálculo de estados de resumen.
- **`admin-service.js`**: Cliente para la Edge Function `admin-api`, que ejecuta consultas y mutaciones administrativas (dashboard, estudiantes, matrículas, actividades, matriz de notas y auditoría).
- **`navigation.js`**: Enrutador ligero para la SPA (Single Page Application), control de renderizado de vistas y reprocesamiento seguro de expresiones matemáticas con MathJax (`typesetPromise`).
- **`curriculum-config.js`**: Catálogo maestro data-driven de unidades curriculares, rutas de aprendizaje, recursos (presentación, gamificación, deber, resultados) y configuración de navegación para el Campus Virtual.
- **`storage.js`**: Utilidades de persistencia local en `localStorage` para caché no sensible.
- **`scoring.js`**: Funciones auxiliares de cálculo y conversión a escala vigesimal o decimal sobre 10.00.

---

## 4. Backend Supabase y Modelo de Datos

### 4.1. Esquema `public` (Accesible con RLS)
- **`academic_years`**: Años lectivos institucionales con bandera de año activo (`is_active`).
- **`academic_terms`**: Periodos o trimestres académicos (`term_number = 1, 2, 3`).
- **`class_sections`**: Cursos y paralelos (ej. "3ro BGU A").
- **`students`**: Catálogo de estudiantes con `student_code` permanente (ej. `UEEH-STU-000001`), nombres, cédula y estado.
- **`enrollments`**: Matrículas que vinculan estudiantes con secciones y años lectivos.
- **`activities`**: Catálogo de actividades formativas y sumativas con fechas de apertura (`opens_at`), vencimiento (`due_at`), puntajes (`minimum_score = 1.00`, `max_score = 10.00`) y ruta de origen (`source_path`).
- **`activity_attempts`**: Registro de cada intento de entrega realizado por el estudiante, incluyendo fecha de entrega, puntaje obtenido y estado.
- **`activity_results`**: Calificación oficial consolidada por actividad (`best_score`), que almacena la mejor nota obtenida por el estudiante.

### 4.2. Esquema `private` (Aislado de Acceso Directo)
- **`activity_grading_configs`**: Pautas privadas de evaluación, respuestas correctas, opciones válidas y configuraciones de calificadores (`grader_type`).
- **`activity_question_attempts`**: Registro detallado de cada intento por pregunta individual, con bloqueo server-side e idempotencia por `question_submission_id`.
- **`audit_logs`**: Registro inmutable de acciones administrativas (creación de estudiantes, cambios de matrícula, reapertura de actividades, exportaciones).
- **`student_claim_codes`**: Códigos de activación de un solo uso asignados a estudiantes no vinculados.

---

## 5. Edge Functions

Todas las Edge Functions están construidas en TypeScript para el runtime Deno y tienen activada la verificación de firma JWT (`verify_jwt = true`):

| Edge Function | Propósito | Seguridad |
|---|---|---|
| `claim-student-code` | Vincula un usuario autenticado con su registro oficial de estudiante mediante código de activación. | Valida sesión JWT del usuario y usa cliente service_role para la mutación. |
| `check-activity-answer` | Evalúa respuestas individuales a nivel de pregunta en tiempo real. | Consulta `private.activity_grading_configs`, aplica reglas de reintentos (máx. 4 en clase, ilimitado en gamificación) y registra en `private.activity_question_attempts`. |
| `submit-activity-result` | Recibe la entrega final de una actividad completa, calcula la nota oficial y actualiza `activity_attempts` y `activity_results`. | Valida plazos (`opens_at`, `due_at`), verifica idempotencia mediante `submission_id` y garantiza calificación mínima institucional. |
| `admin-api` | Proporciona endpoints para todas las operaciones del panel administrativo. | Verifica que el usuario tenga rol `admin` en `public.profiles` antes de ejecutar cualquier acción. |

---

## 6. Mecanismos de Calificación e Inmutabilidad

1. **Escala Oficial sobre 10.00**: Todas las actividades se califican sobre una escala de **1.00 a 10.00 puntos**.
2. **Calificación Mínima Institucional**: Cualquier entrega procesada o actividad no entregada tras el vencimiento de la fecha límite recibe la calificación mínima garantizada de **1.00 / 10.00**.
3. **Consistencia de Recuperación**: Si una actividad incluye fase de recuperación (como en Unidad 5), la calificación final se calcula como:
   $$\text{Nota Final} = \max(\text{Nota Inicial}, \text{Nota Recuperación})$$
4. **Idempotencia de Entregas**: El cliente genera un `submission_id` único por intento. Reintentos de transmisión por inestabilidad de red no duplican intentos ni alteran el puntaje previamente asignado.

---

## 7. Panel Administrativo y Exportaciones

El panel administrativo (`components/admin/`) ofrece herramientas completas de gestión docente:

- **Dashboard**: Estadísticas generales de estudiantes matriculados, actividades activas y entregas.
- **Estudiantes**: Creación, edición, activación/desactivación y regeneración de códigos de acceso.
- **Matrículas**: Asignación de estudiantes a cursos y paralelos.
- **Años Lectivos**: Creación y selección del periodo académico en curso.
- **Actividades & Matriz de Calificaciones**: Visualización en tiempo real de las notas de todos los estudiantes por actividad y unidad, con opción de modificar fechas de entrega o reapertura individual.
- **Auditoría**: Trazabilidad completa de cambios administrativos con fecha, usuario y detalles.
- **Exportaciones**:
  - Descarga en formato CSV.
  - Generación de libros de cálculo **Microsoft Excel (.xlsx)** binarios reales (OpenXML PK-ZIP) con formato institucional mediante la librería local SheetJS (`assets/vendor/xlsx.full.min.js`).

---

## 8. Anti-Caché Selectivo de Actividades Evaluables

Para garantizar que los estudiantes reciban siempre la versión más reciente de los recursos evaluables (incluso en navegadores móviles con caché agresiva), la plataforma implementa una estrategia de **anti-caché selectivo**:

- **Recursos con Anti-Caché**: Exclusivamente las páginas de **Gamificación** (`gamificacion.html`) y **Trabajo en Clase / Deber** (`deber.html`). Al abrirse desde el dashboard, se les añade un token temporal dinámico (`?v=TIMESTAMP`) generado en cada apertura.
- **Recursos con Caché Estándar**: Las **Presentaciones formativas** (`presentation.html`), el dashboard, la administración, fuentes tipográficas, hojas de estilo y librerías externas conservan su política de caché estándar para optimizar el rendimiento y consumo de datos.
- **Seguridad e Inmutabilidad de Sesión**: Esta estrategia opera exclusivamente a nivel de URL del visor embebido; **no borra** `localStorage`, `sessionStorage`, tokens JWT de autenticación ni cachés de base de datos.
- **Escalabilidad Data-Driven**: Todas las unidades actuales y futuras heredan automáticamente este comportamiento según el tipo de recurso configurado en `core/curriculum-config.js`.

