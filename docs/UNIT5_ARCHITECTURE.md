# Unidad 5 — Arquitectura Maestra

## 1. Propósito

La **Unidad 5 (Determinantes de Matrices 2×2 y 3×3)** es la primera unidad del plan curricular que implementa la infraestructura académica moderna basada en **Supabase Cloud**, **Edge Functions** y **PostgreSQL con RLS (Row Level Security)**.

Esta unidad sirve como **plantilla arquitectónica y pedagógica de referencia para la Unidad 6 y todas las unidades futuras** de la plataforma UEEH Matemáticas 3.º BGU.

---

## 2. Estructura Real de Archivos

Los archivos existentes de la Unidad 5 se encuentran organizados en la siguiente estructura:

```text
topics/unit5-determinantes/
├── presentation.html    # Presentación interactiva de clase (22 slides formativas)
├── gamificacion.html    # Odisea Espacial: 6 planetas interactivos con evaluación server-side
└── deber.html           # Deber interactivo (14 ejercicios iniciales + 8 de recuperación)

components/
└── activity-summary.js  # Visor central de resultados y estado de actividades en Supabase
```

---

## 3. Patrón Pedagógico y Técnico

Cada tema dentro de la arquitectura modular se compone de cuatro momentos educativos:

```text
Tema de Unidad (ej. Determinantes)
│
├── 1. Presentación de Clase (presentation.html)
│      └── Formativa · Sin calificación oficial
│
├── 2. Gamificación Evaluada (gamificacion.html)
│      └── Sumativa · Calificada server-side sobre 10.00
│
├── 3. Trabajo en Clase / Deber (deber.html)
│      └── Sumativa · 4 intentos con recuperación server-side sobre 10.00
│
└── 4. Resumen de Desempeño (activity-summary.js)
       └── Reporte oficial en tiempo real desde Supabase
```

### 3.1. Presentación (`presentation.html`)
- **Carácter**: Formativo y de instrucción docente guiada.
- **Contenido**: 22 diapositivas interactivas con renderizado matemático LaTeX mediante MathJax 3.
- **Regla de Integración**: **No registra calificaciones oficiales**. No escribe registros en `activity_attempts` ni `activity_results`. Su progreso es meramente informativo para la navegación del estudiante.

### 3.2. Gamificación (`gamificacion.html`)
- **Carácter**: Sumativo y lúdico.
- **Identificador de Actividad**: `u5-determinantes-gam-01`.
- **Mecánica**: Ruta espacial de 6 planetas con problemas de determinantes 2×2, 3×3 y condición de invertibilidad.
- **Evaluación Server-Side**:
  - Cada respuesta se envía a la Edge Function `check-activity-answer` mediante una petición autenticada con token JWT.
  - La Edge Function consulta la pauta privada en el esquema `private.activity_grading_configs` y valida el resultado sin exponer respuestas al cliente.
  - Al completar los 6 planetas, el cliente invoca `submitActivityResult()` de `core/activity-service.js`, que transmite la entrega oficial a la Edge Function `submit-activity-result`.
  - La calificación final oficial se calcula en el servidor sobre **10.00 puntos** (`minimum_score = 1.00`, `max_score = 10.00`).

### 3.3. Trabajo en Clase / Deber (`deber.html`)
- **Carácter**: Sumativo y de consolidación de destrezas.
- **Identificador de Actividad**: `u5-determinantes-class-01`.
- **Mecánica**: 14 ejercicios iniciales (cálculo 2×2, 3×3, Sarrus, cofactores, ecuaciones cuadráticas, Regla de Cramer y retos conceptuales) + 8 ejercicios de recuperación automática si el promedio inicial es inferior a 7.00/10.00.
- **Garantías de Seguridad y Rendimiento**:
  - **In-Flight Submit Guard**: Bandera síncrona `_submitting` que bloquea el botón y la interfaz antes de cualquier operación asíncrona, evitando peticiones duplicadas por clics repetidos.
  - **Pending Submission Binding**: Objeto estructurado `_pendingSubmission = { id, runId, phase, questionId, exerciseIndex }` que vincula el identificador de entrega a la pregunta exacta de origen. Si ocurre un fallo de red o error HTTP 500, la navegación se bloquea y el reintento reutiliza el mismo `question_submission_id` para garantizar idempotencia en la base de datos.
  - **Soluciones y Pautas Protegidas**: Todos los ejercicios públicos declaran `solution: null` y carecen de `correctIndex` o `acceptedAnswers`. Las pistas pedagógicas son estrictamente procedimentales y no revelan resultados ni opciones.
  - **Escala de Calificación**:
    - Intento 1 correcto: 10.00 / 10.00
    - Intento 2 correcto: 9.00 / 10.00
    - Intento 3 correcto: 8.00 / 10.00
    - Intento 4 correcto: 7.00 / 10.00
    - Intento 4 fallido: 1.00 / 10.00 (bloqueo automático)
  - **Cálculo de Recuperación**: Si aplica recuperación, la nota final se calcula oficialmente como `Math.max(notaInicial, notaRecuperacion)`, protegiendo el desempeño del estudiante.

### 3.4. Resumen de Desempeño (`components/activity-summary.js`)
- **Carácter**: Consulta y retroalimentación institucional.
- **Fuente de Verdad**: Consulta directa mediante RPC/REST a las tablas `activities`, `activity_attempts` y `activity_results` en Supabase.
- **Independencia de Caché**: No depende ni reconstruye notas desde `localStorage` o variables del navegador. Refleja el estado inmutable registrado en el backend.

---

## 4. Convenciones de Base de Datos y Aprovisionamiento

Toda actividad de Unidad 5 (y futuras) cumple con los siguientes metadatos en la tabla `public.activities`:

| Campo | Tipo | Ejemplo Unidad 5 | Descripción |
|---|---|---|---|
| `activity_key` | `text` (UNIQUE) | `u5-determinantes-gam-01` / `u5-determinantes-class-01` | Clave única e inmutable de la actividad. |
| `class_section_id` | `uuid` | `(FK -> class_sections)` | Sección académica a la que pertenece. |
| `academic_term_id` | `uuid` | `(FK -> academic_terms)` | Trimestre académico (Segundo Trimestre, `term_number = 2`). |
| `title` | `text` | `"Trabajo en Clase: Determinantes de Matrices 2x2 y 3x3"` | Título descriptivo visible en el portal. |
| `activity_type` | `text` | `'gamification'` / `'classwork'` | Tipo de actividad. |
| `unit_number` | `integer` | `5` | Número de la unidad curricular. |
| `max_score` | `numeric(4,2)` | `10.00` | Calificación máxima posible. |
| `minimum_score` | `numeric(4,2)` | `1.00` | Calificación mínima institucional garantizada. |
| `is_active` | `boolean` | `true` | Disponibilidad para resolución por estudiantes. |
| `opens_at` | `timestamptz` | `'2026-08-16 00:00:00-05'` | Fecha y hora de apertura. |
| `due_at` | `timestamptz` | `'2026-08-27 23:59:59-05'` | Fecha y hora límite de entrega. |
| `display_order` | `integer` | `1` (Gamificación), `2` (Clase) | Orden de presentación visual. |
| `source_path` | `text` | `'topics/unit5-determinantes/deber.html'` | Ruta relativa al archivo HTML de la actividad. |

---

## 5. Reglas Inmutables para Futuras Unidades (Unidad 6+)

Al construir la Unidad 6 y unidades posteriores, se deben seguir estrictamente estas directrices arquitectónicas:

1. **Reutilización de Servicios Centrales**:
   - Importar la instancia de Supabase desde `core/supabase-client.js`.
   - Utilizar `core/activity-service.js` para enviar entregas (`submitActivityResult`) y consultar estados.
   - **Prohibido** llamar a `createClient()` de forma independiente dentro de los archivos HTML de las actividades.
2. **Evaluación 100% en Backend**:
   - Las respuestas correctas, opciones válidas y pautas de calificación deben residir exclusivamente en `private.activity_grading_configs` y ser procesadas por Edge Functions.
   - **Prohibido** incluir `correctIndex`, listas de respuestas correctas o soluciones en el código JavaScript o HTML público.
3. **Escala Institucional sobre 10**:
   - Toda actividad académica oficial debe expresarse sobre **10.00 puntos**.
   - Los puntos de gamificación (ej. 60 pts) son cosméticos y deben convertirse a la escala sobre 10.00 al registrar la nota oficial.
4. **Pistas Pedagógicas Orientativas**:
   - Las pistas (`hint`) deben recordar fórmulas, propiedades o procedimientos sin revelar el resultado numérico ni la opción correcta.
5. **Idempotencia y Resiliencia de Red**:
   - Implementar control de envío en vuelo (`_submitting`) y retención de identificadores de envío (`_pendingSubmission`) para evitar intentos duplicados ante desconexiones o errores de red.
