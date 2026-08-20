---
name: UEEH
description: Integra una nueva unidad de Matemáticas de Tercero de BGU en la plataforma UEEH a partir de tres archivos fuente ya terminados: presentation.html, gamificacion.html y deber.html. Conserva intactos los originales, crea la nueva unidad siguiendo la arquitectura validada de la Unidad 5, integra currículo, actividades, grading seguro, Supabase, pruebas, mobile y GitHub Pages sin modificar innecesariamente la infraestructura.
---

# UEEH

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
- question_id;
- tema;
- título;
- contenido;
- fechas;
- respuestas;
- grading config;
- unit_number.

La Unidad 5 es PATRÓN, no contenido para duplicar.

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

No eliminar:

pistas pedagógicas

ni:

soluciones paso a paso

si son parte del aprendizaje.

Pero las soluciones deben aparecer únicamente en los momentos pedagógicamente permitidos.

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

question_score

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

supabase/functions/check-activity-answer/

y el patrón utilizado por Unidad 5.

No inventar un contrato distinto si ya existe uno funcionando.

Mantener:

- autenticación JWT;
- validación de estudiante activo;
- matrícula activa;
- sección;
- actividad;
- apertura;
- fecha límite;
- run_id;
- phase;
- question_id;
- question_submission_id;
- control de intentos;
- respuesta server-side.

Si el nuevo tipo matemático necesita lógica adicional de grading:

EXTENDER únicamente el grader necesario.

NO reescribir toda la función.

NO debilitar las validaciones existentes.

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

# QUESTION IDs

Conservar los IDs estables definidos en los HTML fuente.

No convertirlos a IDs aleatorios.

Los question_id deben coincidir entre:

frontend

grading config

attempts

backend.

---

# QUESTION SUBMISSION ID

Seguir el patrón actual de Unidad 5.

Cada comprobación debe utilizar el identificador idempotente requerido por el backend.

No permitir que:

doble click

doble tap

Enter repetido

produzcan múltiples intentos involuntarios.

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

# GAMIFICACIÓN — INTENTOS

El frontend puede mostrar:

Intento actual

Puntaje disponible

pero NO debe decidir oficialmente el intento.

El servidor debe mantener autoridad sobre:

attempt_number.

Reglas esperadas:

1 → 10
2 → 9
3 → 8
4+ → 7

Nunca confiar en un attempt_number enviado por navegador.

---

# TRABAJO EN CLASE — INTENTOS

El frontend puede representar visualmente:

1 → 10
2 → 9
3 → 8
4 → 7

y estado no logrado:

1.

Pero la calificación oficial debe ser server-side.

La recuperación debe mantener separación entre:

phase = initial

y:

phase = recovery

o la convención actualmente utilizada por UEEH.

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

submit-activity-result

o equivalente actual.

Mantener:

submission_id

idempotencia

reintentos

best_score

attempt_count

minimum_score

status

según la arquitectura vigente.

No permitir que el navegador decida el best_score oficial.

---

# RETRIES

Los errores técnicos:

NO deben generar calificación.

Si una entrega falla por:

red

timeout

error temporal

servidor

debe conservar el mismo submission_id cuando corresponda.

No crear un nuevo intento académico por un retry técnico.

---

# SESSION STORAGE

Puede utilizarse únicamente según el patrón actual para:

estado temporal

pending retry

submission_id

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

# ANTI-CACHÉ SELECTIVO

La plataforma tiene anti-caché selectivo para actividades evaluables.

Debe heredarse por TIPO DE RECURSO.

Esperado:

presentation → caché normal

gamification → URL fresca

classwork/deber → URL fresca

NO agregar lógica:

if unit === 6

NO agregar manualmente:

?v=Date.now()

dentro de gamificacion.html o deber.html.

NO versionar:

activity-service.js

supabase-client.js

por cada apertura.

NO crear múltiples clientes Supabase.

Usar el mecanismo global existente.

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

gamification

Trabajo en clase/deber:

classwork

Utilizar los tipos exactos vigentes en la base de datos.

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

finalize_overdue_activities.

Reutilizar infraestructura existente.

---

# REAPERTURA

No implementar lógica especial de reapertura por unidad.

Utilizar las reglas globales vigentes.

---

# GRADING CONFIG

Crear/configurar el grading correspondiente a:

gamification

classwork

en la infraestructura privada existente.

NO colocar grading config sensible en tablas públicas accesibles.

NO conceder acceso directo a estudiantes a grading privado.

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

--no-verify-jwt

para desplegar funciones que requieren autenticación.

Mantener verificación JWT.

Si se modifica una Edge Function:

ejecutar tests correspondientes antes de deploy.

Solo desplegarla si realmente fue modificada y es necesaria para la nueva unidad.

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
- IDs estables;
- ausencia de respuestas públicas;
- ausencia de AUTHORING_ANSWER_KEY desplegado;
- integración curricular;
- activity_key;
- doble submit;
- pistas sin respuestas;
- grading;
- recuperación;
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

Simular:

múltiples clicks rápidos.

Esperado:

una sola comprobación académica.

Simular:

Enter repetido.

Esperado:

una sola comprobación académica.

---

# TEST DE INTENTOS

Gamificación:

1 → 10
2 → 9
3 → 8
4 → 7
5+ → 7

Trabajo en clase:

1 → 10
2 → 9
3 → 8
4 → 7
no logrado → 1

Comprobar frontend Y backend.

Backend es la autoridad.

---

# TEST DE RECUPERACIÓN

Cuando aplique:

verificar:

- phase inicial;
- activación correcta;
- IDs independientes;
- intentos independientes;
- pistas sin respuesta;
- soluciones controladas;
- resultado final coherente.

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

node --check

sobre módulos JavaScript modificados cuando corresponda.

Validar errores HTML/JS razonables en los tres archivos.

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
INTEGRAR GAMIFICACIÓN

FASE 9
INTEGRAR TRABAJO EN CLASE

FASE 10
EXTRAER PAUTAS DE RESPUESTA

FASE 11
CONFIGURAR GRADING PRIVADO

FASE 12
CONECTAR VALIDACIÓN SERVER-SIDE

FASE 13
CONECTAR RESULTADO OFICIAL

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
ACTIVIDADES
========================================

activity_key gamification =
activity_key classwork =

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

nuevo tipo de grader agregado = [...]

========================================
REGLAS
========================================

gamification:
1=10 = OK/ERROR
2=9 = OK/ERROR
3=8 = OK/ERROR
4+=7 = OK/ERROR

classwork:
1=10 = OK/ERROR
2=9 = OK/ERROR
3=8 = OK/ERROR
4=7 = OK/ERROR
no logrado=1 = OK/ERROR

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
ANTI-CACHÉ
========================================

presentation caché normal = SÍ/NO
gamification anti-caché global heredado = SÍ/NO
classwork anti-caché global heredado = SÍ/NO

lógica unit-specific agregada = NO/OTRO

========================================
TESTS
========================================

tests existentes = X/X PASS
tests nuevos = X/X PASS
fallos =

doble submit gamification = PASS/FAIL
doble submit classwork = PASS/FAIL
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