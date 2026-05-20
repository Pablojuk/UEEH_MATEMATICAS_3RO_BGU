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

✅ **Fase 2 completada:** arquitectura base + sistema de slides interactivas con LaTeX renderizado por MathJax (aún sin juego/deber/recuperación reales).

## Estructura de carpetas

```text
/
├── index.html
├── README.md
├── assets/
│   ├── css/styles.css
│   ├── js/main.js
│   ├── img/.gitkeep
│   └── audio/.gitkeep
├── core/
│   ├── app.js
│   ├── navigation.js
│   ├── storage.js
│   ├── scoring.js
│   └── sheets-api.js
├── components/
│   ├── student-form.js
│   ├── slide-viewer.js
│   ├── game-shell.js
│   ├── feedback-box.js
│   └── result-panel.js
├── topics/plantilla-tema/
│   ├── config.js
│   ├── content.js
│   └── exercises.js
└── docs/arquitectura.md
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
