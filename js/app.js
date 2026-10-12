/**
 * ============================================================================
 * PORTAFOLIO DIGITAL DE FÍSICA I — MOTOR DE APLICACIÓN v3.5
 * ============================================================================
 * Características:
 *  - Guardado automático en tiempo real en todos los apartados (debounced autosave).
 *  - Integración nativa con IndexedDB (FileStorage) para almacenamiento local
 *    persistente de imágenes de alta resolución y archivos PDF sin límites de cuota.
 *  - Sección «Mis temas» simplificada: 4 pestañas exclusivas (Definiciones, Fórmulas,
 *    Metacognición, Evidencias) con tarjetas totalmente flexibles (texto solo, imagen
 *    sola, título+imagen, título+texto+imagen, etc.).
 *  - Sección «Prácticas» simplificada al máximo: gestor de fotos y documentos PDF
 *    con zona de carga drag & drop y botones directos, sin formularios tediosos.
 *  - Módulos independientes de Talleres, Parciales y Mi Aprendizaje.
 *  - Renderizado matemático KaTeX con previsualización en vivo.
 *  - Importación y exportación de respaldos en formato JSON completo.
 * ============================================================================
 */

// Claves de almacenamiento
const STORAGE_KEY_DB = "portafolio_fisica_db_v3";
const LEGACY_STORAGE_KEY_TOPICS = "portafolio_fisica_topics_v2";
const LEGACY_STORAGE_KEY_PROFILE = "portafolio_fisica_profile_v2";

// ============================================================================
// ALMACENAMIENTO BINARIO CON INDEXEDDB (FileStorage)
// Permite guardar imágenes y PDFs de cualquier tamaño sin saturar LocalStorage
// ============================================================================
const FileStorage = {
  dbName: "PortafolioFisicaIDB",
  dbVersion: 1,
  storeName: "files",
  _db: null,
  _cache: new Map(), // Caché en memoria para acceso instantáneo

  async init() {
    if (this._db) return this._db;
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(this.dbName, this.dbVersion);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: "id" });
          }
        };
        req.onsuccess = (e) => {
          this._db = e.target.result;
          resolve(this._db);
        };
        req.onerror = (e) => {
          console.warn("IndexedDB no disponible, usando fallback en memoria:", e);
          resolve(null);
        };
      } catch (err) {
        console.warn("Excepción al inicializar IndexedDB:", err);
        resolve(null);
      }
    });
  },

  async saveFile(id, name, type, size, data) {
    this._cache.set(id, data);
    const db = await this.init();
    if (!db) return true;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        store.put({ id, name, type, size, data, updatedAt: Date.now() });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  async getFile(id) {
    if (this._cache.has(id)) return this._cache.get(id);
    const db = await this.init();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result && req.result.data) {
            this._cache.set(id, req.result.data);
            resolve(req.result.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  },

  async deleteFile(id) {
    this._cache.delete(id);
    const db = await this.init();
    if (!db) return true;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  async getAllFiles() {
    const db = await this.init();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }
};

// ============================================================================
// UTILIDADES GENERALES
// ============================================================================

function generateUniqueId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function escapeHTML(str = "") {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return "0 KB";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function showToast(message, type = "info") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === "success" ? "✓" : type === "error" ? "⚠️" : "ℹ"}</span>
    <span class="toast-message">${escapeHTML(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function renderKaTeX(element) {
  if (!element || typeof renderMathInElement !== "function") return;
  try {
    renderMathInElement(element, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true }
      ],
      throwOnError: false
    });
  } catch (err) {
    console.warn("KaTeX error:", err);
  }
}

function formatLatex(latexCode, isDisplayMode = false) {
  if (!latexCode || !latexCode.trim()) return "";
  if (typeof katex === "undefined") {
    return `<code class="math-fallback">${escapeHTML(latexCode)}</code>`;
  }
  try {
    return katex.renderToString(latexCode.trim(), {
      displayMode: isDisplayMode,
      throwOnError: false
    });
  } catch (err) {
    return `<code class="math-fallback">${escapeHTML(latexCode)}</code>`;
  }
}

// ============================================================================
// BASE DE DATOS INICIAL PREDETERMINADA (CONTENIDOS ACADÉMICOS DE FÍSICA I)
// ============================================================================

const DEFAULT_DB = {
  profile: {
    name: "Alejandro Morales",
    career: "Ingeniería Mecánica",
    university: "Facultad de Ingeniería",
    term: "2026-I",
    bio: "Estudiante de ingeniería enfocado en mecánica clásica, modelado analítico y análisis experimental de sistemas físicos.",
    goals: "Comprender a profundidad los modelos vectoriales y las leyes de movimiento, superando dificultades conceptuales mediante el análisis de errores y la verificación experimental."
  },
  topics: [
    {
      id: "tema-vectores",
      order: 1,
      title: "Vectores y Álgebra Vectorial",
      description: "Representación geométrica y analítica, componentes rectangulares, vectores unitarios, producto punto y producto cruz en dos y tres dimensiones.",
      status: "Completado",
      estimatedHours: "18 horas",
      definitions: [
        {
          id: "card-v-def1",
          title: "Vector en el Espacio",
          text: "Entidad geométrica y matemática definida por tres atributos indispensables: magnitud (módulo o longitud escalar), dirección (orientación angular en el espacio) y sentido. Se representa analíticamente como una tupla ordenada en ℝ³.",
          imageData: null
        },
        {
          id: "card-v-def2",
          title: "Componentes Rectangulares",
          text: "Proyecciones ortogonales de un vector sobre los ejes cartesianos: Ax = |A| cos(θ), Ay = |A| sin(θ). Permiten transformar el álgebra geométrica en sumas algebraicas directas.",
          imageData: null
        },
        {
          id: "card-v-def3",
          title: "Vector Unitario (Versor)",
          text: "Vector adimensional de módulo exactamente igual a 1, utilizado para especificar una dirección espacial: û = u / |u|. Los vectores canónicos en ℝ³ son î, ĵ, k̂.",
          imageData: null
        },
        {
          id: "card-v-def4",
          title: "Producto Escalar (Punto)",
          text: "Operación binaria que produce un escalar: A · B = |A||B| cos(θ) = AxBx + AyBy + AzBz. Su valor es nulo si y sólo si los vectores son ortogonales.",
          imageData: null
        },
        {
          id: "card-v-def5",
          title: "Producto Vectorial (Cruz)",
          text: "Operación en ℝ³ que genera un vector perpendicular a ambos factores: |A × B| = |A||B| sin(θ). Su sentido sigue la regla de la mano derecha y su magnitud es el área del paralelogramo.",
          imageData: null
        }
      ],
      formulas: [
        {
          id: "card-v-form1",
          title: "Módulo de un Vector en ℝ³",
          latex: "|\\vec{A}| = \\sqrt{A_x^2 + A_y^2 + A_z^2}",
          text: "El módulo representa la longitud euclidiana del vector. Es siempre no negativo y satisface la desigualdad triangular.",
          imageData: null
        },
        {
          id: "card-v-form2",
          title: "Descomposición Cartesiana 2D",
          latex: "A_x = |\\vec{A}|\\cos\\theta, \\quad A_y = |\\vec{A}|\\sin\\theta, \\quad \\theta = \\arctan\\left(\\frac{A_y}{A_x}\\right)",
          text: "Válido para un ángulo θ medido en sentido antihorario desde el semieje positivo X. Requiere verificar el cuadrante si Ax < 0.",
          imageData: null
        },
        {
          id: "card-v-form3",
          title: "Producto Escalar y Ángulo Relativo",
          latex: "\\vec{A} \\cdot \\vec{B} = |\\vec{A}||\\vec{B}|\\cos\\theta = A_x B_x + A_y B_y + A_z B_z",
          text: "Permite despejar el ángulo relativo entre cualquier par de fuerzas o desplazamientos tridimensionales: cos(θ) = (A · B) / (|A||B|).",
          imageData: null
        },
        {
          id: "card-v-form4",
          title: "Proyección Ortogonal de A sobre B",
          latex: "\\text{Proy}_{\\vec{B}}(\\vec{A}) = \\frac{\\vec{A} \\cdot \\vec{B}}{|\\vec{B}|}",
          text: "Componente escalar de A que actúa en la dirección exacta de la línea de acción de B.",
          imageData: null
        }
      ],
      metacognition: [
        {
          id: "card-v-meta1",
          title: "Dificultad de Cuadrantes en la Calculadora",
          text: "Al calcular el ángulo polar con arctan(Ay/Ax), la calculadora siempre devuelve valores entre -90° y +90°. Aprendí que si la componente Ax es negativa (cuadrantes II y III), debo sumar siempre 180° para obtener el ángulo polar verdadero desde el eje +X.",
          imageData: null
        },
        {
          id: "card-v-meta2",
          title: "Visualización Espacial en 3D",
          text: "Dibujar una caja paralelepípeda alrededor del vector ayuda a identificar los cosenos directores y evitar confusiones en los signos de las componentes k̂.",
          imageData: null
        }
      ],
      evidencias: [
        {
          id: "card-v-evi1",
          title: "Esquema Conceptual de Álgebra Vectorial en 2D",
          text: "Esquema analítico con descomposiciones cartesianas, cálculo de módulo por Pitágoras y regla del paralelogramo.",
          imageData: "assets/imagenes/mapa_vectores.svg",
          imageName: "mapa_vectores.svg"
        }
      ]
    },
    {
      id: "tema-cinematica",
      order: 2,
      title: "Cinemática en Una y Dos Dimensiones",
      description: "Posición, desplazamiento, velocidad instantánea, aceleración, MRU, MRUV, caída libre y movimiento parabólico de proyectiles.",
      status: "Completado",
      estimatedHours: "22 horas",
      definitions: [
        {
          id: "card-c-def1",
          title: "Posición",
          text: "Vector r(t) trazado desde el origen del marco de referencia hasta la ubicación puntual de la partícula en el instante t.",
          imageData: null
        },
        {
          id: "card-c-def2",
          title: "Desplazamiento",
          text: "Vector que une la posición inicial con la final: Δr = r(t₂) - r(t₁). Es estrictamente independiente de la trayectoria recorrida.",
          imageData: null
        },
        {
          id: "card-c-def3",
          title: "Velocidad Instantánea",
          text: "Derivada temporal del vector posición: v = dr/dt. Es un vector tangente a la trayectoria en cada instante.",
          imageData: null
        },
        {
          id: "card-c-def4",
          title: "Aceleración",
          text: "Tasa de cambio de la velocidad respecto al tiempo: a = dv/dt = d²r/dt².",
          imageData: null
        },
        {
          id: "card-c-def5",
          title: "Tiro Parabólico",
          text: "Superposición de dos movimientos independientes: MRU uniforme horizontal y MRUV acelerado vertical bajo la gravedad g.",
          imageData: null
        }
      ],
      formulas: [
        {
          id: "card-c-form1",
          title: "Ecuación de Posición en MRUV",
          latex: "x(t) = x_0 + v_0 t + \\frac{1}{2} a t^2",
          text: "Válida únicamente cuando la aceleración 'a' se mantiene constante.",
          imageData: null
        },
        {
          id: "card-c-form2",
          title: "Ecuación de Torricelli",
          latex: "v_f^2 = v_0^2 + 2 a \\Delta x",
          text: "Aceleración constante; permite calcular la rapidez sin conocer el tiempo transcurrido.",
          imageData: null
        },
        {
          id: "card-c-form3",
          title: "Tiro Parabólico Paramétrico",
          latex: "x(t) = (v_0 \\cos\\theta) t, \\quad y(t) = y_0 + (v_0 \\sin\\theta) t - \\frac{1}{2} g t^2",
          text: "Despreciando resistencia del aire con aceleración uniforme de gravedad g = 9.8 m/s².",
          imageData: null
        }
      ],
      metacognition: [
        {
          id: "card-c-meta1",
          title: "Convención de Signos en Tiro Parabólico",
          text: "Confundía el signo de la velocidad con el signo de la aceleración g. Aprendí a fijar desde el primer renglón: 'Eje vertical positivo hacia arriba, por ende a_y = -9.8 m/s² constante en todo el vuelo, incluso en el punto de altura máxima'.",
          imageData: null
        }
      ],
      evidencias: [
        {
          id: "card-c-evi1",
          title: "Corrección de Parcial: Proyectil con Desnivel",
          text: "Demostración gráfica de por qué la fórmula simplificada de alcance horizontal no aplica cuando el proyectil se lanza desde un acantilado.",
          imageData: "assets/evidencias/correccion_parcial_tiro.svg",
          imageName: "correccion_parcial_tiro.svg"
        }
      ]
    },
    {
      id: "tema-newton",
      order: 3,
      title: "Leyes de Newton y Dinámica Clásica",
      description: "Causas del movimiento: Primera, Segunda y Tercera Ley de Newton, diagramas de cuerpo libre (DCL), fricción estática y cinética, y sistemas acoplados.",
      status: "En progreso",
      estimatedHours: "26 horas",
      definitions: [
        {
          id: "card-n-def1",
          title: "Primera Ley (Inercia)",
          text: "Todo cuerpo continúa en su estado de reposo o de movimiento rectilíneo uniforme a menos que una fuerza neta no nula actúe sobre él.",
          imageData: null
        },
        {
          id: "card-n-def2",
          title: "Segunda Ley (Dinámica)",
          text: "La aceleración de un cuerpo es directamente proporcional a la fuerza neta aplicada e inversamente proporcional a su masa: ΣF = m a.",
          imageData: null
        },
        {
          id: "card-n-def3",
          title: "Tercera Ley (Acción y Reacción)",
          text: "Las fuerzas de interacción siempre aparecen en pares opuestos de igual magnitud que actúan sobre cuerpos distintos: F_AB = -F_BA.",
          imageData: null
        },
        {
          id: "card-n-def4",
          title: "Fuerza Normal",
          text: "Fuerza de contacto perpendicular a la superficie de apoyo generada por la repulsión electromagnética microscópica entre átomos.",
          imageData: null
        },
        {
          id: "card-n-def5",
          title: "Fricción de Coulomb",
          text: "Resistencia tangencial al movimiento entre superficies secas: estática máxima fs = μs N y cinética fk = μk N.",
          imageData: null
        }
      ],
      formulas: [
        {
          id: "card-n-form1",
          title: "Segunda Ley de Newton",
          latex: "\\sum \\vec{F} = m \\vec{a} \\iff \\sum F_x = m a_x, \\quad \\sum F_y = m a_y",
          text: "Válida en marcos de referencia inerciales con masa inercial m constante.",
          imageData: null
        },
        {
          id: "card-n-form2",
          title: "Leyes de Fricción",
          latex: "f_{s,\\max} = \\mu_s N, \\quad f_k = \\mu_k N",
          text: "El coeficiente estático es mayor que el cinético (μs > μk) e independiente del área aparente de contacto.",
          imageData: null
        },
        {
          id: "card-n-form3",
          title: "Plano Inclinado con Ángulo θ",
          latex: "N = m g \\cos\\theta, \\quad \\sum F_{\\parallel} = m g \\sin\\theta - f_k = m a",
          text: "Ejes coordenados rotados: paralelo al plano y perpendicular al plano.",
          imageData: null
        }
      ],
      metacognition: [
        {
          id: "card-n-meta1",
          title: "Construcción Rigurosa del Diagrama de Cuerpo Libre (DCL)",
          text: "Omitía la normal en planos inclinados o dibujaba fuerzas ficticias. Aprendí la regla de oro: una fuerza sólo existe si hay un agente físico real en contacto con el cuerpo (o gravedad a distancia). Si no hay contacto, no hay fuerza.",
          imageData: null
        }
      ],
      evidencias: [
        {
          id: "card-n-evi1",
          title: "Diagrama de Cuerpo Libre en Plano Inclinado",
          text: "Descomposición del peso en componentes paralela y normal, con fuerza de fricción cinética opuesta al deslizamiento.",
          imageData: "assets/evidencias/dcl_plano_inclinado.svg",
          imageName: "dcl_plano_inclinado.svg"
        }
      ]
    }
  ],
  practiceFiles: [
    {
      id: "pfile-1",
      name: "montaje_experimental_fotopuertas.svg",
      type: "image/svg+xml",
      size: 14250,
      uploadDate: "2026-03-26",
      data: "assets/imagenes/laboratorio_fotopuertas.svg"
    },
    {
      id: "pfile-2",
      name: "guia_practica_mesa_fuerzas.pdf",
      type: "application/pdf",
      size: 285400,
      uploadDate: "2026-03-12",
      data: ""
    },
    {
      id: "pfile-3",
      name: "informe_segunda_ley_newton.pdf",
      type: "application/pdf",
      size: 452100,
      uploadDate: "2026-04-09",
      data: ""
    }
  ],
  workshops: [
    {
      id: "tall-v1",
      topicId: "tema-vectores",
      title: "Taller 1 - Ejercicio 4: Ángulo y Proyección Entre Fuerzas en 3D",
      date: "2026-03-18",
      statement: "Dadas dos fuerzas coplanares F₁ = (40î - 20ĵ + 10k̂) N y F₂ = (-15î + 30ĵ + 25k̂) N aplicadas en el origen, determine el ángulo entre ambas fuerzas y la componente proyectada de F₁ sobre la línea de acción de F₂.",
      formulas: "\\vec{F}_1 \\cdot \\vec{F}_2 = |\\vec{F}_1||\\vec{F}_2| \\cos(\\phi), \\quad \\text{Proy}_{F_2}(F_1) = \\frac{\\vec{F}_1 \\cdot \\vec{F}_2}{|\\vec{F}_2|}",
      stepByStep: "Paso 1: Módulos individuales:\n|F₁| = √(40² + (-20)² + 10²) = 45.83 N\n|F₂| = √((-15)² + 30² + 25²) = 41.83 N\n\nPaso 2: Producto escalar por componentes:\nF₁ · F₂ = (40)(-15) + (-20)(30) + (10)(25) = -950 N²\n\nPaso 3: Ángulo entre vectores:\ncos(φ) = (-950) / (45.83 × 41.83) = -0.4955 ⇒ φ = 119.70°\n\nPaso 4: Proyección escalar:\nProy = -950 / 41.83 = -22.71 N",
      finalAnswer: "Ángulo φ = 119.70° (obtuso). Proyección escalar de F₁ sobre F₂ = -22.71 N.",
      verification: "Comprobación geométrica: Proy = |F₁| cos(φ) = 45.83 × cos(119.70°) = -22.71 N.",
      reflection: "El producto escalar simplifica enormemente el cálculo de proyecciones espaciales sin recurrir a geometría tridimensional compleja.",
      files: []
    },
    {
      id: "tall-c1",
      topicId: "tema-cinematica",
      title: "Taller 2 - Ejercicio 3: Encuentro de Dos Móviles en MRUV",
      date: "2026-04-02",
      statement: "Dos vehículos A y B parten simultáneamente de dos puntos separados 600 metros viajando en sentidos opuestos. El móvil A parte del reposo acelerando a 2 m/s². El móvil B viaja hacia A con velocidad constante de 15 m/s. Halle el tiempo y la posición de encuentro.",
      formulas: "x_A(t) = \\frac{1}{2} a_A t^2, \\quad x_B(t) = 600 - v_B t",
      stepByStep: "Paso 1: Ecuaciones horarias con origen en A:\nxA(t) = t²\nxB(t) = 600 - 15 t\n\nPaso 2: Condición de encuentro xA = xB:\nt² + 15 t - 600 = 0\n\nPaso 3: Fórmula cuadrática:\nt = [-15 + √(225 + 2400)] / 2 = 18.12 segundos\n\nPaso 4: Posición:\nxA(18.12) = 328.33 metros desde el punto de partida de A.",
      finalAnswer: "Tiempo de encuentro t = 18.12 s; Posición x = 328.33 m.",
      verification: "Comprobación con móvil B: xB(18.12) = 600 - 15(18.12) = 328.2 m.",
      reflection: "Fijar un único sistema de coordenadas desde el primer renglón evita por completo confusiones de signos en movimientos opuestos.",
      files: []
    },
    {
      id: "tall-n1",
      topicId: "tema-newton",
      title: "Taller 3 - Ejercicio 5: Sistema Acoplado en la Máquina de Atwood",
      date: "2026-04-16",
      statement: "Dos masas m₁ = 3 kg y m₂ = 5 kg están conectadas por una cuerda inextensible y ligera que pasa por una polea ideal sin fricción. Halle la aceleración del sistema y la tensión en la cuerda al soltarlas del reposo.",
      formulas: "T - m_1 g = m_1 a, \\quad m_2 g - T = m_2 a \\implies a = \\frac{m_2 - m_1}{m_1 + m_2} g",
      stepByStep: "Paso 1: DCL y ecuaciones dinámicas individuales:\nPara m₁: T - 3(9.8) = 3 a\nPara m₂: 5(9.8) - T = 5 a\n\nPaso 2: Sumando ambas ecuaciones:\n(5 - 3)(9.8) = (3 + 5) a ⇒ 19.6 = 8 a ⇒ a = 2.45 m/s²\n\nPaso 3: Sustituyendo en la primera ecuación:\nT = 3(9.8 + 2.45) = 36.75 N",
      finalAnswer: "Aceleración a = 2.45 m/s²; Tensión en la cuerda T = 36.75 N.",
      verification: "Comprobando en m₂: T = 5(9.8 - 2.45) = 36.75 N.",
      reflection: "Al sumar las ecuaciones del sistema se cancelan las fuerzas internas (tensión), facilitando el despeje inmediato de la aceleración.",
      files: []
    }
  ],
  exams: [
    {
      id: "parc-v1",
      topicId: "tema-vectores",
      title: "Primer Parcial - Problema 1: Cálculo de Trabajo y Ángulo Relativo",
      date: "2026-04-20",
      evaluatedContents: "Álgebra vectorial, producto escalar, descomposición cartesiana",
      statement: "Un bloque es arrastrado sobre un plano horizontal una distancia de 8 metros por una fuerza constante F = 60 N orientada a 30° sobre la horizontal. Calcule el trabajo efectuado por dicha fuerza.",
      originalProcedure: "Se utilizó la fórmula W = F · d · cos(θ), pero se colocó: W = 60 N × 8 m × cos(60°) = 240 J, confundiéndose el ángulo de inclinación respecto a la vertical con el ángulo respecto a la horizontal.",
      identifiedError: "ERROR DE LECTURA Y DEFINICIÓN: El enunciado indicaba 30° con la horizontal (paralelo al desplazamiento). Se tomó erróneamente el ángulo complementario con la normal vertical (60°), reduciendo a la mitad el trabajo real.",
      correctSolution: "Paso 1: Identificar ángulo relativo φ entre F y el desplazamiento Δr:\nφ = 30° - 0° = 30°\n\nPaso 2: Cálculo con definición formal:\nW = |F| |Δr| cos(30°) = 60 N × 8 m × (√3 / 2) = 415.69 Joules",
      verification: "Comprobación por componentes: Fx = 60 cos(30°) = 51.96 N. W = Fx · Δx = 51.96 N × 8 m = 415.68 J.",
      preventionReflection: "Siempre trazar ambos vectores partiendo del mismo punto origen e identificar explícitamente el ángulo relativo antes de calcular funciones trigonométricas.",
      files: []
    },
    {
      id: "parc-c1",
      topicId: "tema-cinematica",
      title: "Primer Parcial - Problema 3: Proyectil Disparado desde un Acantilado",
      date: "2026-04-20",
      evaluatedContents: "Cinemática en dos dimensiones, tiro parabólico con desnivel vertical",
      statement: "Un proyectil se dispara desde la cima de un acantilado de 45 m de altura con rapidez de 25 m/s a un ángulo de 37° por encima de la horizontal. Halle el alcance horizontal hasta impactar en el suelo.",
      originalProcedure: "Se utilizó la fórmula de alcance simplificado: R = (v₀² sin 2θ) / g = (25² · sin 74°) / 9.8 = 61.31 metros.",
      identifiedError: "ERROR DE HIPÓTESIS DE VALIDEZ: Se aplicó la fórmula de alcance horizontal plano que sólo es válida cuando la altura final es igual a la inicial (Δy = 0), ignorando los 45 metros de caída extra.",
      correctSolution: "Paso 1: Descomposición inicial: v₀x = 19.96 m/s; v₀y = 15.04 m/s\nPaso 2: Ecuación vertical: 45 + 15.04 t - 4.9 t² = 0 ⇒ t = 4.93 s\nPaso 3: Alcance horizontal: x = 19.96 m/s × 4.93 s = 98.40 metros",
      verification: "Comprobación energética: rapidez de impacto v = √(25² + 2(9.8)(45)) = 38.82 m/s.",
      preventionReflection: "Nunca aplicar fórmulas de atajo sin verificar primero si se cumplen todas sus hipótesis de deducción (como Δy = 0). Las ecuaciones paramétricas horarias son universales.",
      files: []
    },
    {
      id: "parc-n1",
      topicId: "tema-newton",
      title: "Segundo Parcial - Problema 2: Bloques Superpuestos y Fricción de Contacto",
      date: "2026-05-15",
      evaluatedContents: "Leyes de Newton, fricción estática máxima, sistemas acoplados, DCL",
      statement: "Un bloque A de 2 kg descansa sobre un bloque B de 4 kg. Se aplica una fuerza horizontal F al bloque B sobre un suelo liso. Si μs = 0.4 entre ambos bloques, calcule la fuerza máxima F para que el bloque A no deslice sobre B.",
      originalProcedure: "Se planteó que la fricción máxima actuaba como fuerza externa en contra del movimiento del sistema: F = fs_max = μs mA g = 0.4(2)(9.8) = 7.84 N.",
      identifiedError: "ERROR GRAVE EN EL DCL Y TERCERA LEY: Se olvidó que la fuerza de fricción entre A y B es una fuerza INTERNA del sistema combinado. Es la fricción hacia adelante sobre el bloque A la que le suministra su aceleración.",
      correctSolution: "Paso 1: Analizar bloque A: a_max = μs g = 0.4 × 9.8 = 3.92 m/s²\nPaso 2: Sistema conjunto (A+B): F_max = (2 + 4) × 3.92 = 23.52 N",
      verification: "Comprobación: F_neta_B = 23.52 - 7.84 = 15.68 N ⇒ a = 15.68 / 4 = 3.92 m/s².",
      preventionReflection: "Siempre que existan cuerpos superpuestos o en contacto, aislar CADA cuerpo por separado en su propio DCL y verificar que las fuerzas de interacción mutua sean pares de acción y reacción opuestos.",
      files: []
    }
  ],
  learnings: [
    {
      id: "learn-v1",
      topicId: "tema-vectores",
      title: "Determinación del Cuadrante Polar Real en Vectores",
      difficulty: "Presentaba confusión sistemática al determinar el ángulo polar del vector resultante cuando la componente X era negativa (cuadrantes II y III), confiando a ciegas en la calculadora.",
      uncomprehendedConcept: "No comprendía que la función arco tangente de la calculadora tiene un rango principal restringido a (-90°, +90°).",
      strategyUsed: "Adopté la regla sistemática de representar gráficamente el vector en el plano cartesiano y aplicar: si Rx < 0, sumar 180° al ángulo polar.",
      helpfulResources: "Simulador de vectores PhET de la Universidad de Colorado y tutorías con el profesor.",
      whatILearned: "Aprendí que las matemáticas deben interpretarse físicamente. El signo de cada componente cartesiana determina la orientación espacial del vector.",
      howIVerified: "Resolví una prueba diagnóstica de 8 vectores con componentes en los cuatro cuadrantes con 100% de aciertos.",
      personalReflection: "Superar esta dificultad fortaleció mi confianza para abordar cinemática y dinámica sin arrastrar fallos trigonométricos.",
      files: []
    },
    {
      id: "learn-c1",
      topicId: "tema-cinematica",
      title: "Convención de Signos en Caída Libre y Tiro Parabólico",
      difficulty: "Me resultaba difícil elegir los signos correctos en las ecuaciones horarias cuando un proyectil subía y luego descendía.",
      uncomprehendedConcept: "Confundía el signo del vector velocidad con el signo del vector aceleración de la gravedad.",
      strategyUsed: "Fijar explícitamente desde el primer renglón: 'Eje vertical positivo hacia arriba, por lo tanto a_y = -g = -9.8 m/s² constante'.",
      helpfulResources: "Diagramas vectoriales paso a paso del profesor.",
      whatILearned: "Comprendí que la aceleración no se vuelve cero en el punto más alto; sólo la velocidad vertical se anula instantáneamente.",
      howIVerified: "Resolví correctamente 5 problemas de proyectiles con distintas alturas de inicio y fin en el taller de repaso.",
      personalReflection: "La claridad en el sistema de coordenadas eliminó por completo los errores de signos algebraicos.",
      files: []
    },
    {
      id: "learn-n1",
      topicId: "tema-newton",
      title: "Construcción Rigurosa del Diagrama de Cuerpo Libre (DCL)",
      difficulty: "Dificultad recurrente en la formulación del DCL, omitiendo la fuerza normal o dibujando fuerzas ficticias.",
      uncomprehendedConcept: "Pensaba que 'la inercia' era una fuerza real aplicada en vez de una propiedad intrínseca de la masa.",
      strategyUsed: "Lista de chequeo física: 1. Gravedad hacia abajo; 2. Contactos físicos reales. Si no hay contacto, no hay fuerza.",
      helpfulResources: "Capítulo 5 del Sears-Zemansky con código de colores.",
      whatILearned: "Una fuerza sólo existe si hay un agente físico identificable que la ejerza. El DCL es el puente indispensable entre el enunciado y la matemática.",
      howIVerified: "Resolví correctamente los 6 ejercicios de sistemas acoplados del examen parcial sin omitir ni duplicar ninguna fuerza.",
      personalReflection: "Aprender a elaborar un DCL riguroso transformó mi manera de abordar la física: pasé de memorizar fórmulas a razonar interacciones físicas reales.",
      files: []
    }
  ]
};

// ============================================================================
// GESTIÓN DE BASE DE DATOS Y MIGRACIÓN TRANSPARENTE
// ============================================================================

let appDB = loadDatabase();
let currentView = "inicio";
let activeDetailTopicId = null;
let activeDetailSubtab = "sub-definiciones";
let currentConfirmAction = null;

// Filtros en memoria
let filters = {
  topicsSearch: "",
  topicsStatus: "all",
  practicesSearch: "",
  workshopsSearch: "",
  workshopsTopic: "all",
  examsSearch: "",
  examsTopic: "all",
  learningsSearch: "",
  learningsTopic: "all"
};

function loadDatabase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DB);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.profile = parsed.profile || structuredClone(DEFAULT_DB.profile);
      parsed.topics = Array.isArray(parsed.topics) ? parsed.topics : structuredClone(DEFAULT_DB.topics);
      parsed.practiceFiles = Array.isArray(parsed.practiceFiles) ? parsed.practiceFiles : structuredClone(DEFAULT_DB.practiceFiles);
      parsed.workshops = Array.isArray(parsed.workshops) ? parsed.workshops : structuredClone(DEFAULT_DB.workshops);
      parsed.exams = Array.isArray(parsed.exams) ? parsed.exams : structuredClone(DEFAULT_DB.exams);
      parsed.learnings = Array.isArray(parsed.learnings) ? parsed.learnings : structuredClone(DEFAULT_DB.learnings);

      // Normalizar estructura de cada tema a las 4 secciones solicitadas
      parsed.topics.forEach((t) => {
        // 1. Definiciones
        if (Array.isArray(t.definitions)) {
          t.definitions = t.definitions.map(d => ({
            id: d.id || generateUniqueId("card_def"),
            title: d.title || d.term || "",
            text: d.text || d.definition || "",
            imageData: d.imageData || null,
            imageFileId: d.imageFileId || null,
            imageName: d.imageName || null
          }));
        } else {
          t.definitions = [];
        }

        // 2. Fórmulas
        if (Array.isArray(t.formulas)) {
          t.formulas = t.formulas.map(f => ({
            id: f.id || generateUniqueId("card_form"),
            title: f.title || f.name || "",
            latex: f.latex || "",
            text: f.text || [f.variables, f.conditions, f.example].filter(Boolean).join("\n") || "",
            imageData: f.imageData || null,
            imageFileId: f.imageFileId || null,
            imageName: f.imageName || null
          }));
        } else {
          t.formulas = [];
        }

        // 3. Metacognición
        if (!Array.isArray(t.metacognition)) {
          t.metacognition = [];
          // Si existían situaciones asociadas a este tema en learnings, migrarlas
          if (Array.isArray(parsed.learnings)) {
            const topicLearnings = parsed.learnings.filter(l => l.topicId === t.id);
            topicLearnings.forEach(l => {
              t.metacognition.push({
                id: generateUniqueId("card_meta"),
                title: l.title || "Reflexión Metacognitiva",
                text: l.difficulty ? `Dificultad: ${l.difficulty}\n\nEstrategia: ${l.strategyUsed || ''}\n\nQué aprendí: ${l.whatILearned || ''}` : (l.text || ""),
                imageData: null
              });
            });
          }
        }

        // 4. Evidencias
        if (!Array.isArray(t.evidencias)) {
          t.evidencias = [];
          if (t.mapFile && t.mapFile.data) {
            t.evidencias.push({
              id: generateUniqueId("card_evi"),
              title: "Mapa Conceptual",
              text: t.conceptualScheme || "",
              imageData: t.mapFile.data,
              imageName: t.mapFile.name || "mapa.svg"
            });
          }
        }
      });

      return parsed;
    }

    // Inicializar con DEFAULT_DB
    const initial = structuredClone(DEFAULT_DB);
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(initial));
    return initial;
  } catch (err) {
    console.error("Error al cargar la base de datos:", err);
    return structuredClone(DEFAULT_DB);
  }
}

// ============================================================================
// MOTOR DE GUARDADO AUTOMÁTICO EN TIEMPO REAL (AUTOSAVE)
// ============================================================================

let autoSaveTimer = null;
let isSaving = false;

function scheduleAutoSave(delayMs = 350) {
  setAutosaveUI("saving");
  if (autoSaveTimer) clearTimeout(autoSaveTimer);

  autoSaveTimer = setTimeout(() => {
    saveDatabase();
  }, delayMs);
}

function flushAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  return saveDatabase();
}

function saveDatabase() {
  if (isSaving) return true;
  isSaving = true;
  try {
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(appDB));
    updateStorageMeter();
    setAutosaveUI("saved");
    isSaving = false;
    return true;
  } catch (err) {
    isSaving = false;
    console.error("Error de guardado en LocalStorage:", err);
    setAutosaveUI("error");
    if (err.name === "QuotaExceededError" || err.code === 22) {
      showToast("Memoria LocalStorage llena. Las imágenes grandes se guardan en IndexedDB.", "error");
    }
    return false;
  }
}

function setAutosaveUI(state) {
  const topbar = document.getElementById("topbarAutosave");
  const text = document.getElementById("autosaveText");
  const modalBadges = document.querySelectorAll(".modal-autosave-badge");

  if (state === "saving") {
    if (topbar) topbar.className = "topbar-autosave saving";
    if (text) text.textContent = "Guardando...";
    modalBadges.forEach(b => {
      b.className = "modal-autosave-badge saving";
      b.textContent = "⏳ Guardando...";
    });
  } else if (state === "saved") {
    if (topbar) topbar.className = "topbar-autosave saved";
    if (text) text.textContent = "Guardado";
    modalBadges.forEach(b => {
      b.className = "modal-autosave-badge saved";
      b.textContent = "✓ Guardado";
    });
  } else if (state === "error") {
    if (topbar) topbar.className = "topbar-autosave error";
    if (text) text.textContent = "Error al guardar";
    modalBadges.forEach(b => {
      b.className = "modal-autosave-badge error";
      b.textContent = "⚠️ Error";
    });
  }
}

// Guardar de inmediato si el usuario cambia de pestaña o cierra la ventana
window.addEventListener("beforeunload", () => flushAutoSave());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) flushAutoSave();
});

function updateStorageMeter() {
  try {
    let totalBytes = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalBytes += (localStorage[key].length + key.length) * 2;
      }
    }
    const kbUsed = Math.round(totalBytes / 1024);
    const maxKb = 5000;
    const percentage = Math.min(100, Math.max(1, Math.round((kbUsed / maxKb) * 100)));

    const usedText = `${kbUsed} KB / 5 MB`;
    const sideText = document.getElementById("storageUsedText");
    const sideBar = document.getElementById("storageUsedBar");
    const detUsed = document.getElementById("storageDetailUsed");
    const detBar = document.getElementById("storageDetailBar");

    if (sideText) sideText.textContent = usedText;
    if (sideBar) sideBar.style.width = `${percentage}%`;
    if (detUsed) detUsed.textContent = `${kbUsed} KB (${percentage}% del límite estimado)`;
    if (detBar) detBar.style.width = `${percentage}%`;
  } catch (e) {
    console.warn("Error en monitor de almacenamiento:", e);
  }
}

function getTopicTitleById(topicId) {
  if (!topicId) return "General / No especificado";
  const t = appDB.topics.find(x => x.id === topicId);
  return t ? t.title : "Tema no encontrado";
}

// ============================================================================
// CONTROLADOR DE NAVEGACIÓN ENTRE VISTAS
// ============================================================================

function navigateToView(viewName) {
  flushAutoSave();
  currentView = viewName;

  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(item => {
    const itemTarget = item.getAttribute("data-view");
    item.classList.toggle("active", itemTarget === viewName || (viewName === "detail" && itemTarget === "temas"));
  });

  const pageTitle = document.getElementById("pageTitle");
  const topbarTag = document.getElementById("topbarTag");
  const titles = {
    inicio: { title: "Inicio", tag: "PANEL PRINCIPAL" },
    temas: { title: "2. Mis Temas de Estudio", tag: "CONTENIDOS ACADÉMICOS" },
    practicas: { title: "3. Prácticas de Laboratorio", tag: "EXPERIMENTACIÓN Y ARCHIVOS" },
    talleres: { title: "4. Talleres y Ejercicios", tag: "RESOLUCIÓN DE PROBLEMAS" },
    parciales: { title: "5. Evaluaciones y Parciales", tag: "EVALUACIÓN Y APRENDIZAJE CRÍTICO" },
    aprendizaje: { title: "6. Mi Aprendizaje y Metacognición", tag: "DIFICULTADES Y ESTRATEGIAS" },
    respaldo: { title: "Copias de Seguridad y Datos", tag: "GESTIÓN DEL SISTEMA" },
    detail: { title: "Contenido del Tema", tag: "MIS TEMAS" }
  };

  if (titles[viewName]) {
    if (pageTitle) pageTitle.textContent = titles[viewName].title;
    if (topbarTag) topbarTag.textContent = titles[viewName].tag;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
  closeMobileMenu();
  renderActiveView();
}

function openMobileMenu() {
  document.getElementById("sidebar")?.classList.add("open");
  document.getElementById("sidebarBackdrop")?.classList.add("open");
}

function closeMobileMenu() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarBackdrop")?.classList.remove("open");
}

// ============================================================================
// RENDERIZADO GLOBAL DE LA APLICACIÓN
// ============================================================================

function renderApp() {
  updateProfileUI();
  updateNavBadges();
  populateTopicSelects();
  updateStorageMeter();
  renderActiveView();
}

function updateNavBadges() {
  const topicsCount = appDB.topics.length;
  const practicesCount = appDB.practiceFiles ? appDB.practiceFiles.length : 0;
  const workshopsCount = appDB.workshops.length;
  const examsCount = appDB.exams.length;
  const learningsCount = appDB.learnings.length;

  const setBadge = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setBadge("navTopicsCount", topicsCount);
  setBadge("navPracticesCount", practicesCount);
  setBadge("navWorkshopsCount", workshopsCount);
  setBadge("navExamsCount", examsCount);
  setBadge("navLearningsCount", learningsCount);

  // KPIs de la vista Inicio
  setBadge("kpiTopicsCount", topicsCount);
  setBadge("kpiPracticesCount", practicesCount);
  setBadge("kpiWorkshopsCount", workshopsCount);
  setBadge("kpiExamsCount", examsCount);
  setBadge("kpiLearningsCount", learningsCount);

  const completed = appDB.topics.filter(t => t.status === "Completado").length;
  const progressPct = topicsCount > 0 ? Math.round((completed / topicsCount) * 100) : 0;
  const progText = document.getElementById("kpiGlobalProgress");
  const progBar = document.getElementById("kpiGlobalProgressBar");
  if (progText) progText.textContent = `${progressPct}%`;
  if (progBar) progBar.style.width = `${progressPct}%`;
}

function renderActiveView() {
  switch (currentView) {
    case "inicio":
      renderInicio();
      break;
    case "temas":
      renderTemas();
      break;
    case "practicas":
      renderPracticas();
      break;
    case "talleres":
      renderTalleres();
      break;
    case "parciales":
      renderParciales();
      break;
    case "aprendizaje":
      renderAprendizaje();
      break;
    case "detail":
      if (activeDetailTopicId) renderTopicDetail(activeDetailTopicId);
      break;
    case "respaldo":
      updateStorageMeter();
      break;
  }
}

function updateProfileUI() {
  const p = appDB.profile;
  const avatar = document.getElementById("sidebarAvatar");
  const name = document.getElementById("sidebarStudentName");
  const meta = document.getElementById("sidebarStudentMeta");

  if (name) name.textContent = p.name || "Estudiante";
  if (meta) meta.textContent = `${p.career || "Física I"} · ${p.term || "2026-I"}`;
  if (avatar) {
    const initials = (p.name || "E").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    avatar.textContent = initials || "AM";
  }
}

function populateTopicSelects() {
  const selects = [
    document.getElementById("filterWorkshopTopicSelect"),
    document.getElementById("filterExamTopicSelect"),
    document.getElementById("filterLearningTopicSelect"),
    document.getElementById("workshopFormTopicSelect"),
    document.getElementById("examFormTopicSelect"),
    document.getElementById("learningFormTopicSelect")
  ];

  selects.forEach(select => {
    if (!select) return;
    const currentVal = select.value;
    const isFilter = select.id.startsWith("filter");

    let optionsHTML = isFilter
      ? `<option value="all">Todos los temas</option>`
      : `<option value="">(Sin vincular a un tema específico)</option>`;

    appDB.topics.forEach(t => {
      optionsHTML += `<option value="${escapeHTML(t.id)}">${escapeHTML(t.title)}</option>`;
    });

    select.innerHTML = optionsHTML;
    if (currentVal) select.value = currentVal;
  });
}

// ============================================================================
// VISTA 1: INICIO (DASHBOARD)
// ============================================================================

function renderInicio() {
  const recentTopicsGrid = document.getElementById("homeRecentTopicsGrid");
  if (recentTopicsGrid) {
    const recent = [...appDB.topics].slice(0, 3);
    recentTopicsGrid.innerHTML = recent.map(t => createTopicCardHTML(t)).join("");
    bindTopicCardClicks(recentTopicsGrid);
  }

  const recentActsGrid = document.getElementById("homeRecentActivitiesGrid");
  if (recentActsGrid) {
    const items = [];
    (appDB.practiceFiles || []).slice(0, 2).forEach(p => items.push({ ...p, kind: "practica", title: p.name, view: "practicas" }));
    (appDB.workshops || []).slice(0, 2).forEach(w => items.push({ ...w, kind: "taller", view: "talleres" }));
    (appDB.exams || []).slice(0, 2).forEach(e => items.push({ ...e, kind: "parcial", view: "parciales" }));

    if (items.length === 0) {
      recentActsGrid.innerHTML = `<p class="text-muted" style="grid-column: 1/-1;">No hay actividades registradas aún.</p>`;
    } else {
      recentActsGrid.innerHTML = items.map(item => `
        <div class="recent-act-item" onclick="navigateToView('${item.view}')" style="cursor: pointer;">
          <div class="recent-act-badge ${item.kind}">${item.kind.toUpperCase()}</div>
          <div class="recent-act-info">
            <strong>${escapeHTML(item.title || item.name)}</strong>
            <span class="text-muted" style="font-size: 12px;">${escapeHTML(getTopicTitleById(item.topicId))}</span>
          </div>
        </div>
      `).join("");
    }
  }
}

// ============================================================================
// VISTA 2: MIS TEMAS (LISTADO GENERAL)
// ============================================================================

function renderTemas() {
  const grid = document.getElementById("topicsGrid");
  const empty = document.getElementById("topicsEmptyState");
  if (!grid) return;

  let filtered = appDB.topics.filter(t => {
    const matchSearch = !filters.topicsSearch ||
      t.title.toLowerCase().includes(filters.topicsSearch.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(filters.topicsSearch.toLowerCase()));
    const matchStatus = filters.topicsStatus === "all" || t.status === filters.topicsStatus;
    return matchSearch && matchStatus;
  });

  document.getElementById("countTopicsAll") && (document.getElementById("countTopicsAll").textContent = appDB.topics.length);
  document.getElementById("countTopicsComplete") && (document.getElementById("countTopicsComplete").textContent = appDB.topics.filter(t => t.status === "Completado").length);
  document.getElementById("countTopicsProgress") && (document.getElementById("countTopicsProgress").textContent = appDB.topics.filter(t => t.status === "En progreso").length);
  document.getElementById("countTopicsPending") && (document.getElementById("countTopicsPending").textContent = appDB.topics.filter(t => t.status === "Pendiente").length);

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
  } else {
    if (empty) empty.classList.add("hidden");
    grid.innerHTML = filtered.map(t => createTopicCardHTML(t)).join("");
    bindTopicCardClicks(grid);
  }
}

function createTopicCardHTML(topic) {
  const defCount = (topic.definitions && topic.definitions.length) || 0;
  const formCount = (topic.formulas && topic.formulas.length) || 0;
  const metaCount = (topic.metacognition && topic.metacognition.length) || 0;
  const eviCount = (topic.evidencias && topic.evidencias.length) || 0;

  const statusSlug = (topic.status || "pendiente").toLowerCase().replace(/\s+/g, "-");

  return `
    <div class="topic-card" data-topic-id="${escapeHTML(topic.id)}">
      <div class="topic-card-header">
        <span class="topic-order-badge">#${String(topic.order || 1).padStart(2, "0")}</span>
        <span class="status-badge ${statusSlug}">${escapeHTML(topic.status || "Pendiente")}</span>
      </div>
      <h3 class="topic-card-title">${escapeHTML(topic.title)}</h3>
      <p class="topic-card-desc">${escapeHTML(topic.description || "Sin descripción.")}</p>

      <!-- Los 4 apartados académicos del tema -->
      <div class="topic-content-chips">
        <span class="content-mini-chip ${defCount > 0 ? 'has-content' : ''}">Definiciones: ${defCount}</span>
        <span class="content-mini-chip ${formCount > 0 ? 'has-content' : ''}">Fórmulas: ${formCount}</span>
        <span class="content-mini-chip ${metaCount > 0 ? 'has-content' : ''}">Metacognición: ${metaCount}</span>
        <span class="content-mini-chip ${eviCount > 0 ? 'has-content' : ''}">Evidencias: ${eviCount}</span>
      </div>

      <div class="topic-card-actions">
        <button class="btn btn-primary btn-sm btn-view-topic" data-topic-id="${escapeHTML(topic.id)}">
          Ver Contenido Completo →
        </button>
        <div class="topic-card-actions-right">
          <button class="icon-action-btn btn-edit-topic" data-topic-id="${escapeHTML(topic.id)}" title="Editar tema">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          </button>
          <button class="icon-action-btn delete btn-delete-topic" data-topic-id="${escapeHTML(topic.id)}" title="Eliminar tema">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindTopicCardClicks(container) {
  if (!container) return;
  container.querySelectorAll(".btn-view-topic").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      showTopicDetail(btn.getAttribute("data-topic-id"));
    };
  });
  container.querySelectorAll(".btn-edit-topic").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openTopicModal(btn.getAttribute("data-topic-id"));
    };
  });
  container.querySelectorAll(".btn-delete-topic").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      confirmDelete("topic", btn.getAttribute("data-topic-id"));
    };
  });
}

function showTopicDetail(topicId) {
  activeDetailTopicId = topicId;
  navigateToView("detail");
}

// ============================================================================
// VISTA DETALLE DEL TEMA — ÚNICAMENTE 4 SECCIONES Y TARJETAS FLEXIBLES
// ============================================================================

function renderTopicDetail(topicId) {
  const topic = appDB.topics.find(t => t.id === topicId);
  const container = document.getElementById("topicDetailContainer");
  if (!topic || !container) {
    navigateToView("temas");
    return;
  }

  const defCount = (topic.definitions && topic.definitions.length) || 0;
  const formCount = (topic.formulas && topic.formulas.length) || 0;
  const metaCount = (topic.metacognition && topic.metacognition.length) || 0;
  const eviCount = (topic.evidencias && topic.evidencias.length) || 0;

  const statusSlug = (topic.status || "pendiente").toLowerCase().replace(/\s+/g, "-");

  let html = `
    <div class="topic-detail-header-card">
      <div class="detail-header-meta">
        <span class="topic-order-badge">#${String(topic.order || 1).padStart(2, "0")}</span>
        <span class="status-badge ${statusSlug}">${escapeHTML(topic.status)}</span>
        <span class="text-muted" style="font-size: 13px;">Dedicación: ${escapeHTML(topic.estimatedHours || "Sin registrar")}</span>
      </div>
      <h2 class="detail-topic-title">${escapeHTML(topic.title)}</h2>
      <p class="detail-topic-desc">${escapeHTML(topic.description || "Sin descripción registrada.")}</p>
    </div>

    <!-- Pestañas internas exclusivas: Definiciones, Fórmulas, Metacognición, Evidencias -->
    <div class="detail-tabs-bar" id="topicDetailSubTabs">
      <button class="detail-tab-btn ${activeDetailSubtab === 'sub-definiciones' ? 'active' : ''}" data-subtab="sub-definiciones">
        <span>📖</span> 1. Definiciones
        <span class="detail-tab-badge">${defCount}</span>
      </button>
      <button class="detail-tab-btn ${activeDetailSubtab === 'sub-formulas' ? 'active' : ''}" data-subtab="sub-formulas">
        <span>𝚺</span> 2. Fórmulas
        <span class="detail-tab-badge">${formCount}</span>
      </button>
      <button class="detail-tab-btn ${activeDetailSubtab === 'sub-metacognicion' ? 'active' : ''}" data-subtab="sub-metacognicion">
        <span>✦</span> 3. Metacognición
        <span class="detail-tab-badge">${metaCount}</span>
      </button>
      <button class="detail-tab-btn ${activeDetailSubtab === 'sub-evidencias' ? 'active' : ''}" data-subtab="sub-evidencias">
        <span>📂</span> 4. Evidencias
        <span class="detail-tab-badge">${eviCount}</span>
      </button>
    </div>
  `;

  // 1. PESTAÑA: DEFINICIONES
  html += `
    <div class="detail-tab-pane ${activeDetailSubtab === 'sub-definiciones' ? 'active' : ''}" id="sub-definiciones">
      <div class="academic-section-card">
        <div class="section-action-header">
          <div>
            <h3><span>📖</span> Definiciones Conceptuales (${defCount})</h3>
            <p class="text-muted" style="font-size: 13px;">Tarjetas con conceptos clave, explicaciones y diagramas opcionales.</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openCardModal('definitions', null, '${escapeHTML(topic.id)}')">
            ＋ Nueva Definición
          </button>
        </div>

        ${defCount === 0 ? `
          <div class="empty-state" style="padding: 30px;">
            <p>No hay definiciones registradas aún para este tema.</p>
            <button class="btn btn-outline btn-sm" onclick="openCardModal('definitions', null, '${escapeHTML(topic.id)}')">＋ Crear primera definición</button>
          </div>
        ` : `
          <div class="topic-cards-grid">
            ${topic.definitions.map(c => createAcademicCardHTML(c, 'definitions', topic.id)).join("")}
          </div>
        `}
      </div>
    </div>
  `;

  // 2. PESTAÑA: FÓRMULAS
  html += `
    <div class="detail-tab-pane ${activeDetailSubtab === 'sub-formulas' ? 'active' : ''}" id="sub-formulas">
      <div class="academic-section-card">
        <div class="section-action-header">
          <div>
            <h3><span>𝚺</span> Fórmulas y Modelos Matemáticos (${formCount})</h3>
            <p class="text-muted" style="font-size: 13px;">Expresiones matemáticas con renderizado KaTeX, explicaciones y condiciones de validez.</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openCardModal('formulas', null, '${escapeHTML(topic.id)}')">
            ＋ Nueva Fórmula
          </button>
        </div>

        ${formCount === 0 ? `
          <div class="empty-state" style="padding: 30px;">
            <p>No se han registrado fórmulas matemáticas en este tema.</p>
            <button class="btn btn-outline btn-sm" onclick="openCardModal('formulas', null, '${escapeHTML(topic.id)}')">＋ Crear primera fórmula</button>
          </div>
        ` : `
          <div class="topic-cards-grid">
            ${topic.formulas.map(c => createAcademicCardHTML(c, 'formulas', topic.id)).join("")}
          </div>
        `}
      </div>
    </div>
  `;

  // 3. PESTAÑA: METACOGNICIÓN
  html += `
    <div class="detail-tab-pane ${activeDetailSubtab === 'sub-metacognicion' ? 'active' : ''}" id="sub-metacognicion">
      <div class="academic-section-card">
        <div class="section-action-header">
          <div>
            <h3><span>✦</span> Metacognición y Situaciones de Aprendizaje (${metaCount})</h3>
            <p class="text-muted" style="font-size: 13px;">Bitácora de dificultades superadas, reflexiones y estrategias aplicadas en este tema.</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openCardModal('metacognition', null, '${escapeHTML(topic.id)}')">
            ＋ Nueva Reflexión
          </button>
        </div>

        ${metaCount === 0 ? `
          <div class="empty-state" style="padding: 30px;">
            <p>No has registrado reflexiones metacognitivas para este tema.</p>
            <button class="btn btn-outline btn-sm" onclick="openCardModal('metacognition', null, '${escapeHTML(topic.id)}')">＋ Registrar primera reflexión</button>
          </div>
        ` : `
          <div class="topic-cards-grid">
            ${topic.metacognition.map(c => createAcademicCardHTML(c, 'metacognition', topic.id)).join("")}
          </div>
        `}
      </div>
    </div>
  `;

  // 4. PESTAÑA: EVIDENCIAS
  html += `
    <div class="detail-tab-pane ${activeDetailSubtab === 'sub-evidencias' ? 'active' : ''}" id="sub-evidencias">
      <div class="academic-section-card">
        <div class="section-action-header">
          <div>
            <h3><span>📂</span> Evidencias y Recursos del Tema (${eviCount})</h3>
            <p class="text-muted" style="font-size: 13px;">Mapas conceptuales, apuntes gráficos, fotos de pizarrón y esquemas del tema.</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openCardModal('evidencias', null, '${escapeHTML(topic.id)}')">
            ＋ Nueva Evidencia
          </button>
        </div>

        ${eviCount === 0 ? `
          <div class="empty-state" style="padding: 30px;">
            <p>No hay evidencias gráficas añadidas a este tema.</p>
            <button class="btn btn-outline btn-sm" onclick="openCardModal('evidencias', null, '${escapeHTML(topic.id)}')">＋ Adjuntar primera evidencia</button>
          </div>
        ` : `
          <div class="topic-cards-grid">
            ${topic.evidencias.map(c => createAcademicCardHTML(c, 'evidencias', topic.id)).join("")}
          </div>
        `}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Renderizar KaTeX en fórmulas de las tarjetas
  renderKaTeX(container);

  // Escuchar cambio de pestañas internas
  container.querySelectorAll(".detail-tab-btn").forEach(btn => {
    btn.onclick = () => {
      container.querySelectorAll(".detail-tab-btn").forEach(b => b.classList.remove("active"));
      container.querySelectorAll(".detail-tab-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const targetSubtab = btn.getAttribute("data-subtab");
      activeDetailSubtab = targetSubtab;
      const targetPane = document.getElementById(targetSubtab);
      if (targetPane) targetPane.classList.add("active");
    };
  });
}

/**
 * Genera el HTML de una tarjeta académica completamente flexible
 * Soporta: solo texto, solo imagen, título+imagen, título+texto+imagen, etc.
 */
function createAcademicCardHTML(card, section, topicId) {
  const hasImage = Boolean(card.imageData);
  const hasTitle = Boolean(card.title && card.title.trim());
  const hasText = Boolean(card.text && card.text.trim());
  const hasLatex = Boolean(card.latex && card.latex.trim());

  let imageBlock = "";
  if (hasImage) {
    imageBlock = `
      <div class="card-media-wrap" onclick="openFileViewer('${escapeHTML(card.title || 'Imagen')}', 'image/jpeg', '${card.imageData}')">
        <img src="${card.imageData}" alt="${escapeHTML(card.title || 'Evidencia')}" loading="lazy">
        <span class="card-media-overlay-zoom">🔍 Ampliar</span>
      </div>
    `;
  }

  let mathBlock = "";
  if (hasLatex) {
    mathBlock = `
      <div class="card-academic-latex-wrap">
        <div class="katex-rendered-box">
          ${formatLatex(card.latex, true)}
        </div>
      </div>
    `;
  }

  return `
    <div class="topic-academic-card" id="card-el-${escapeHTML(card.id)}">
      ${imageBlock}
      <div class="card-content-body">
        ${hasTitle ? `<h4 class="card-academic-title">${escapeHTML(card.title)}</h4>` : ''}
        ${mathBlock}
        ${hasText ? `<div class="card-academic-text">${escapeHTML(card.text)}</div>` : ''}
      </div>
      <div class="card-academic-footer">
        <span class="card-academic-date">Guardado auto</span>
        <div class="card-academic-actions">
          <button class="btn btn-outline btn-sm" onclick="openCardModal('${section}', '${escapeHTML(card.id)}', '${escapeHTML(topicId)}')">
            ✎ Editar
          </button>
          <button class="icon-action-btn delete" title="Eliminar tarjeta" onclick="confirmDelete('card', '${escapeHTML(card.id)}', { topicId: '${escapeHTML(topicId)}', section: '${section}' })">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// MODAL EDITOR DE TARJETA FLEXIBLE CON GUARDADO EN TIEMPO REAL
// ============================================================================

let currentActiveCard = null;

function openCardModal(section, cardId = null, topicId = null) {
  const topic = appDB.topics.find(t => t.id === topicId);
  if (!topic) return;

  const sectionArray = topic[section];
  if (!Array.isArray(sectionArray)) topic[section] = [];

  let card = null;
  let isNew = false;

  if (cardId) {
    card = topic[section].find(c => c.id === cardId);
  }

  if (!card) {
    isNew = true;
    card = {
      id: generateUniqueId("card"),
      title: "",
      text: "",
      latex: "",
      imageData: null,
      imageFileId: null,
      imageName: null
    };
    topic[section].unshift(card);
    scheduleAutoSave(0); // Guardado inmediato del nuevo registro
  }

  currentActiveCard = card;

  // Llenar campos del modal
  document.getElementById("cardEditorTopicId").value = topicId;
  document.getElementById("cardEditorSection").value = section;
  document.getElementById("cardEditorCardId").value = card.id;

  const titleInput = document.getElementById("cardEditorTitle");
  const textInput = document.getElementById("cardEditorText");
  const latexInput = document.getElementById("cardEditorLatex");
  const formulaGroup = document.getElementById("cardEditorFormulaGroup");

  titleInput.value = card.title || "";
  textInput.value = card.text || "";

  if (section === "formulas") {
    formulaGroup.classList.remove("hidden");
    latexInput.value = card.latex || "";
    updateCardEditorLatexPreview(card.latex || "");
  } else {
    formulaGroup.classList.add("hidden");
    latexInput.value = "";
  }

  // Título e Icono del Modal según la sección
  const icons = {
    definitions: "📖 Definición",
    formulas: "𝚺 Fórmula y Modelo",
    metacognition: "✦ Metacognición",
    evidencias: "📂 Evidencia Gráfica"
  };
  document.getElementById("cardEditorModalTitle").textContent = isNew
    ? `Nueva Tarjeta (${icons[section] || 'Académica'})`
    : `Editar Tarjeta (${icons[section] || 'Académica'})`;

  renderCardEditorImageUI();

  // Enlazar eventos de guardado en tiempo real al escribir
  titleInput.oninput = () => {
    card.title = titleInput.value;
    scheduleAutoSave();
  };

  textInput.oninput = () => {
    card.text = textInput.value;
    scheduleAutoSave();
  };

  latexInput.oninput = () => {
    card.latex = latexInput.value;
    updateCardEditorLatexPreview(card.latex);
    scheduleAutoSave();
  };

  // Selector de imagen nueva
  const newImgInput = document.getElementById("cardEditorImageNewInput");
  newImgInput.value = "";
  newImgInput.onchange = (e) => handleCardImageUpload(e.target.files[0]);

  // Selector de cambio de imagen
  const changeImgInput = document.getElementById("cardEditorImageChangeInput");
  changeImgInput.value = "";
  changeImgInput.onchange = (e) => handleCardImageUpload(e.target.files[0]);

  // Botón para quitar imagen
  const removeImgBtn = document.getElementById("cardEditorRemoveImageBtn");
  removeImgBtn.onclick = () => {
    card.imageData = null;
    card.imageFileId = null;
    card.imageName = null;
    renderCardEditorImageUI();
    scheduleAutoSave(0);
    showToast("Imagen eliminada de la tarjeta.", "info");
  };

  // Botón para eliminar tarjeta
  const deleteBtn = document.getElementById("cardEditorDeleteBtn");
  deleteBtn.onclick = () => {
    closeModal("cardEditorModal");
    confirmDelete("card", card.id, { topicId, section });
  };

  openModal("cardEditorModal");
}

function renderCardEditorImageUI() {
  const currentWrap = document.getElementById("cardEditorImageCurrentWrap");
  const uploadWrap = document.getElementById("cardEditorImageUploadWrap");
  const previewImg = document.getElementById("cardEditorImageCurrentPreview");

  if (currentActiveCard && currentActiveCard.imageData) {
    previewImg.src = currentActiveCard.imageData;
    currentWrap.classList.remove("hidden");
    uploadWrap.classList.add("hidden");
  } else {
    currentWrap.classList.add("hidden");
    uploadWrap.classList.remove("hidden");
  }
}

function handleCardImageUpload(file) {
  if (!file || !currentActiveCard) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    const fileId = generateUniqueId("img");

    // Guardar en IndexedDB para persistencia segura de gran tamaño
    await FileStorage.saveFile(fileId, file.name, file.type, file.size, dataUrl);

    currentActiveCard.imageData = dataUrl;
    currentActiveCard.imageFileId = fileId;
    currentActiveCard.imageName = file.name;

    renderCardEditorImageUI();
    scheduleAutoSave(0);
    showToast(`✓ Imagen "${file.name}" adjuntada y guardada.`, "success");
  };
  reader.readAsDataURL(file);
}

function updateCardEditorLatexPreview(code) {
  const preview = document.getElementById("cardEditorLatexPreview");
  if (!preview) return;
  if (!code || !code.trim()) {
    preview.innerHTML = `<span class="text-muted">Escribe código LaTeX arriba para previsualizar aquí en vivo.</span>`;
    return;
  }
  preview.innerHTML = formatLatex(code, true);
}

function insertLatexSnippet(snippet) {
  const latexInput = document.getElementById("cardEditorLatex");
  if (!latexInput || !currentActiveCard) return;
  latexInput.value = (latexInput.value ? latexInput.value + " " : "") + snippet;
  currentActiveCard.latex = latexInput.value;
  updateCardEditorLatexPreview(currentActiveCard.latex);
  scheduleAutoSave();
  latexInput.focus();
}

// ============================================================================
// VISTA 3: PRÁCTICAS DE LABORATORIO — GESTOR DE ARCHIVOS Y FOTOS SIMPLIFICADO
// ============================================================================

function renderPracticas() {
  initPracticasDropzone();
  renderPracticasFilesList();
}

function initPracticasDropzone() {
  const dropzone = document.getElementById("practiceDropzone");
  if (!dropzone || dropzone._hasListeners) return;
  dropzone._hasListeners = true;

  ["dragenter", "dragover"].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-active");
    });
  });

  ["dragleave", "drop"].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-active");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handlePracticesBatchUpload(files);
    }
  });

  // Inputs de carga
  const headerInput = document.getElementById("practiceHeaderFileInput");
  const imagesInput = document.getElementById("practiceImagesBtnInput");
  const pdfsInput = document.getElementById("practicePdfsBtnInput");
  const anyInput = document.getElementById("practiceAnyBtnInput");

  [headerInput, imagesInput, pdfsInput, anyInput].forEach(inp => {
    if (inp) {
      inp.onchange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handlePracticesBatchUpload(e.target.files);
          inp.value = "";
        }
      };
    }
  });
}

function handlePracticesBatchUpload(fileList) {
  Array.from(fileList).forEach(file => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const fileId = generateUniqueId("prac_file");

      // Guardar en IndexedDB
      await FileStorage.saveFile(fileId, file.name, file.type, file.size, dataUrl);

      if (!Array.isArray(appDB.practiceFiles)) appDB.practiceFiles = [];

      appDB.practiceFiles.unshift({
        id: fileId,
        name: file.name,
        type: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        size: file.size,
        uploadDate: new Date().toISOString().slice(0, 10),
        data: dataUrl
      });

      scheduleAutoSave(0);
      renderPracticasFilesList();
      updateNavBadges();
      showToast(`✓ Archivo "${file.name}" subido y guardado.`, "success");
    };
    reader.readAsDataURL(file);
  });
}

function renderPracticasFilesList() {
  const grid = document.getElementById("practiceFilesGrid");
  const empty = document.getElementById("practiceFilesEmptyState");
  const badge = document.getElementById("practiceFilesTotalBadge");
  if (!grid) return;

  const files = appDB.practiceFiles || [];
  if (badge) badge.textContent = files.length;

  let filtered = files;
  if (filters.practicesSearch && filters.practicesSearch.trim()) {
    const q = filters.practicesSearch.toLowerCase().trim();
    filtered = files.filter(f => f.name.toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }

  if (empty) empty.classList.add("hidden");

  grid.innerHTML = filtered.map(f => {
    const isPdf = f.type === "application/pdf" || (f.name && f.name.toLowerCase().endsWith(".pdf"));
    const isImage = !isPdf;

    return `
      <div class="practice-file-card" id="pfile-el-${escapeHTML(f.id)}">
        <div class="practice-file-thumb" onclick="openFileViewer('${escapeHTML(f.name)}', '${escapeHTML(f.type)}', '${f.data}')">
          <span class="file-type-pill ${isPdf ? 'pdf' : ''}">${isPdf ? 'PDF' : 'IMAGEN'}</span>
          ${isImage ? `
            <img src="${f.data || 'assets/imagenes/laboratorio_fotopuertas.svg'}" alt="${escapeHTML(f.name)}" loading="lazy">
          ` : `
            <div class="pdf-icon-display">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <span style="font-weight: 700; font-size: 13px;">Documento PDF</span>
            </div>
          `}
        </div>

        <div class="practice-file-body">
          <h4 class="practice-file-name" title="${escapeHTML(f.name)}">${escapeHTML(f.name)}</h4>
          <span class="practice-file-meta">${formatBytes(f.size)} · ${escapeHTML(f.uploadDate || '2026-10-12')}</span>

          <div class="practice-file-actions">
            <button class="btn btn-primary btn-sm" onclick="openFileViewer('${escapeHTML(f.name)}', '${escapeHTML(f.type)}', '${f.data}')">
              👁 Abrir
            </button>
            <button class="btn btn-outline btn-sm" onclick="downloadFileDirectly('${escapeHTML(f.name)}', '${f.data}')">
              ⬇ Descargar
            </button>
            <label class="btn btn-outline btn-sm file-input-label" title="Reemplazar archivo">
              🔄 Reemplazar
              <input type="file" accept=".pdf, image/*" onchange="replacePracticeFile('${escapeHTML(f.id)}', this.files[0])">
            </label>
            <button class="icon-action-btn delete" title="Eliminar archivo" onclick="confirmDelete('practiceFile', '${escapeHTML(f.id)}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function replacePracticeFile(fileId, newFile) {
  if (!newFile) return;
  const fileRecord = appDB.practiceFiles.find(f => f.id === fileId);
  if (!fileRecord) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    await FileStorage.saveFile(fileId, newFile.name, newFile.type, newFile.size, dataUrl);

    fileRecord.name = newFile.name;
    fileRecord.type = newFile.type;
    fileRecord.size = newFile.size;
    fileRecord.data = dataUrl;
    fileRecord.uploadDate = new Date().toISOString().slice(0, 10);

    scheduleAutoSave(0);
    renderPracticasFilesList();
    showToast(`✓ Archivo reemplazado por "${newFile.name}".`, "success");
  };
  reader.readAsDataURL(newFile);
}

function downloadFileDirectly(filename, dataUrl) {
  if (!dataUrl) {
    showToast("Archivo no disponible para descarga local directa.", "info");
    return;
  }
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename || "archivo_practica";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ============================================================================
// VISTA 4: TALLERES (APARTADO INDEPENDIENTE)
// ============================================================================

function renderTalleres() {
  const grid = document.getElementById("workshopsGrid");
  const empty = document.getElementById("workshopsEmptyState");
  if (!grid) return;

  let filtered = appDB.workshops.filter(w => {
    const matchSearch = !filters.workshopsSearch ||
      w.title.toLowerCase().includes(filters.workshopsSearch.toLowerCase()) ||
      (w.statement && w.statement.toLowerCase().includes(filters.workshopsSearch.toLowerCase())) ||
      (w.finalAnswer && w.finalAnswer.toLowerCase().includes(filters.workshopsSearch.toLowerCase()));
    const matchTopic = filters.workshopsTopic === "all" || w.topicId === filters.workshopsTopic;
    return matchSearch && matchTopic;
  });

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
  } else {
    if (empty) empty.classList.add("hidden");
    grid.innerHTML = filtered.map(w => `
      <div class="activity-card" id="workshop-el-${escapeHTML(w.id)}">
        <div class="activity-card-top">
          <span class="activity-type-badge taller">📝 Taller</span>
          <span class="activity-date">${escapeHTML(w.date || '2026-10-12')}</span>
        </div>
        <div class="activity-card-topic">${escapeHTML(getTopicTitleById(w.topicId))}</div>
        <h3 class="activity-card-title">${escapeHTML(w.title)}</h3>
        <p class="activity-card-snippet">${escapeHTML(w.statement || "")}</p>
        ${w.finalAnswer ? `
          <div class="activity-card-highlight">
            <strong>Respuesta:</strong> ${escapeHTML(w.finalAnswer)}
          </div>
        ` : ''}
        <div class="activity-card-footer">
          <button class="btn btn-primary btn-sm" onclick="openItemViewerModal('workshop', '${escapeHTML(w.id)}')">
            Ver desarrollo
          </button>
          <div class="activity-card-actions">
            <button class="icon-action-btn" title="Editar taller" onclick="openWorkshopModal('${escapeHTML(w.id)}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button class="icon-action-btn delete" title="Eliminar taller" onclick="confirmDelete('workshop', '${escapeHTML(w.id)}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `).join("");
  }
}

let activeEditingWorkshop = null;

function openWorkshopModal(workshopId = null) {
  let item = null;
  let isNew = false;

  if (workshopId) {
    item = appDB.workshops.find(w => w.id === workshopId);
  }

  if (!item) {
    isNew = true;
    item = {
      id: generateUniqueId("tall"),
      topicId: "",
      title: "",
      date: new Date().toISOString().slice(0, 10),
      statement: "",
      formulas: "",
      stepByStep: "",
      finalAnswer: "",
      verification: "",
      reflection: "",
      files: []
    };
    appDB.workshops.unshift(item);
    scheduleAutoSave(0);
  }

  activeEditingWorkshop = item;

  document.getElementById("workshopModalTitle").textContent = isNew ? "Registrar Nuevo Taller" : "Editar Taller";
  document.getElementById("workshopFormId").value = item.id;
  document.getElementById("workshopFormTitle").value = item.title || "";
  document.getElementById("workshopFormDate").value = item.date || "";
  document.getElementById("workshopFormTopicSelect").value = item.topicId || "";
  document.getElementById("workshopFormStatement").value = item.statement || "";
  document.getElementById("workshopFormFormulas").value = item.formulas || "";
  document.getElementById("workshopFormStepByStep").value = item.stepByStep || "";
  document.getElementById("workshopFormAnswer").value = item.finalAnswer || "";
  document.getElementById("workshopFormVerification").value = item.verification || "";
  document.getElementById("workshopFormReflection").value = item.reflection || "";

  // Enlazar guardado automático en tiempo real en cada campo
  const fields = [
    { id: "workshopFormTitle", prop: "title" },
    { id: "workshopFormDate", prop: "date" },
    { id: "workshopFormTopicSelect", prop: "topicId" },
    { id: "workshopFormStatement", prop: "statement" },
    { id: "workshopFormFormulas", prop: "formulas" },
    { id: "workshopFormStepByStep", prop: "stepByStep" },
    { id: "workshopFormAnswer", prop: "finalAnswer" },
    { id: "workshopFormVerification", prop: "verification" },
    { id: "workshopFormReflection", prop: "reflection" }
  ];

  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (el) {
      el.oninput = () => {
        item[f.prop] = el.value;
        scheduleAutoSave();
      };
      el.onchange = () => {
        item[f.prop] = el.value;
        scheduleAutoSave();
      };
    }
  });

  const form = document.getElementById("workshopForm");
  form.onsubmit = (e) => {
    e.preventDefault();
    flushAutoSave();
    closeModal("workshopModal");
    renderTalleres();
    updateNavBadges();
    showToast("✓ Taller guardado correctamente.", "success");
  };

  openModal("workshopModal");
}

// ============================================================================
// VISTA 5: PARCIALES Y CORRECCIONES (APARTADO INDEPENDIENTE)
// ============================================================================

function renderParciales() {
  const grid = document.getElementById("examsGrid");
  const empty = document.getElementById("examsEmptyState");
  if (!grid) return;

  let filtered = appDB.exams.filter(e => {
    const matchSearch = !filters.examsSearch ||
      e.title.toLowerCase().includes(filters.examsSearch.toLowerCase()) ||
      (e.statement && e.statement.toLowerCase().includes(filters.examsSearch.toLowerCase())) ||
      (e.identifiedError && e.identifiedError.toLowerCase().includes(filters.examsSearch.toLowerCase()));
    const matchTopic = filters.examsTopic === "all" || e.topicId === filters.examsTopic;
    return matchSearch && matchTopic;
  });

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
  } else {
    if (empty) empty.classList.add("hidden");
    grid.innerHTML = filtered.map(e => `
      <div class="activity-card" id="exam-el-${escapeHTML(e.id)}">
        <div class="activity-card-top">
          <span class="activity-type-badge parcial">🎯 Parcial</span>
          <span class="activity-date">${escapeHTML(e.date || '2026-10-12')}</span>
        </div>
        <div class="activity-card-topic">${escapeHTML(getTopicTitleById(e.topicId))}</div>
        <h3 class="activity-card-title">${escapeHTML(e.title)}</h3>
        <p class="activity-card-snippet">${escapeHTML(e.statement || "")}</p>
        ${e.identifiedError ? `
          <div class="activity-card-warning">
            <strong>⚠ Error diagnosticado:</strong> ${escapeHTML(e.identifiedError)}
          </div>
        ` : ''}
        <div class="activity-card-footer">
          <button class="btn btn-primary btn-sm" onclick="openItemViewerModal('exam', '${escapeHTML(e.id)}')">
            Ver corrección
          </button>
          <div class="activity-card-actions">
            <button class="icon-action-btn" title="Editar parcial" onclick="openExamModal('${escapeHTML(e.id)}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button class="icon-action-btn delete" title="Eliminar parcial" onclick="confirmDelete('exam', '${escapeHTML(e.id)}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `).join("");
  }
}

let activeEditingExam = null;

function openExamModal(examId = null) {
  let item = null;
  let isNew = false;

  if (examId) {
    item = appDB.exams.find(e => e.id === examId);
  }

  if (!item) {
    isNew = true;
    item = {
      id: generateUniqueId("parc"),
      topicId: "",
      title: "",
      date: new Date().toISOString().slice(0, 10),
      evaluatedContents: "",
      statement: "",
      originalProcedure: "",
      identifiedError: "",
      correctSolution: "",
      verification: "",
      preventionReflection: "",
      files: []
    };
    appDB.exams.unshift(item);
    scheduleAutoSave(0);
  }

  activeEditingExam = item;

  document.getElementById("examModalTitle").textContent = isNew ? "Registrar Nuevo Parcial" : "Editar Corrección de Parcial";
  document.getElementById("examFormId").value = item.id;
  document.getElementById("examFormTitle").value = item.title || "";
  document.getElementById("examFormDate").value = item.date || "";
  document.getElementById("examFormTopicSelect").value = item.topicId || "";
  document.getElementById("examFormContents").value = item.evaluatedContents || "";
  document.getElementById("examFormStatement").value = item.statement || "";
  document.getElementById("examFormOriginal").value = item.originalProcedure || "";
  document.getElementById("examFormError").value = item.identifiedError || "";
  document.getElementById("examFormCorrectSolution").value = item.correctSolution || "";
  document.getElementById("examFormVerification").value = item.verification || "";
  document.getElementById("examFormReflection").value = item.preventionReflection || "";

  // Guardado en tiempo real en cada campo
  const fields = [
    { id: "examFormTitle", prop: "title" },
    { id: "examFormDate", prop: "date" },
    { id: "examFormTopicSelect", prop: "topicId" },
    { id: "examFormContents", prop: "evaluatedContents" },
    { id: "examFormStatement", prop: "statement" },
    { id: "examFormOriginal", prop: "originalProcedure" },
    { id: "examFormError", prop: "identifiedError" },
    { id: "examFormCorrectSolution", prop: "correctSolution" },
    { id: "examFormVerification", prop: "verification" },
    { id: "examFormReflection", prop: "preventionReflection" }
  ];

  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (el) {
      el.oninput = () => {
        item[f.prop] = el.value;
        scheduleAutoSave();
      };
      el.onchange = () => {
        item[f.prop] = el.value;
        scheduleAutoSave();
      };
    }
  });

  const form = document.getElementById("examForm");
  form.onsubmit = (e) => {
    e.preventDefault();
    flushAutoSave();
    closeModal("examModal");
    renderParciales();
    updateNavBadges();
    showToast("✓ Parcial guardado correctamente.", "success");
  };

  openModal("examModal");
}

// ============================================================================
// VISTA 6: MI APRENDIZAJE Y METACOGNICIÓN
// ============================================================================

function renderAprendizaje() {
  const grid = document.getElementById("learningsGrid");
  const empty = document.getElementById("learningsEmptyState");
  if (!grid) return;

  let filtered = appDB.learnings.filter(l => {
    const matchSearch = !filters.learningsSearch ||
      l.title.toLowerCase().includes(filters.learningsSearch.toLowerCase()) ||
      (l.difficulty && l.difficulty.toLowerCase().includes(filters.learningsSearch.toLowerCase())) ||
      (l.whatILearned && l.whatILearned.toLowerCase().includes(filters.learningsSearch.toLowerCase()));
    const matchTopic = filters.learningsTopic === "all" || l.topicId === filters.learningsTopic;
    return matchSearch && matchTopic;
  });

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
  } else {
    if (empty) empty.classList.add("hidden");
    grid.innerHTML = filtered.map(l => `
      <div class="activity-card" id="learning-el-${escapeHTML(l.id)}">
        <div class="activity-card-top">
          <span class="activity-type-badge aprendizaje">✦ Metacognición</span>
        </div>
        <div class="activity-card-topic">${escapeHTML(getTopicTitleById(l.topicId))}</div>
        <h3 class="activity-card-title">${escapeHTML(l.title)}</h3>
        <p class="activity-card-snippet"><strong>1. Dificultad:</strong> ${escapeHTML(l.difficulty || "")}</p>
        <div class="activity-card-footer">
          <button class="btn btn-primary btn-sm" onclick="openItemViewerModal('learning', '${escapeHTML(l.id)}')">
            Ver reflexión completa
          </button>
          <div class="activity-card-actions">
            <button class="icon-action-btn" title="Editar reflexión" onclick="openLearningModal('${escapeHTML(l.id)}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button class="icon-action-btn delete" title="Eliminar reflexión" onclick="confirmDelete('learning', '${escapeHTML(l.id)}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `).join("");
  }
}

function openLearningModal(learnId = null) {
  let item = null;
  let isNew = false;

  if (learnId) {
    item = appDB.learnings.find(l => l.id === learnId);
  }

  if (!item) {
    isNew = true;
    item = {
      id: generateUniqueId("learn"),
      topicId: "",
      title: "",
      difficulty: "",
      uncomprehendedConcept: "",
      strategyUsed: "",
      helpfulResources: "",
      whatILearned: "",
      howIVerified: "",
      personalReflection: "",
      files: []
    };
    appDB.learnings.unshift(item);
    scheduleAutoSave(0);
  }

  document.getElementById("learningModalTitle").textContent = isNew ? "Registrar Nueva Situación" : "Editar Situación de Aprendizaje";
  document.getElementById("learningFormId").value = item.id;
  document.getElementById("learningFormTitle").value = item.title || "";
  document.getElementById("learningFormTopicSelect").value = item.topicId || "";
  document.getElementById("learningFormDifficulty").value = item.difficulty || "";
  document.getElementById("learningFormConcept").value = item.uncomprehendedConcept || "";
  document.getElementById("learningFormStrategy").value = item.strategyUsed || "";
  document.getElementById("learningFormResources").value = item.helpfulResources || "";
  document.getElementById("learningFormWhatILearned").value = item.whatILearned || "";
  document.getElementById("learningFormHowIVerified").value = item.howIVerified || "";
  document.getElementById("learningFormReflection").value = item.personalReflection || "";

  // Guardado en tiempo real
  const fields = [
    { id: "learningFormTitle", prop: "title" },
    { id: "learningFormTopicSelect", prop: "topicId" },
    { id: "learningFormDifficulty", prop: "difficulty" },
    { id: "learningFormConcept", prop: "uncomprehendedConcept" },
    { id: "learningFormStrategy", prop: "strategyUsed" },
    { id: "learningFormResources", prop: "helpfulResources" },
    { id: "learningFormWhatILearned", prop: "whatILearned" },
    { id: "learningFormHowIVerified", prop: "howIVerified" },
    { id: "learningFormReflection", prop: "personalReflection" }
  ];

  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (el) {
      el.oninput = () => {
        item[f.prop] = el.value;
        scheduleAutoSave();
      };
    }
  });

  const form = document.getElementById("learningForm");
  form.onsubmit = (e) => {
    e.preventDefault();
    flushAutoSave();
    closeModal("learningModal");
    renderAprendizaje();
    updateNavBadges();
    showToast("✓ Situación guardada correctamente.", "success");
  };

  openModal("learningModal");
}

// ============================================================================
// MODAL DE GESTIÓN GENERAL DE TEMAS (CREAR / EDITAR TEMA)
// ============================================================================

function openTopicModal(topicId = null) {
  let topic = null;
  let isNew = false;

  if (topicId) {
    topic = appDB.topics.find(t => t.id === topicId);
  }

  if (!topic) {
    isNew = true;
    topic = {
      id: generateUniqueId("tema"),
      order: appDB.topics.length + 1,
      title: "",
      description: "",
      status: "Pendiente",
      estimatedHours: "20 horas",
      definitions: [],
      formulas: [],
      metacognition: [],
      evidencias: []
    };
    appDB.topics.push(topic);
    scheduleAutoSave(0);
  }

  document.getElementById("topicModalTitle").textContent = isNew ? "Crear Nuevo Tema" : "Editar Información del Tema";
  document.getElementById("topicFormId").value = topic.id;
  document.getElementById("topicFormTitle").value = topic.title || "";
  document.getElementById("topicFormOrder").value = topic.order || 1;
  document.getElementById("topicFormStatus").value = topic.status || "Pendiente";
  document.getElementById("topicFormHours").value = topic.estimatedHours || "";
  document.getElementById("topicFormDesc").value = topic.description || "";

  // Guardado en tiempo real
  const fields = [
    { id: "topicFormTitle", prop: "title" },
    { id: "topicFormOrder", prop: "order" },
    { id: "topicFormStatus", prop: "status" },
    { id: "topicFormHours", prop: "estimatedHours" },
    { id: "topicFormDesc", prop: "description" }
  ];

  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (el) {
      el.oninput = () => {
        topic[f.prop] = el.value;
        scheduleAutoSave();
      };
      el.onchange = () => {
        topic[f.prop] = el.value;
        scheduleAutoSave();
      };
    }
  });

  const form = document.getElementById("topicForm");
  form.onsubmit = (e) => {
    e.preventDefault();
    flushAutoSave();
    closeModal("topicModal");
    renderTemas();
    populateTopicSelects();
    updateNavBadges();
    showToast("✓ Tema guardado correctamente.", "success");
  };

  openModal("topicModal");
}

// ============================================================================
// VISOR DETALLADO DE ELEMENTOS (ItemViewerModal)
// ============================================================================

function openItemViewerModal(type, itemId) {
  let title = "Detalle";
  let contentHTML = "";

  if (type === "workshop") {
    const w = appDB.workshops.find(x => x.id === itemId);
    if (!w) return;
    title = w.title;
    contentHTML = `
      <div class="viewer-section">
        <span class="viewer-tag">TEMA: ${escapeHTML(getTopicTitleById(w.topicId))} · FECHA: ${escapeHTML(w.date || '')}</span>
        <h3 class="viewer-title">${escapeHTML(w.title)}</h3>
      </div>
      <div class="viewer-block">
        <h4>Enunciado del Problema:</h4>
        <p>${escapeHTML(w.statement)}</p>
      </div>
      ${w.formulas ? `
        <div class="viewer-block">
          <h4>Fórmulas Empleadas:</h4>
          <div class="katex-rendered-box">${formatLatex(w.formulas, true)}</div>
        </div>
      ` : ''}
      <div class="viewer-block">
        <h4>Procedimiento y Desarrollo Paso a Paso:</h4>
        <pre class="viewer-pre">${escapeHTML(w.stepByStep)}</pre>
      </div>
      <div class="viewer-block highlight">
        <h4>Respuesta Final:</h4>
        <p><strong>${escapeHTML(w.finalAnswer)}</strong></p>
      </div>
      ${w.verification ? `
        <div class="viewer-block">
          <h4>Verificación:</h4>
          <p>${escapeHTML(w.verification)}</p>
        </div>
      ` : ''}
      ${w.reflection ? `
        <div class="viewer-block">
          <h4>Reflexión:</h4>
          <p>${escapeHTML(w.reflection)}</p>
        </div>
      ` : ''}
    `;
  } else if (type === "exam") {
    const e = appDB.exams.find(x => x.id === itemId);
    if (!e) return;
    title = e.title;
    contentHTML = `
      <div class="viewer-section">
        <span class="viewer-tag">EVALUACIÓN · ${escapeHTML(getTopicTitleById(e.topicId))}</span>
        <h3 class="viewer-title">${escapeHTML(e.title)}</h3>
      </div>
      <div class="viewer-block">
        <h4>Enunciado Evaluado:</h4>
        <p>${escapeHTML(e.statement)}</p>
      </div>
      <div class="viewer-block warning">
        <h4>Diagnóstico del Error Identificado:</h4>
        <p>${escapeHTML(e.identifiedError)}</p>
      </div>
      <div class="viewer-block">
        <h4>Solución Correcta Paso a Paso:</h4>
        <pre class="viewer-pre">${escapeHTML(e.correctSolution)}</pre>
      </div>
      ${e.preventionReflection ? `
        <div class="viewer-block success">
          <h4>Estrategia para evitar el error:</h4>
          <p>${escapeHTML(e.preventionReflection)}</p>
        </div>
      ` : ''}
    `;
  } else if (type === "learning") {
    const l = appDB.learnings.find(x => x.id === itemId);
    if (!l) return;
    title = l.title;
    contentHTML = `
      <div class="viewer-section">
        <span class="viewer-tag">METACOGNICIÓN · ${escapeHTML(getTopicTitleById(l.topicId))}</span>
        <h3 class="viewer-title">${escapeHTML(l.title)}</h3>
      </div>
      <div class="viewer-block">
        <h4>1. Dificultad Encontrada:</h4>
        <p>${escapeHTML(l.difficulty)}</p>
      </div>
      <div class="viewer-block">
        <h4>2. Estrategia Utilizada:</h4>
        <p>${escapeHTML(l.strategyUsed)}</p>
      </div>
      <div class="viewer-block highlight">
        <h4>3. Qué Aprendí:</h4>
        <p>${escapeHTML(l.whatILearned)}</p>
      </div>
      ${l.personalReflection ? `
        <div class="viewer-block">
          <h4>Reflexión Personal:</h4>
          <p>${escapeHTML(l.personalReflection)}</p>
        </div>
      ` : ''}
    `;
  }

  document.getElementById("itemViewerTitle").textContent = title;
  const body = document.getElementById("itemViewerBody");
  body.innerHTML = contentHTML;
  renderKaTeX(body);
  openModal("itemViewerModal");
}

// ============================================================================
// MODAL DE CONFIRMACIÓN DE ELIMINACIÓN SEGURA
// ============================================================================

function confirmDelete(type, id, extra = null) {
  currentConfirmAction = { type, id, extra };
  const promptEl = document.getElementById("confirmDialogPrompt");

  const names = {
    topic: "este tema de estudio completo con todas sus secciones",
    card: "esta tarjeta académica",
    practiceFile: "este archivo de práctica",
    workshop: "este taller y su desarrollo resuelto",
    exam: "este parcial y su corrección analítica",
    learning: "esta situación de aprendizaje metacognitiva"
  };

  if (promptEl) {
    promptEl.textContent = `¿Estás completamente seguro de que deseas eliminar ${names[type] || 'este registro'}? Esta acción no se puede deshacer.`;
  }

  openModal("confirmModal");
}

function executeDelete() {
  if (!currentConfirmAction) return;
  const { type, id, extra } = currentConfirmAction;

  if (type === "topic") {
    appDB.topics = appDB.topics.filter(t => t.id !== id);
    if (activeDetailTopicId === id) navigateToView("temas");
    renderTemas();
    showToast("Tema eliminado.", "info");
  } else if (type === "card") {
    const { topicId, section } = extra;
    const topic = appDB.topics.find(t => t.id === topicId);
    if (topic && Array.isArray(topic[section])) {
      topic[section] = topic[section].filter(c => c.id !== id);
      renderTopicDetail(topicId);
      showToast("Tarjeta eliminada.", "info");
    }
  } else if (type === "practiceFile") {
    appDB.practiceFiles = (appDB.practiceFiles || []).filter(f => f.id !== id);
    FileStorage.deleteFile(id);
    renderPracticasFilesList();
    showToast("Archivo de práctica eliminado.", "info");
  } else if (type === "workshop") {
    appDB.workshops = appDB.workshops.filter(w => w.id !== id);
    renderTalleres();
    showToast("Taller eliminado.", "info");
  } else if (type === "exam") {
    appDB.exams = appDB.exams.filter(e => e.id !== id);
    renderParciales();
    showToast("Parcial eliminado.", "info");
  } else if (type === "learning") {
    appDB.learnings = appDB.learnings.filter(l => l.id !== id);
    renderAprendizaje();
    showToast("Situación eliminada.", "info");
  }

  scheduleAutoSave(0);
  updateNavBadges();
  closeModal("confirmModal");
  currentConfirmAction = null;
}

// ============================================================================
// VISOR DE ARCHIVOS Y MULTIMEDIA (FileViewerModal)
// ============================================================================

function openFileViewer(name, type, data) {
  if (!data) {
    showToast("No hay vista previa disponible para este archivo.", "info");
    return;
  }

  document.getElementById("fileViewerTitle").textContent = name || "Vista de Archivo";
  const body = document.getElementById("fileViewerBody");
  const isPdf = (type && type.includes("pdf")) || (name && name.toLowerCase().endsWith(".pdf"));

  if (isPdf) {
    body.innerHTML = `
      <div style="height: 60vh; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px;">
        <object data="${data}" type="application/pdf" width="100%" height="100%">
          <div style="text-align: center; padding: 30px;">
            <p>Tu navegador no admite visualización directa embebida del PDF.</p>
            <a href="${data}" target="_blank" class="btn btn-primary">Abrir PDF en pestaña nueva</a>
          </div>
        </object>
      </div>
    `;
  } else {
    body.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; max-height: 70vh; overflow: auto;">
        <img src="${data}" alt="${escapeHTML(name)}" style="max-width: 100%; max-height: 68vh; object-fit: contain; border-radius: 8px;">
      </div>
    `;
  }

  const downloadBtn = document.getElementById("fileViewerDownloadBtn");
  if (downloadBtn) {
    downloadBtn.onclick = () => downloadFileDirectly(name, data);
  }

  openModal("fileViewerModal");
}

// ============================================================================
// GESTIÓN DE MODALES (APERTURA Y CIERRE CON RETENCIÓN DE SCROLL)
// ============================================================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
  flushAutoSave();
}

// ============================================================================
// RESPALDO Y COPIAS DE SEGURIDAD (EXPORTACIÓN E IMPORTACIÓN JSON COMPLETA)
// ============================================================================

async function exportBackupJSON() {
  flushAutoSave();
  showToast("Preparando exportación completa con archivos...", "info");

  const files = await FileStorage.getAllFiles();
  const payload = {
    app: "Portafolio Digital de Física I",
    version: "3.5",
    exportedAt: new Date().toISOString(),
    db: appDB,
    storedFiles: files
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Portafolio_Fisica_I_Respaldo_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("✓ Copia de seguridad exportada con éxito.", "success");
}

function importBackupJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const importedDB = data.db || data;

      if (!importedDB.topics) {
        showToast("El archivo seleccionado no tiene un formato de portafolio válido.", "error");
        return;
      }

      // Restaurar archivos a IndexedDB si vienen en el respaldo
      if (Array.isArray(data.storedFiles)) {
        for (const f of data.storedFiles) {
          if (f.id && f.data) {
            await FileStorage.saveFile(f.id, f.name, f.type, f.size, f.data);
          }
        }
      }

      appDB = importedDB;
      saveDatabase();
      renderApp();
      showToast("✓ Portafolio restaurado correctamente desde el respaldo.", "success");
    } catch (err) {
      console.error("Error al importar JSON:", err);
      showToast("Error al procesar el archivo JSON.", "error");
    }
  };
  reader.readAsText(file);
}

function restoreDefaultData() {
  if (confirm("¿Deseas restablecer los contenidos académicos de ejemplo? Se mantendrá guardado.")) {
    appDB = structuredClone(DEFAULT_DB);
    saveDatabase();
    renderApp();
    showToast("✓ Datos de ejemplo restaurados.", "success");
  }
}

function clearAllData() {
  if (confirm("¿Estás seguro de que deseas borrar TODOS los registros? Se vaciarán los temas y actividades.")) {
    appDB = {
      profile: structuredClone(DEFAULT_DB.profile),
      topics: [],
      practiceFiles: [],
      workshops: [],
      exams: [],
      learnings: []
    };
    saveDatabase();
    renderApp();
    showToast("Todos los datos han sido borrados.", "info");
  }
}

// ============================================================================
// INICIALIZACIÓN DE LA APLICACIÓN Y EVENT LISTENERS
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Inicializar IndexedDB en segundo plano
  await FileStorage.init();

  // Enlazar navegación de la barra lateral
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.onclick = () => {
      const view = btn.getAttribute("data-view");
      if (view) navigateToView(view);
    };
  });

  // Toggle menú móvil
  document.getElementById("mobileMenuBtn")?.addEventListener("click", openMobileMenu);
  document.getElementById("sidebarCloseBtn")?.addEventListener("click", closeMobileMenu);
  document.getElementById("sidebarBackdrop")?.addEventListener("click", closeMobileMenu);

  // Botón volver a temas
  document.getElementById("detailBackBtn")?.addEventListener("click", () => navigateToView("temas"));

  // Botón editar tema desde detalle
  document.getElementById("detailEditTopicBtn")?.addEventListener("click", () => {
    if (activeDetailTopicId) openTopicModal(activeDetailTopicId);
  });

  // Botón eliminar tema desde detalle
  document.getElementById("detailDeleteTopicBtn")?.addEventListener("click", () => {
    if (activeDetailTopicId) confirmDelete("topic", activeDetailTopicId);
  });

  // Botón crear nuevo tema en topbar y en temas
  document.getElementById("topbarQuickAddBtn")?.addEventListener("click", () => openTopicModal());
  document.getElementById("btnOpenNewTopicModal")?.addEventListener("click", () => openTopicModal());

  // Botones de crear en actividades independientes
  document.getElementById("btnOpenNewWorkshopModal")?.addEventListener("click", () => openWorkshopModal());
  document.getElementById("btnOpenNewExamModal")?.addEventListener("click", () => openExamModal());
  document.getElementById("btnOpenNewLearningModal")?.addEventListener("click", () => openLearningModal());

  // Acceso rápido a todos los temas en inicio
  document.getElementById("homeViewAllTopicsBtn")?.addEventListener("click", () => navigateToView("temas"));

  // Tarjetas KPI de Inicio con data-goto-view
  document.querySelectorAll("[data-goto-view]").forEach(card => {
    card.onclick = () => {
      const v = card.getAttribute("data-goto-view");
      if (v) navigateToView(v);
    };
  });

  // Búsqueda y filtros de Temas
  const searchTopics = document.getElementById("searchTopicsInput");
  if (searchTopics) {
    searchTopics.oninput = () => {
      filters.topicsSearch = searchTopics.value;
      renderTemas();
    };
  }

  document.querySelectorAll("[data-filter-topics]").forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll("[data-filter-topics]").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      filters.topicsStatus = chip.getAttribute("data-filter-topics");
      renderTemas();
    };
  });

  document.getElementById("emptyResetTopicFilterBtn")?.addEventListener("click", () => {
    filters.topicsSearch = "";
    filters.topicsStatus = "all";
    if (searchTopics) searchTopics.value = "";
    document.querySelectorAll("[data-filter-topics]").forEach(c => c.classList.remove("active"));
    document.querySelector("[data-filter-topics='all']")?.classList.add("active");
    renderTemas();
  });

  // Búsqueda de Prácticas
  const searchPractices = document.getElementById("searchPracticesInput");
  if (searchPractices) {
    searchPractices.oninput = () => {
      filters.practicesSearch = searchPractices.value;
      renderPracticasFilesList();
    };
  }

  // Búsqueda y filtros de Talleres
  const searchWorkshops = document.getElementById("searchWorkshopsInput");
  if (searchWorkshops) {
    searchWorkshops.oninput = () => {
      filters.workshopsSearch = searchWorkshops.value;
      renderTalleres();
    };
  }
  const filterWorkshopTopic = document.getElementById("filterWorkshopTopicSelect");
  if (filterWorkshopTopic) {
    filterWorkshopTopic.onchange = () => {
      filters.workshopsTopic = filterWorkshopTopic.value;
      renderTalleres();
    };
  }

  // Búsqueda y filtros de Parciales
  const searchExams = document.getElementById("searchExamsInput");
  if (searchExams) {
    searchExams.oninput = () => {
      filters.examsSearch = searchExams.value;
      renderParciales();
    };
  }
  const filterExamTopic = document.getElementById("filterExamTopicSelect");
  if (filterExamTopic) {
    filterExamTopic.onchange = () => {
      filters.examsTopic = filterExamTopic.value;
      renderParciales();
    };
  }

  // Búsqueda y filtros de Metacognición
  const searchLearnings = document.getElementById("searchLearningsInput");
  if (searchLearnings) {
    searchLearnings.oninput = () => {
      filters.learningsSearch = searchLearnings.value;
      renderAprendizaje();
    };
  }
  const filterLearningTopic = document.getElementById("filterLearningTopicSelect");
  if (filterLearningTopic) {
    filterLearningTopic.onchange = () => {
      filters.learningsTopic = filterLearningTopic.value;
      renderAprendizaje();
    };
  }

  // Modal Confirmación
  document.getElementById("confirmCancelBtn")?.addEventListener("click", () => closeModal("confirmModal"));
  document.getElementById("confirmExecuteBtn")?.addEventListener("click", executeDelete);

  // Perfil de estudiante
  const openProfile = () => {
    document.getElementById("profileName").value = appDB.profile.name || "";
    document.getElementById("profileCareer").value = appDB.profile.career || "";
    document.getElementById("profileUniversity").value = appDB.profile.university || "";
    document.getElementById("profileTerm").value = appDB.profile.term || "";
    document.getElementById("profileBio").value = appDB.profile.bio || "";
    document.getElementById("profileGoals").value = appDB.profile.goals || "";
    openModal("profileModal");
  };

  document.getElementById("sidebarEditProfileBtn")?.addEventListener("click", openProfile);
  document.getElementById("topbarProfileBtn")?.addEventListener("click", openProfile);

  document.getElementById("profileForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    appDB.profile.name = document.getElementById("profileName").value;
    appDB.profile.career = document.getElementById("profileCareer").value;
    appDB.profile.university = document.getElementById("profileUniversity").value;
    appDB.profile.term = document.getElementById("profileTerm").value;
    appDB.profile.bio = document.getElementById("profileBio").value;
    appDB.profile.goals = document.getElementById("profileGoals").value;
    saveDatabase();
    updateProfileUI();
    closeModal("profileModal");
    showToast("✓ Perfil actualizado con éxito.", "success");
  });

  // Respaldo JSON
  document.getElementById("sidebarExportBtn")?.addEventListener("click", exportBackupJSON);
  document.getElementById("exportBackupFullBtn")?.addEventListener("click", exportBackupJSON);

  const handleImport = (e) => {
    if (e.target.files && e.target.files[0]) {
      importBackupJSON(e.target.files[0]);
      e.target.value = "";
    }
  };
  document.getElementById("sidebarImportFile")?.addEventListener("change", handleImport);
  document.getElementById("importBackupFullFile")?.addEventListener("change", handleImport);

  document.getElementById("restoreDefaultsBtn")?.addEventListener("click", restoreDefaultData);
  document.getElementById("clearAllDataBtn")?.addEventListener("click", clearAllData);

  // Renderizar la app completa
  renderApp();
});
