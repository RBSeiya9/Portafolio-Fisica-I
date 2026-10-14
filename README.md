# Portafolio Digital de Física I

Portafolio académico construido con HTML, CSS y JavaScript vanilla para organizar temas, definiciones, fórmulas, prácticas, talleres, parciales y reflexiones de aprendizaje de Física I.

## ¿Qué incluye?
- Dashboard con resumen académico.
- Gestión de temas y subcategorías: definiciones, fórmulas, metacognición y evidencias.
- Registro de prácticas y archivos adjuntos.
- Secciones de talleres, parciales y aprendizaje.
- Guardado en el navegador con LocalStorage y archivos en IndexedDB.
- Exportación e importación de respaldo en JSON.

## Captura de pantalla
Puedes abrir la app en el navegador y usarla como portafolio académico. Si necesitas una captura, abre la vista principal y toma una imagen desde tu navegador.

## Cómo ejecutarlo localmente
1. Abre la carpeta del proyecto en VS Code.
2. Desde la terminal, ejecuta:
   ```bash
   python -m http.server 8000
   ```
3. Abre en el navegador:
   ```text
   http://localhost:8000/
   ```

## Cómo publicarlo en GitHub Pages
1. Sube la carpeta a tu repositorio GitHub.
2. En la configuración del repositorio, ve a **Settings > Pages**.
3. Selecciona **Deploy from a branch**.
4. Elige la rama `main` y la carpeta `/root`.
5. Guarda y espera a que GitHub publique la página.

## Estructura de carpetas
```text
.
├── assets/
│   ├── evidencias/
│   └── imagenes/
├── css/
│   └── estilos.css
├── js/
│   ├── app.js
│   ├── demo-data.js
│   ├── seed.js
│   └── ...
├── index.html
├── README.md
├── .gitignore
├── LICENSE
└── Portafolio-Fisica-I.zip
```

## Respaldar y restaurar datos
- Exporta un respaldo en JSON desde la interfaz.
- Para restaurar, importa el archivo JSON desde la app.
- Para generar una semilla desde un respaldo exportado, usa el siguiente procedimiento:
  ```bash
  # 1) Guarda el archivo JSON exportado.
  # 2) Abre la consola del navegador.
  # 3) Carga el JSON y crea un objeto con la estructura esperada por la app.
  # 4) Guarda la estructura como window.PORTAFOLIO_SEED = { ... }
  ```
  La estructura base esperada es:
  ```js
  window.PORTAFOLIO_SEED = {
    version: 3,
    profile: {
      name: "",
      career: "",
      university: "",
      professor: "",
      term: "",
      bio: "",
      goals: ""
    },
    topics: [],
    practiceFiles: [],
    workshops: [],
    exams: [],
    learnings: []
  };
  ```

## Limitaciones
- Los datos viven en el navegador del usuario y se persisten localmente.
- Si se usa otra computadora o dispositivo, los datos no se sincronizan automáticamente sin importar/exportar el respaldo.
- El contenido semilla solo sirve como punto de partida y no reemplaza la información real del estudiante.

## Créditos
- Fuente principal del texto visual: Google Fonts (Inter, Outfit y Fira Code).
- Renderizado matemático: KaTeX.
- Iconografía y gráficos de apoyo: recursos vectoriales en la carpeta `assets/`.

## Nota de datos
Si no hay información real del estudiante, el sistema deja esos campos vacíos y muestra marcadores claros para completar la información de forma manual.
