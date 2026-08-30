---
name: UEEH
description: Integra una nueva unidad de Matemáticas de Tercero de BGU en la plataforma UEEH a partir de tres archivos fuente ya terminados: presentation.html, gamificacion.html y deber.html. Conserva intactos los originales y adapta la copia a la arquitectura validada de Unidad 5+ con persistencia por ejercicio, activity_runs canónicos resueltos por servidor, políticas diferenciadas classwork/gamification, grading y finalización server-side, retry idempotente, aislamiento de resultados por unidad, release/cache global, validación de Edge Functions, Supabase, administración segura, pruebas, mobile y GitHub Pages sin modificar innecesariamente la infraestructura.
---

# UEEH

> Revisión v5: incorpora salvaguardas aprendidas de incidencias reales de producción: servicio compartido obligatorio para COMPROBAR, adopción obligatoria del `run_id` canónico devuelto por servidor, finalización basada en progreso canónico, retry idempotente con distinción entre incertidumbre de red y error HTTP confirmado, validación de BOOT_ERROR/OPTIONS, edición administrativa segura, reapertura de plazos, resultados aislados por unidad y actualización automática de release/cache sin exigir borrado manual en celulares.

## PROPÓSITO

Esta Skill sirve EXCLUSIVAMENTE para integrar nuevas unidades de Matemáticas en la plataforma:

UEEH_MATEMATICAS_3RO_BGU

El usuario proporcionará una carpeta local que contiene exactamente los tres recursos fuente de una nueva unidad:

presentation.html
gamificacion.html
deber.html

Estos archivos ya contienen:

- contenido matemático;
- diseño visual;
- DUA;
- ejercicios;
- pistas;
- soluciones;
- mecánica pedagógica;
- interacción;
- reglas locales de intentos;
- AUTHORING_ANSWER_KEY en actividades evaluables.

La Skill NO debe volver a crear estos recursos desde cero.

La misión de la Skill es:

TOMAR LOS 3 HTML FUENTE
↓
CONSERVAR LOS ORIGINALES
↓
CREAR UNA COPIA DENTRO DEL PROYECTO
↓
ADAPTAR ESA COPIA A LA ARQUITECTURA UEEH
↓
INTEGRAR LA NUEVA UNIDAD
↓
PROTEGER CALIFICACIÓN Y RESPUESTAS
↓
CONFIGURAR ACTIVIDADES
↓
EJECUTAR PRUEBAS
↓
ENTREGAR REPORTE
↓
DETENERSE ANTES DE COMMIT/PUSH

---

# FORMA DE INVOCACIÓN

Ejemplo:

Usa la Skill UEEH.

Implementa la Unidad 6.

Los tres HTML fuente se encuentran en:

"C:\ruta\de\mi\unidad6"

Tema:

"Sistemas de ecuaciones lineales"

Otra forma válida:

Usa UEEH e integra la siguiente unidad.

Fuente:
"C:\ruta\de\la\carpeta"

Si el usuario indica explícitamente el número de unidad, utilizar ese número.

Si NO lo indica:

determinar la siguiente unidad disponible revisando:

core/curriculum-config.js

y la estructura actual de:

topics/

NO asumir automáticamente que siempre será Unidad 6.

---

# PRINCIPIO FUNDAMENTAL

La Unidad 5 es la REFERENCIA ARQUITECTÓNICA VALIDADA.

Referencia actual:

topics/unit5-determinantes/

Usar Unidad 5 para comprender:

- estructura;
- integración;
- navegación;
- seguridad;
- grading;
- intentos;
- Supabase;
- frontend;
- Edge Functions;
- actividad final;
- retries;
- mobile;
- anti-caché;
- tests.

NO copiar ciegamente valores específicos de Unidad 5.

NO copiar:

- activity_key;
- exercise_key;
- tema;
- título;
- contenido;
- fechas;
- respuestas;
- grading config;
- unit_number.

La Unidad 5 es PATRÓN, no contenido para duplicar.

---

# ESTADO ARQUITECTÓNICO VALIDADO ACTUAL

Esta Skill fue actualizada para la infraestructura vigente de Unidad 5+.

Antes de integrar una nueva unidad, verificar que el repositorio actual conserve o haya evolucionado de forma compatible con estos componentes:

- `public.activities`;
- `public.activity_runs`;
- `public.activity_exercise_progress`;
- `public.activity_exercise_checks`;
- `public.activity_attempts`;
- `public.activity_results`;
- `private.activity_grading_configs`;
- `core/exercise-progress-service.js`;
- `core/activity-service.js`;
- `components/activity-summary.js`;
- `check-activity-answer`;
- `submit-activity-result`.

La infraestructura validada actualmente utiliza:

`activities.attempt_policy`

con dos políticas:

`classwork_limited`

para Trabajo en clase / Deber, y:

`gamification_unlimited`

para Gamificación.

Regla `classwork_limited`:

1 correcto → 10
2 correcto → 9
3 correcto → 8
4 correcto → 7
4 respuestas incorrectas → 1, `status = failed`, `locked = true`
quinto intento → rechazado

Regla `gamification_unlimited`:

1 correcto → 10
2 correcto → 9
3 correcto → 8
4 o cualquier intento posterior correcto → 7
respuesta incorrecta → `score = null`, `status = incorrect`, `locked = false`
intentos → ilimitados
el reto se bloquea únicamente al acertar

La persistencia académica por ejercicio se basa en:

`activity_runs`

para identificar la ejecución completa de una actividad;

`activity_exercise_checks`

para conservar historial inmutable e idempotente de cada comprobación;

`activity_exercise_progress`

para conservar el estado consolidado actual de cada ejercicio.

Principio UX obligatorio:

COMPROBAR
=
VALIDAR
+
CONSUMIR INTENTO
+
GUARDAR AUTOMÁTICAMENTE EN SUPABASE

NO agregar botones:

Guardar

Guardar progreso

Sincronizar

El estudiante no debe preocuparse por guardar manualmente.

Cada comprobación utiliza un `check_id` idempotente.

La entrega final utiliza `submission_id` idempotente.

F5, cierre del navegador o cambio de dispositivo NO deben reiniciar intentos ni progreso oficial.

Al abrir una actividad evaluable, la UI debe restaurar automáticamente el progreso desde Supabase.

Al momento de esta actualización, `check-activity-answer` se encontraba desplegada con JWT verificado y soporte para las dos políticas. Sin embargo, la regla de fuente de verdad de esta Skill sigue siendo inspeccionar la versión ACTUAL antes de integrar.

---

# REGLA DE FUENTE DE VERDAD

Antes de implementar:

INSPECCIONAR SIEMPRE EL CÓDIGO ACTUAL DEL REPOSITORIO.

No asumir que la arquitectura sigue exactamente igual que cuando se escribió esta Skill.

Las fuentes de verdad son, en este orden:

1. código actual del proyecto;
2. arquitectura actualmente utilizada por Unidad 5;
3. tests actuales;
4. documentación actual;
5. esta Skill.

Si existe una diferencia entre esta Skill y una arquitectura posterior claramente validada en el proyecto:

NO forzar automáticamente una arquitectura antigua.

Analizar la diferencia y reportarla antes de realizar un cambio destructivo.

---

# PRE-FLIGHT OBLIGATORIO

ANTES DE MODIFICAR NADA ejecutar:

git status
git branch --show-current
git rev-parse HEAD
git fetch origin
git rev-parse origin/main

Comprobar:

- rama actual;
- estado del repositorio;
- HEAD;
- origin/main;
- archivos modificados.

Si existen cambios del usuario NO relacionados con la nueva unidad:

NO sobrescribirlos.

NO descartarlos.

NO hacer reset.

NO hacer checkout destructivo.

Si los cambios pueden interferir con la integración:

DETENERSE y reportar.

## SINCRONIZACIÓN LOCAL/REMOTA Y ARCHIVOS GENERADOS

La fecha visual mostrada por GitHub Desktop NO es autoridad para decidir si `main` está actualizado.

La autoridad es:

`git rev-parse HEAD`

comparado con:

`git rev-parse origin/main`

Si la rama local `main` está atrasada y el working tree está limpio, actualizar únicamente mediante:

`git pull --ff-only origin main`

NO crear merge commit por una simple sincronización.

Si se trabaja en una rama de integración, comprobar que parte del `origin/main` vigente o reportar la divergencia antes de modificar la unidad.

Archivos generados o ignorados como:

- `node_modules/`;
- `deno.lock` cuando el `.gitignore` vigente lo excluya;
- `supabase/.temp/`;
- `scratch/`;
- logs locales;

NO deben terminar en un commit de integración por accidente.

Si GitHub Desktop muestra cientos de archivos generados:

1. inspeccionar `.gitignore`;
2. ejecutar primero `git clean -ndX`;
3. verificar que la simulación contiene EXCLUSIVAMENTE archivos ignorados seguros;
4. solo con autorización explícita del usuario puede utilizarse `git clean -fdX`.

NO sustituir `-X` por `git clean -fd`, porque este último puede borrar archivos no ignorados.

Los tests del repositorio NO deben depender de rutas absolutas específicas de otro equipo como `C:\\Users\\...`, Dropbox, OneDrive externo o carpetas privadas. Las verificaciones obligatorias deben ser repo-locales. Si existe una comparación opcional contra originales externos, reportarla como opcional y no confundir su ausencia con un fallo de producción.

Nunca ejecutar:

git reset --hard

git clean -fd

git checkout -- .

git restore .

sin autorización explícita.

---

# REGLA DE GIT

Durante la implementación:

NO hacer commit.

NO hacer push.

NO crear tag.

NO modificar tags existentes.

NO hacer force push.

NO utilizar:

git push --force

Al finalizar:

entregar reporte.

El usuario decidirá posteriormente si autoriza publicación.

---

# VALIDAR CARPETA FUENTE

La carpeta proporcionada por el usuario debe contener:

presentation.html
gamificacion.html
deber.html

Verificar los tres.

Si falta alguno:

DETENERSE.

NO inventarlo.

NO sustituirlo.

NO crear contenido nuevo para reemplazarlo.

Reportar cuál falta.

---

# LOS ORIGINALES SON INMUTABLES

REGLA OBLIGATORIA:

NO modificar los tres archivos originales proporcionados por el usuario.

Los archivos de la carpeta fuente son:

MASTER / ORIGINALES.

Primero:

1. leerlos;
2. auditarlos;
3. obtener hash o comprobar tamaño si es útil;
4. copiarlos al proyecto;
5. trabajar únicamente sobre las copias.

Nunca guardar modificaciones sobre la carpeta original.

---

# DETERMINAR NUEVA UNIDAD

Determinar:

unit_number

title

topic

slug

Ejemplo:

Unidad:

6

Tema:

Sistemas de ecuaciones lineales

Slug:

sistemas-ecuaciones

Ruta:

topics/unit6-sistemas-ecuaciones/

El slug debe ser:

- corto;
- legible;
- minúsculas;
- sin tildes;
- sin espacios;
- separado con guiones;
- estable.

NO utilizar slugs extremadamente largos.

---

# ESTRUCTURA DE LA NUEVA UNIDAD

Crear:

topics/unitX-slug/

y copiar exactamente:

presentation.html
gamificacion.html
deber.html

Ejemplo:

topics/
└── unit6-sistemas-ecuaciones/
    ├── presentation.html
    ├── gamificacion.html
    └── deber.html

Trabajar únicamente sobre estas copias.

---

# AUDITORÍA DE LOS HTML FUENTE

ANTES de integrar, revisar cada archivo.

## presentation.html

Debe ser principalmente:

RECURSO DOCENTE.

No debe depender de:

- Supabase;
- Google Sheets;
- autenticación;
- student_id;
- notas;
- service_role;
- backend.

Debe funcionar autónomamente.

Debe usar MathJax correctamente cuando corresponda.

Debe conservar todos los procedimientos matemáticos.

---

## gamificacion.html

Debe contener:

- IDs estables;
- mecánica de juego;
- intentos;
- feedback;
- pistas;
- soluciones;
- AUTHORING_ANSWER_KEY o equivalente claramente centralizado;
- validación local claramente identificable.

Regla pedagógica esperada de Gamificación:

Intento 1 correcto → 10
Intento 2 correcto → 9
Intento 3 correcto → 8
Intento 4 correcto → 7
Intento 5 o posterior correcto → 7

Intentos ilimitados.

El estudiante NO avanza hasta resolver correctamente el reto.

No existe recuperación automática por cantidad de intentos en Gamificación.

Si el HTML fuente utiliza una regla distinta:

NO cambiarla silenciosamente.

Reportar la discrepancia.

---

## deber.html

Debe contener:

- IDs estables q1, q2... o equivalentes;
- IDs de recuperación r1, r2... o equivalentes;
- ejercicios principales;
- recuperación;
- feedback;
- pistas;
- soluciones;
- AUTHORING_ANSWER_KEY o equivalente;
- validación local centralizada.

Regla pedagógica esperada:

Intento 1 correcto → 10
Intento 2 correcto → 9
Intento 3 correcto → 8
Intento 4 correcto → 7
No logrado después del ciclo ordinario → 1

Cuando corresponda:

activar recuperación de acuerdo con la lógica pedagógica definida en el HTML fuente y las reglas vigentes del sistema UEEH.

Nunca usar 0 como calificación académica final cerrada.

La nota mínima institucional de UEEH es:

1/10.

---

# NO REESCRIBIR EL DISEÑO

La Skill NO tiene como misión rediseñar arbitrariamente los tres HTML.

Conservar:

- identidad visual;
- colores;
- narrativa;
- estructura pedagógica;
- ejercicios;
- MathJax;
- DUA;
- explicaciones;
- mecánica;
- animaciones razonables.

Modificar únicamente lo necesario para integrar el recurso de manera segura con UEEH.

---

# PRESENTATION.HTML

La presentación:

NO es actividad evaluable.

Debe conservar caché normal.

NO agregar:

?v=Date.now()

Service Worker

Cache Storage

caches.delete()

mecanismos propios de anti-caché.

La plataforma UEEH ya gestiona el comportamiento apropiado.

Integrar presentation.html únicamente como recurso curricular.

---

# GAMIFICACION.HTML Y DEBER.HTML

Estos dos archivos SÍ son actividades evaluables.

Sus copias desplegadas NO pueden continuar utilizando el navegador como autoridad académica.

Durante la integración:

la validación local utilizada por el HTML fuente debe convertirse al patrón seguro UEEH.

El resultado debe seguir la arquitectura actualmente validada de Unidad 5.

---

# AUTHORING_ANSWER_KEY

Los archivos fuente pueden contener:

AUTHORING_ANSWER_KEY

porque necesitan funcionar autónomamente antes de integrarse.

PERO:

LA COPIA DE PRODUCCIÓN NO DEBE EXPONER LA PAUTA DE RESPUESTAS.

Durante integración:

1. localizar AUTHORING_ANSWER_KEY;

2. validar que todas las preguntas tengan una pauta;

3. trasladar la información necesaria al grading privado correspondiente;

4. adaptar la validación frontend a server-side;

5. retirar del HTML desplegado las respuestas que permitirían conocer la solución directamente;

6. comprobar que no queden respuestas correctas expuestas accidentalmente.

No asumir que cambiar el nombre de una variable protege una respuesta.

No ofuscar.

La seguridad debe provenir del servidor.

---

# PROHIBIDO EXPONER RESPUESTAS

En las copias desplegadas buscar especialmente:

correctIndex
correctAnswer
correct_answer
expectedAnswer
expected_answer
acceptedAnswers
answerKey
AUTHORING_ANSWER_KEY
solutionAnswer
isCorrect
data-correct

Si alguno contiene una pauta evaluativa accesible al estudiante:

trasladarla al backend privado.

No eliminar el VALOR PEDAGÓGICO de:

pistas pedagógicas

ni de:

soluciones paso a paso.

Sin embargo, en las copias desplegadas evaluables NO mantener una solución completa accesible en JavaScript/HTML si eso permite descubrir la respuesta antes de tiempo.

Las soluciones sensibles deben trasladarse al grader/backend privado o a una respuesta server-side segura y solo mostrarse en el momento pedagógicamente permitido:

- después de `correct`;
- o, para `classwork_limited`, después de `failed`.

En `gamification_unlimited`, una respuesta incorrecta nunca debe liberar la solución completa.

---

# PISTAS

AUDITAR todas las pistas.

Especialmente:

RECUPERACIÓN.

Una pista NO debe revelar:

- respuesta final;
- opción correcta;
- resultado numérico final;
- letra correcta;
- matriz resultante completa si eso constituye la respuesta.

La pista debe orientar.

No resolver.

---

# VALIDACIÓN SERVER-SIDE

Usar la arquitectura actualmente validada de:

check-activity-answer

o su equivalente vigente.

La respuesta del estudiante debe validarse en servidor.

El frontend NO debe enviar como autoridad:

student_id

score

exercise_score

attempt_number

correct_answer

expected_answer

is_correct

best_score

La identidad del estudiante debe derivarse del:

JWT autenticado.

---

# IDENTIDAD DEL ESTUDIANTE

Nunca solicitar manualmente:

nombre

correo

student_id

linked_user_id

La plataforma ya utiliza autenticación Google/Supabase.

La identidad académica se deriva del usuario autenticado.

---

# CHECK-ACTIVITY-ANSWER

Antes de modificar la integración:

INSPECCIONAR la versión ACTUAL de:

`supabase/functions/check-activity-answer/`

No inventar un contrato distinto si ya existe uno funcionando.

El contrato canónico de Unidad 5+ debe basarse conceptualmente en:

`activity_key`

`exercise_key`

`answer`

`check_id`

El frontend NO debe enviar como autoridad:

`student_id`

`score`

`correct`

`attempt_number`

`remaining_attempts`

`locked`

`best_score`

La Edge Function debe mantener:

- autenticación JWT;
- resolución del estudiante desde `auth.uid()`;
- validación de estudiante activo;
- matrícula activa;
- sección;
- actividad;
- `opens_at`;
- `due_at`;
- resolución/validación del `activity_run` oficial;
- validación de `exercise_key` contra grading privado;
- calificación server-side;
- `check_id` idempotente;
- política de intentos obtenida desde la actividad;
- escritura server-side del historial y progreso.

Si el cliente proporciona `run_id`, nunca confiar en él para crear o reiniciar una ejecución. El backend debe validar o resolver el run oficial del estudiante.

## RUN CANÓNICO OBLIGATORIO

El navegador NO debe inventar, generar ni mantener como autoridad académica un UUID de `activity_run`.

Cuando `check-activity-answer` o el servicio central cree/resuelva el run oficial, la respuesta server-side debe devolver el `run_id` canónico vigente.

El servicio compartido del frontend debe:

1. adoptar ese `run_id` canónico;
2. reutilizarlo en comprobaciones posteriores cuando el contrato actual lo requiera;
3. utilizarlo como referencia para la finalización;
4. sustituir cualquier UUID local previo que nunca fue confirmado por servidor.

Un `run_id` del cliente es, como máximo, un HINT. Nunca es autoridad.

Para la entrega final, si la arquitectura actual conserva esta semántica, la resolución segura debe seguir este orden conceptual:

1. si ya existe un `activity_attempt` para `(student, activity, submission_id)`, devolver ese intento y preservar idempotencia;
2. si el `run_id` recibido corresponde al run canónico actual, propiedad del estudiante autenticado y de la actividad, utilizarlo;
3. si el `run_id` recibido es local, obsoleto o no pertenece al run canónico, pero existe EXACTAMENTE un run actual `in_progress` para ese estudiante + actividad, utilizar el run canónico actual;
4. si existen múltiples runs activos ambiguos, rechazar con error explícito y NO elegir arbitrariamente;
5. permitir fallback histórico únicamente cuando NO exista progreso/run canónico vigente y el código actual realmente necesite compatibilidad histórica.

El fallback histórico NUNCA debe tener prioridad sobre un run canónico actual.

Errores como `RUN_NOT_OWNED` en una actividad recién completada deben investigarse primero como posible inconsistencia de integración de `run_id`, no como error del código institucional del estudiante, matrícula o cuenta Google.

Prueba obligatoria para toda unidad nueva evaluable:

- iniciar actividad desde un navegador/sesión sin `run_id` previo;
- realizar la primera comprobación;
- confirmar que el frontend adopta el `run_id` devuelto por servidor;
- completar todos los ejercicios;
- finalizar;
- esperar HTTP exitoso y creación de exactamente un intento/resultado oficial.

Compatibilidad antigua como:

`question_id`

`question_submission_id`

`phase`

solo debe conservarse si el código ACTUAL realmente la necesita. No crear aliases innecesarios para unidades nuevas.

Para `gamification_unlimited`:

`remaining_attempts = null`

mientras el reto siga abierto.

Para `classwork_limited`:

`remaining_attempts` debe reflejar 3, 2, 1 o 0 según corresponda.

La solución completa o respuesta pedagógica sensible NO debe devolverse mientras el ejercicio permanezca:

`pending`

o:

`incorrect`.

Puede devolverse únicamente cuando el estado terminal permitido sea alcanzado:

`correct`

o, para `classwork_limited`:

`failed`.

Si el nuevo tipo matemático necesita lógica adicional de grading:

EXTENDER únicamente el grader necesario.

NO reescribir toda la función.

NO debilitar las validaciones existentes.

Si se modifica la Edge Function:

- ejecutar `deno check`;
- ejecutar tests;
- desplegar solo si es necesario;
- mantener `verify_jwt = true`;
- nunca usar `--no-verify-jwt` para esta función.

---

# NUEVOS TIPOS DE PREGUNTAS

Antes de agregar código al backend:

comparar los tipos de preguntas de la nueva unidad con los tipos ya soportados.

Ejemplos posibles:

mcq
input
fill

Si ya existe soporte:

REUTILIZARLO.

No crear un segundo grader para lo mismo.

Si aparece un modo realmente nuevo:

1. documentar el nuevo modo;
2. agregar soporte mínimo;
3. mantener compatibilidad con Unidad 5;
4. agregar tests;
5. no romper preguntas existentes.

---

# NORMALIZACIÓN MATEMÁTICA

La validación de respuestas escritas debe respetar el patrón existente.

Cuando corresponda puede aceptar:

3
x=3
x = 3

o equivalencias matemáticas definidas.

No aplicar una normalización excesiva que convierta respuestas incorrectas en correctas.

Para nuevos formatos:

agregar tests.

---

# EXERCISE KEYS

Conservar los IDs estables definidos en los HTML fuente, pero mapearlos al concepto vigente:

`exercise_key`.

Preferir que los HTML fuente nuevos ya utilicen una propiedad explícita:

`exerciseKey`.

Ejemplos:

`level01-q01`

`initial-q01`

No convertirlos a IDs aleatorios.

No usar el texto del ejercicio como identificador.

Los `exercise_key` deben coincidir entre:

frontend

grading config privado

`activity_exercise_checks`

`activity_exercise_progress`

backend.

Si una fuente antigua utiliza `q1`, `q2`, `g1`, etc. y esos IDs son estables, pueden conservarse y mapearse sin necesidad de renombrar todo el diseño.

---

# CHECK ID

La idempotencia vigente por comprobación utiliza:

`check_id`.

Cada acción lógica de COMPROBAR debe generar un identificador UUID estable para ese request lógico.

Si la red falla después de que el servidor procesó la respuesta:

el retry debe reutilizar el MISMO `check_id`.

Nunca generar un `check_id` nuevo para un retry técnico del mismo clic.

La infraestructura debe soportar idempotencia histórica:

Check A → intento 1

Check B → intento 2

retry tardío Check A

Resultado esperado:

`attempt_count` continúa en 2.

No permitir que:

- doble click;
- doble tap;
- Enter repetido;
- retry de red;

produzcan intentos académicos adicionales.

---

# PROTECCIÓN DE DOBLE SUBMIT

Conservar o implementar guard:

_submittingAnswer

o equivalente.

Mientras una respuesta está siendo comprobada:

deshabilitar el botón.

No procesar simultáneamente:

click
tap
Enter.

Utilizar try/finally cuando corresponda.

---

# PERSISTENCIA AUTOMÁTICA POR EJERCICIO

REUTILIZAR la infraestructura global vigente.

NO crear tablas ni servicios por unidad.

Componentes esperados:

`public.activity_runs`

`public.activity_exercise_progress`

`public.activity_exercise_checks`

`core/exercise-progress-service.js`

La función pedagógica del botón debe ser:

COMPROBAR
↓
`checkExercise(...)`
↓
`check-activity-answer`
↓
validación server-side
↓
registro idempotente del check
↓
actualización del progreso
↓
respuesta segura a UI

El navegador NO debe escribir directamente en las tablas académicas.

`activity_exercise_checks`:

- historial inmutable de comprobaciones;
- conserva `check_id`;
- evita que retries antiguos consuman nuevos intentos.

`activity_exercise_progress`:

- estado consolidado del ejercicio;
- respuesta guardada;
- `attempt_count`;
- `score` terminal cuando corresponda;
- `status`;
- `locked`.

`activity_runs`:

- identifica la ejecución completa;
- evita reiniciar intentos inventando `run_id`;
- mantiene historial entre intentos completos de la actividad.

Al cargar `gamificacion.html` o `deber.html` de producción:

1. autenticar mediante la plataforma existente;
2. obtener progreso oficial;
3. restaurar automáticamente respuestas/estados;
4. bloquear `correct` y `failed` cuando corresponda;
5. restaurar contador de intentos;
6. permitir continuar exactamente donde quedó.

NO exigir al estudiante pulsar un botón “Recuperar”.

NO usar `localStorage` o `sessionStorage` como fuente oficial.

---

# INTEGRACIÓN OBLIGATORIA DEL SERVICIO DE PROGRESO

Para TODA actividad evaluable nueva, `gamificacion.html` y `deber.html` de producción DEBEN reutilizar explícitamente el servicio central vigente:

`core/exercise-progress-service.js`

La integración debe comprobar en el código desplegado que se importan y utilizan las funciones vigentes equivalentes a:

`checkExercise(...)`

`getExerciseProgress(...)`

PROHIBIDO implementar en una nueva unidad llamadas `fetch(...)` inline o ad-hoc directamente desde el HTML hacia `check-activity-answer`, aunque el endpoint sea correcto.

PROHIBIDO duplicar dentro de cada HTML la lógica de:

- obtención de sesión/JWT;
- construcción del request académico;
- idempotencia de `check_id`;
- clasificación de errores técnicos;
- restauración de progreso;
- retries de comprobación.

La única excepción sería que el repositorio actual haya reemplazado formalmente `exercise-progress-service.js` por otro servicio global equivalente. En ese caso, inspeccionar el código vigente y reutilizar ESE servicio común.

Antes de considerar integrada una actividad evaluable, verificar explícitamente:

1. `gamificacion.html` importa/reutiliza el servicio central = SÍ;
2. `deber.html` importa/reutiliza el servicio central = SÍ;
3. `fetch` académico inline hacia `check-activity-answer` = 0;
4. restauración mediante `getExerciseProgress` o equivalente = SÍ;
5. autenticación proviene de la sesión Supabase vigente = SÍ.

Si cualquiera falla, la unidad NO está lista para publicación.

---

# RETRY TÉCNICO E IDEMPOTENCIA DE CHECK_ID

Una acción lógica de COMPROBAR genera un único `check_id`.

Si ocurre un error cuyo resultado académico es desconocido, por ejemplo:

- pérdida de red;
- timeout;
- `fetch` interrumpido;
- respuesta del servidor perdida;
- error técnico antes de recibir confirmación definitiva;

el siguiente reintento del MISMO envío debe reutilizar exactamente el mismo `check_id`.

NO generar un UUID nuevo únicamente porque el usuario volvió a pulsar COMPROBAR después de un error técnico.

Generar un nuevo `check_id` solo cuando existe confirmación definitiva de que la comprobación anterior terminó y el estudiante realiza una NUEVA comprobación académica.

La UI debe conservar durante un error técnico:

- ejercicio actual;
- respuesta seleccionada/escrita;
- estado previo confirmado;
- `check_id` pendiente;
- botón reactivable para retry.

Un error técnico NO debe:

- marcar `incorrect`;
- marcar `failed`;
- asignar 1/10;
- avanzar de reto;
- borrar la selección;
- bloquear el ejercicio;
- consumir visualmente otro intento sin confirmación server-side.

Gamificación y classwork deben mostrar feedback técnico visible y no destructivo.

---

# GAMIFICACIÓN — INTENTOS

La actividad de tipo:

`gamification`

debe utilizar explícitamente, cuando el esquema vigente lo permita:

`attempt_policy = gamification_unlimited`.

El frontend puede mostrar:

Intento actual

Puntaje disponible

pero NO debe decidir oficialmente el intento.

El servidor mantiene autoridad sobre `attempt_count`.

Regla definitiva:

1 correcto → 10

2 correcto → 9

3 correcto → 8

4 correcto → 7

5 correcto → 7

6 correcto → 7

n correcto → 7

Los intentos son ILIMITADOS.

Si la respuesta es incorrecta:

`score = null`

`status = incorrect`

`locked = false`

`remaining_attempts = null`

El reto continúa abierto.

NO existe:

- `failed` por cantidad de intentos;
- 1/10 por exceso de intentos;
- quinto intento bloqueado;
- límite máximo de comprobaciones.

El reto se bloquea únicamente cuando:

`status = correct`.

El estudiante NO avanza mientras el estado sea `pending` o `incorrect`.

La solución completa NO se muestra hasta acertar.

Nunca confiar en un `attempt_count` enviado por navegador.

---

# TRABAJO EN CLASE — INTENTOS

La actividad de tipo:

`classwork`

debe utilizar explícitamente, cuando el esquema vigente lo permita:

`attempt_policy = classwork_limited`.

Regla definitiva:

1 correcto → 10

2 correcto → 9

3 correcto → 8

4 correcto → 7

4.º intento incorrecto → 1

En el cuarto fallo:

`status = failed`

`score = 1`

`locked = true`

No existe quinto intento.

Si el ejercicio queda `correct`:

`locked = true`.

Si está `incorrect` y todavía quedan intentos:

`score = null`

`locked = false`.

La calificación oficial siempre es server-side.

Nunca utilizar 0 como nota terminal.

La UI puede mostrar los intentos restantes, pero el backend es la autoridad.

---

# TRABAJO EN CLASE — RECUPERACIÓN

Los HTML fuente pueden contener una fase pedagógica de recuperación.

NO asumir automáticamente que una recuperación condicional forma parte del MISMO conjunto obligatorio de `exercise_key` del grading oficial.

Antes de integrar recuperación:

1. inspeccionar cómo la Unidad 5 y el backend ACTUAL representan recuperación;
2. comprobar si `finalize_activity_run` / grading privado soportan ejercicios condicionales;
3. comprobar cómo se calcula el denominador oficial;
4. comprobar que los ejercicios de recuperación no se vuelvan obligatorios para estudiantes que no la necesitan.

Si el backend actual YA soporta recuperación condicional:

reutilizar exactamente ese patrón.

Si NO la soporta:

NO inventar una extensión estructural durante una integración ordinaria.

Mantener la recuperación del HTML fuente como experiencia pedagógica de preview o reportar que requiere decisión adicional, por ejemplo una actividad de recuperación separada.

No modificar esquema central únicamente para acomodar una recuperación de una unidad sin aprobación explícita.

---

# CALIFICACIÓN OFICIAL

La calificación oficial NO puede provenir de:

localStorage

sessionStorage

visualScore

previewScore

DOM

parámetros GET

variables manipulables.

Supabase/backend es la fuente oficial.

---

# EXERCISE-PROGRESS-SERVICE

REUTILIZAR:

`core/exercise-progress-service.js`

No crear:

`exercise-progress-service-unit6.js`

`exercise-progress-service-unit7.js`

ni copias por unidad.

La integración de `gamificacion.html` y `deber.html` debe adaptarse al contrato genérico vigente, conceptualmente equivalente a:

`checkExercise(...)`

`getExerciseProgress(...)`

`restoreExerciseProgress(...)`

`finalizeActivity(...)`

El HTML de producción debe utilizar este servicio o el equivalente vigente para:

- COMPROBAR;
- recuperar progreso;
- aplicar estados bloqueados;
- finalizar la actividad.

No duplicar fetch/RPC manual en cada unidad si el servicio global ya lo resuelve.

---

# ACTIVITY-SERVICE

REUTILIZAR:

core/activity-service.js

o su equivalente vigente.

NO crear:

activity-service-unit6.js

activity-service-unit7.js

copias por unidad.

NO modificar activity-service.js si la nueva unidad puede funcionar con su contrato genérico existente.

Si parece necesario modificarlo:

analizar primero.

Solo modificar si existe una necesidad arquitectónica real.

Agregar tests.

---

# RESULTADO FINAL DE ACTIVIDAD

Seguir el patrón vigente de:

`submit-activity-result`

junto con la finalización del `activity_run` o equivalente actual.

Mantener:

`submission_id`

idempotencia

reintentos

`best_score`

`attempt_count`

`minimum_score`

`status`

según la arquitectura vigente.

La entrega final debe ser validada server-side.

NO permitir finalizar si faltan ejercicios obligatorios terminales.

Para `classwork_limited`, un ejercicio obligatorio es terminal cuando está:

`correct`

o:

`failed`.

Para `gamification_unlimited`, los retos obligatorios deben llegar a:

`correct`.

No existe `failed` por exceso de intentos en gamificación.

El servidor debe obtener desde el grading privado la lista COMPLETA de `exercise_key` requeridos y utilizar ese total como denominador.

NO calcular denominador usando solo las filas que el estudiante alcanzó a crear.

Si la actividad está incompleta:

rechazar la entrega sin crear `activity_attempt` ni resultado oficial completado.

No permitir que el navegador decida el `best_score` oficial.

La idempotencia de `submission_id` es obligatoria incluso si la primera respuesta HTTP se perdió después de registrar correctamente la entrega.

Retry del mismo `submission_id`:

- NO crea nuevo `activity_run`;
- NO crea nuevo `activity_attempt`;
- NO incrementa `attempt_count`;
- devuelve la confirmación de la entrega ya registrada.

## FUENTE CANÓNICA PARA EL RESUMEN Y LA FINALIZACIÓN

Mientras la arquitectura vigente conserve `activity_exercise_progress`, una entrega NUEVA debe calcularse a partir del progreso canónico del `activity_run` actual.

Funciones equivalentes a `get_activity_run_summary(...)` NO deben depender exclusivamente de un ledger histórico antiguo si `check-activity-answer` ya escribe en la arquitectura canónica nueva.

Regla de compatibilidad:

- si el run tiene progreso canónico nuevo → usar SOLO ese progreso para el resumen de ese run;
- si el run NO tiene progreso canónico nuevo y existe historial legacy válido → permitir fallback histórico;
- NO mezclar filas nuevas y antiguas del mismo run creando duplicados o denominadores incorrectos.

La lista completa de ejercicios obligatorios sigue viniendo del grading privado. El progreso canónico indica su estado, NO redefine el denominador oficial.

Agregar prueba de regresión que cubra:

- run nuevo completo sin filas legacy → finaliza correctamente;
- run histórico solo legacy → continúa funcionando;
- run nuevo con progreso canónico → el fallback legacy no toma prioridad.

---

# RETRIES

Los errores técnicos NO deben generar calificación.

Distinguir OBLIGATORIAMENTE dos escenarios:

## A. INCERTIDUMBRE REAL DE RED

Existe incertidumbre únicamente cuando el cliente NO recibió una respuesta definitiva, por ejemplo:

- `fetch` rechazado;
- pérdida de red;
- timeout sin respuesta HTTP confirmada;
- conexión interrumpida;
- respuesta perdida después de que el servidor pudo haber procesado la solicitud.

En este caso:

- conservar el MISMO `submission_id`;
- conservar el pending correspondiente;
- mostrar estado equivalente a `PENDING_RETRY` / “Pendiente de confirmar”;
- el retry técnico debe reutilizar el mismo `submission_id`;
- NO crear un nuevo intento académico.

## B. ERROR HTTP CONFIRMADO

Si el navegador recibió una respuesta HTTP con body/código de error, el resultado técnico de la solicitud SÍ es conocido.

Ejemplos:

- 400;
- 403;
- 404;
- 409;
- 413;
- 5xx con respuesta recibida.

En este caso:

- NO mostrar “problemas de conexión previa” como explicación genérica;
- NO mantener falsamente el estado `PENDING_RETRY`;
- limpiar el pending de ESA `submission_id` o convertirlo en un estado explícito de error confirmado según el servicio vigente;
- mostrar `code/error` seguro devuelto por servidor;
- si el usuario vuelve a intentar y el contrato permite retry, preservar el mismo `submission_id` cuando sea necesario para idempotencia, pero no confundirlo con una solicitud de resultado desconocido.

Nunca borrar un pending perteneciente a otra actividad o a otra `submission_id`.

Un HTTP 400 confirmado debe diagnosticarse por su `code` real antes de culpar a caché, conexión, código institucional o estudiante.

---

# SESSION STORAGE

Puede utilizarse únicamente según el patrón actual para:

estado temporal

pending retry

submission_id

Cuando exista una entrega pendiente, guardar el envelope mínimo necesario para reproducir exactamente el request lógico, según el contrato vigente, por ejemplo:

- `activity_key`;
- `submission_id`;
- `submission`;
- `run_id` como hint/canónico confirmado, nunca como autoridad local;
- `phase` si aplica;
- `initial_run_id` si aplica.

NO guardar en ese pending:

- JWT;
- access token;
- refresh token;
- `student_id` autoritativo;
- score oficial;
- service role.

Compatibilidad legacy:

- si un pending antiguo no contiene `run_id`, el backend/servicio debe resolver el único run canónico vigente de forma segura;
- si contiene un `run_id` obsoleto, el servidor debe tratarlo como hint y preferir el único run canónico actual cuando corresponda;
- si un `submission_id` legacy es sintácticamente inválido y nunca pudo registrarse oficialmente, el servicio vigente puede regenerarlo de forma controlada;
- nunca regenerar un `submission_id` que ya tenga un intento oficial registrado.

No borrar globalmente sessionStorage.

PROHIBIDO:

sessionStorage.clear()

---

# LOCAL STORAGE

No guardar nota oficial.

No utilizar localStorage como fuente académica.

No borrar globalmente localStorage.

PROHIBIDO:

localStorage.clear()

Esto podría romper autenticación.

---

# ACTIVITY RESULTS

Usar:

public.activity_results

o la estructura vigente equivalente.

El estudiante debe poder visualizar posteriormente su resultado mediante el resumen global existente.

NO crear una tabla de resultados nueva para cada unidad.

---

# ACTIVITY SUMMARY

REUTILIZAR:

components/activity-summary.js

o el componente global actualmente vigente.

NO crear:

activity-summary-unit6.js

activity-summary-unit7.js

etc.

El resumen debe continuar siendo genérico.

## AISLAMIENTO OBLIGATORIO DE RESULTADOS POR UNIDAD

La pantalla de resultados de una unidad debe mostrar EXCLUSIVAMENTE las actividades de esa unidad.

Ejemplos:

Resultados Unidad 5
→ solo `activities.unit_number = 5`

Resultados Unidad 6
→ solo `activities.unit_number = 6`

Resultados Unidad N
→ solo `activities.unit_number = N`

La fuente de verdad para este aislamiento debe ser:

`public.activities.unit_number`

NO inferir la unidad únicamente desde `activity_key`, títulos, rutas o texto visible.

El contexto de unidad debe provenir del objeto canónico/data-driven usado por navegación, por ejemplo:

`unit.unitNumber`

`unit.title`

o su equivalente vigente.

El flujo esperado es conceptualmente:

unidad actual
↓
`renderStudentActivitySummary(..., { unitNumber, unitTitle })`
↓
`fetchStudentActivitySummary(unitNumber)`
↓
consulta filtrada por `activities.unit_number`
↓
filtro defensivo en componente
↓
render de SOLO esa unidad

Preferir que la consulta al backend/Supabase ya incluya el filtro de unidad.

Si el servicio devuelve más registros por compatibilidad, el componente debe aplicar además un filtro defensivo por `activity.unit_number`.

PROHIBIDO:

- mostrar resultados de otra unidad como relleno;
- usar un encabezado estático como “Unidad 5+” en una pantalla de Unidad 6;
- hardcodear etiquetas `U5`, `U6`, etc.;
- crear componentes summary separados por unidad.

El encabezado y las etiquetas de tarjetas deben derivarse dinámicamente de la unidad real.

Si la unidad actual no tiene resultados:

mostrar un estado vacío equivalente a:

“Aún no tienes actividades calificadas en esta unidad.”

NO mostrar resultados de otra unidad.

Antes de considerar lista una nueva unidad, probar al menos:

- abrir resultados de la unidad anterior;
- abrir resultados de la nueva unidad;
- volver entre ambas;
- comprobar que no se conservan tarjetas de la unidad previa en memoria/DOM.

---

# CURRICULUM CONFIG

Registrar la nueva unidad en:

core/curriculum-config.js

o su equivalente vigente.

Debe quedar data-driven.

Ejemplo conceptual:

{
    unit: 6,
    title: "...",
    slug: "...",
    resources: {
        presentation: "...",
        gamification: "...",
        classwork: "..."
    }
}

RESPETAR exactamente el esquema ACTUAL existente.

NO inventar un formato nuevo.

---

# APP.JS

La arquitectura actual está diseñada para que futuras unidades no requieran hardcoding.

Por tanto:

NO modificar core/app.js únicamente para agregar:

if unit === 6

case 6

modal-unit-6 específico

ruta hardcodeada

tarjeta hardcodeada.

La nueva unidad debe aparecer mediante:

curriculum-config.js

y mecanismos data-driven existentes.

Si es necesario modificar app.js para que SOLO Unidad 6 funcione:

considerar esto una alerta arquitectónica.

Detenerse y analizar antes de introducir hardcoding.

---

# ANTI-CACHÉ SELECTIVO Y ACTUALIZACIÓN DE ASSETS

La plataforma tiene anti-caché selectivo para actividades evaluables.

Debe heredarse por TIPO DE RECURSO.

Esperado:

presentation → caché normal

gamification → URL fresca según mecanismo global vigente

classwork/deber → URL fresca según mecanismo global vigente

NO agregar lógica:

if unit === 6

NO agregar manualmente dentro de cada HTML:

`?v=Date.now()`

NO crear Service Worker nuevo únicamente para resolver caché.

NO borrar:

`localStorage`

`sessionStorage`

cookies

sesión Supabase

como estrategia de actualización.

## REGLA CRÍTICA PARA MÓDULOS COMPARTIDOS

Los usuarios NO deben necesitar borrar manualmente el caché después de una publicación.

Cuando cambien módulos compartidos como:

- `core/app.js`;
- `core/activity-service.js`;
- `core/exercise-progress-service.js`;
- `components/activity-summary.js`;
- cliente Supabase/configuración pública equivalente;

el mecanismo GLOBAL de build/deploy debe permitir que una recarga normal obtenga la versión nueva.

No usar un timestamp aleatorio distinto en cada apertura.

Preferir el mecanismo vigente del proyecto basado en:

- versión de aplicación;
- build id;
- commit/version estable de despliegue;
- content hash;
- o equivalente global ya validado.

El objetivo es:

DEPLOY NUEVO
↓
URL/asset versionado cambia de forma estable
↓
navegador solicita módulo nuevo
↓
no hace falta Ctrl+F5 ni borrar caché

Si el proyecto todavía no cubre módulos compartidos con su cache-busting global:

reportarlo como defecto de infraestructura antes de publicar nuevas unidades.

No crear múltiples clientes Supabase.

## RELEASE CHECKER GLOBAL

Si el repositorio actual conserva el mecanismo validado basado en:

- `core/version.js`;
- `version.json`;
- `core/release-check.js`;

REUTILIZARLO. No crear un segundo sistema de actualización por unidad.

Comportamiento esperado:

1. `version.json` contiene únicamente versión/build públicos;
2. el release checker consulta `version.json` con `cache: "no-store"` y un query de control para evitar que el propio archivo de versión quede obsoleto;
3. compara la versión remota con `APP_VERSION`;
4. si difieren, realiza una sola recarga controlada;
5. la protección anti-loop usa una clave propia, NO `sessionStorage.clear()`;
6. la recarga NO debe cerrar la sesión Google/Supabase ni borrar pendientes académicos;
7. si `version.json` no responde, la aplicación continúa en vez de quedar bloqueada.

Cuando se publique un cambio de módulos compartidos, incrementar la versión de release de forma COHERENTE en todos los puntos requeridos por el proyecto.

Debe existir/reutilizarse una prueba de consistencia que compare como mínimo:

- `core/version.js`;
- `version.json`;
- `index.html`;
- entrypoint principal;
- imports productivos relevantes.

No considerar resuelto el caché únicamente porque exista `?v=` en un archivo aislado.

## PRUEBA OBLIGATORIA DE CACHÉ DE DEPLOY

Cuando se modifique un módulo compartido:

1. confirmar qué versión/asset se sirve desde GitHub Pages;
2. comparar con el archivo de `origin/main`;
3. abrir con navegador que tenga una versión previa almacenada;
4. realizar recarga normal, NO hard reload;
5. comprobar que carga la versión nueva;
6. probar además ventana privada/incógnito como control diagnóstico.

`Ctrl+F5` puede utilizarse para diagnosticar, pero NO puede ser requisito operativo para estudiantes.

---

# SUPABASE

NO modificar infraestructura Supabase innecesariamente.

NO crear migración solo porque existe una nueva unidad.

Las actividades académicas ordinarias deben registrarse utilizando la infraestructura administrativa ya existente:

Admin API

RPC privada

o el mecanismo actualmente validado del proyecto.

Antes de realizar operaciones:

inspeccionar cómo Unidad 5 fue provisionada.

NO inventar SQL ad hoc si ya existe un gateway administrativo aprobado.

---

# ACTIVITY KEYS

Crear claves únicas y estables.

Convención recomendada:

uX-slug-gam-01

uX-slug-class-01

Ejemplo:

u6-sistemas-ecuaciones-gam-01

u6-sistemas-ecuaciones-class-01

No reutilizar activity_key de otra unidad.

Antes de crear:

comprobar unicidad.

---

# ACTIVITY TYPE

Gamificación:

`type = gamification`

`attempt_policy = gamification_unlimited`

Trabajo en clase/deber:

`type = classwork`

`attempt_policy = classwork_limited`

Utilizar los tipos y políticas exactas vigentes en la base de datos.

Para nuevas actividades, si `attempt_policy` existe en el esquema actual, preferir registrarlo EXPLÍCITAMENTE en vez de depender solamente de inferencia por `type`.

No asignar `classwork_limited` a gamificación.

No asignar `gamification_unlimited` a deber/classwork.

Antes de guardar, comprobar que el gateway administrativo actual acepta y persiste `attempt_policy`.

---

# SOURCE PATH

Registrar rutas correspondientes.

Ejemplo:

topics/unit6-sistemas-ecuaciones/gamificacion.html

topics/unit6-sistemas-ecuaciones/deber.html

No utilizar rutas de Windows en producción.

No guardar:

C:\...

dentro del código desplegado.

---

# UNIT NUMBER

La actividad debe guardar el unit_number correcto.

No copiar:

unit_number = 5

de la plantilla.

---

# SECTION Y TERM

Utilizar:

sección académica vigente

periodo académico vigente

trimestre/term correspondiente.

No crear secciones duplicadas.

No crear año académico nuevo sin necesidad.

---

# FECHAS DE ACTIVIDADES

NO inventar fechas límite.

Las fechas deben tratarse como timestamps reales con zona horaria. Un `datetime-local` del navegador debe convertirse correctamente al timestamp que espera backend/Supabase.

Antes de concluir que una actividad “se cerró antes de tiempo”:

1. consultar `is_active`;
2. consultar `due_at` real en Supabase;
3. comparar con `now()` del servidor;
4. comprobar conversión UTC/zona local;
5. recién después diagnosticar UI/caché.

Agregar test cuando se toque lógica de fechas:

- `due_at` futuro → entrega permitida;
- `due_at` pasado → entrega rechazada según contrato;
- no comparar strings locales como autoridad temporal.

Si el usuario proporcionó:

opens_at

due_at

utilizarlas después de validarlas.

Si NO proporcionó fechas:

integrar completamente el código,

preparar las actividades,

pero mantenerlas INACTIVAS o en estado seguro según permita la infraestructura actual.

Reportar claramente:

"Actividad preparada pero pendiente de fecha/activación."

Nunca inventar una fecha de entrega académica.

---

# MINIMUM SCORE

Mantener la regla institucional vigente:

minimum_score = 1

cuando corresponda.

No utilizar:

0

como nota académica mínima automática.

---

# DEADLINES

Mantener el mecanismo global vigente de cierre automático.

No crear un cron nuevo por unidad.

No crear un scheduler nuevo.

No duplicar:

`finalize_overdue_activities`.

Reutilizar infraestructura existente.

Regla institucional vigente:

progreso por ejercicio ≠ entrega oficial.

Si vence una actividad sin envío final confirmado:

- puede generarse `not_submitted` con nota mínima institucional 1 según la arquitectura vigente;
- NO crear `activity_attempt` falso;
- NO convertir automáticamente el progreso parcial en entrega;
- NO borrar `activity_runs`;
- NO borrar `activity_exercise_progress`;
- NO borrar `activity_exercise_checks`.

Esto permite que una reapertura recupere el progreso previo.

---

# REAPERTURA

No implementar lógica especial de reapertura por unidad.

Utilizar las reglas globales vigentes.

La reapertura debe preservar:

`activity_runs`

`activity_exercise_progress`

`activity_exercise_checks`.

Si existe un resultado automático `not_submitted`, seguir el patrón global vigente para retirarlo/reabrir sin tocar intentos reales ni progreso previo.

El estudiante debe poder continuar exactamente desde donde quedó.

## EDICIÓN ADMINISTRATIVA VS REAPERTURA

La integración de una nueva unidad debe verificar que la UI administrativa trate correctamente el grader REAL de cada actividad.

PROHIBIDO que el modal genérico de edición convierta silenciosamente un grader especializado existente en `auto_mcq` o muestre una pauta ficticia como `q1 = A`.

Al abrir una actividad existente para edición:

- cargar el `grader_type` real;
- cargar/configurar únicamente una UI compatible con ese grader;
- si el editor genérico NO soporta ese grader especializado, mostrarlo como protegido/no editable en lugar de inventar una configuración;
- nunca sobrescribir `private.activity_grading_configs` con un esquema distinto por defecto.

Si una actividad ya tiene intentos/resultados reales, considerar sensibles/protegidos:

- `activity_key`;
- tipo;
- sección;
- periodo;
- unidad;
- `max_score`;
- `minimum_score`;
- grader/config privado, salvo un flujo explícito y seguro diseñado para ello.

Para AMPLIAR EL PLAZO de una actividad que ya tiene historial académico, preferir el gateway administrativo específico de REAPERTURA (`reopen_activity` / equivalente vigente) en lugar de reutilizar el formulario general de edición.

La reapertura debe:

- exigir una nueva `due_at` futura;
- mantener `is_active = true`;
- preservar intentos y resultados reales;
- preservar `activity_runs`, progreso y checks;
- retirar únicamente resultados automáticos `not_submitted` permitidos por la arquitectura vigente, nunca entregas reales;
- registrar auditoría sin exponer grading privado.

Agregar smoke administrativo para una actividad de prueba/grader nuevo:

- detalle muestra grader real;
- editar no lo convierte a otro grader;
- reabrir cambia solamente el plazo y conserva historial.

---

# GRADING CONFIG

Crear/configurar el grading correspondiente a:

`gamification`

`classwork`

en la infraestructura privada existente.

El grading privado debe contener, según el tipo soportado:

- lista estable de `exercise_key` obligatorios;
- tipo de grader por ejercicio;
- respuestas aceptadas / índices correctos;
- información pedagógica sensible que no debe exponerse antes de tiempo;
- cualquier metadato necesario para cálculo server-side.

NO colocar grading config sensible en tablas públicas accesibles.

NO conceder acceso directo a estudiantes a grading privado.

No dejar `AUTHORING_ANSWER_KEY`, `correctIndex`, `acceptedAnswers` o soluciones sensibles en las copias evaluables de producción.

El servidor es autoridad sobre respuesta correcta, intento y puntaje.

---

# RLS Y SEGURIDAD

NO desactivar RLS.

NO agregar políticas permisivas innecesarias.

NO utilizar:

USING (true)

o:

WITH CHECK (true)

para solucionar rápidamente un problema de permisos.

NO otorgar acceso directo a:

anon

authenticated

sobre tablas privadas de grading.

Mantener el patrón de funciones server-side actualmente validado.

---

# SERVICE ROLE

NUNCA colocar service_role:

- frontend;
- HTML;
- JavaScript público;
- GitHub;
- documentación;
- tests públicos.

Si una operación privilegiada lo necesita:

debe ejecutarse únicamente server-side mediante la infraestructura existente.

---

# EDGE FUNCTIONS

NO usar:

`--no-verify-jwt`

para desplegar funciones que requieren autenticación.

Mantener verificación JWT.

Si se modifica una Edge Function:

ejecutar tests correspondientes antes de deploy.

Solo desplegarla si realmente fue modificada y es necesaria para la nueva unidad.

## VALIDACIÓN DE ARRANQUE OBLIGATORIA

Una Edge Function marcada como `ACTIVE` NO demuestra por sí sola que pueda arrancar correctamente.

Antes de desplegar una función modificada ejecutar, como mínimo:

`deno check supabase/functions/<funcion>/index.ts`

y cualquier chequeo/compilación adicional vigente del proyecto.

Esto debe detectar errores de arranque como:

- identificadores léxicos declarados dos veces;
- imports inválidos;
- errores TypeScript/Deno;
- sintaxis inválida;
- dependencias que no cargan;
- código que impide alcanzar `Deno.serve` / `serve`.

NO desplegar una Edge Function si `deno check` falla.

## PREFLIGHT CORS OBLIGATORIO DESPUÉS DE DEPLOY

Después de desplegar una función usada desde navegador, probar remotamente un preflight `OPTIONS` real desde el origen de producción.

Para `check-activity-answer` o equivalente, esperar conceptualmente:

`OPTIONS → 200`

con encabezados CORS correctos.

Un resultado:

`OPTIONS → 503`

`BOOT_ERROR`

o “Function failed to start”

es un BLOQUEANTE de publicación.

No atribuir un `OPTIONS 503` a caché del navegador.

Investigar primero logs de Edge Function y errores de arranque.

## SMOKE POST AUTENTICADO

Después del preflight:

- un POST sin credenciales puede responder 401 y eso es correcto;
- un POST autenticado de una cuenta test válida debe alcanzar la lógica de la función y devolver la respuesta esperada.

No considerar sana una función únicamente porque:

- figura `ACTIVE`;
- el deploy terminó sin error;
- los tests locales pasaron.

Debe existir una verificación remota mínima.

## LOGS POST-DEPLOY

Después de pruebas reales revisar logs remotos.

Las Edge Functions críticas deben dejar logging diagnóstico MÍNIMO Y SEGURO para poder distinguir validaciones reales de supuestos problemas de red/caché.

Cuando exista un rechazo controlado, registrar cuando sea útil:

- `code` de error;
- `activity_key`;
- estrategia de resolución del run (`provided`, `canonical`, `historical`, `ambiguous` o equivalente);
- cantidad de ejercicios resumidos/terminales cuando no revele respuestas;
- versión de la función.

NO registrar:

- JWT;
- access/refresh tokens;
- service role;
- correo del estudiante;
- respuestas correctas privadas;
- grading config sensible.

El frontend/servicio debe conservar y exponer para diagnóstico seguro el `HTTP status`, `code` y `error` sanitizado recibidos del backend, sin convertir todos los errores en “Error de conexión”.

Esperado:

- sin nuevos `BOOT_ERROR`;
- sin ráfagas de `OPTIONS 503`;
- errores 401 únicamente cuando correspondan a pruebas sin sesión/expirada;
- POST autenticado exitoso cuando la actividad y sesión son válidas.

---

# NO HACER CAMBIOS DE INFRAESTRUCTURA POR COMODIDAD

La creación de una nueva unidad normalmente NO debe requerir cambios en:

profiles
students
enrollments
academic_years
class_sections
academic_terms
activity_results schema
auth
claim system

Si parece necesario modificar estas estructuras:

DETENERSE.

Explicar por qué.

No hacerlo automáticamente.

---


# CUENTA TÉCNICA PERMANENTE DE PRUEBA

La plataforma conserva intencionalmente una cuenta técnica de estudiante para pruebas funcionales reales.

Identificación actual:

- `official_full_name` con prefijo `ZZ_TEST_`;
- cuenta conocida: `ZZ_TEST_VISUAL_U5`;
- `student_code` actual: `UEEH-STU-000011`.

Esta cuenta NO es un residuo ni debe eliminarse durante la integración de nuevas unidades.

Reglas obligatorias:

- NO borrar `ZZ_TEST_VISUAL_U5`;
- NO eliminar su matrícula;
- NO eliminar su usuario de autenticación;
- NO resetear su código;
- NO reutilizar códigos consumidos;
- NO resetear secuencias;
- NO crear otro estudiante de prueba si esta cuenta permite realizar el smoke test requerido;
- NO considerar esta cuenta como estudiante oficial en conteos académicos del curso.

Estado institucional esperado mientras esta decisión siga vigente:

- estudiantes oficiales = 9;
- estudiantes test = 1;
- estudiantes totales = 10;
- matrículas oficiales = 9;
- matrículas test = 1;
- matrículas totales = 10.

Para pruebas de una nueva unidad, PREFERIR esta cuenta técnica antes de crear fixtures adicionales.

Puede utilizarse para comprobar:

- acceso como estudiante;
- gamificación;
- trabajo en clase/deber;
- `Comprobar`;
- políticas de intentos;
- restauración después de F5;
- restauración entre dispositivos;
- bloqueo de ejercicios;
- finalización;
- resultados;
- reapertura;
- comportamiento mobile.

Los intentos, resultados y progreso de esta cuenta son datos de prueba y NO deben confundirse con rendimiento académico oficial.

## REPORTES Y EXPORTACIONES

Al revisar reportes académicos, estadísticas o exportaciones oficiales, distinguir cuentas test mediante el criterio vigente:

`official_full_name LIKE 'ZZ_TEST_%'`

Para conteos institucionales oficiales, considerar únicamente registros que NO cumplan dicho criterio.

Si el sistema actual ya dispone de un filtro seguro para excluir cuentas test, REUTILIZARLO.

Si todavía no existe un filtro formal en una exportación concreta:

- NO crear una migración ni refactorización estructural solo por integrar una nueva unidad;
- reportar claramente que la cuenta test está incluida o debe excluirse al generar el reporte oficial;
- no modificar automáticamente la arquitectura central salvo autorización específica del usuario.

No utilizar únicamente el rango numérico del `student_code` como autoridad para distinguir estudiantes reales de prueba. El criterio principal vigente es el prefijo explícito `ZZ_TEST_` en `official_full_name`.

---

# PRESENTACIÓN Y SUPABASE

presentation.html:

NO debe crear actividad evaluable.

NO debe crear grading config.

NO debe generar activity_result.

Es únicamente recurso curricular.

---

# TESTS OBLIGATORIOS

Antes de considerar la unidad integrada:

ejecutar TODOS los tests existentes.

No solamente los tests nuevos.

Esperado:

0 fallos.

---

# CREAR TESTS DE LA NUEVA UNIDAD

Agregar pruebas cuando sean necesarias para verificar:

- existencia de los tres archivos;
- rutas;
- `exercise_key` estables;
- ausencia de respuestas públicas;
- ausencia de `AUTHORING_ANSWER_KEY` desplegado;
- integración curricular;
- `activity_key`;
- `attempt_policy` correcto;
- COMPROBAR como único flujo de validación/guardado;
- ausencia de botones Guardar/Sincronizar añadidos por integración;
- `check_id` idempotente;
- doble submit;
- restauración de progreso;
- bloqueo correcto de ejercicios terminales;
- pistas sin respuestas;
- grading;
- recuperación cuando aplique;
- finalización solo con ejercicios requeridos completos;
- `submission_id` idempotente;
- mobile hooks;
- ausencia de secretos.

Los tests deben ser DATA-DRIVEN cuando sea posible.

No crear una arquitectura de tests que obligue a editar el motor por cada nueva unidad.

---

# TEST DE RESPUESTAS EXPUESTAS

Buscar en las copias de producción:

AUTHORING_ANSWER_KEY
correctIndex
correct_answer
correctAnswer
expected_answer
expectedAnswer
data-correct
service_role
sb_secret_

Diferenciar:

contenido pedagógico legítimo

de:

pauta evaluativa expuesta.

No generar falsos positivos absurdos con ejemplos resueltos que el docente necesita mostrar en presentation.html.

La protección estricta aplica especialmente a:

gamificacion.html

deber.html

---

# TEST DE PISTAS

Revisar automáticamente y manualmente las pistas.

Especialmente:

recovery.

No debe aparecer la respuesta final antes de que corresponda.

---

# TEST DE DOBLE SUBMIT

Simular múltiples clicks rápidos en COMPROBAR.

Esperado:

una sola comprobación académica.

Simular Enter repetido.

Esperado:

una sola comprobación académica.

Simular retry con el mismo `check_id`.

Esperado:

no consume un nuevo intento.

Simular idempotencia histórica:

Check A → intento 1

Check B → intento 2

retry tardío Check A

Esperado:

`attempt_count = 2`, no 3.

Simular retry técnico de entrega final con el mismo `submission_id`.

Esperado:

una sola entrega académica y un solo `activity_attempt`.

---

# TEST OBLIGATORIO DE SERVICIO COMPARTIDO

Para cada nueva unidad evaluable, agregar o reutilizar una prueba data-driven que confirme:

- `gamificacion.html` utiliza `exercise-progress-service.js` o equivalente global vigente;
- `deber.html` utiliza `exercise-progress-service.js` o equivalente global vigente;
- no existe `fetch` académico inline directo a `check-activity-answer`;
- se utiliza la restauración global `getExerciseProgress(...)` o equivalente;
- errores técnicos preservan la respuesta visible;
- retry técnico conserva el mismo `check_id`;
- F5 recupera progreso confirmado desde Supabase.

Esta prueba es obligatoria porque una actividad puede pasar pruebas matemáticas/visuales y aun fallar en producción si omite el servicio central de autenticación y persistencia.

---

# TEST DE AISLAMIENTO DE RESULTADOS POR UNIDAD

Agregar o reutilizar una prueba data-driven que use un dataset con actividades de múltiples unidades.

Caso mínimo:

- U5 gamification;
- U5 classwork;
- U6 gamification;
- U6 classwork.

Cuando `currentUnit = 5`:

esperado → solo 2 tarjetas U5.

Cuando `currentUnit = 6`:

esperado → solo 2 tarjetas U6.

Cuando `currentUnit = 7` y no existen resultados:

esperado → 0 tarjetas de otras unidades y estado vacío específico.

Verificar también:

- encabezado dinámico de unidad;
- etiqueta de cada tarjeta derivada de `activity.unit_number`;
- ausencia de hardcoding `U5`/`U6`;
- volver U5 → U6 → U5 no conserva DOM/resultados de la unidad anterior.

---

# TEST DE CACHE-BUSTING DE MÓDULOS COMPARTIDOS

Si durante la integración se modifica cualquiera de:

`core/app.js`

`core/activity-service.js`

`core/exercise-progress-service.js`

`components/activity-summary.js`

o equivalente compartido:

verificar que el mecanismo de deploy invalide la versión anterior de forma estable.

Esperado:

- recarga normal obtiene versión nueva;
- no requiere borrar caché;
- no requiere borrar cookies;
- no rompe sesión Supabase;
- no usa `Date.now()` por apertura;
- incógnito y navegador normal convergen a la misma versión publicada.

---

# TEST DE RUN CANÓNICO Y FINALIZACIÓN

Agregar/reutilizar una prueba de regresión data-driven que confirme:

- el primer `check-activity-answer` devuelve/resuelve un `run_id` canónico;
- el servicio compartido adopta ese `run_id`;
- un UUID local distinto NO desplaza al run canónico;
- un `run_id` obsoleto con exactamente un run actual válido se recupera de forma segura cuando el contrato vigente lo permite;
- múltiples runs activos producen error explícito y no selección arbitraria;
- una actividad nueva completa finaliza sin `RUN_NOT_OWNED`;
- la finalización usa progreso canónico actual;
- fallback histórico funciona solo cuando no existe progreso canónico;
- no se fabrican intentos/resultados durante tests read-only.

Probar al menos una gamificación y un classwork.

# TEST DE PENDING/RETRY DE ENTREGA FINAL

Simular:

1. `fetch` rechazado antes de respuesta → pending permanece, mismo `submission_id`;
2. timeout sin respuesta → pending permanece;
3. HTTP 400 con body → NO queda `PENDING_RETRY`;
4. HTTP 403/413 → NO se describe como problema de conexión;
5. retry del mismo `submission_id` ya registrado → no duplica intento;
6. pending legacy sin `run_id` → resolución segura del run actual;
7. pending legacy con `run_id` obsoleto → servidor prefiere run canónico válido;
8. pending con `submission_id` inválido no registrado → recuperación controlada según servicio vigente.

# TEST DE SALUD REMOTA DE EDGE FUNCTIONS

Si se modifica `check-activity-answer`, `submit-activity-result` u otra Edge Function usada por la unidad:

antes del deploy:
- `deno check` = PASS.

después del deploy:
- status remoto = `ACTIVE`;
- `verify_jwt = true` cuando corresponda;
- `OPTIONS` remoto = 200;
- sin `BOOT_ERROR`;
- POST autenticado con cuenta test = respuesta esperada;
- logs sin nuevos `OPTIONS 503`.

Un `ACTIVE` con `OPTIONS 503` debe considerarse FAIL.

---

# DIAGNÓSTICO DE ERRORES TÉCNICOS EN COMPROBAR

Si el frontend muestra:

“Error de conexión”

“no se pudo confirmar”

pantalla en blanco

o equivalente:

NO asumir automáticamente que es caché o red.

Seguir este orden:

1. DevTools/Network → HTTP real;
2. logs de `check-activity-answer`;
3. preflight `OPTIONS`;
4. autenticación/JWT;
5. contrato `activity_key`, `exercise_key`, `check_id`, `answer`;
6. RPC/SQL;
7. recién después revisar caché/assets.

Un error técnico NO puede convertirse en:

- respuesta incorrecta;
- `failed`;
- nota 1;
- consumo duplicado de intento.

La UI debe conservar la respuesta y el `check_id` pendiente cuando el resultado académico sea desconocido.

---

# TEST DE INTENTOS

Gamificación (`gamification_unlimited`):

1 correcto → 10

2 correcto → 9

3 correcto → 8

4 correcto → 7

5+ correcto → 7

20 respuestas incorrectas → continúa abierto, `score = null`, no bloqueo

correcto después de 20 fallos → 7 y bloqueo

`remaining_attempts = null`

Trabajo en clase (`classwork_limited`):

1 correcto → 10

2 correcto → 9

3 correcto → 8

4 correcto → 7

4.º fallo → 1, `failed`, bloqueado

5.º intento → rechazado

Comprobar frontend Y backend.

Backend es la autoridad.

---

# TEST DE PERSISTENCIA Y RESTAURACIÓN

Verificar como mínimo:

1. estudiante comprueba varios ejercicios;
2. progreso queda confirmado en Supabase;
3. recarga/F5;
4. se recuperan intentos, respuestas, score, status y locked;
5. correct permanece bloqueado;
6. failed de classwork permanece bloqueado;
7. incorrect permanece editable con intentos ya consumidos;
8. gamificación incorrecta permanece editable aunque tenga más de 4 intentos;
9. cambio de dispositivo con la misma cuenta recupera el mismo progreso;
10. no existe botón manual obligatorio de Guardar.

---

# TEST DE RECUPERACIÓN

Cuando aplique y el backend vigente soporte el modelo utilizado:

verificar:

- fase inicial;
- activación correcta;
- IDs independientes;
- intentos independientes;
- pistas sin respuesta;
- soluciones controladas;
- resultado final coherente;
- ejercicios condicionales NO alteran incorrectamente el denominador oficial.

Si la recuperación del HTML fuente no tiene representación segura en el backend actual:

NO forzarla dentro de la misma actividad durante la integración.

Reportar la discrepancia y la estrategia segura disponible.

---

# TEST DE MATHJAX

Verificar:

presentation.html
gamificacion.html
deber.html

Especialmente:

- matrices;
- determinantes;
- sistemas;
- fracciones;
- procedimientos dinámicos.

No permitir errores JS por MathJax.

---

# MOBILE

Verificar al menos conceptualmente y mediante herramientas disponibles:

320px
360px
390px
412px

Revisar:

- botones;
- inputs;
- teclado móvil;
- overlays;
- modales;
- MathJax;
- overflow;
- navegación;
- orientación vertical;
- orientación horizontal.

---

# GITHUB PAGES

Comprobar rutas compatibles con:

/UEEH_MATEMATICAS_3RO_BGU/

NO introducir rutas root-relative como:

/core/...

si rompen el subpath de GitHub Pages.

Preferir el patrón de rutas ya utilizado por el proyecto.

---

# NAVEGACIÓN

Comprobar:

Dashboard
↓
Nueva unidad
↓
Presentación

Dashboard
↓
Nueva unidad
↓
Gamificación

Dashboard
↓
Nueva unidad
↓
Trabajo en clase

y:

Regresar

cuando corresponda.

---

# RUTAS FUENTE

Nunca dejar referencias en producción a:

file:///

C:\Users\...

localhost

127.0.0.1

excepto configuraciones explícitas de desarrollo ya existentes y justificadas.

---

# SECRET SCAN

Antes de finalizar buscar:

service_role
sb_secret
secret
password
client_secret
access_token
refresh_token
Bearer ey
API keys privadas

Distinguir valores reales de nombres de variables/documentación.

Esperado:

0 secretos reales.

---

# SINTAXIS

Ejecutar:

`node --check`

sobre módulos JavaScript modificados cuando corresponda.

Para TODA Edge Function modificada ejecutar además:

`deno check`

sobre su entrypoint real antes del deploy.

Validar errores HTML/JS razonables en los tres archivos.

No aceptar como sustituto de estos chequeos que una función remota figure simplemente como `ACTIVE`.

---

# SUPABASE DIFF

Al terminar comprobar:

git diff -- supabase/

Si hubo cambios:

deben corresponder EXCLUSIVAMENTE a algo necesario para integrar el nuevo tipo de grading.

No debe existir una migración nueva simplemente para insertar una actividad normal.

---

# NO MIGRACIONES INNECESARIAS

NO crear:

migration_unit6.sql

migration_unit7.sql

solo para registrar actividades.

Utilizar infraestructura administrativa.

Una migración solo se justifica si existe un CAMBIO REAL DE ESQUEMA.

---

# COMPATIBILIDAD HACIA ATRÁS

La nueva unidad NO debe romper:

Unidad 1
Unidad 2
Unidad 3
Unidad 4
Unidad 5

Ejecutar tests existentes.

No modificar comportamiento global sin comprobar regresiones.

---

# CRITERIO DE CAMBIO MÍNIMO

Regla:

MODIFICAR EL MENOR NÚMERO DE ARCHIVOS POSIBLE.

Una nueva unidad normalmente debería implicar:

- nueva carpeta topics/unitX-slug/;
- curriculum-config;
- tests;
- grading config/actividad;
- grader únicamente si aparece un nuevo tipo matemático no soportado.

NO realizar refactorizaciones generales mientras se integra una unidad.

No "aprovechar" para limpiar archivos no relacionados.

---

# DOCUMENTACIÓN

Actualizar documentación únicamente cuando sea útil.

No llenar README con detalles específicos repetitivos de cada unidad.

Si la arquitectura NO cambió:

no reescribir documentación arquitectónica completa.

Puede registrarse brevemente la nueva unidad si el proyecto mantiene un catálogo.

---

# ORDEN DE IMPLEMENTACIÓN

Seguir este orden:

FASE 1
PRE-FLIGHT

FASE 2
VALIDAR LOS 3 HTML FUENTE

FASE 3
DETERMINAR UNIDAD, TEMA Y SLUG

FASE 4
AUDITAR HTML FUENTE

FASE 5
CREAR CARPETA DE LA UNIDAD

FASE 6
COPIAR LOS 3 ARCHIVOS

FASE 7
INTEGRAR PRESENTATION

FASE 8
INTEGRAR GAMIFICACIÓN CON `gamification_unlimited`

FASE 9
INTEGRAR TRABAJO EN CLASE CON `classwork_limited`

FASE 10
EXTRAER PAUTAS Y SOLUCIONES SENSIBLES

FASE 11
CONFIGURAR GRADING PRIVADO + `exercise_key`

FASE 12
CONECTAR COMPROBAR OBLIGATORIAMENTE CON `exercise-progress-service` / `check-activity-answer` Y ELIMINAR FETCH ACADÉMICO INLINE

FASE 13
CONECTAR RESTAURACIÓN DE PROGRESO Y RESULTADO OFICIAL

FASE 14
REGISTRAR CURRICULUM-CONFIG

FASE 15
PREPARAR ACTIVIDADES

FASE 16
EJECUTAR TESTS

FASE 17
SMOKE MOBILE

FASE 18
SECURITY SCAN

FASE 19
GIT DIFF

FASE 20
REPORTE FINAL

FASE 21
DETENERSE

---

# REGLA DE DETENCIÓN

DETENERSE automáticamente si aparece cualquiera de estos escenarios:

- falta uno de los tres HTML;
- archivos fuente corruptos;
- respuestas no identificables;
- conflicto con cambios locales del usuario;
- requerimiento de migración estructural inesperada;
- necesidad de debilitar RLS;
- necesidad de exponer service_role;
- ruptura de compatibilidad con Unidad 5;
- tests críticos fallan;
- grader no puede representar correctamente el nuevo tipo matemático;
- actividad necesita fechas y no puede mantenerse segura/inactiva;
- cambio requiere rediseñar arquitectura central.

NO improvisar una solución insegura.

Reportar el bloqueo.

---

# REGLA DE NO PREGUNTAR INNECESARIAMENTE

Si la información puede obtenerse inspeccionando el proyecto:

NO preguntar al usuario.

Ejemplos:

- número de siguiente unidad;
- estructura curriculum-config;
- nombres de funciones;
- rutas internas;
- tipos de actividad;
- IDs existentes;
- patrón de integración.

Investigar primero.

Preguntar únicamente si falta una decisión PEDAGÓGICA o ADMINISTRATIVA que no puede deducirse.

Ejemplo:

fecha límite real.

---

# NO MODIFICAR ORIGINALES

Al finalizar:

comprobar que:

presentation.html original
gamificacion.html original
deber.html original

siguen intactos.

Si se obtuvo hash inicialmente:

compararlo.

Esperado:

SIN CAMBIOS.

---

# REGLA FINAL DE INTEGRACIÓN DE ACTIVIDADES EVALUABLES

Para cada nueva unidad, la integración correcta debe producir esta experiencia:

Gamificación:

Responder reto
↓
COMPROBAR
↓
servidor valida y guarda
↓
si incorrecto: sigue intentando sin límite
↓
si correcto: 10/9/8/7 según intento y bloquea

Trabajo en clase/deber:

Responder ejercicio
↓
COMPROBAR
↓
servidor valida y guarda
↓
1.º=10, 2.º=9, 3.º=8, 4.º=7
↓
si falla las 4: 1 y bloquea

En ambos casos:

- no existe botón Guardar;
- no existe botón Sincronizar;
- Supabase conserva el progreso;
- F5 no reinicia intentos;
- cambio de dispositivo no reinicia intentos;
- frontend no decide score ni student_id;
- `check_id` protege cada comprobación;
- `submission_id` protege la entrega final;
- la nota oficial se calcula server-side.

---

# REPORTE FINAL OBLIGATORIO

Entregar exactamente un reporte similar a:

UEEH — INTEGRACIÓN DE NUEVA UNIDAD

========================================
FUENTE
========================================

carpeta fuente =
presentation encontrado = SÍ/NO
gamificacion encontrado = SÍ/NO
deber encontrado = SÍ/NO

originales modificados = NO/OTRO

========================================
UNIDAD
========================================

unidad =
tema =
slug =
ruta creada =

========================================
CURRÍCULO
========================================

curriculum-config actualizado = SÍ/NO
app.js hardcodeado = NO/OTRO

presentation integrada = SÍ/NO
gamification integrada = SÍ/NO
classwork integrada = SÍ/NO

========================================
CUENTAS DE ESTUDIANTE
========================================

students oficiales =
students test =
students total =

enrollments oficiales =
enrollments test =
enrollments total =

ZZ_TEST_VISUAL_U5 conservado = SÍ/NO/NO EXISTE
nueva cuenta test creada = NO/OTRO
cuenta test excluida de conteo académico oficial = SÍ/NO/NO APLICA

========================================
ACTIVIDADES
========================================

activity_key gamification =
activity_key classwork =

attempt_policy gamification = gamification_unlimited/OTRO
attempt_policy classwork = classwork_limited/OTRO

gamification activa = SÍ/NO
classwork activa = SÍ/NO

opens_at =
due_at =

si falta activación, indicar motivo =

========================================
GRADING
========================================

AUTHORING_ANSWER_KEY fuente encontrado = SÍ/NO

AUTHORING_ANSWER_KEY expuesto en producción = SÍ/NO

grading gamification privado = SÍ/NO
grading classwork privado = SÍ/NO

check-activity-answer reutilizado = SÍ/NO
check-activity-answer modificado = SÍ/NO
check-activity-answer verify_jwt = true/false

exercise-progress-service reutilizado = SÍ/NO
fetch académico inline en gamification = 0/OTRO
fetch académico inline en classwork = 0/OTRO
getExerciseProgress gamification = SÍ/NO
getExerciseProgress classwork = SÍ/NO
retry conserva mismo check_id = SÍ/NO
activity_runs utilizado = SÍ/NO
activity_exercise_progress utilizado = SÍ/NO
activity_exercise_checks utilizado = SÍ/NO
run_id canónico adoptado desde servidor = SÍ/NO
run_id local autoritativo = NO/OTRO
RUN_NOT_OWNED en flujo normal = 0/OTRO
summary final usa progreso canónico = SÍ/NO
fallback histórico solo sin progreso canónico = SÍ/NO

nuevo tipo de grader agregado = [...]

========================================
REGLAS
========================================

gamification:
1=10 = OK/ERROR
2=9 = OK/ERROR
3=8 = OK/ERROR
4+=7 = OK/ERROR
intentos ilimitados = OK/ERROR
incorrecto no bloquea = OK/ERROR
remaining_attempts null = OK/ERROR

classwork:
1=10 = OK/ERROR
2=9 = OK/ERROR
3=8 = OK/ERROR
4=7 = OK/ERROR
4.º fallo=1 = OK/ERROR
5.º intento rechazado = OK/ERROR

recuperación = OK/NO APLICA/ERROR
pistas sin respuestas = OK/ERROR

========================================
SEGURIDAD
========================================

student_id enviado por frontend = NO/OTRO
score oficial enviado por frontend = NO/OTRO
attempt_number autoritativo frontend = NO/OTRO

service_role frontend = NO/OTRO
secretos reales = 0/OTRO

RLS debilitado = NO/OTRO
migraciones innecesarias = NO/OTRO

========================================
RESULTADOS POR UNIDAD
========================================

unitNumber recibido por summary =
filtro por activities.unit_number = SÍ/NO
resultados otra unidad visibles = 0/OTRO
encabezado dinámico de unidad = SÍ/NO
estado vacío por unidad = PASS/FAIL

========================================
ANTI-CACHÉ
========================================

presentation caché normal = SÍ/NO
gamification anti-caché global heredado = SÍ/NO
classwork anti-caché global heredado = SÍ/NO
módulos compartidos versionados por deploy = SÍ/NO
recarga normal obtiene última versión = PASS/FAIL
requiere borrar caché manualmente = NO/OTRO
release checker global reutilizado = SÍ/NO/NO EXISTE
version.json consistente = PASS/FAIL/NO APLICA
reload loop protegido = PASS/FAIL/NO APLICA
sesión y pending preservados en actualización = PASS/FAIL/NO APLICA

lógica unit-specific agregada = NO/OTRO

========================================
TESTS
========================================

tests existentes = X/X PASS
tests nuevos = X/X PASS
fallos =

doble submit gamification = PASS/FAIL
doble submit classwork = PASS/FAIL
idempotencia check_id = PASS/FAIL
idempotencia submission_id = PASS/FAIL
HTTP 400 deja pending falso = NO/OTRO
network failure conserva pending = PASS/FAIL
legacy pending run_id recuperado = PASS/FAIL/NO APLICA
run canónico finalización = PASS/FAIL
restauración de progreso = PASS/FAIL
F5 conserva intentos = PASS/FAIL
smoke con ZZ_TEST_VISUAL_U5 = PASS/FAIL/NO EJECUTADO
COMPROBAR gamification producción = PASS/FAIL
COMPROBAR classwork producción = PASS/FAIL
Edge deno check = PASS/FAIL/NO MODIFICADA
Edge OPTIONS remoto = 200/OTRO/NO MODIFICADA
Edge BOOT_ERROR = 0/OTRO/NO MODIFICADA
POST autenticado smoke = PASS/FAIL/NO MODIFICADA
resultados aislados por unidad = PASS/FAIL
cache-busting módulos compartidos = PASS/FAIL/NO APLICA
F5 restore producción = PASS/FAIL
feedback error técnico no destructivo = PASS/FAIL
comprobar guarda automáticamente = PASS/FAIL
botón Guardar agregado = NO/OTRO
botón Sincronizar agregado = NO/OTRO
pistas recuperación = PASS/FAIL
respuestas públicas = PASS/FAIL
MathJax = PASS/FAIL

========================================
MOBILE
========================================

320px = OK/ERROR
360px = OK/ERROR
390px = OK/ERROR
412px = OK/ERROR

Android = OK/ERROR
iPhone = OK/ERROR

========================================
GITHUB PAGES
========================================

rutas compatibles = SÍ/NO
subpath conservado = SÍ/NO
root-relative problemáticas = 0/OTRO

========================================
ADMIN ACTIVIDADES
========================================

grader real visible en edición = PASS/FAIL/NO APLICA
editor convierte grader especializado a auto_mcq = NO/OTRO
reapertura usa gateway específico = PASS/FAIL/NO APLICA
reapertura preserva historial real = PASS/FAIL/NO APLICA

========================================
GIT
========================================

commit inicial =
HEAD final local =

archivos creados = [...]
archivos modificados = [...]

supabase diff = [...]

commit creado = NO
push realizado = NO
tag creado = NO

working tree =
 
========================================
VEREDICTO
========================================

unidad integrada = SÍ/NO
lista para revisión docente = SÍ/NO
lista para publicación = SÍ/NO

bloqueantes = [...]

acciones pendientes del docente = [...]

ESTADO FINAL =