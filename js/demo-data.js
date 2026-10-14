(function () {
  const demoData = {
    version: 3,
    profile: {
      name: "Estudiante de ejemplo",
      career: "Carrera de ejemplo",
      university: "Universidad de ejemplo",
      professor: "Docente de ejemplo",
      term: "2026-I",
      bio: "Este es un conjunto de ejemplo para probar el portafolio. Completa tus datos reales en la edición del perfil.",
      goals: "Usar este espacio para registrar temas, ejercicios, talleres y reflexiones del curso."
    },
    topics: [
      {
        id: "demo-tema-1",
        order: 1,
        title: "Tema de ejemplo",
        description: "Contenido de demostración. Reemplaza este tema por tus propios registros.",
        status: "En progreso",
        definitions: [
          {
            id: "demo-card-def-1",
            title: "Definición",
            text: "Aquí aparece una definición de ejemplo para mostrar el formato del portafolio.",
            imageData: null,
            imageFileId: null,
            imageName: null
          }
        ],
        formulas: [
          {
            id: "demo-card-form-1",
            title: "Fórmula de ejemplo",
            latex: "v = \frac{\Delta x}{\Delta t}",
            text: "Ejemplo de renderizado matemático.",
            imageData: null,
            imageFileId: null,
            imageName: null
          }
        ],
        metacognition: [
          {
            id: "demo-card-meta-1",
            title: "Reflexión",
            text: "Este bloque es de demostración. Completa tu propia metacognición.",
            imageData: null,
            imageFileId: null,
            imageName: null
          }
        ],
        evidencias: []
      }
    ],
    practiceFiles: [],
    workshops: [],
    exams: [],
    learnings: []
  };

  window.PORTAFOLIO_DEMO_DATA = demoData;
  window.loadPortfolioDemoData = function () {
    if (typeof localStorage === "undefined") {
      return false;
    }

    const seed = JSON.parse(JSON.stringify(demoData));
    localStorage.setItem("portafolio_fisica_db_v3", JSON.stringify(seed));
    return true;
  };
})();
