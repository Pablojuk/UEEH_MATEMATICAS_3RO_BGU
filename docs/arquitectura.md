# Arquitectura base (Fase 1)

Esta fase crea la **columna vertebral** de la plataforma "Matemáticas de Tercero de BGU".

## ¿Qué hace cada carpeta?

- `assets/`: estilos, JavaScript inicial y recursos multimedia.
- `core/`: lógica central (arranque, navegación, almacenamiento, notas y conexión futura a Google Sheets).
- `components/`: piezas reutilizables de la interfaz (formulario, slides, juego, retroalimentación y resultados).
- `topics/plantilla-tema/`: plantilla para construir nuevos temas sin rehacer toda la app.
- `docs/`: documentación funcional para mantenimiento.

## ¿Qué hace cada archivo principal?

- `index.html`: entrada principal compatible con GitHub Pages.
- `core/app.js`: flujo base de pantallas (bienvenida → formulario → panel → vistas placeholder).
- `core/storage.js`: guarda datos del estudiante y avance en `localStorage`.
- `core/scoring.js`: funciones genéricas para notas sobre 10.
- `core/sheets-api.js`: deja preparado el endpoint de Apps Script para fases futuras.

## ¿Cómo se agregará un nuevo tema?

1. Copiar `topics/plantilla-tema` y renombrar la carpeta (ejemplo: `topics/ecuaciones-lineales`).
2. Completar `config.js` con metadatos del tema.
3. Completar `content.js` con contenido de slides.
4. Completar `exercises.js` con ejercicios reales.
5. Conectar ese tema desde nuevas vistas en `components/` y navegación en `core/app.js`.

## Fases siguientes (sin implementar aún)

- **Fase 2:** sistema real de slides interactivas.
- **Fase 3:** gamificación.
- **Fase 4:** deber interactivo.
- **Fase 5:** recuperación automática.
- **Fase 6:** conexión real con Google Sheets.
- **Fase 7:** optimización final móvil y pruebas de calidad.

## Publicación en GitHub Pages

1. Subir cambios a GitHub (`git push`).
2. En GitHub: `Settings` → `Pages`.
3. En "Build and deployment", elegir la rama (`main`) y carpeta raíz (`/root`).
4. Guardar y esperar el enlace público.

## ¿Qué parte se conectará con Google Sheets después?

El archivo `core/sheets-api.js` ya incluye:

- la URL de Apps Script,
- el formato completo del payload,
- la función `enviarDatosAGoogleSheets(datos)` en modo simulación.

En Fase 6 se activa el `fetch` real.

## ¿Cómo probar en local?

- Opción recomendada: Live Server (VS Code/Cursor).
- Abrir la carpeta del proyecto y ejecutar `index.html` en Live Server.

> Nota: con `file://` algunos navegadores bloquean módulos ES.

## ¿Cómo probar en GitHub Pages?

1. Publicar desde `main`.
2. Abrir el enlace público desde celular y computadora.
3. Verificar que se vea bienvenida, formulario y panel.
4. Probar navegación a slides/juego/deber/resultados.
