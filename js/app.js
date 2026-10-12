/**
 * ============================================================================
 * PORTAFOLIO DIGITAL DE FÍSICA I - APLICACIÓN PRINCIPAL
 * Lenguaje: JavaScript Puro (Vanilla JS, ECMAScript moderno)
 * Almacenamiento: LocalStorage (Persistencia local en navegador)
 * Notación Matemática: KaTeX (Renderizado de fórmulas LaTeX)
 * Arquitectura: Módulos independientes para Temas, Prácticas, Talleres,
 *               Parciales y Metacognición con edición individualizada.
 * ============================================================================
 */

// Clave principal de almacenamiento en LocalStorage (Base de datos versión 3)
const STORAGE_KEY_DB = "portafolio_fisica_db_v3";
const LEGACY_STORAGE_KEY_TOPICS = "portafolio_fisica_topics_v2";
const LEGACY_STORAGE_KEY_PROFILE = "portafolio_fisica_profile_v2";

/**
 * Generador de identificadores únicos
 */
function generateUniqueId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
}

/**
 * Sanitiza texto para evitar inyecciones HTML accidentales
 */
function escapeHTML(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Notificaciones Toast animadas en pantalla
 */
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

/**
 * Renderiza fórmulas LaTeX utilizando KaTeX de forma segura
 */
function renderKaTeX(element) {
  if (window.renderMathInElement && element) {
    try {
      window.renderMathInElement(element, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false
      });
    } catch (e) {
      console.warn("Error en KaTeX auto-render:", e);
    }
  }
}

/**
 * Formatea una expresión de LaTeX individual a HTML KaTeX
 */
function formatLatex(latexCode, isDisplayMode = false) {
  if (window.katex && latexCode) {
    try {
      return window.katex.renderToString(latexCode, {
        displayMode: isDisplayMode,
        throwOnError: false
      });
    } catch (e) {
      return `<code class="fallback-math">${escapeHTML(latexCode)}</code>`;
    }
  }
  return `<code class="fallback-math">${escapeHTML(latexCode || "")}</code>`;
}

// ============================================================================
// BASE DE DATOS INICIAL PREDETERMINADA (CONTENIDO ACADÉMICO MODELO)
// ============================================================================

const DEFAULT_DB = {
  profile: {
    studentName: "Alejandro Morales Rivera",
    university: "Universidad Nacional de Ingeniería",
    career: "Ingeniería Mecánica",
    professor: "Dr. Carlos E. Mendoza",
    semester: "2026-I",
    presentation: "Este portafolio digital organiza de forma continua y verificable todas las evidencias de aprendizaje, deducciones analíticas, prácticas de laboratorio, resolución de talleres y reflexiones críticas sobre dificultades del curso de Física I.",
    objectives: "Consolidar los fundamentos conceptuales de la mecánica clásica newtoniana, desarrollar destrezas analíticas en resolución de problemas, verificar hipótesis experimentales en laboratorio y aplicar la metacognición para corregir errores sistemáticos en evaluaciones."
  },
  topics: [
    {
      id: "tema-vectores",
      order: 1,
      title: "Vectores y Álgebra Vectorial",
      description: "Representación geométrica y analítica, componentes rectangulares, vectores unitarios, producto punto y producto cruz en dos y tres dimensiones.",
      status: "Completado",
      estimatedHours: "18 horas",
      conceptualScheme: "El álgebra vectorial constituye la base matemática indispensable de toda la mecánica clásica. Las leyes de Newton, la cinemática en dos dimensiones y el trabajo mecánico son conceptos intrínsecamente vectoriales.",
      mapFile: {
        name: "mapa_conceptual_vectores_2d.svg",
        type: "image/svg+xml",
        data: "assets/imagenes/mapa_vectores.svg"
      },
      definitions: [
        {
          id: "def-v1",
          term: "Magnitud Escalar",
          definition: "Aquella que queda completamente definida por un valor numérico y una unidad de medida (ej. masa, tiempo, temperatura, energía)."
        },
        {
          id: "def-v2",
          term: "Magnitud Vectorial",
          definition: "Requiere módulo (magnitud), dirección espacial y sentido para su especificación completa (ej. desplazamiento, velocidad, aceleración, fuerza)."
        },
        {
          id: "def-v3",
          term: "Vector Unitario",
          definition: "Vector adimensional de magnitud exactamente igual a 1 (î, ĵ, k̂) empleado para especificar una dirección en el espacio cartesiano."
        },
        {
          id: "def-v4",
          term: "Producto Escalar (Punto)",
          definition: "Operación algebraica entre dos vectores que produce un escalar: A · B = |A||B| cos(θ). Mide la proyección paralela de un vector sobre otro y define el trabajo mecánico."
        },
        {
          id: "def-v5",
          term: "Producto Vectorial (Cruz)",
          definition: "Operación entre vectores cuyo resultado es un tercer vector ortogonal al plano definido por los dos primeros: A × B = |A||B| sin(θ) n̂. Define magnitudes como torque y momento angular."
        }
      ],
      formulas: [
        {
          id: "form-v1",
          name: "Componentes Rectangulares en 2D",
          latex: "A_x = |\\vec{A}| \\cos(\\theta), \\quad A_y = |\\vec{A}| \\sin(\\theta)",
          variables: "|\\vec{A}|: módulo del vector [m, N, m/s], \\theta: ángulo medido respecto al semieje positivo X.",
          conditions: "Ángulo medido en sentido antihorario respecto al eje horizontal.",
          example: "Para F = 50 N a 36.87°: Fx = 50 cos(36.87°) = 40 N; Fy = 50 sin(36.87°) = 30 N."
        },
        {
          id: "form-v2",
          name: "Módulo y Dirección del Vector Resultante",
          latex: "|\\vec{R}| = \\sqrt{R_x^2 + R_y^2 + R_z^2}, \\quad \\theta = \\arctan\\left(\\frac{R_y}{R_x}\\right)",
          variables: "R_x, R_y, R_z: componentes cartesianas del vector suma.",
          conditions: "Para el ángulo polar, se debe sumar 180° si Rx < 0 (cuadrantes II y III).",
          example: "Si Rx = -4 m y Ry = 3 m, |R| = √(16+9) = 5 m; θ = arctan(3/-4) + 180° = 143.13°."
        },
        {
          id: "form-v3",
          name: "Producto Escalar (Producto Punto)",
          latex: "\\vec{A} \\cdot \\vec{B} = |\\vec{A}||\\vec{B}| \\cos(\\phi) = A_x B_x + A_y B_y + A_z B_z",
          variables: "\\phi: ángulo menor comprendido entre los vectores (0° ≤ \\phi ≤ 180°).",
          conditions: "Si dos vectores no nulos tienen producto escalar igual a cero, son ortogonales (perpendiculares).",
          example: "A = (2î + 3ĵ) N, B = (4î - 1ĵ) m ⇒ W = 2(4) + 3(-1) = 5 J de trabajo."
        },
        {
          id: "form-v4",
          name: "Producto Vectorial (Producto Cruz)",
          latex: "\\vec{A} \\times \\vec{B} = \\left(A_y B_z - A_z B_y\\right)\\hat{i} + \\left(A_z B_x - A_x B_z\\right)\\hat{j} + \\left(A_x B_y - A_y B_x\\right)\\hat{k}",
          variables: "Resultado: vector perpendicular al plano AB con sentido dado por la regla de la mano derecha.",
          conditions: "Operación anticonmutativa: A × B = -(B × A). Si A y B son paralelos, su producto cruz es nulo.",
          example: "Torque: τ = r × F. Para r = (0.5î) m y F = (20ĵ) N ⇒ τ = 10 k̂ N·m."
        }
      ],
      files: []
    },
    {
      id: "tema-cinematica",
      order: 2,
      title: "Cinemática en Una y Dos Dimensiones",
      description: "Estudio de las leyes geométricas del movimiento sin considerar las causas: MRU, MRUV, caída libre vertical y movimiento de proyectiles (tiro parabólico).",
      status: "En progreso",
      estimatedHours: "24 horas",
      conceptualScheme: "La cinemática describe la posición, velocidad y aceleración de partículas respecto a sistemas de referencia inerciales, sirviendo de puente con la dinámica newtoniana.",
      mapFile: null,
      definitions: [
        {
          id: "def-c1",
          term: "Sistema de Referencia",
          definition: "Marco coordenado respecto al cual se miden el tiempo y las coordenadas espaciales de una partícula."
        },
        {
          id: "def-c2",
          term: "Desplazamiento",
          definition: "Vector que une la posición inicial con la posición final: Δr = r(t₂) - r(t₁). Es independiente de la trayectoria recorrida."
        },
        {
          id: "def-c3",
          term: "Velocidad Instantánea",
          definition: "Derivada temporal de la posición: v = dr/dt. Es un vector tangente a la trayectoria en cada instante."
        },
        {
          id: "def-c4",
          term: "Aceleración",
          definition: "Tasa de cambio de la velocidad respecto al tiempo: a = dv/dt = d²r/dt²."
        },
        {
          id: "def-c5",
          term: "Tiro Parabólico",
          definition: "Superposición de dos movimientos independientes: MRU uniforme horizontal y MRUV acelerado vertical bajo la gravedad g."
        }
      ],
      formulas: [
        {
          id: "form-c1",
          name: "Ecuación de Posición en MRUV",
          latex: "x(t) = x_0 + v_0 t + \\frac{1}{2} a t^2",
          variables: "x_0: posición inicial [m], v_0: rapidez inicial [m/s], a: aceleración constante [m/s²], t: tiempo [s].",
          conditions: "Válida únicamente cuando la aceleración 'a' se mantiene constante.",
          example: "x₀ = 5 m, v₀ = 2 m/s, a = 3 m/s² a los t = 4 s ⇒ x(4) = 5 + 2(4) + 0.5(3)(16) = 37 m."
        },
        {
          id: "form-c2",
          name: "Ecuación de Torricelli",
          latex: "v_f^2 = v_0^2 + 2 a \\Delta x",
          variables: "v_f: velocidad final, v_0: velocidad inicial, a: aceleración, \\Delta x: desplazamiento.",
          conditions: "Aceleración constante; útil cuando no se conoce el tiempo.",
          example: "Frenado de 20 m/s a 0 con a = -5 m/s² ⇒ 0 = 400 - 10 Δx ⇒ Δx = 40 m de distancia de frenado."
        },
        {
          id: "form-c3",
          name: "Tiro Parabólico Paramétrico",
          latex: "x(t) = (v_0 \\cos\\theta) t, \\quad y(t) = y_0 + (v_0 \\sin\\theta) t - \\frac{1}{2} g t^2",
          variables: "\\theta: ángulo de elevación inicial, g: 9.8 m/s², y_0: altura inicial.",
          conditions: "Despreciando resistencia del aire con gravedad uniforme.",
          example: "v₀ = 30 m/s a 45°: v₀x = 21.21 m/s, v₀y = 21.21 m/s. Altura máxima en t = 2.16 s."
        }
      ],
      files: []
    },
    {
      id: "tema-newton",
      order: 3,
      title: "Leyes de Newton y Dinámica Clásica",
      description: "Causas del movimiento: Primera, Segunda y Tercera Ley de Newton, diagramas de cuerpo libre (DCL), fuerzas de fricción estática y cinética, y aplicaciones a sistemas acoplados.",
      status: "En progreso",
      estimatedHours: "26 horas",
      conceptualScheme: "Las leyes de Newton son el núcleo de la física clásica. Permiten predecir la aceleración cinemática de cualquier cuerpo conociendo las fuerzas de interacción que experimenta.",
      mapFile: null,
      definitions: [
        {
          id: "def-n1",
          term: "Primera Ley (Inercia)",
          definition: "Todo cuerpo continúa en reposo o movimiento rectilíneo uniforme a menos que una fuerza neta no nula actúe sobre él."
        },
        {
          id: "def-n2",
          term: "Segunda Ley (Dinámica)",
          definition: "La aceleración de un cuerpo es directamente proporcional a la fuerza neta aplicada e inversamente proporcional a su masa: ΣF = m a."
        },
        {
          id: "def-n3",
          term: "Tercera Ley (Acción y Reacción)",
          definition: "Las fuerzas siempre aparecen en pares opuestos de igual magnitud que actúan sobre cuerpos distintos: F_AB = -F_BA."
        },
        {
          id: "def-n4",
          term: "Fuerza Normal",
          definition: "Fuerza de contacto perpendicular a la superficie de apoyo generada por la repulsión electromagnética microscópica."
        },
        {
          id: "def-n5",
          term: "Fricción de Coulomb",
          definition: "Resistencia al deslizamiento tangencial entre superficies secas: estática máxima fs = μs N y cinética fk = μk N."
        }
      ],
      formulas: [
        {
          id: "form-n1",
          name: "Segunda Ley de Newton",
          latex: "\\sum \\vec{F} = m \\vec{a} \\iff \\sum F_x = m a_x, \\quad \\sum F_y = m a_y",
          variables: "m: masa inercial [kg], \\vec{a}: aceleración [m/s²], \\sum\\vec{F}: fuerza neta [N].",
          conditions: "Marco de referencia inercial; masa constante.",
          example: "Fuerza neta de 30 N sobre masa de 6 kg ⇒ a = 30 / 6 = 5 m/s²."
        },
        {
          id: "form-n2",
          name: "Leyes de Fricción",
          latex: "f_{s,\\max} = \\mu_s N, \\quad f_k = \\mu_k N",
          variables: "\\mu_s: coeficiente estático, \\mu_k: coeficiente cinético, N: fuerza normal.",
          conditions: "\\mu_s > \\mu_k; independiente del área de contacto aparente.",
          example: "Masa de 10 kg con μk = 0.2 en plano horizontal ⇒ N = 98 N ⇒ fk = 19.6 N."
        },
        {
          id: "form-n3",
          name: "Plano Inclinado con Ángulo θ",
          latex: "N = m g \\cos\\theta, \\quad \\sum F_{\\parallel} = m g \\sin\\theta - f_k = m a",
          variables: "\\theta: ángulo del plano con la horizontal, g: 9.8 m/s².",
          conditions: "Eje coordenado paralelo al plano.",
          example: "Plano a 30° sin fricción: a = g sin(30°) = 4.9 m/s² independientemente de la masa."
        }
      ],
      files: []
    }
  ],
  practices: [
    {
      id: "prac-v1",
      topicId: "tema-vectores",
      title: "Práctica 1: Mesa de Fuerzas y Equilibrio Vectorial",
      date: "2026-03-12",
      statement: "Determinar experimentalmente la fuerza equilibrante de un sistema de dos fuerzas concurrentes y comparar el resultado analítico por componentes con el método experimental.",
      objectives: "• Comprobar experimentalmente la condición de equilibrio estático de traslación (ΣF = 0).\n• Determinar la magnitud y dirección polar de la fuerza equilibrante.",
      materials: "Mesa de fuerzas circular graduada en 360°, aro central con hilos, juego de masas calibradas (50g, 100g, 200g), poleas de baja fricción y nivel de burbuja.",
      data: "• Fuerza 1: m₁ = 150 g (F₁ = 1.47 N) en θ₁ = 30°\n• Fuerza 2: m₂ = 200 g (F₂ = 1.96 N) en θ₂ = 120°\n• Fuerza Equilibrante experimental medida: m_eq = 275 g (F_eq = 2.70 N) en θ_eq = 262°",
      procedure: "1. Nivelar la mesa de fuerzas con nivel de burbuja.\n2. Colocar las poleas en las posiciones angulares asignadas.\n3. Añadir masas a los portamasas hasta que el anillo central quede concéntrico.\n4. Ajustar la tercera polea hasta lograr equilibrio completo sin rozar el perno.",
      calculations: "Rx = 1.47 cos(30°) + 1.96 cos(120°) = 1.273 - 0.980 = 0.293 N\nRy = 1.47 sin(30°) + 1.96 sin(120°) = 0.735 + 1.697 = 2.432 N\n|R| = √(0.293² + 2.432²) = 2.450 N; θ = 83.13°\nFuerza Equilibrante Teórica: F_eq = 2.450 N en θ_eq = 263.13°\nError porcentual: |(2.70 - 2.45) / 2.45| · 100% = 1.02%",
      results: "La fuerza equilibrante experimental coincidió con el modelo analítico con una discrepancia de apenas 1.02%.",
      conclusions: "Se validó la suma vectorial por descomposición cartesiana. La fricción en poleas representó la principal fuente de error.",
      files: []
    },
    {
      id: "prac-c1",
      topicId: "tema-cinematica",
      title: "Práctica 2: Medición Experimental de la Aceleración de la Gravedad",
      date: "2026-03-26",
      statement: "Determinar el valor local de la aceleración gravitacional 'g' mediante caída libre empleando una esfera metálica y fotopuertas sincronizadas.",
      objectives: "• Determinar el valor experimental de 'g' con su incertidumbre.\n• Analizar gráficamente la relación cuadrática entre altura de caída y tiempo.",
      materials: "Columna graduada vertical de 2 m, electroimán de liberación, esfera de acero de 20 mm, dos fotopuertas Pasco y cronómetro digital de milisegundos.",
      data: "• Altura h₁ = 0.50 m: t = 0.319 s\n• Altura h₂ = 1.00 m: t = 0.452 s\n• Altura h₃ = 1.50 m: t = 0.553 s\n• Altura h₄ = 1.80 m: t = 0.606 s",
      procedure: "1. Nivelar la columna vertical con plomada.\n2. Fijar la fotopuerta inferior a distintas alturas sucesivas.\n3. Activar el electroimán para liberar la esfera desde el reposo.\n4. Registrar 5 repeticiones de tiempo para cada altura.",
      calculations: "Ajuste de h = ½ g t² mediante regresión lineal h vs t²:\nPendiente m = 4.89 m/s² ⇒ g_exp = 2(4.89) = 9.78 m/s²\nIncertidumbre relativa: |(9.78 - 9.806) / 9.806| · 100% = 0.27%",
      results: "El valor obtenido para la aceleración de la gravedad fue g = (9.78 ± 0.04) m/s².",
      conclusions: "Se verificó la naturaleza uniformemente acelerada de la caída libre con precisión superior al 99.7%.",
      files: [
        {
          name: "montaje_experimental_fotopuertas.svg",
          type: "image/svg+xml",
          data: "assets/imagenes/laboratorio_fotopuertas.svg"
        }
      ]
    },
    {
      id: "prac-n1",
      topicId: "tema-newton",
      title: "Práctica 3: Verificación de la Segunda Ley de Newton con Carro Dinámico",
      date: "2026-04-09",
      statement: "Validar experimentalmente la relación proporcional entre la aceleración y la fuerza neta aceleradora manteniendo la masa total del sistema constante.",
      objectives: "• Demostrar que a ∝ F_neta para masa inercial constante.\n• Determinar la masa inercial del sistema a partir de la pendiente F vs a.",
      materials: "Pista de aluminio de baja fricción, carro dinámico con reflector, sensor de movimiento por ultrasonido Pasco, masas calibradas y polea ligera.",
      data: "• Masa total del sistema: M_total = 0.650 kg\n• Ensayo 1: m_cuelga = 0.020 kg ⇒ F = 0.196 N, a = 0.301 m/s²\n• Ensayo 2: m_cuelga = 0.040 kg ⇒ F = 0.392 N, a = 0.605 m/s²\n• Ensayo 3: m_cuelga = 0.060 kg ⇒ F = 0.588 N, a = 0.898 m/s²",
      procedure: "1. Calibrar sensor ultrasónico y nivelar el carril.\n2. Transferir masas del carro al portamasas para variar la fuerza neta sin variar la masa total.\n3. Medir la aceleración con el software Pasco en 5 repeticiones por masa.",
      calculations: "Regresión lineal de F = M_exp · a:\nPendiente M_exp = 0.654 kg\nComparación con la masa medida en balanza (0.650 kg):\nError relativo: |(0.654 - 0.650) / 0.650| · 100% = 0.61%",
      results: "La gráfica F vs a exhibió una relación estrictamente lineal con coeficiente de determinación R² = 0.9994.",
      conclusions: "La Segunda Ley de Newton fue comprobada experimentalmente con un margen de discrepancia inferior al 1%.",
      files: []
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
      stepByStep: "Paso 1: Módulos individuales:\n|F₁| = √(40² + (-20)² + 10²) = √2100 = 45.83 N\n|F₂| = √((-15)² + 30² + 25²) = √1750 = 41.83 N\n\nPaso 2: Producto escalar por componentes:\nF₁ · F₂ = (40)(-15) + (-20)(30) + (10)(25) = -600 - 600 + 250 = -950 N²\n\nPaso 3: Ángulo entre vectores:\ncos(φ) = (-950) / (45.83 × 41.83) = -0.4955 ⇒ φ = 119.70°\n\nPaso 4: Proyección escalar:\nProy = -950 / 41.83 = -22.71 N",
      finalAnswer: "Ángulo φ = 119.70° (obtuso). Proyección escalar de F₁ sobre F₂ = -22.71 N.",
      verification: "Comprobación geométrica: Proy = |F₁| cos(φ) = 45.83 × cos(119.70°) = -22.71 N (coincidencia analítica exacta).",
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
      stepByStep: "Paso 1: Ecuaciones horarias con origen en A:\nxA(t) = ½(2) t² = t²\nxB(t) = 600 - 15 t\n\nPaso 2: Condición de encuentro xA = xB:\nt² = 600 - 15 t ⇒ t² + 15 t - 600 = 0\n\nPaso 3: Fórmula cuadrática:\nt = [-15 ± √(225 + 2400)] / 2 = [-15 + 51.23] / 2 = 18.12 segundos\n\nPaso 4: Posición del encuentro:\nxA(18.12) = (18.12)² = 328.33 metros desde el origen.",
      finalAnswer: "Tiempo de encuentro t = 18.12 s; Posición x = 328.33 m desde el punto de partida de A.",
      verification: "Comprobación con móvil B: xB(18.12) = 600 - 15(18.12) = 600 - 271.8 = 328.2 m.",
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
      stepByStep: "Paso 1: DCL y ecuaciones dinámicas individuales:\nPara m₁ (asciende): T - 3(9.8) = 3 a\nPara m₂ (desciende): 5(9.8) - T = 5 a\n\nPaso 2: Sumando ambas ecuaciones:\n(5 - 3)(9.8) = (3 + 5) a ⇒ 19.6 = 8 a ⇒ a = 2.45 m/s²\n\nPaso 3: Sustituyendo en la primera ecuación:\nT = 3(9.8 + 2.45) = 3(12.25) = 36.75 N",
      finalAnswer: "Aceleración a = 2.45 m/s²; Tensión en la cuerda T = 36.75 N.",
      verification: "Comprobando en m₂: T = 5(9.8 - 2.45) = 5(7.35) = 36.75 N.",
      reflection: "Al sumar las ecuaciones del sistema se cancelan las fuerzas internas (tensión), facilitando el despeje inmediato de la aceleración.",
      files: [
        {
          name: "dcl_plano_inclinado_rozamiento.svg",
          type: "image/svg+xml",
          data: "assets/evidencias/dcl_plano_inclinado.svg"
        }
      ]
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
      correctSolution: "Paso 1: Identificar ángulo relativo φ entre F y el desplazamiento Δr:\nφ = 30° - 0° = 30°\n\nPaso 2: Cálculo con definición formal:\nW = |F| |Δr| cos(30°) = 60 N × 8 m × (√3 / 2) = 480 × 0.8660 = 415.69 Joules",
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
      correctSolution: "Paso 1: Descomposición inicial:\nv₀x = 25 cos(37°) = 19.96 m/s; v₀y = 25 sin(37°) = 15.04 m/s\n\nPaso 2: Ecuación vertical con y₀ = 45 m y suelo en y = 0:\n45 + 15.04 t - 4.9 t² = 0 ⇒ 4.9 t² - 15.04 t - 45 = 0\n\nPaso 3: Resolviendo la cuadrática:\nt = [15.04 + √(226.2 + 882)] / 9.8 = [15.04 + 33.29] / 9.8 = 4.93 s\n\nPaso 4: Alcance horizontal real:\nx = v₀x · t = 19.96 m/s × 4.93 s = 98.40 metros",
      verification: "Comprobación energética: rapidez al impacto v = √(v₀² + 2gh) = √(625 + 2(9.8)(45)) = 38.82 m/s. Concuerda exactamente con √(19.96² + 33.27²).",
      preventionReflection: "Nunca aplicar fórmulas de atajo sin verificar primero si se cumplen todas sus hipótesis de deducción (como Δy = 0). Las ecuaciones paramétricas horarias son universales.",
      files: [
        {
          name: "correccion_alcance_desnivel.svg",
          type: "image/svg+xml",
          data: "assets/evidencias/correccion_parcial_tiro.svg"
        }
      ]
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
      correctSolution: "Paso 1: Analizar bloque superior A de forma aislada:\nfs = mA · a ⇒ a_max = μs g = 0.4 × 9.8 = 3.92 m/s²\n\nPaso 2: Analizar sistema conjunto (A + B) con masa total 6 kg:\nF_max = (mA + mB) · a_max = (2 + 4) × 3.92 = 23.52 Newtons",
      verification: "Comprobación: con F = 23.52 N, el bloque B recibe F = 23.52 N hacia adelante y fricción f = 7.84 N hacia atrás de parte de A. F_neta_B = 15.68 N ⇒ a = 15.68 / 4 = 3.92 m/s².",
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
      uncomprehendedConcept: "No comprendía que la función arco tangente de la calculadora tiene un rango principal restringido a (-90°, +90°), por lo que no distingue por sí sola entre el segundo y el cuarto cuadrante.",
      strategyUsed: "Adopté la regla sistemática de representar gráficamente el vector en el plano cartesiano antes de cualquier cálculo y aplicar: si Rx < 0, sumar 180° al ángulo polar.",
      helpfulResources: "El simulador de vectores PhET de la Universidad de Colorado, videos de descomposición geométrica y tutorías con el profesor.",
      whatILearned: "Aprendí que las matemáticas deben interpretarse físicamente. El signo de cada componente cartesiana determina de forma unívoca la orientación espacial del vector.",
      howIVerified: "Resolví una prueba diagnóstica de 8 vectores con componentes en los cuatro cuadrantes, obteniendo el 100% de aciertos tanto en módulo como en dirección polar.",
      personalReflection: "Superar esta dificultad fortaleció mi confianza para abordar cinemática y dinámica sin arrastrar fallos trigonométricos.",
      files: []
    },
    {
      id: "learn-c1",
      topicId: "tema-cinematica",
      title: "Convención de Signos en Caída Libre y Tiro Parabólico",
      difficulty: "Me resultaba difícil elegir los signos correctos en las ecuaciones horarias cuando un proyectil subía y luego descendía.",
      uncomprehendedConcept: "Confundía el signo del vector velocidad (que cambia de positivo a negativo) con el signo del vector aceleración de la gravedad (que siempre apunta hacia abajo hacia el centro de la Tierra).",
      strategyUsed: "Fijar explícitamente desde el primer renglón del problema: 'Eje vertical positivo hacia arriba, por lo tanto a_y = -g = -9.8 m/s² constante durante todo el vuelo'.",
      helpfulResources: "Diagramas vectoriales paso a paso del profesor y la animación interactiva con vectores velocidad y aceleración visibles.",
      whatILearned: "Comprendí que la aceleración no se vuelve cero en el punto más alto; sólo la componente vertical de la velocidad se anula instantáneamente, mientras que 'g' permanece constante.",
      howIVerified: "Resolví correctamente 5 problemas de proyectiles con distintas alturas de inicio y fin en el taller de repaso previo al examen.",
      personalReflection: "La claridad en el sistema de coordenadas eliminó por completo los errores de signos algebraicos.",
      files: []
    },
    {
      id: "learn-n1",
      topicId: "tema-newton",
      title: "Construcción Rigurosa del Diagrama de Cuerpo Libre (DCL)",
      difficulty: "Dificultad recurrente en la formulación del DCL, omitiendo la fuerza normal en planos inclinados o dibujando fuerzas ficticias que no existían físicamente.",
      uncomprehendedConcept: "Pensaba que 'la fuerza centrípeta' o 'la inercia' eran fuerzas reales aplicadas, en vez de entender que son el efecto resultante de interacciones físicas reales (tensión, fricción, gravedad).",
      strategyUsed: "Elaborar una lista de chequeo física para cada cuerpo: 1. Gravedad (peso hacia abajo); 2. Contactos físicos reales (normales perpendiculares, tensiones por cuerdas, fricciones tangenciales). Si no hay contacto, no hay fuerza.",
      helpfulResources: "Capítulo 5 del libro Sears-Zemansky y la técnica de dibujar cada cuerpo en una página separada con código de colores.",
      whatILearned: "Que una fuerza sólo existe si hay un agente físico identificable que la ejerza. El DCL es el puente indispensable entre el enunciado verbal y la matemática.",
      howIVerified: "Resolví correctamente los 6 ejercicios de sistemas acoplados del examen parcial sin omitir ni duplicar ninguna fuerza en los diagramas.",
      personalReflection: "Aprender a elaborar un DCL riguroso transformó mi manera de abordar la física: pasé de memorizar fórmulas a razonar interacciones físicas reales.",
      files: []
    }
  ]
};

// ============================================================================
// GESTIÓN DE ESTADO Y PERSISTENCIA (LOCALSTORAGE Y MIGRACIÓN)
// ============================================================================

let appDB = loadDatabase();
let currentView = "inicio";
let activeDetailTopicId = null;
let currentConfirmAction = null;

// Filtros en memoria
let filters = {
  topicsSearch: "",
  topicsStatus: "all",
  practicesSearch: "",
  practicesTopic: "all",
  workshopsSearch: "",
  workshopsTopic: "all",
  examsSearch: "",
  examsTopic: "all",
  learningsSearch: "",
  learningsTopic: "all"
};

/**
 * Carga la base de datos completa de LocalStorage con migración transparente
 */
function loadDatabase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DB);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Asegurar arrays mínimos
      parsed.profile = parsed.profile || structuredClone(DEFAULT_DB.profile);
      parsed.topics = Array.isArray(parsed.topics) ? parsed.topics : [];
      parsed.practices = Array.isArray(parsed.practices) ? parsed.practices : [];
      parsed.workshops = Array.isArray(parsed.workshops) ? parsed.workshops : [];
      parsed.exams = Array.isArray(parsed.exams) ? parsed.exams : [];
      parsed.learnings = Array.isArray(parsed.learnings) ? parsed.learnings : [];
      return parsed;
    }

    // Comprobar si existen datos en la versión anterior (v2) para migrar sin pérdida
    const legacyTopicsRaw = localStorage.getItem(LEGACY_STORAGE_KEY_TOPICS);
    const legacyProfileRaw = localStorage.getItem(LEGACY_STORAGE_KEY_PROFILE);

    if (legacyTopicsRaw) {
      console.log("Migrando datos de Portafolio v2 a estructura v3 independiente...");
      const legacyTopics = JSON.parse(legacyTopicsRaw);
      const legacyProfile = legacyProfileRaw ? JSON.parse(legacyProfileRaw) : DEFAULT_DB.profile;

      const newDB = {
        profile: legacyProfile,
        topics: [],
        practices: [],
        workshops: [],
        exams: [],
        learnings: []
      };

      legacyTopics.forEach(topic => {
        // Extraer prácticas
        if (Array.isArray(topic.practices)) {
          topic.practices.forEach(p => {
            newDB.practices.push({
              ...p,
              id: p.id || generateUniqueId("prac"),
              topicId: topic.id,
              date: p.date || new Date().toISOString().slice(0, 10)
            });
          });
        }

        // Extraer talleres
        if (Array.isArray(topic.workshops)) {
          topic.workshops.forEach(w => {
            newDB.workshops.push({
              ...w,
              id: w.id || generateUniqueId("tall"),
              topicId: topic.id,
              date: w.date || new Date().toISOString().slice(0, 10)
            });
          });
        }

        // Extraer parciales
        if (Array.isArray(topic.exams)) {
          topic.exams.forEach(e => {
            newDB.exams.push({
              ...e,
              id: e.id || generateUniqueId("parc"),
              topicId: topic.id,
              date: e.date || new Date().toISOString().slice(0, 10)
            });
          });
        }

        // Extraer situación de aprendizaje
        if (topic.learningSituation && (topic.learningSituation.difficulty || topic.learningSituation.whatILearned)) {
          newDB.learnings.push({
            id: generateUniqueId("learn"),
            topicId: topic.id,
            title: `Aprendizaje en ${topic.title}`,
            difficulty: topic.learningSituation.difficulty || "",
            uncomprehendedConcept: topic.learningSituation.uncomprehendedConcept || "",
            strategyUsed: topic.learningSituation.strategyUsed || "",
            helpfulResources: topic.learningSituation.helpfulResources || "",
            whatILearned: topic.learningSituation.whatILearned || "",
            howIVerified: topic.learningSituation.howIVerified || "",
            personalReflection: topic.learningSituation.personalReflection || "",
            files: topic.learningSituation.files || []
          });
        }

        // Convertir conceptos texto a array de definiciones estructuradas
        const definitions = [];
        if (typeof topic.concepts === "string" && topic.concepts.trim()) {
          const lines = topic.concepts.split("\n").filter(l => l.trim());
          lines.forEach((line, lIdx) => {
            const clean = line.replace(/^[•\-\*]\s*/, "");
            const parts = clean.split(":");
            if (parts.length > 1) {
              definitions.push({
                id: `def_${topic.id}_${lIdx}`,
                term: parts[0].trim(),
                definition: parts.slice(1).join(":").trim()
              });
            } else {
              definitions.push({
                id: `def_${topic.id}_${lIdx}`,
                term: `Concepto ${lIdx + 1}`,
                definition: clean.trim()
              });
            }
          });
        }

        newDB.topics.push({
          id: topic.id,
          order: topic.order || 1,
          title: topic.title,
          description: topic.description || "",
          status: topic.status || "En progreso",
          estimatedHours: topic.estimatedHours || "20 horas",
          conceptualScheme: topic.relationships || (topic.concepts || ""),
          mapFile: topic.mapFile || null,
          definitions: definitions.length > 0 ? definitions : (topic.definitions || []),
          formulas: Array.isArray(topic.formulas) ? topic.formulas : [],
          files: []
        });
      });

      // Guardar en la nueva estructura v3
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(newDB));
      return newDB;
    }

    // Si no hay datos, inicializar con DEFAULT_DB
    const initial = structuredClone(DEFAULT_DB);
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(initial));
    return initial;
  } catch (err) {
    console.error("Error al cargar base de datos:", err);
    return structuredClone(DEFAULT_DB);
  }
}

/**
 * Guarda el estado actual en LocalStorage con control de cuota
 */
function saveDatabase() {
  try {
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(appDB));
    updateStorageMeter();
    return true;
  } catch (err) {
    console.error("Error al guardar en LocalStorage:", err);
    if (err.name === "QuotaExceededError" || err.code === 22) {
      showToast("¡Límite de memoria local superado! Reduce el tamaño de los archivos adjuntos o exporta un respaldo.", "error");
    } else {
      showToast("No se pudo guardar la información en este navegador.", "error");
    }
    return false;
  }
}

/**
 * Calcula el espacio aproximado de almacenamiento utilizado
 */
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

/**
 * Obtiene el título de un tema a partir de su ID
 */
function getTopicTitleById(topicId) {
  if (!topicId) return "General / No especificado";
  const t = appDB.topics.find(x => x.id === topicId);
  return t ? t.title : "Tema no encontrado";
}

// ============================================================================
// NAVEGACIÓN ENTRE VISTAS
// ============================================================================

function navigateToView(viewName) {
  currentView = viewName;

  // Ocultar todas las vistas
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

  // Activar la vista solicitada
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add("active");

  // Actualizar sidebar activo
  document.querySelectorAll(".nav-item").forEach(item => {
    const itemTarget = item.getAttribute("data-view");
    item.classList.toggle("active", itemTarget === viewName || (viewName === "detail" && itemTarget === "temas"));
  });

  // Título de la barra superior
  const pageTitle = document.getElementById("pageTitle");
  const titles = {
    inicio: "Inicio · Resumen del Portafolio",
    temas: "2. Mis Temas de Estudio",
    practicas: "3. Prácticas de Laboratorio",
    talleres: "4. Talleres y Ejercicios",
    parciales: "5. Evaluaciones y Parciales",
    aprendizaje: "6. Mi Aprendizaje y Metacognición",
    detail: "Detalle del Tema",
    respaldo: "Copias de Seguridad y Datos"
  };
  if (pageTitle) pageTitle.textContent = titles[viewName] || "Portafolio Digital";

  // Cerrar menú móvil si está abierto
  closeMobileMenu();

  // Scroll superior suave
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Re-renderizar la vista correspondiente
  renderActiveView();
}

function openMobileMenu() {
  document.getElementById("sidebar")?.classList.add("open");
  document.getElementById("sidebarBackdrop")?.classList.add("active");
}

function closeMobileMenu() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarBackdrop")?.classList.remove("active");
}

// ============================================================================
// RENDERIZADO PRINCIPAL DE LA APLICACIÓN
// ============================================================================

function renderApp() {
  // Ordenar temas por su campo de orden
  appDB.topics.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

  // Actualizar perfil de usuario
  updateProfileUI();

  // Actualizar contadores del Sidebar
  document.getElementById("navTopicsCount").textContent = appDB.topics.length;
  document.getElementById("navPracticesCount").textContent = appDB.practices.length;
  document.getElementById("navWorkshopsCount").textContent = appDB.workshops.length;
  document.getElementById("navExamsCount").textContent = appDB.exams.length;
  document.getElementById("navLearningsCount").textContent = appDB.learnings.length;

  // Llenar selects de temas en los formularios y filtros
  populateTopicSelects();

  // Renderizar la vista actualmente visible
  renderActiveView();

  // Actualizar medidor de espacio
  updateStorageMeter();
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

/**
 * Actualiza la información del perfil del estudiante en la interfaz
 */
function updateProfileUI() {
  const p = appDB.profile || DEFAULT_DB.profile;

  const sideName = document.getElementById("sidebarStudentName");
  const sideMeta = document.getElementById("sidebarStudentMeta");
  const sideAvatar = document.getElementById("sidebarAvatar");

  if (sideName) sideName.textContent = p.studentName || "Estudiante";
  if (sideMeta) sideMeta.textContent = `${p.career || "Ingeniería"} · ${p.semester || "Física I"}`;
  if (sideAvatar) {
    const initials = (p.studentName || "AM")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join("");
    sideAvatar.textContent = initials || "FI";
  }

  const profName = document.getElementById("profileStudentName");
  const profUniv = document.getElementById("profileUniversity");
  const profCareer = document.getElementById("profileCareer");
  const profProf = document.getElementById("profileProfessor");
  const profSem = document.getElementById("profileSemester");
  const profPres = document.getElementById("profilePresentation");
  const profObj = document.getElementById("profileObjectives");

  if (profName) profName.textContent = p.studentName;
  if (profUniv) profUniv.textContent = p.university;
  if (profCareer) profCareer.textContent = p.career;
  if (profProf) profProf.textContent = p.professor;
  if (profSem) profSem.textContent = p.semester;
  if (profPres) profPres.textContent = p.presentation;
  if (profObj) profObj.textContent = p.objectives;

  const topbarTag = document.getElementById("topbarTag");
  if (topbarTag) topbarTag.textContent = `SEMESTRE ${p.semester || "2026-I"}`;
}

/**
 * Llena todos los selectores desplegables de temas en filtros y modales
 */
function populateTopicSelects() {
  const selectIds = [
    "filterPracticeTopicSelect",
    "filterWorkshopTopicSelect",
    "filterExamTopicSelect",
    "filterLearningTopicSelect",
    "defFormTopicSelect",
    "formulaFormTopicSelect",
    "practiceFormTopicSelect",
    "workshopFormTopicSelect",
    "examFormTopicSelect",
    "learningFormTopicSelect"
  ];

  selectIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    const currentVal = el.value;
    const isFilter = id.startsWith("filter");

    let options = isFilter ? '<option value="all">Todos los temas</option>' : '';
    if (!isFilter && (id.includes("practice") || id.includes("workshop") || id.includes("exam") || id.includes("learning"))) {
      options += '<option value="">(Sin vincular a un tema específico)</option>';
    }

    appDB.topics.forEach(t => {
      options += `<option value="${escapeHTML(t.id)}">Tema ${t.order}: ${escapeHTML(t.title)}</option>`;
    });

    el.innerHTML = options;
    if (currentVal) el.value = currentVal;
  });
}

// ============================================================================
// 1. RENDERIZADO DE INICIO (DASHBOARD)
// ============================================================================

function renderInicio() {
  const totalTopics = appDB.topics.length;
  const totalPractices = appDB.practices.length;
  const totalWorkshops = appDB.workshops.length;
  const totalExams = appDB.exams.length;
  const totalLearnings = appDB.learnings.length;

  document.getElementById("kpiTopicsCount").textContent = totalTopics;
  document.getElementById("kpiPracticesCount").textContent = totalPractices;
  document.getElementById("kpiWorkshopsCount").textContent = totalWorkshops;
  document.getElementById("kpiExamsCount").textContent = totalExams;
  document.getElementById("kpiLearningsCount").textContent = totalLearnings;

  // Calcular porcentaje promedio de avance
  const completedTopics = appDB.topics.filter(t => t.status === "Completado").length;
  const globalProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  document.getElementById("kpiGlobalProgress").textContent = `${globalProgress}%`;
  document.getElementById("kpiGlobalProgressBar").style.width = `${globalProgress}%`;

  // Temas recientes (primeros 3)
  const recentTopicsContainer = document.getElementById("homeRecentTopicsGrid");
  if (recentTopicsContainer) {
    if (appDB.topics.length === 0) {
      recentTopicsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <h3>Aún no hay temas registrados</h3>
          <p>Comienza registrando el primer tema de tu portafolio de Física I.</p>
          <button class="btn btn-primary" onclick="openTopicModal()">＋ Crear primer tema</button>
        </div>`;
    } else {
      recentTopicsContainer.innerHTML = appDB.topics.slice(0, 3).map(t => createTopicCardHTML(t)).join("");
      bindTopicCardClicks(recentTopicsContainer);
    }
  }

  // Actividades recientes consolidadas
  const activitiesContainer = document.getElementById("homeRecentActivitiesGrid");
  if (activitiesContainer) {
    const allActivities = [
      ...appDB.practices.map(p => ({ ...p, typeLabel: "Práctica", typeClass: "practica", viewName: "practicas" })),
      ...appDB.workshops.map(w => ({ ...w, typeLabel: "Taller", typeClass: "taller", viewName: "talleres" })),
      ...appDB.exams.map(e => ({ ...e, typeLabel: "Parcial", typeClass: "parcial", viewName: "parciales" })),
      ...appDB.learnings.map(l => ({ ...l, typeLabel: "Metacognición", typeClass: "aprendizaje", viewName: "aprendizaje" }))
    ].slice(0, 3);

    if (allActivities.length === 0) {
      activitiesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>Sin actividades registradas aún</h3>
          <p>Puedes registrar prácticas, talleres y parciales desde sus apartados dedicados.</p>
        </div>`;
    } else {
      activitiesContainer.innerHTML = allActivities.map(act => `
        <div class="activity-card">
          <div class="activity-card-top">
            <span class="activity-type-badge ${act.typeClass}">${act.typeLabel}</span>
            <span class="activity-date">${act.date || ""}</span>
          </div>
          <span class="topic-tag">${escapeHTML(getTopicTitleById(act.topicId))}</span>
          <h4 class="activity-card-title">${escapeHTML(act.title)}</h4>
          <p class="activity-card-body">${escapeHTML(act.statement || act.difficulty || act.objectives || act.description || "")}</p>
          <div class="activity-card-foot">
            <button class="btn btn-secondary btn-sm" onclick="navigateToView('${act.viewName}')">Ver en ${act.typeLabel} →</button>
          </div>
        </div>
      `).join("");
    }
  }
}

// ============================================================================
// 2. RENDERIZADO DE MIS TEMAS
// ============================================================================

function renderTemas() {
  const container = document.getElementById("topicsGrid");
  const emptyState = document.getElementById("topicsEmptyState");
  if (!container) return;

  const q = (filters.topicsSearch || "").trim().toLowerCase();
  const statusFilter = filters.topicsStatus;

  const filtered = appDB.topics.filter(t => {
    const matchQ = (t.title + " " + (t.description || "")).toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchQ && matchStatus;
  });

  // Contadores de estado
  document.getElementById("countTopicsAll").textContent = appDB.topics.length;
  document.getElementById("countTopicsComplete").textContent = appDB.topics.filter(t => t.status === "Completado").length;
  document.getElementById("countTopicsProgress").textContent = appDB.topics.filter(t => t.status === "En progreso").length;
  document.getElementById("countTopicsPending").textContent = appDB.topics.filter(t => t.status === "Pendiente").length;

  if (filtered.length === 0) {
    container.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
  } else {
    if (emptyState) emptyState.classList.add("hidden");
    container.innerHTML = filtered.map(t => createTopicCardHTML(t)).join("");
    bindTopicCardClicks(container);
  }
}

function createTopicCardHTML(topic) {
  const statusSlug = (topic.status || "pendiente").toLowerCase().replace(/\s+/g, "-");
  const defCount = topic.definitions ? topic.definitions.length : 0;
  const formCount = topic.formulas ? topic.formulas.length : 0;
  const linkedPracs = appDB.practices.filter(p => p.topicId === topic.id).length;
  const linkedWorks = appDB.workshops.filter(w => w.topicId === topic.id).length;
  const linkedExams = appDB.exams.filter(e => e.topicId === topic.id).length;

  return `
    <article class="topic-card" data-topic-id="${escapeHTML(topic.id)}">
      <div class="topic-card-header">
        <div class="topic-order-badge">#${String(topic.order || 1).padStart(2, "0")}</div>
        <span class="status-badge ${statusSlug}">${escapeHTML(topic.status || "Pendiente")}</span>
      </div>

      <h3 class="topic-card-title">${escapeHTML(topic.title)}</h3>
      <p class="topic-card-desc">${escapeHTML(topic.description || "Sin descripción registrada.")}</p>

      <div class="topic-content-chips">
        <span class="content-mini-chip ${defCount > 0 ? 'has-content' : ''}">${defCount} Definiciones</span>
        <span class="content-mini-chip ${formCount > 0 ? 'has-content' : ''}">${formCount} Fórmulas</span>
        <span class="content-mini-chip ${linkedPracs > 0 ? 'has-content' : ''}">${linkedPracs} Prácticas</span>
        <span class="content-mini-chip ${linkedWorks > 0 ? 'has-content' : ''}">${linkedWorks} Talleres</span>
        <span class="content-mini-chip ${linkedExams > 0 ? 'has-content' : ''}">${linkedExams} Parciales</span>
      </div>

      <div class="topic-card-actions">
        <button class="btn btn-primary btn-sm action-view-topic" data-id="${escapeHTML(topic.id)}">
          Ver tema →
        </button>
        <div class="topic-card-actions-right">
          <button class="icon-action-btn action-edit-topic" title="Editar tema" data-id="${escapeHTML(topic.id)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          </button>
          <button class="icon-action-btn delete action-delete-topic" title="Eliminar tema" data-id="${escapeHTML(topic.id)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

function bindTopicCardClicks(container) {
  container.querySelectorAll(".action-view-topic").forEach(btn => {
    btn.onclick = () => showTopicDetail(btn.getAttribute("data-id"));
  });
  container.querySelectorAll(".action-edit-topic").forEach(btn => {
    btn.onclick = () => openTopicModal(btn.getAttribute("data-id"));
  });
  container.querySelectorAll(".action-delete-topic").forEach(btn => {
    btn.onclick = () => confirmDelete("topic", btn.getAttribute("data-id"));
  });
}

// ============================================================================
// 3. RENDERIZADO DE PRÁCTICAS
// ============================================================================

function renderPracticas() {
  const container = document.getElementById("practicesGrid");
  const empty = document.getElementById("practicesEmptyState");
  if (!container) return;

  const q = (filters.practicesSearch || "").trim().toLowerCase();
  const topicFilter = filters.practicesTopic;

  const filtered = appDB.practices.filter(p => {
    const matchQ = (p.title + " " + (p.objectives || "") + " " + (p.statement || "")).toLowerCase().includes(q);
    const matchTopic = topicFilter === "all" || p.topicId === topicFilter;
    return matchQ && matchTopic;
  });

  if (filtered.length === 0) {
    container.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
  } else {
    if (empty) empty.classList.add("hidden");
    container.innerHTML = filtered.map(p => `
      <div class="activity-card">
        <div class="activity-card-top">
          <span class="activity-type-badge practica">🧪 Práctica</span>
          <span class="activity-date">${p.date || "Sin fecha"}</span>
        </div>
        <span class="topic-tag">${escapeHTML(getTopicTitleById(p.topicId))}</span>
        <h4 class="activity-card-title">${escapeHTML(p.title)}</h4>
        <p class="activity-card-body">${escapeHTML(p.statement || p.objectives || "Sin enunciado registrado.")}</p>
        <div class="activity-card-meta">
          <span>📊 ${p.data ? "Datos registrados" : "Sin datos"}</span>
          <span>📎 ${(p.files && p.files.length) || 0} archivos</span>
        </div>
        <div class="activity-card-foot">
          <button class="btn btn-primary btn-sm" onclick="openItemViewerModal('practice', '${escapeHTML(p.id)}')">Ver detalle</button>
          <div class="topic-card-actions-right">
            <button class="icon-action-btn" title="Editar práctica" onclick="openPracticeModal('${escapeHTML(p.id)}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button class="icon-action-btn delete" title="Eliminar práctica" onclick="confirmDelete('practice', '${escapeHTML(p.id)}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `).join("");
  }
}

// ============================================================================
// 4. RENDERIZADO DE TALLERES
// ============================================================================

function renderTalleres() {
  const container = document.getElementById("workshopsGrid");
  const empty = document.getElementById("workshopsEmptyState");
  if (!container) return;

  const q = (filters.workshopsSearch || "").trim().toLowerCase();
  const topicFilter = filters.workshopsTopic;

  const filtered = appDB.workshops.filter(w => {
    const matchQ = (w.title + " " + (w.statement || "") + " " + (w.finalAnswer || "")).toLowerCase().includes(q);
    const matchTopic = topicFilter === "all" || w.topicId === topicFilter;
    return matchQ && matchTopic;
  });

  if (filtered.length === 0) {
    container.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
  } else {
    if (empty) empty.classList.add("hidden");
    container.innerHTML = filtered.map(w => `
      <div class="activity-card">
        <div class="activity-card-top">
          <span class="activity-type-badge taller">📝 Taller</span>
          <span class="activity-date">${w.date || "Sin fecha"}</span>
        </div>
        <span class="topic-tag">${escapeHTML(getTopicTitleById(w.topicId))}</span>
        <h4 class="activity-card-title">${escapeHTML(w.title)}</h4>
        <p class="activity-card-body">${escapeHTML(w.statement || "Sin enunciado.")}</p>
        ${w.finalAnswer ? `
          <div class="highlight-box" style="margin-bottom: 12px; font-size: 12.5px;">
            <strong>Respuesta:</strong> ${escapeHTML(w.finalAnswer)}
          </div>
        ` : ''}
        <div class="activity-card-foot">
          <button class="btn btn-primary btn-sm" onclick="openItemViewerModal('workshop', '${escapeHTML(w.id)}')">Ver desarrollo</button>
          <div class="topic-card-actions-right">
            <button class="icon-action-btn" title="Editar taller" onclick="openWorkshopModal('${escapeHTML(w.id)}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button class="icon-action-btn delete" title="Eliminar taller" onclick="confirmDelete('workshop', '${escapeHTML(w.id)}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `).join("");
  }
}

// ============================================================================
// 5. RENDERIZADO DE PARCIALES Y CORRECCIONES
// ============================================================================

function renderParciales() {
  const container = document.getElementById("examsGrid");
  const empty = document.getElementById("examsEmptyState");
  if (!container) return;

  const q = (filters.examsSearch || "").trim().toLowerCase();
  const topicFilter = filters.examsTopic;

  const filtered = appDB.exams.filter(e => {
    const matchQ = (e.title + " " + (e.statement || "") + " " + (e.identifiedError || "")).toLowerCase().includes(q);
    const matchTopic = topicFilter === "all" || e.topicId === topicFilter;
    return matchQ && matchTopic;
  });

  if (filtered.length === 0) {
    container.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
  } else {
    if (empty) empty.classList.add("hidden");
    container.innerHTML = filtered.map(e => `
      <div class="activity-card">
        <div class="activity-card-top">
          <span class="activity-type-badge parcial">🎯 Parcial</span>
          <span class="activity-date">${e.date || "Sin fecha"}</span>
        </div>
        <span class="topic-tag">${escapeHTML(getTopicTitleById(e.topicId))}</span>
        <h4 class="activity-card-title">${escapeHTML(e.title)}</h4>
        <p class="activity-card-body">${escapeHTML(e.statement || "Sin enunciado.")}</p>
        ${e.identifiedError ? `
          <div class="error-diagnosis-box" style="margin-bottom: 12px; font-size: 12px; padding: 10px 12px;">
            <strong>⚠️ Error diagnosticado:</strong> ${escapeHTML(e.identifiedError)}
          </div>
        ` : ''}
        <div class="activity-card-foot">
          <button class="btn btn-primary btn-sm" onclick="openItemViewerModal('exam', '${escapeHTML(e.id)}')">Ver corrección</button>
          <div class="topic-card-actions-right">
            <button class="icon-action-btn" title="Editar corrección" onclick="openExamModal('${escapeHTML(e.id)}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button class="icon-action-btn delete" title="Eliminar examen" onclick="confirmDelete('exam', '${escapeHTML(e.id)}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `).join("");
  }
}

// ============================================================================
// 6. RENDERIZADO DE MI APRENDIZAJE (METACOGNICIÓN)
// ============================================================================

function renderAprendizaje() {
  const container = document.getElementById("learningsGrid");
  const empty = document.getElementById("learningsEmptyState");
  if (!container) return;

  const q = (filters.learningsSearch || "").trim().toLowerCase();
  const topicFilter = filters.learningsTopic;

  const filtered = appDB.learnings.filter(l => {
    const matchQ = (l.title + " " + (l.difficulty || "") + " " + (l.whatILearned || "")).toLowerCase().includes(q);
    const matchTopic = topicFilter === "all" || l.topicId === topicFilter;
    return matchQ && matchTopic;
  });

  if (filtered.length === 0) {
    container.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
  } else {
    if (empty) empty.classList.add("hidden");
    container.innerHTML = filtered.map(l => `
      <div class="activity-card">
        <div class="activity-card-top">
          <span class="activity-type-badge aprendizaje">✦ Metacognición</span>
        </div>
        <span class="topic-tag">${escapeHTML(getTopicTitleById(l.topicId))}</span>
        <h4 class="activity-card-title">${escapeHTML(l.title)}</h4>
        <div class="activity-card-body">
          <p><strong>1. Dificultad:</strong> ${escapeHTML(l.difficulty || "No indicada")}</p>
          <p style="margin-top: 6px;"><strong>5. Qué aprendí:</strong> ${escapeHTML(l.whatILearned || "No indicado")}</p>
        </div>
        <div class="activity-card-foot">
          <button class="btn btn-primary btn-sm" onclick="openItemViewerModal('learning', '${escapeHTML(l.id)}')">Ver reflexión completa</button>
          <div class="topic-card-actions-right">
            <button class="icon-action-btn" title="Editar situación" onclick="openLearningModal('${escapeHTML(l.id)}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
            <button class="icon-action-btn delete" title="Eliminar situación" onclick="confirmDelete('learning', '${escapeHTML(l.id)}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `).join("");
  }
}

// ============================================================================
// 7. VISTA DETALLE DEL TEMA (CON EDICIÓN MODULAR DE CADA SECCIÓN)
// ============================================================================

function showTopicDetail(topicId) {
  activeDetailTopicId = topicId;
  navigateToView("detail");
}

function renderTopicDetail(topicId) {
  const topic = appDB.topics.find(t => t.id === topicId);
  const container = document.getElementById("topicDetailContainer");
  if (!topic || !container) {
    navigateToView("temas");
    return;
  }

  // Actividades vinculadas a este tema
  const topicPractices = appDB.practices.filter(p => p.topicId === topic.id);
  const topicWorkshops = appDB.workshops.filter(w => w.topicId === topic.id);
  const topicExams = appDB.exams.filter(e => e.topicId === topic.id);
  const topicLearnings = appDB.learnings.filter(l => l.topicId === topic.id);

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

    <!-- Pestañas internas del detalle del tema -->
    <div class="detail-tabs-bar" id="topicDetailSubTabs">
      <button class="detail-tab-btn active" data-subtab="sub-conceptos">
        <span>📑</span> Esquema & Definiciones
        <span class="detail-tab-badge">${(topic.definitions && topic.definitions.length) || 0}</span>
      </button>
      <button class="detail-tab-btn" data-subtab="sub-formulas">
        <span>𝚺</span> Fórmulas y Modelos
        <span class="detail-tab-badge">${(topic.formulas && topic.formulas.length) || 0}</span>
      </button>
      <button class="detail-tab-btn" data-subtab="sub-practicas">
        <span>🧪</span> Prácticas del Tema
        <span class="detail-tab-badge">${topicPractices.length}</span>
      </button>
      <button class="detail-tab-btn" data-subtab="sub-talleres">
        <span>📝</span> Talleres del Tema
        <span class="detail-tab-badge">${topicWorkshops.length}</span>
      </button>
      <button class="detail-tab-btn" data-subtab="sub-parciales">
        <span>🎯</span> Parciales del Tema
        <span class="detail-tab-badge">${topicExams.length}</span>
      </button>
      <button class="detail-tab-btn" data-subtab="sub-aprendizaje">
        <span>✦</span> Metacognición
        <span class="detail-tab-badge">${topicLearnings.length}</span>
      </button>
      <button class="detail-tab-btn" data-subtab="sub-evidencias">
        <span>📂</span> Evidencias
      </button>
    </div>
  `;

  // SUB-TAB 1: ESQUEMA CONCEPTUAL & DEFINICIONES
  html += `
    <div class="detail-tab-pane active" id="sub-conceptos">
      <div class="academic-section-card">
        <div class="section-action-header">
          <h3><span>📖</span> Esquema Conceptual General</h3>
          <button class="btn btn-outline btn-sm" onclick="openTopicModal('${escapeHTML(topic.id)}')">
            ✎ Modificar esquema o mapa
          </button>
        </div>
        <div class="detail-field-group">
          <p>${topic.conceptualScheme ? escapeHTML(topic.conceptualScheme) : "<em>No se ha registrado esquema explicativo para este tema.</em>"}</p>
        </div>

        ${topic.mapFile ? `
          <div style="margin-top: 20px;">
            <strong>Mapa Conceptual Gráfico:</strong>
            <div class="evidence-gallery" style="margin-top: 10px;">
              <div class="evidence-thumbnail-card" onclick="openFileViewer('${escapeHTML(topic.mapFile.name)}', '${escapeHTML(topic.mapFile.type)}', '${topic.mapFile.data}')">
                <div class="evidence-thumb-img-wrap">
                  ${topic.mapFile.type && topic.mapFile.type.startsWith("image/") ? `<img src="${topic.mapFile.data}" alt="Mapa">` : '<span class="doc-icon">📄</span>'}
                </div>
                <div class="evidence-thumb-info">
                  <span class="evidence-thumb-name">${escapeHTML(topic.mapFile.name)}</span>
                  <span class="evidence-thumb-meta">Mapa conceptual</span>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Definiciones individuales con agregar, editar y eliminar -->
      <div class="academic-section-card">
        <div class="section-action-header">
          <h3><span>📝</span> Definiciones Conceptuales (${(topic.definitions && topic.definitions.length) || 0})</h3>
          <button class="btn btn-primary btn-sm" onclick="openDefinitionModal(null, '${escapeHTML(topic.id)}')">
            ＋ Agregar Definición
          </button>
        </div>

        ${(!topic.definitions || topic.definitions.length === 0) ? `
          <div class="empty-state" style="padding: 30px;">
            <p>No hay definiciones registradas aún para este tema.</p>
            <button class="btn btn-outline btn-sm" onclick="openDefinitionModal(null, '${escapeHTML(topic.id)}')">＋ Registrar primera definición</button>
          </div>
        ` : `
          <div class="definitions-stack">
            ${topic.definitions.map(d => `
              <div class="definition-card">
                <div>
                  <h4 class="definition-term">${escapeHTML(d.term)}</h4>
                  <p class="definition-text">${escapeHTML(d.definition)}</p>
                </div>
                <div class="topic-card-actions-right">
                  <button class="icon-action-btn" title="Editar definición" onclick="openDefinitionModal('${escapeHTML(d.id)}', '${escapeHTML(topic.id)}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                  </button>
                  <button class="icon-action-btn delete" title="Eliminar definición" onclick="confirmDelete('definition', '${escapeHTML(d.id)}', '${escapeHTML(topic.id)}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    </div>
  `;

  // SUB-TAB 2: FÓRMULAS MATEMÁTICAS CON KATEX
  html += `
    <div class="detail-tab-pane" id="sub-formulas">
      <div class="academic-section-card">
        <div class="section-action-header">
          <h3><span>𝚺</span> Fórmulas y Modelos Matemáticos (${(topic.formulas && topic.formulas.length) || 0})</h3>
          <button class="btn btn-primary btn-sm" onclick="openFormulaModal(null, '${escapeHTML(topic.id)}')">
            ＋ Agregar Fórmula
          </button>
        </div>

        ${(!topic.formulas || topic.formulas.length === 0) ? `
          <div class="empty-state" style="padding: 30px;">
            <p>No se han registrado fórmulas matemáticas en este tema.</p>
            <button class="btn btn-outline btn-sm" onclick="openFormulaModal(null, '${escapeHTML(topic.id)}')">＋ Registrar primera fórmula</button>
          </div>
        ` : `
          <div class="formulas-grid">
            ${topic.formulas.map(f => `
              <div class="formula-card">
                <div class="formula-card-header">
                  <span class="formula-card-title">${escapeHTML(f.name)}</span>
                </div>
                <div class="formula-display-box">
                  ${formatLatex(f.latex, true)}
                </div>
                ${f.variables ? `
                  <div class="formula-meta-group">
                    <strong>Variables y Unidades (SI):</strong>
                    <p>${escapeHTML(f.variables)}</p>
                  </div>
                ` : ''}
                ${f.conditions ? `
                  <div class="formula-meta-group">
                    <strong>Condiciones de Aplicación:</strong>
                    <p>${escapeHTML(f.conditions)}</p>
                  </div>
                ` : ''}
                ${f.example ? `
                  <div class="formula-meta-group">
                    <strong>Ejemplo de Cálculo:</strong>
                    <p>${escapeHTML(f.example)}</p>
                  </div>
                ` : ''}
                <div class="formula-card-footer">
                  <button class="icon-action-btn" title="Editar fórmula" onclick="openFormulaModal('${escapeHTML(f.id)}', '${escapeHTML(topic.id)}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                  </button>
                  <button class="icon-action-btn delete" title="Eliminar fórmula" onclick="confirmDelete('formula', '${escapeHTML(f.id)}', '${escapeHTML(topic.id)}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    </div>
  `;

  // SUB-TAB 3: PRÁCTICAS DEL TEMA
  html += `
    <div class="detail-tab-pane" id="sub-practicas">
      <div class="academic-section-card">
        <div class="section-action-header">
          <h3><span>🧪</span> Prácticas de Laboratorio Asociadas</h3>
          <button class="btn btn-primary btn-sm" onclick="openPracticeModal(null, '${escapeHTML(topic.id)}')">
            ＋ Registrar Práctica para este tema
          </button>
        </div>

        ${topicPractices.length === 0 ? `
          <div class="empty-state" style="padding: 30px;">
            <p>Aún no hay prácticas de laboratorio vinculadas a este tema.</p>
            <button class="btn btn-outline btn-sm" onclick="openPracticeModal(null, '${escapeHTML(topic.id)}')">＋ Crear práctica</button>
          </div>
        ` : `
          <div class="cards-activity-grid">
            ${topicPractices.map(p => `
              <div class="activity-card">
                <div class="activity-card-top">
                  <span class="activity-type-badge practica">🧪 Práctica</span>
                  <span class="activity-date">${p.date || ""}</span>
                </div>
                <h4 class="activity-card-title">${escapeHTML(p.title)}</h4>
                <p class="activity-card-body">${escapeHTML(p.statement || p.objectives || "")}</p>
                <div class="activity-card-foot">
                  <button class="btn btn-primary btn-sm" onclick="openItemViewerModal('practice', '${escapeHTML(p.id)}')">Ver detalle</button>
                  <div class="topic-card-actions-right">
                    <button class="icon-action-btn" title="Editar práctica" onclick="openPracticeModal('${escapeHTML(p.id)}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="icon-action-btn delete" title="Eliminar práctica" onclick="confirmDelete('practice', '${escapeHTML(p.id)}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    </div>
  `;

  // SUB-TAB 4: TALLERES DEL TEMA
  html += `
    <div class="detail-tab-pane" id="sub-talleres">
      <div class="academic-section-card">
        <div class="section-action-header">
          <h3><span>📝</span> Talleres y Ejercicios Resueltos</h3>
          <button class="btn btn-primary btn-sm" onclick="openWorkshopModal(null, '${escapeHTML(topic.id)}')">
            ＋ Registrar Taller para este tema
          </button>
        </div>

        ${topicWorkshops.length === 0 ? `
          <div class="empty-state" style="padding: 30px;">
            <p>No se han registrado talleres vinculados a este tema.</p>
            <button class="btn btn-outline btn-sm" onclick="openWorkshopModal(null, '${escapeHTML(topic.id)}')">＋ Crear taller</button>
          </div>
        ` : `
          <div class="cards-activity-grid">
            ${topicWorkshops.map(w => `
              <div class="activity-card">
                <div class="activity-card-top">
                  <span class="activity-type-badge taller">📝 Taller</span>
                  <span class="activity-date">${w.date || ""}</span>
                </div>
                <h4 class="activity-card-title">${escapeHTML(w.title)}</h4>
                <p class="activity-card-body">${escapeHTML(w.statement || "")}</p>
                <div class="activity-card-foot">
                  <button class="btn btn-primary btn-sm" onclick="openItemViewerModal('workshop', '${escapeHTML(w.id)}')">Ver desarrollo</button>
                  <div class="topic-card-actions-right">
                    <button class="icon-action-btn" title="Editar taller" onclick="openWorkshopModal('${escapeHTML(w.id)}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="icon-action-btn delete" title="Eliminar taller" onclick="confirmDelete('workshop', '${escapeHTML(w.id)}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    </div>
  `;

  // SUB-TAB 5: PARCIALES DEL TEMA
  html += `
    <div class="detail-tab-pane" id="sub-parciales">
      <div class="academic-section-card">
        <div class="section-action-header">
          <h3><span>🎯</span> Evaluaciones Parciales y Correcciones</h3>
          <button class="btn btn-primary btn-sm" onclick="openExamModal(null, '${escapeHTML(topic.id)}')">
            ＋ Registrar Parcial para este tema
          </button>
        </div>

        ${topicExams.length === 0 ? `
          <div class="empty-state" style="padding: 30px;">
            <p>No hay evaluaciones parciales vinculadas a este tema.</p>
            <button class="btn btn-outline btn-sm" onclick="openExamModal(null, '${escapeHTML(topic.id)}')">＋ Registrar examen corregido</button>
          </div>
        ` : `
          <div class="cards-activity-grid">
            ${topicExams.map(e => `
              <div class="activity-card">
                <div class="activity-card-top">
                  <span class="activity-type-badge parcial">🎯 Parcial</span>
                  <span class="activity-date">${e.date || ""}</span>
                </div>
                <h4 class="activity-card-title">${escapeHTML(e.title)}</h4>
                <p class="activity-card-body">${escapeHTML(e.statement || "")}</p>
                ${e.identifiedError ? `
                  <div class="error-diagnosis-box" style="margin-bottom: 12px; font-size: 12px;">
                    <strong>⚠️ Error:</strong> ${escapeHTML(e.identifiedError)}
                  </div>
                ` : ''}
                <div class="activity-card-foot">
                  <button class="btn btn-primary btn-sm" onclick="openItemViewerModal('exam', '${escapeHTML(e.id)}')">Ver corrección</button>
                  <div class="topic-card-actions-right">
                    <button class="icon-action-btn" title="Editar parcial" onclick="openExamModal('${escapeHTML(e.id)}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="icon-action-btn delete" title="Eliminar examen" onclick="confirmDelete('exam', '${escapeHTML(e.id)}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    </div>
  `;

  // SUB-TAB 6: METACOGNICIÓN DEL TEMA
  html += `
    <div class="detail-tab-pane" id="sub-aprendizaje">
      <div class="academic-section-card">
        <div class="section-action-header">
          <h3><span>✦</span> Situaciones de Aprendizaje y Dificultades Superadas</h3>
          <button class="btn btn-primary btn-sm" onclick="openLearningModal(null, '${escapeHTML(topic.id)}')">
            ＋ Registrar Nueva Situación
          </button>
        </div>

        ${topicLearnings.length === 0 ? `
          <div class="empty-state" style="padding: 30px;">
            <p>No se han registrado situaciones metacognitivas para este tema.</p>
            <button class="btn btn-outline btn-sm" onclick="openLearningModal(null, '${escapeHTML(topic.id)}')">＋ Registrar reflexión</button>
          </div>
        ` : `
          <div class="cards-activity-grid">
            ${topicLearnings.map(l => `
              <div class="activity-card">
                <div class="activity-card-top">
                  <span class="activity-type-badge aprendizaje">✦ Metacognición</span>
                </div>
                <h4 class="activity-card-title">${escapeHTML(l.title)}</h4>
                <div class="activity-card-body">
                  <p><strong>Dificultad:</strong> ${escapeHTML(l.difficulty || "")}</p>
                  <p style="margin-top: 6px;"><strong>Qué aprendí:</strong> ${escapeHTML(l.whatILearned || "")}</p>
                </div>
                <div class="activity-card-foot">
                  <button class="btn btn-primary btn-sm" onclick="openItemViewerModal('learning', '${escapeHTML(l.id)}')">Ver completa</button>
                  <div class="topic-card-actions-right">
                    <button class="icon-action-btn" title="Editar reflexión" onclick="openLearningModal('${escapeHTML(l.id)}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="icon-action-btn delete" title="Eliminar situación" onclick="confirmDelete('learning', '${escapeHTML(l.id)}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    </div>
  `;

  // SUB-TAB 7: EVIDENCIAS
  const allTopicFiles = [];
  if (topic.mapFile) allTopicFiles.push({ file: topic.mapFile, label: "Mapa conceptual" });
  topicPractices.forEach(p => (p.files || []).forEach(f => allTopicFiles.push({ file: f, label: p.title })));
  topicWorkshops.forEach(w => (w.files || []).forEach(f => allTopicFiles.push({ file: f, label: w.title })));
  topicExams.forEach(e => (e.files || []).forEach(f => allTopicFiles.push({ file: f, label: e.title })));
  topicLearnings.forEach(l => (l.files || []).forEach(f => allTopicFiles.push({ file: f, label: l.title })));

  html += `
    <div class="detail-tab-pane" id="sub-evidencias">
      <div class="academic-section-card">
        <h3><span>📂</span> Todas las Evidencias Adjuntas del Tema</h3>
        ${allTopicFiles.length === 0 ? `
          <p class="text-muted"><em>No hay imágenes o documentos adjuntos para este tema ni sus actividades.</em></p>
        ` : `
          <div class="evidence-gallery">
            ${allTopicFiles.map(item => `
              <div class="evidence-thumbnail-card" onclick="openFileViewer('${escapeHTML(item.file.name)}', '${escapeHTML(item.file.type)}', '${item.file.data}')">
                <div class="evidence-thumb-img-wrap">
                  ${item.file.type && item.file.type.startsWith("image/") ? `<img src="${item.file.data}" alt="Foto">` : '<span class="doc-icon">📄</span>'}
                </div>
                <div class="evidence-thumb-info">
                  <span class="evidence-thumb-name">${escapeHTML(item.file.name)}</span>
                  <span class="evidence-thumb-meta">${escapeHTML(item.label)}</span>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Renderizar fórmulas con KaTeX
  renderKaTeX(container);

  // Enlazar pestañas internas
  const tabBtns = container.querySelectorAll(".detail-tab-btn");
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const targetSubtab = btn.getAttribute("data-subtab");
      container.querySelectorAll(".detail-tab-pane").forEach(pane => {
        pane.classList.toggle("active", pane.id === targetSubtab);
      });
    };
  });

  // Botones de cabecera del tema
  document.getElementById("detailEditTopicBtn").onclick = () => openTopicModal(topic.id);
  document.getElementById("detailDeleteTopicBtn").onclick = () => confirmDelete("topic", topic.id);
}

// ============================================================================
// 8. MODALES DE EDICIÓN Y CREACIÓN (CRUD INDIVIDUALIZADO)
// ============================================================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("active");
  // Asegurar scroll inicial al tope del formulario
  const body = modal.querySelector(".modal-body");
  if (body) body.scrollTop = 0;
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

// --- A. MODAL TEMA ---
let pendingTopicMapFile = null;

function openTopicModal(topicId = null) {
  const title = document.getElementById("topicModalTitle");
  const form = document.getElementById("topicForm");
  form.reset();
  pendingTopicMapFile = null;

  if (topicId) {
    const t = appDB.topics.find(x => x.id === topicId);
    if (!t) return;
    title.textContent = `Editar Tema: ${t.title}`;
    document.getElementById("topicFormId").value = t.id;
    document.getElementById("topicFormTitle").value = t.title || "";
    document.getElementById("topicFormOrder").value = t.order || 1;
    document.getElementById("topicFormStatus").value = t.status || "En progreso";
    document.getElementById("topicFormHours").value = t.estimatedHours || "";
    document.getElementById("topicFormDesc").value = t.description || "";
    document.getElementById("topicFormConceptual").value = t.conceptualScheme || "";
    pendingTopicMapFile = t.mapFile || null;
  } else {
    title.textContent = "Registrar Nuevo Tema Académico";
    document.getElementById("topicFormId").value = "";
    document.getElementById("topicFormOrder").value = appDB.topics.length + 1;
    document.getElementById("topicFormStatus").value = "En progreso";
  }

  renderTopicMapPreview();
  openModal("topicModal");
}

function renderTopicMapPreview() {
  const container = document.getElementById("topicMapFilePreview");
  if (!container) return;
  if (!pendingTopicMapFile) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `
    <div class="attached-item-chip">
      <span>📄</span>
      <span class="attached-item-name">${escapeHTML(pendingTopicMapFile.name)}</span>
      <button type="button" class="attached-item-remove-btn" onclick="removePendingTopicMap()">✕</button>
    </div>
  `;
}

function removePendingTopicMap() {
  pendingTopicMapFile = null;
  renderTopicMapPreview();
}

// --- B. MODAL DEFINICIÓN ---
function openDefinitionModal(defId = null, defaultTopicId = null) {
  const title = document.getElementById("defModalTitle");
  const form = document.getElementById("definitionForm");
  form.reset();

  populateTopicSelects();
  const select = document.getElementById("defFormTopicSelect");

  if (defaultTopicId && select) {
    select.value = defaultTopicId;
  }

  if (defId) {
    title.textContent = "Editar Definición";
    document.getElementById("defFormId").value = defId;

    // Buscar en todos los temas
    for (const t of appDB.topics) {
      const found = (t.definitions || []).find(d => d.id === defId);
      if (found) {
        document.getElementById("defFormTerm").value = found.term || "";
        document.getElementById("defFormDefinition").value = found.definition || "";
        document.getElementById("defFormTopicId").value = t.id;
        if (select) select.value = t.id;
        break;
      }
    }
  } else {
    title.textContent = "Agregar Nueva Definición";
    document.getElementById("defFormId").value = "";
    document.getElementById("defFormTopicId").value = defaultTopicId || "";
  }

  openModal("definitionModal");
}

// --- C. MODAL FÓRMULA ---
function openFormulaModal(formulaId = null, defaultTopicId = null) {
  const title = document.getElementById("formulaModalTitle");
  const form = document.getElementById("formulaForm");
  form.reset();

  populateTopicSelects();
  const select = document.getElementById("formulaFormTopicSelect");
  if (defaultTopicId && select) select.value = defaultTopicId;

  if (formulaId) {
    title.textContent = "Editar Fórmula Matemática";
    document.getElementById("formulaFormId").value = formulaId;

    for (const t of appDB.topics) {
      const found = (t.formulas || []).find(f => f.id === formulaId);
      if (found) {
        document.getElementById("formulaFormName").value = found.name || "";
        document.getElementById("formulaFormLatex").value = found.latex || "";
        document.getElementById("formulaFormVars").value = found.variables || "";
        document.getElementById("formulaFormConditions").value = found.conditions || "";
        document.getElementById("formulaFormExample").value = found.example || "";
        document.getElementById("formulaFormTopicId").value = t.id;
        if (select) select.value = t.id;
        updateFormulaLivePreview(found.latex);
        break;
      }
    }
  } else {
    title.textContent = "Agregar Nueva Fórmula Matemática";
    document.getElementById("formulaFormId").value = "";
    document.getElementById("formulaFormTopicId").value = defaultTopicId || "";
    updateFormulaLivePreview("");
  }

  openModal("formulaModal");
}

function updateFormulaLivePreview(latexCode) {
  const box = document.getElementById("formulaFormKatexPreview");
  if (!box) return;
  if (!latexCode || !latexCode.trim()) {
    box.innerHTML = '<span class="text-muted">Escribe código LaTeX arriba para previsualizar aquí.</span>';
    return;
  }
  box.innerHTML = formatLatex(latexCode, true);
}

// --- D. MODAL PRÁCTICA ---
let pendingPracticeFiles = [];

function openPracticeModal(practiceId = null, defaultTopicId = null) {
  const title = document.getElementById("practiceModalTitle");
  const form = document.getElementById("practiceForm");
  form.reset();
  pendingPracticeFiles = [];

  populateTopicSelects();
  const select = document.getElementById("practiceFormTopicSelect");
  if (defaultTopicId && select) select.value = defaultTopicId;

  if (practiceId) {
    const p = appDB.practices.find(x => x.id === practiceId);
    if (!p) return;
    title.textContent = "Editar Práctica de Laboratorio";
    document.getElementById("practiceFormId").value = p.id;
    document.getElementById("practiceFormTitle").value = p.title || "";
    document.getElementById("practiceFormDate").value = p.date || "";
    document.getElementById("practiceFormStatement").value = p.statement || "";
    document.getElementById("practiceFormObjectives").value = p.objectives || "";
    document.getElementById("practiceFormMaterials").value = p.materials || "";
    document.getElementById("practiceFormData").value = p.data || "";
    document.getElementById("practiceFormProcedure").value = p.procedure || "";
    document.getElementById("practiceFormCalculations").value = p.calculations || "";
    document.getElementById("practiceFormResults").value = p.results || "";
    document.getElementById("practiceFormConclusions").value = p.conclusions || "";
    if (select) select.value = p.topicId || "";
    pendingPracticeFiles = [...(p.files || [])];
  } else {
    title.textContent = "Registrar Nueva Práctica de Laboratorio";
    document.getElementById("practiceFormId").value = "";
    document.getElementById("practiceFormDate").value = new Date().toISOString().slice(0, 10);
  }

  renderPendingFilesList("practiceFormFilesPreview", pendingPracticeFiles, "practice");
  openModal("practiceModal");
}

// --- E. MODAL TALLER ---
let pendingWorkshopFiles = [];

function openWorkshopModal(workshopId = null, defaultTopicId = null) {
  const title = document.getElementById("workshopModalTitle");
  const form = document.getElementById("workshopForm");
  form.reset();
  pendingWorkshopFiles = [];

  populateTopicSelects();
  const select = document.getElementById("workshopFormTopicSelect");
  if (defaultTopicId && select) select.value = defaultTopicId;

  if (workshopId) {
    const w = appDB.workshops.find(x => x.id === workshopId);
    if (!w) return;
    title.textContent = "Editar Taller / Ejercicio";
    document.getElementById("workshopFormId").value = w.id;
    document.getElementById("workshopFormTitle").value = w.title || "";
    document.getElementById("workshopFormDate").value = w.date || "";
    document.getElementById("workshopFormStatement").value = w.statement || "";
    document.getElementById("workshopFormFormulas").value = w.formulas || "";
    document.getElementById("workshopFormStepByStep").value = w.stepByStep || "";
    document.getElementById("workshopFormAnswer").value = w.finalAnswer || "";
    document.getElementById("workshopFormVerification").value = w.verification || "";
    document.getElementById("workshopFormReflection").value = w.reflection || "";
    if (select) select.value = w.topicId || "";
    pendingWorkshopFiles = [...(w.files || [])];
  } else {
    title.textContent = "Registrar Nuevo Taller";
    document.getElementById("workshopFormId").value = "";
    document.getElementById("workshopFormDate").value = new Date().toISOString().slice(0, 10);
  }

  renderPendingFilesList("workshopFormFilesPreview", pendingWorkshopFiles, "workshop");
  openModal("workshopModal");
}

// --- F. MODAL PARCIAL ---
let pendingExamFiles = [];

function openExamModal(examId = null, defaultTopicId = null) {
  const title = document.getElementById("examModalTitle");
  const form = document.getElementById("examForm");
  form.reset();
  pendingExamFiles = [];

  populateTopicSelects();
  const select = document.getElementById("examFormTopicSelect");
  if (defaultTopicId && select) select.value = defaultTopicId;

  if (examId) {
    const e = appDB.exams.find(x => x.id === examId);
    if (!e) return;
    title.textContent = "Editar Corrección de Parcial";
    document.getElementById("examFormId").value = e.id;
    document.getElementById("examFormTitle").value = e.title || "";
    document.getElementById("examFormDate").value = e.date || "";
    document.getElementById("examFormContents").value = e.evaluatedContents || "";
    document.getElementById("examFormStatement").value = e.statement || "";
    document.getElementById("examFormOriginal").value = e.originalProcedure || "";
    document.getElementById("examFormError").value = e.identifiedError || "";
    document.getElementById("examFormCorrectSolution").value = e.correctSolution || "";
    document.getElementById("examFormVerification").value = e.verification || "";
    document.getElementById("examFormReflection").value = e.preventionReflection || "";
    if (select) select.value = e.topicId || "";
    pendingExamFiles = [...(e.files || [])];
  } else {
    title.textContent = "Registrar Corrección de Parcial";
    document.getElementById("examFormId").value = "";
    document.getElementById("examFormDate").value = new Date().toISOString().slice(0, 10);
  }

  renderPendingFilesList("examFormFilesPreview", pendingExamFiles, "exam");
  openModal("examModal");
}

// --- G. MODAL METACOGNICIÓN ---
let pendingLearningFiles = [];

function openLearningModal(learnId = null, defaultTopicId = null) {
  const title = document.getElementById("learningModalTitle");
  const form = document.getElementById("learningForm");
  form.reset();
  pendingLearningFiles = [];

  populateTopicSelects();
  const select = document.getElementById("learningFormTopicSelect");
  if (defaultTopicId && select) select.value = defaultTopicId;

  if (learnId) {
    const l = appDB.learnings.find(x => x.id === learnId);
    if (!l) return;
    title.textContent = "Editar Situación de Aprendizaje";
    document.getElementById("learningFormId").value = l.id;
    document.getElementById("learningFormTitle").value = l.title || "";
    document.getElementById("learningFormDifficulty").value = l.difficulty || "";
    document.getElementById("learningFormConcept").value = l.uncomprehendedConcept || "";
    document.getElementById("learningFormStrategy").value = l.strategyUsed || "";
    document.getElementById("learningFormResources").value = l.helpfulResources || "";
    document.getElementById("learningFormWhatLearned").value = l.whatILearned || "";
    document.getElementById("learningFormVerification").value = l.howIVerified || "";
    document.getElementById("learningFormReflection").value = l.personalReflection || "";
    if (select) select.value = l.topicId || "";
    pendingLearningFiles = [...(l.files || [])];
  } else {
    title.textContent = "Registrar Nueva Situación de Aprendizaje";
    document.getElementById("learningFormId").value = "";
  }

  renderPendingFilesList("learningFormFilesPreview", pendingLearningFiles, "learning");
  openModal("learningModal");
}

// --- AUXILIARES DE SUBIDA DE ARCHIVOS ---
function renderPendingFilesList(containerId, fileArray, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = fileArray.map((f, idx) => `
    <div class="attached-item-chip">
      <span>📎</span>
      <span class="attached-item-name">${escapeHTML(f.name)}</span>
      <button type="button" class="attached-item-remove-btn" onclick="removePendingFile('${type}', ${idx})">✕</button>
    </div>
  `).join("");
}

function removePendingFile(type, index) {
  if (type === "practice") {
    pendingPracticeFiles.splice(index, 1);
    renderPendingFilesList("practiceFormFilesPreview", pendingPracticeFiles, "practice");
  } else if (type === "workshop") {
    pendingWorkshopFiles.splice(index, 1);
    renderPendingFilesList("workshopFormFilesPreview", pendingWorkshopFiles, "workshop");
  } else if (type === "exam") {
    pendingExamFiles.splice(index, 1);
    renderPendingFilesList("examFormFilesPreview", pendingExamFiles, "exam");
  } else if (type === "learning") {
    pendingLearningFiles.splice(index, 1);
    renderPendingFilesList("learningFormFilesPreview", pendingLearningFiles, "learning");
  }
}

function readFilesSafely(fileList, maxSizeBytes = 1.5 * 1024 * 1024) {
  return Promise.all(
    fileList.map(file => {
      return new Promise((resolve) => {
        if (file.size > maxSizeBytes) {
          showToast(`El archivo "${file.name}" supera el tamaño sugerido de 1.5 MB para LocalStorage.`, "warning");
        }
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result
          });
        };
        reader.onerror = () => {
          showToast(`No se pudo leer el archivo "${file.name}".`, "error");
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    })
  ).then(results => results.filter(Boolean));
}

// ============================================================================
// 9. VISOR DETALLADO DE ELEMENTOS (ITEM VIEWER MODAL)
// ============================================================================

function openItemViewerModal(type, itemId) {
  const modal = document.getElementById("itemViewerModal");
  const title = document.getElementById("itemViewerTitle");
  const badge = document.getElementById("itemViewerBadge");
  const body = document.getElementById("itemViewerBody");
  if (!modal || !body) return;

  let contentHTML = "";

  if (type === "practice") {
    const p = appDB.practices.find(x => x.id === itemId);
    if (!p) return;
    badge.textContent = "🧪";
    title.textContent = p.title;
    contentHTML = `
      <div class="activity-card-top" style="margin-bottom: 16px;">
        <span class="topic-tag">${escapeHTML(getTopicTitleById(p.topicId))}</span>
        <span class="activity-date">Fecha: ${p.date || "No registrada"}</span>
      </div>
      ${p.statement ? `<div class="detail-field-group"><strong>Enunciado:</strong><p>${escapeHTML(p.statement)}</p></div>` : ''}
      ${p.objectives ? `<div class="detail-field-group"><strong>Objetivos:</strong><p>${escapeHTML(p.objectives)}</p></div>` : ''}
      ${p.materials ? `<div class="detail-field-group"><strong>Materiales y Equipos:</strong><p>${escapeHTML(p.materials)}</p></div>` : ''}
      ${p.data ? `<div class="detail-field-group"><strong>Datos Experimentales:</strong><p>${escapeHTML(p.data)}</p></div>` : ''}
      ${p.procedure ? `<div class="detail-field-group"><strong>Procedimiento:</strong><p>${escapeHTML(p.procedure)}</p></div>` : ''}
      ${p.calculations ? `<div class="detail-field-group"><strong>Cálculos y Fórmulas:</strong><p>${escapeHTML(p.calculations)}</p></div>` : ''}
      ${p.results ? `<div class="detail-field-group"><strong>Resultados:</strong><div class="highlight-box">${escapeHTML(p.results)}</div></div>` : ''}
      ${p.conclusions ? `<div class="detail-field-group"><strong>Conclusiones:</strong><p>${escapeHTML(p.conclusions)}</p></div>` : ''}
      ${(p.files && p.files.length) ? `
        <div class="detail-field-group">
          <strong>Archivos Adjuntos:</strong>
          <div class="evidence-gallery" style="margin-top: 10px;">
            ${p.files.map(f => `
              <div class="evidence-thumbnail-card" onclick="openFileViewer('${escapeHTML(f.name)}', '${escapeHTML(f.type)}', '${f.data}')">
                <div class="evidence-thumb-img-wrap">
                  ${f.type && f.type.startsWith("image/") ? `<img src="${f.data}" alt="Foto">` : '<span class="doc-icon">📄</span>'}
                </div>
                <div class="evidence-thumb-info">
                  <span class="evidence-thumb-name">${escapeHTML(f.name)}</span>
                  <span class="evidence-thumb-meta">Práctica</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ''}
    `;
  } else if (type === "workshop") {
    const w = appDB.workshops.find(x => x.id === itemId);
    if (!w) return;
    badge.textContent = "📝";
    title.textContent = w.title;
    contentHTML = `
      <div class="activity-card-top" style="margin-bottom: 16px;">
        <span class="topic-tag">${escapeHTML(getTopicTitleById(w.topicId))}</span>
        <span class="activity-date">Fecha: ${w.date || "No registrada"}</span>
      </div>
      <div class="detail-field-group"><strong>Enunciado:</strong><p>${escapeHTML(w.statement)}</p></div>
      ${w.formulas ? `
        <div class="detail-field-group">
          <strong>Fórmulas Utilizadas:</strong>
          <div class="formula-display-box">${formatLatex(w.formulas, true)}</div>
        </div>
      ` : ''}
      ${w.stepByStep ? `<div class="detail-field-group"><strong>Procedimiento Paso a Paso:</strong><p>${escapeHTML(w.stepByStep)}</p></div>` : ''}
      ${w.finalAnswer ? `<div class="detail-field-group"><strong>Respuesta Final:</strong><div class="success-box"><strong>${escapeHTML(w.finalAnswer)}</strong></div></div>` : ''}
      ${w.verification ? `<div class="detail-field-group"><strong>Verificación Física:</strong><p>${escapeHTML(w.verification)}</p></div>` : ''}
      ${w.reflection ? `<div class="detail-field-group"><strong>Reflexión:</strong><p>${escapeHTML(w.reflection)}</p></div>` : ''}
      ${(w.files && w.files.length) ? `
        <div class="detail-field-group">
          <strong>Hojas de Trabajo Adjuntas:</strong>
          <div class="evidence-gallery" style="margin-top: 10px;">
            ${w.files.map(f => `
              <div class="evidence-thumbnail-card" onclick="openFileViewer('${escapeHTML(f.name)}', '${escapeHTML(f.type)}', '${f.data}')">
                <div class="evidence-thumb-img-wrap">
                  ${f.type && f.type.startsWith("image/") ? `<img src="${f.data}" alt="Foto">` : '<span class="doc-icon">📄</span>'}
                </div>
                <div class="evidence-thumb-info">
                  <span class="evidence-thumb-name">${escapeHTML(f.name)}</span>
                  <span class="evidence-thumb-meta">Taller</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ''}
    `;
  } else if (type === "exam") {
    const e = appDB.exams.find(x => x.id === itemId);
    if (!e) return;
    badge.textContent = "🎯";
    title.textContent = e.title;
    contentHTML = `
      <div class="activity-card-top" style="margin-bottom: 16px;">
        <span class="topic-tag">${escapeHTML(getTopicTitleById(e.topicId))}</span>
        <span class="activity-date">Fecha: ${e.date || "No registrada"}</span>
      </div>
      ${e.evaluatedContents ? `<div class="detail-field-group"><strong>Contenidos Evaluados:</strong><p>${escapeHTML(e.evaluatedContents)}</p></div>` : ''}
      <div class="detail-field-group"><strong>1. Enunciado del Problema:</strong><p>${escapeHTML(e.statement)}</p></div>
      <div class="detail-field-group"><strong>2. Procedimiento Original Realizado:</strong><p>${escapeHTML(e.originalProcedure)}</p></div>
      <div class="detail-field-group">
        <strong>3. Error Identificado (Diagnóstico Pedagógico):</strong>
        <div class="error-diagnosis-box"><strong>⚠️ ERROR COMETIDO:</strong> ${escapeHTML(e.identifiedError)}</div>
      </div>
      <div class="detail-field-group"><strong>4. Solución Correcta Paso a Paso:</strong><p>${escapeHTML(e.correctSolution)}</p></div>
      ${e.verification ? `<div class="detail-field-group"><strong>5. Verificación del Resultado:</strong><div class="highlight-box">${escapeHTML(e.verification)}</div></div>` : ''}
      <div class="detail-field-group">
        <strong>6. Reflexión Preventiva para no Reincidir:</strong>
        <div class="success-box"><strong>💡 ESTRATEGIA PREVENTIVA:</strong> ${escapeHTML(e.preventionReflection)}</div>
      </div>
      ${(e.files && e.files.length) ? `
        <div class="detail-field-group">
          <strong>Examen Calificado Adjunto:</strong>
          <div class="evidence-gallery" style="margin-top: 10px;">
            ${e.files.map(f => `
              <div class="evidence-thumbnail-card" onclick="openFileViewer('${escapeHTML(f.name)}', '${escapeHTML(f.type)}', '${f.data}')">
                <div class="evidence-thumb-img-wrap">
                  ${f.type && f.type.startsWith("image/") ? `<img src="${f.data}" alt="Foto">` : '<span class="doc-icon">📄</span>'}
                </div>
                <div class="evidence-thumb-info">
                  <span class="evidence-thumb-name">${escapeHTML(f.name)}</span>
                  <span class="evidence-thumb-meta">Examen</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ''}
    `;
  } else if (type === "learning") {
    const l = appDB.learnings.find(x => x.id === itemId);
    if (!l) return;
    badge.textContent = "✦";
    title.textContent = l.title;
    contentHTML = `
      <div class="activity-card-top" style="margin-bottom: 16px;">
        <span class="topic-tag">${escapeHTML(getTopicTitleById(l.topicId))}</span>
      </div>
      <div class="detail-field-group"><strong>1. ¿Qué dificultad encontré?</strong><p>${escapeHTML(l.difficulty)}</p></div>
      <div class="detail-field-group"><strong>2. ¿Qué concepto o procedimiento no comprendía?</strong><p>${escapeHTML(l.uncomprehendedConcept)}</p></div>
      <div class="detail-field-group"><strong>3. ¿Qué estrategia de aprendizaje utilicé?</strong><p>${escapeHTML(l.strategyUsed)}</p></div>
      <div class="detail-field-group"><strong>4. ¿Qué ejercicios o recursos me ayudaron?</strong><p>${escapeHTML(l.helpfulResources)}</p></div>
      <div class="detail-field-group"><strong>5. ¿Qué aprendí?</strong><p>${escapeHTML(l.whatILearned)}</p></div>
      <div class="detail-field-group"><strong>6. ¿Cómo comprobé que mejoré?</strong><p>${escapeHTML(l.howIVerified)}</p></div>
      ${l.personalReflection ? `<div class="detail-field-group"><strong>Reflexión Personal del Proceso:</strong><p>${escapeHTML(l.personalReflection)}</p></div>` : ''}
      ${(l.files && l.files.length) ? `
        <div class="detail-field-group">
          <strong>Evidencias del Progreso Adjuntas:</strong>
          <div class="evidence-gallery" style="margin-top: 10px;">
            ${l.files.map(f => `
              <div class="evidence-thumbnail-card" onclick="openFileViewer('${escapeHTML(f.name)}', '${escapeHTML(f.type)}', '${f.data}')">
                <div class="evidence-thumb-img-wrap">
                  ${f.type && f.type.startsWith("image/") ? `<img src="${f.data}" alt="Foto">` : '<span class="doc-icon">📄</span>'}
                </div>
                <div class="evidence-thumb-info">
                  <span class="evidence-thumb-name">${escapeHTML(f.name)}</span>
                  <span class="evidence-thumb-meta">Evidencia</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ''}
    `;
  }

  body.innerHTML = contentHTML;
  renderKaTeX(body);
  openModal("itemViewerModal");
}

// ============================================================================
// 10. CONTROLADORES DE CONFIRMACIÓN Y ELIMINACIÓN
// ============================================================================

function confirmDelete(type, id, parentTopicId = null) {
  let itemTitle = "este elemento";

  if (type === "topic") {
    const t = appDB.topics.find(x => x.id === id);
    if (t) itemTitle = `el tema "${t.title}"`;
  } else if (type === "definition") {
    const t = appDB.topics.find(x => x.id === parentTopicId);
    const d = t?.definitions?.find(x => x.id === id);
    if (d) itemTitle = `la definición de "${d.term}"`;
  } else if (type === "formula") {
    const t = appDB.topics.find(x => x.id === parentTopicId);
    const f = t?.formulas?.find(x => x.id === id);
    if (f) itemTitle = `la fórmula "${f.name}"`;
  } else if (type === "practice") {
    const p = appDB.practices.find(x => x.id === id);
    if (p) itemTitle = `la práctica "${p.title}"`;
  } else if (type === "workshop") {
    const w = appDB.workshops.find(x => x.id === id);
    if (w) itemTitle = `el taller "${w.title}"`;
  } else if (type === "exam") {
    const e = appDB.exams.find(x => x.id === id);
    if (e) itemTitle = `el parcial "${e.title}"`;
  } else if (type === "learning") {
    const l = appDB.learnings.find(x => x.id === id);
    if (l) itemTitle = `la situación de aprendizaje "${l.title}"`;
  }

  currentConfirmAction = () => {
    executeDelete(type, id, parentTopicId);
  };

  document.getElementById("confirmModalMessage").textContent =
    `¿Estás seguro de que deseas eliminar permanentemente ${itemTitle}? Esta acción no se puede deshacer.`;
  openModal("confirmModal");
}

function executeDelete(type, id, parentTopicId) {
  if (type === "topic") {
    appDB.topics = appDB.topics.filter(t => t.id !== id);
    saveDatabase();
    renderApp();
    if (currentView === "detail" && activeDetailTopicId === id) {
      navigateToView("temas");
    }
    showToast("Tema eliminado correctamente.", "info");
  } else if (type === "definition") {
    const t = appDB.topics.find(x => x.id === parentTopicId);
    if (t && t.definitions) {
      t.definitions = t.definitions.filter(d => d.id !== id);
      saveDatabase();
      renderApp();
      showToast("Definición eliminada.", "info");
    }
  } else if (type === "formula") {
    const t = appDB.topics.find(x => x.id === parentTopicId);
    if (t && t.formulas) {
      t.formulas = t.formulas.filter(f => f.id !== id);
      saveDatabase();
      renderApp();
      showToast("Fórmula eliminada.", "info");
    }
  } else if (type === "practice") {
    appDB.practices = appDB.practices.filter(p => p.id !== id);
    saveDatabase();
    renderApp();
    showToast("Práctica eliminada.", "info");
  } else if (type === "workshop") {
    appDB.workshops = appDB.workshops.filter(w => w.id !== id);
    saveDatabase();
    renderApp();
    showToast("Taller eliminado.", "info");
  } else if (type === "exam") {
    appDB.exams = appDB.exams.filter(e => e.id !== id);
    saveDatabase();
    renderApp();
    showToast("Examen eliminado.", "info");
  } else if (type === "learning") {
    appDB.learnings = appDB.learnings.filter(l => l.id !== id);
    saveDatabase();
    renderApp();
    showToast("Situación de aprendizaje eliminada.", "info");
  }
}

function closeConfirmDialog() {
  closeModal("confirmModal");
  currentConfirmAction = null;
}

// ============================================================================
// 11. VISOR DE ARCHIVO / LIGHTBOX
// ============================================================================

function openFileViewer(name, type, data) {
  const modal = document.getElementById("fileViewerModal");
  const title = document.getElementById("fileViewerTitle");
  const body = document.getElementById("fileViewerBody");
  const download = document.getElementById("fileViewerDownloadBtn");

  if (!modal || !body) return;

  if (title) title.textContent = name || "Vista Previa de Evidencia";
  if (download) {
    download.href = data;
    download.download = name || "evidencia";
  }

  if (type && type.startsWith("image/") && data) {
    body.innerHTML = `<img src="${data}" alt="${escapeHTML(name)}">`;
  } else if (type === "application/pdf" && data) {
    body.innerHTML = `<iframe src="${data}" style="width:100%; height:550px; border:none;"></iframe>`;
  } else {
    body.innerHTML = `
      <div style="text-align: center; color: #FFFFFF; padding: 40px;">
        <p style="font-size: 40px; margin-bottom: 12px;">📄</p>
        <h4>${escapeHTML(name)}</h4>
        <p style="font-size: 13px; color: #94A3B8; margin-top: 8px;">Este archivo puede descargarse en tu computadora.</p>
        <a href="${data}" download="${escapeHTML(name)}" class="btn btn-accent btn-sm" style="margin-top: 16px;">Descargar archivo</a>
      </div>
    `;
  }

  openModal("fileViewerModal");
}

function closeFileViewer() {
  closeModal("fileViewerModal");
}

// ============================================================================
// 12. EXPORTACIÓN E IMPORTACIÓN DE COPIAS DE SEGURIDAD
// ============================================================================

function exportBackupJSON() {
  const backupData = {
    application: "Portafolio Digital de Física I",
    version: "3.0",
    exportedAt: new Date().toISOString(),
    database: appDB
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `respaldo-portafolio-fisica-I-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Copia de seguridad exportada en archivo JSON.", "success");
}

function importBackupJSON(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const incomingDB = data.database || data;

      if (!incomingDB || (!incomingDB.topics && !Array.isArray(incomingDB))) {
        throw new Error("Formato inválido");
      }

      currentConfirmAction = () => {
        if (incomingDB.topics && Array.isArray(incomingDB.topics)) {
          appDB = incomingDB;
        } else if (Array.isArray(incomingDB)) {
          appDB.topics = incomingDB;
        }
        saveDatabase();
        renderApp();
        navigateToView("inicio");
        showToast("Copia de seguridad importada exitosamente.", "success");
      };

      document.getElementById("confirmModalMessage").textContent =
        "La importación reemplazará los datos actuales del portafolio. ¿Deseas continuar con la restauración?";
      openModal("confirmModal");
    } catch (err) {
      console.error("Error al importar:", err);
      showToast("El archivo seleccionado no tiene un formato válido de portafolio.", "error");
    }
  };
  reader.readAsText(file);
}

function restoreDefaultData() {
  currentConfirmAction = () => {
    appDB = structuredClone(DEFAULT_DB);
    saveDatabase();
    renderApp();
    navigateToView("inicio");
    showToast("Datos de ejemplo iniciales restaurados con éxito.", "success");
  };

  document.getElementById("confirmModalMessage").textContent =
    "Esta acción restablecerá los 3 temas modelo con sus prácticas, talleres y evaluaciones de ejemplo. ¿Deseas continuar?";
  openModal("confirmModal");
}

function clearAllData() {
  currentConfirmAction = () => {
    appDB = {
      profile: structuredClone(DEFAULT_DB.profile),
      topics: [],
      practices: [],
      workshops: [],
      exams: [],
      learnings: []
    };
    saveDatabase();
    renderApp();
    navigateToView("temas");
    showToast("Se han eliminado todos los registros almacenados.", "info");
  };

  document.getElementById("confirmModalMessage").textContent =
    "¡Atención! Se eliminarán TODOS los temas y evaluaciones registradas. Se recomienda descargar un respaldo antes.";
  openModal("confirmModal");
}

// ============================================================================
// 13. INICIALIZACIÓN DE EVENTOS Y REGISTRO DE FORMULARIOS
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // 1. Navegación en Barra Lateral
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      navigateToView(btn.getAttribute("data-view"));
    });
  });

  // 2. Control del menú móvil
  document.getElementById("mobileMenuBtn")?.addEventListener("click", openMobileMenu);
  document.getElementById("sidebarCloseBtn")?.addEventListener("click", closeMobileMenu);
  document.getElementById("sidebarBackdrop")?.addEventListener("click", closeMobileMenu);

  // 3. Botones de acción rápida en topbar e inicio
  document.getElementById("topbarQuickAddBtn")?.addEventListener("click", () => openTopicModal());
  document.getElementById("heroCreateTopicBtn")?.addEventListener("click", () => openTopicModal());
  document.getElementById("heroExploreTopicsBtn")?.addEventListener("click", () => navigateToView("temas"));
  document.getElementById("homeViewAllTopicsBtn")?.addEventListener("click", () => navigateToView("temas"));
  document.getElementById("btnOpenNewTopicModal")?.addEventListener("click", () => openTopicModal());

  // Navegación desde tarjetas KPI en Inicio
  document.querySelectorAll(".stat-card[data-goto-view]").forEach(card => {
    card.addEventListener("click", () => {
      navigateToView(card.getAttribute("data-goto-view"));
    });
  });

  // Botones para registrar en cada sección independiente
  document.getElementById("btnOpenNewPracticeModal")?.addEventListener("click", () => openPracticeModal());
  document.getElementById("btnOpenNewWorkshopModal")?.addEventListener("click", () => openWorkshopModal());
  document.getElementById("btnOpenNewExamModal")?.addEventListener("click", () => openExamModal());
  document.getElementById("btnOpenNewLearningModal")?.addEventListener("click", () => openLearningModal());

  // Navegación de regreso en Detalle
  document.getElementById("detailBackBtn")?.addEventListener("click", () => navigateToView("temas"));

  // 4. Búsqueda y Filtros de Temas
  const searchTopicsInput = document.getElementById("searchTopicsInput");
  if (searchTopicsInput) {
    searchTopicsInput.addEventListener("input", (e) => {
      filters.topicsSearch = e.target.value;
      renderTemas();
    });
  }

  document.querySelectorAll("[data-filter-topics]").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-filter-topics]").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      filters.topicsStatus = chip.getAttribute("data-filter-topics");
      renderTemas();
    });
  });

  document.getElementById("emptyResetTopicFilterBtn")?.addEventListener("click", () => {
    if (searchTopicsInput) searchTopicsInput.value = "";
    filters.topicsSearch = "";
    filters.topicsStatus = "all";
    document.querySelectorAll("[data-filter-topics]").forEach(c => c.classList.toggle("active", c.getAttribute("data-filter-topics") === "all"));
    renderTemas();
  });

  // 5. Filtros de Prácticas
  document.getElementById("searchPracticesInput")?.addEventListener("input", (e) => {
    filters.practicesSearch = e.target.value;
    renderPracticas();
  });
  document.getElementById("filterPracticeTopicSelect")?.addEventListener("change", (e) => {
    filters.practicesTopic = e.target.value;
    renderPracticas();
  });

  // 6. Filtros de Talleres
  document.getElementById("searchWorkshopsInput")?.addEventListener("input", (e) => {
    filters.workshopsSearch = e.target.value;
    renderTalleres();
  });
  document.getElementById("filterWorkshopTopicSelect")?.addEventListener("change", (e) => {
    filters.workshopsTopic = e.target.value;
    renderTalleres();
  });

  // 7. Filtros de Parciales
  document.getElementById("searchExamsInput")?.addEventListener("input", (e) => {
    filters.examsSearch = e.target.value;
    renderParciales();
  });
  document.getElementById("filterExamTopicSelect")?.addEventListener("change", (e) => {
    filters.examsTopic = e.target.value;
    renderParciales();
  });

  // 8. Filtros de Aprendizaje
  document.getElementById("searchLearningsInput")?.addEventListener("input", (e) => {
    filters.learningsSearch = e.target.value;
    renderAprendizaje();
  });
  document.getElementById("filterLearningTopicSelect")?.addEventListener("change", (e) => {
    filters.learningsTopic = e.target.value;
    renderAprendizaje();
  });

  // 9. FORMULARIO: TEMA
  document.getElementById("topicFormMapFile")?.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const read = await readFilesSafely([files[0]]);
      if (read.length > 0) {
        pendingTopicMapFile = read[0];
        renderTopicMapPreview();
      }
    }
    e.target.value = "";
  });

  document.getElementById("topicForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const titleVal = document.getElementById("topicFormTitle").value.trim();
    const descVal = document.getElementById("topicFormDesc").value.trim();

    if (!titleVal) {
      showToast("Por favor ingresa el título del tema.", "warning");
      document.getElementById("topicFormTitle").focus();
      return;
    }
    if (!descVal) {
      showToast("Por favor ingresa una breve descripción del tema.", "warning");
      document.getElementById("topicFormDesc").focus();
      return;
    }

    const editId = document.getElementById("topicFormId").value;
    const orderVal = Number(document.getElementById("topicFormOrder").value) || 1;
    const statusVal = document.getElementById("topicFormStatus").value;
    const hoursVal = document.getElementById("topicFormHours").value.trim();
    const conceptVal = document.getElementById("topicFormConceptual").value.trim();

    if (editId) {
      // Modificar existente sin duplicar
      const idx = appDB.topics.findIndex(t => t.id === editId);
      if (idx >= 0) {
        appDB.topics[idx].title = titleVal;
        appDB.topics[idx].order = orderVal;
        appDB.topics[idx].status = statusVal;
        appDB.topics[idx].estimatedHours = hoursVal;
        appDB.topics[idx].description = descVal;
        appDB.topics[idx].conceptualScheme = conceptVal;
        if (pendingTopicMapFile !== undefined) {
          appDB.topics[idx].mapFile = pendingTopicMapFile;
        }
      }
      showToast(`Tema "${titleVal}" actualizado correctamente.`, "success");
    } else {
      // Crear nuevo registro con ID único
      const newTopic = {
        id: generateUniqueId("tema"),
        order: orderVal,
        title: titleVal,
        status: statusVal,
        estimatedHours: hoursVal,
        description: descVal,
        conceptualScheme: conceptVal,
        mapFile: pendingTopicMapFile || null,
        definitions: [],
        formulas: [],
        files: []
      };
      appDB.topics.push(newTopic);
      showToast(`Tema "${titleVal}" registrado en el portafolio.`, "success");
    }

    saveDatabase();
    renderApp();
    closeModal("topicModal");
    if (editId && currentView === "detail" && activeDetailTopicId === editId) {
      renderTopicDetail(editId);
    }
  });

  // 10. FORMULARIO: DEFINICIÓN
  document.getElementById("definitionForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const termVal = document.getElementById("defFormTerm").value.trim();
    const defVal = document.getElementById("defFormDefinition").value.trim();
    const topicIdVal = document.getElementById("defFormTopicSelect").value;

    if (!termVal) {
      showToast("Por favor ingresa el término o concepto.", "warning");
      document.getElementById("defFormTerm").focus();
      return;
    }
    if (!defVal) {
      showToast("Por favor ingresa la definición.", "warning");
      document.getElementById("defFormDefinition").focus();
      return;
    }
    if (!topicIdVal) {
      showToast("Selecciona el tema correspondiente para esta definición.", "warning");
      document.getElementById("defFormTopicSelect").focus();
      return;
    }

    const editId = document.getElementById("defFormId").value;
    const topic = appDB.topics.find(t => t.id === topicIdVal);
    if (!topic) {
      showToast("No se encontró el tema seleccionado.", "error");
      return;
    }
    if (!topic.definitions) topic.definitions = [];

    if (editId) {
      // Actualizar definición existente
      let updated = false;
      for (const t of appDB.topics) {
        const dIdx = (t.definitions || []).findIndex(d => d.id === editId);
        if (dIdx >= 0) {
          if (t.id === topicIdVal) {
            t.definitions[dIdx].term = termVal;
            t.definitions[dIdx].definition = defVal;
          } else {
            // Se movió de tema
            t.definitions.splice(dIdx, 1);
            topic.definitions.push({ id: editId, term: termVal, definition: defVal });
          }
          updated = true;
          break;
        }
      }
      if (!updated) {
        topic.definitions.push({ id: editId, term: termVal, definition: defVal });
      }
      showToast(`Definición de "${termVal}" actualizada.`, "success");
    } else {
      // Crear nueva definición
      topic.definitions.push({
        id: generateUniqueId("def"),
        term: termVal,
        definition: defVal
      });
      showToast(`Definición de "${termVal}" agregada.`, "success");
    }

    saveDatabase();
    renderApp();
    closeModal("definitionModal");
    if (currentView === "detail" && activeDetailTopicId === topicIdVal) {
      renderTopicDetail(topicIdVal);
    }
  });

  // 11. FORMULARIO: FÓRMULA (CON VISTA PREVIA KATEX)
  document.getElementById("formulaFormLatex")?.addEventListener("input", (e) => {
    updateFormulaLivePreview(e.target.value);
  });

  document.getElementById("formulaForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameVal = document.getElementById("formulaFormName").value.trim();
    const latexVal = document.getElementById("formulaFormLatex").value.trim();
    const topicIdVal = document.getElementById("formulaFormTopicSelect").value;

    if (!nameVal) {
      showToast("Ingresa el nombre de la ecuación.", "warning");
      document.getElementById("formulaFormName").focus();
      return;
    }
    if (!latexVal) {
      showToast("Ingresa la expresión en código LaTeX.", "warning");
      document.getElementById("formulaFormLatex").focus();
      return;
    }
    if (!topicIdVal) {
      showToast("Selecciona el tema de la fórmula.", "warning");
      document.getElementById("formulaFormTopicSelect").focus();
      return;
    }

    const editId = document.getElementById("formulaFormId").value;
    const varsVal = document.getElementById("formulaFormVars").value.trim();
    const condVal = document.getElementById("formulaFormConditions").value.trim();
    const examVal = document.getElementById("formulaFormExample").value.trim();

    const topic = appDB.topics.find(t => t.id === topicIdVal);
    if (!topic) return;
    if (!topic.formulas) topic.formulas = [];

    const formulaData = {
      name: nameVal,
      latex: latexVal,
      variables: varsVal,
      conditions: condVal,
      example: examVal
    };

    if (editId) {
      // Actualizar sin duplicar
      let updated = false;
      for (const t of appDB.topics) {
        const fIdx = (t.formulas || []).findIndex(f => f.id === editId);
        if (fIdx >= 0) {
          if (t.id === topicIdVal) {
            t.formulas[fIdx] = { ...formulaData, id: editId };
          } else {
            t.formulas.splice(fIdx, 1);
            topic.formulas.push({ ...formulaData, id: editId });
          }
          updated = true;
          break;
        }
      }
      if (!updated) {
        topic.formulas.push({ ...formulaData, id: editId });
      }
      showToast(`Fórmula "${nameVal}" actualizada.`, "success");
    } else {
      topic.formulas.push({
        ...formulaData,
        id: generateUniqueId("form")
      });
      showToast(`Fórmula "${nameVal}" guardada exitosamente.`, "success");
    }

    saveDatabase();
    renderApp();
    closeModal("formulaModal");
    if (currentView === "detail" && activeDetailTopicId === topicIdVal) {
      renderTopicDetail(topicIdVal);
    }
  });

  // 12. FORMULARIO: PRÁCTICA
  document.getElementById("practiceFormFiles")?.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const read = await readFilesSafely(files);
      pendingPracticeFiles.push(...read);
      renderPendingFilesList("practiceFormFilesPreview", pendingPracticeFiles, "practice");
    }
    e.target.value = "";
  });

  document.getElementById("practiceForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const titleVal = document.getElementById("practiceFormTitle").value.trim();
    const objVal = document.getElementById("practiceFormObjectives").value.trim();

    if (!titleVal) {
      showToast("Ingresa el título de la práctica.", "warning");
      document.getElementById("practiceFormTitle").focus();
      return;
    }
    if (!objVal) {
      showToast("Ingresa los objetivos de la práctica.", "warning");
      document.getElementById("practiceFormObjectives").focus();
      return;
    }

    const editId = document.getElementById("practiceFormId").value;
    const practiceData = {
      title: titleVal,
      date: document.getElementById("practiceFormDate").value || "",
      topicId: document.getElementById("practiceFormTopicSelect").value || "",
      statement: document.getElementById("practiceFormStatement").value.trim(),
      objectives: objVal,
      materials: document.getElementById("practiceFormMaterials").value.trim(),
      data: document.getElementById("practiceFormData").value.trim(),
      procedure: document.getElementById("practiceFormProcedure").value.trim(),
      calculations: document.getElementById("practiceFormCalculations").value.trim(),
      results: document.getElementById("practiceFormResults").value.trim(),
      conclusions: document.getElementById("practiceFormConclusions").value.trim(),
      files: [...pendingPracticeFiles]
    };

    if (editId) {
      const idx = appDB.practices.findIndex(p => p.id === editId);
      if (idx >= 0) {
        appDB.practices[idx] = { ...practiceData, id: editId };
      }
      showToast(`Práctica "${titleVal}" actualizada.`, "success");
    } else {
      appDB.practices.push({
        ...practiceData,
        id: generateUniqueId("prac")
      });
      showToast(`Práctica "${titleVal}" registrada con éxito.`, "success");
    }

    saveDatabase();
    renderApp();
    closeModal("practiceModal");
    if (currentView === "detail" && activeDetailTopicId) {
      renderTopicDetail(activeDetailTopicId);
    }
  });

  // 13. FORMULARIO: TALLER
  document.getElementById("workshopFormFiles")?.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const read = await readFilesSafely(files);
      pendingWorkshopFiles.push(...read);
      renderPendingFilesList("workshopFormFilesPreview", pendingWorkshopFiles, "workshop");
    }
    e.target.value = "";
  });

  document.getElementById("workshopForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const titleVal = document.getElementById("workshopFormTitle").value.trim();
    const statVal = document.getElementById("workshopFormStatement").value.trim();
    const stepVal = document.getElementById("workshopFormStepByStep").value.trim();
    const ansVal = document.getElementById("workshopFormAnswer").value.trim();

    if (!titleVal) {
      showToast("Ingresa el título o número del taller.", "warning");
      document.getElementById("workshopFormTitle").focus();
      return;
    }
    if (!statVal) {
      showToast("Ingresa el enunciado del problema.", "warning");
      document.getElementById("workshopFormStatement").focus();
      return;
    }
    if (!stepVal) {
      showToast("Ingresa el procedimiento paso a paso.", "warning");
      document.getElementById("workshopFormStepByStep").focus();
      return;
    }
    if (!ansVal) {
      showToast("Ingresa la respuesta final con sus unidades.", "warning");
      document.getElementById("workshopFormAnswer").focus();
      return;
    }

    const editId = document.getElementById("workshopFormId").value;
    const workshopData = {
      title: titleVal,
      date: document.getElementById("workshopFormDate").value || "",
      topicId: document.getElementById("workshopFormTopicSelect").value || "",
      statement: statVal,
      formulas: document.getElementById("workshopFormFormulas").value.trim(),
      stepByStep: stepVal,
      finalAnswer: ansVal,
      verification: document.getElementById("workshopFormVerification").value.trim(),
      reflection: document.getElementById("workshopFormReflection").value.trim(),
      files: [...pendingWorkshopFiles]
    };

    if (editId) {
      const idx = appDB.workshops.findIndex(w => w.id === editId);
      if (idx >= 0) {
        appDB.workshops[idx] = { ...workshopData, id: editId };
      }
      showToast(`Taller "${titleVal}" actualizado.`, "success");
    } else {
      appDB.workshops.push({
        ...workshopData,
        id: generateUniqueId("tall")
      });
      showToast(`Taller "${titleVal}" registrado con éxito.`, "success");
    }

    saveDatabase();
    renderApp();
    closeModal("workshopModal");
    if (currentView === "detail" && activeDetailTopicId) {
      renderTopicDetail(activeDetailTopicId);
    }
  });

  // 14. FORMULARIO: PARCIAL
  document.getElementById("examFormFiles")?.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const read = await readFilesSafely(files);
      pendingExamFiles.push(...read);
      renderPendingFilesList("examFormFilesPreview", pendingExamFiles, "exam");
    }
    e.target.value = "";
  });

  document.getElementById("examForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const titleVal = document.getElementById("examFormTitle").value.trim();
    const statVal = document.getElementById("examFormStatement").value.trim();
    const origVal = document.getElementById("examFormOriginal").value.trim();
    const errVal = document.getElementById("examFormError").value.trim();
    const solVal = document.getElementById("examFormCorrectSolution").value.trim();
    const reflVal = document.getElementById("examFormReflection").value.trim();

    if (!titleVal) {
      showToast("Ingresa el nombre o número del parcial.", "warning");
      document.getElementById("examFormTitle").focus();
      return;
    }
    if (!statVal) {
      showToast("Ingresa el enunciado de la pregunta.", "warning");
      document.getElementById("examFormStatement").focus();
      return;
    }
    if (!origVal) {
      showToast("Describe el procedimiento original realizado.", "warning");
      document.getElementById("examFormOriginal").focus();
      return;
    }
    if (!errVal) {
      showToast("Describe el error identificado (diagnóstico).", "warning");
      document.getElementById("examFormError").focus();
      return;
    }
    if (!solVal) {
      showToast("Ingresa la solución correcta paso a paso.", "warning");
      document.getElementById("examFormCorrectSolution").focus();
      return;
    }
    if (!reflVal) {
      showToast("Ingresa la reflexión preventiva.", "warning");
      document.getElementById("examFormReflection").focus();
      return;
    }

    const editId = document.getElementById("examFormId").value;
    const examData = {
      title: titleVal,
      date: document.getElementById("examFormDate").value || "",
      topicId: document.getElementById("examFormTopicSelect").value || "",
      evaluatedContents: document.getElementById("examFormContents").value.trim(),
      statement: statVal,
      originalProcedure: origVal,
      identifiedError: errVal,
      correctSolution: solVal,
      verification: document.getElementById("examFormVerification").value.trim(),
      preventionReflection: reflVal,
      files: [...pendingExamFiles]
    };

    if (editId) {
      const idx = appDB.exams.findIndex(e => e.id === editId);
      if (idx >= 0) {
        appDB.exams[idx] = { ...examData, id: editId };
      }
      showToast(`Corrección "${titleVal}" actualizada.`, "success");
    } else {
      appDB.exams.push({
        ...examData,
        id: generateUniqueId("parc")
      });
      showToast(`Corrección "${titleVal}" guardada con éxito.`, "success");
    }

    saveDatabase();
    renderApp();
    closeModal("examModal");
    if (currentView === "detail" && activeDetailTopicId) {
      renderTopicDetail(activeDetailTopicId);
    }
  });

  // 15. FORMULARIO: METACOGNICIÓN
  document.getElementById("learningFormFiles")?.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const read = await readFilesSafely(files);
      pendingLearningFiles.push(...read);
      renderPendingFilesList("learningFormFilesPreview", pendingLearningFiles, "learning");
    }
    e.target.value = "";
  });

  document.getElementById("learningForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const titleVal = document.getElementById("learningFormTitle").value.trim();
    const diffVal = document.getElementById("learningFormDifficulty").value.trim();
    const learnVal = document.getElementById("learningFormWhatLearned").value.trim();

    if (!titleVal) {
      showToast("Ingresa el título de la situación.", "warning");
      document.getElementById("learningFormTitle").focus();
      return;
    }
    if (!diffVal) {
      showToast("Describe la dificultad encontrada.", "warning");
      document.getElementById("learningFormDifficulty").focus();
      return;
    }
    if (!learnVal) {
      showToast("Indica qué aprendiste superando este problema.", "warning");
      document.getElementById("learningFormWhatLearned").focus();
      return;
    }

    const editId = document.getElementById("learningFormId").value;
    const learningData = {
      title: titleVal,
      topicId: document.getElementById("learningFormTopicSelect").value || "",
      difficulty: diffVal,
      uncomprehendedConcept: document.getElementById("learningFormConcept").value.trim(),
      strategyUsed: document.getElementById("learningFormStrategy").value.trim(),
      helpfulResources: document.getElementById("learningFormResources").value.trim(),
      whatILearned: learnVal,
      howIVerified: document.getElementById("learningFormVerification").value.trim(),
      personalReflection: document.getElementById("learningFormReflection").value.trim(),
      files: [...pendingLearningFiles]
    };

    if (editId) {
      const idx = appDB.learnings.findIndex(l => l.id === editId);
      if (idx >= 0) {
        appDB.learnings[idx] = { ...learningData, id: editId };
      }
      showToast(`Situación de aprendizaje actualizada.`, "success");
    } else {
      appDB.learnings.push({
        ...learningData,
        id: generateUniqueId("learn")
      });
      showToast(`Situación de aprendizaje guardada con éxito.`, "success");
    }

    saveDatabase();
    renderApp();
    closeModal("learningModal");
    if (currentView === "detail" && activeDetailTopicId) {
      renderTopicDetail(activeDetailTopicId);
    }
  });

  // 16. FORMULARIO: PERFIL ACADÉMICO
  const openProfileModal = () => {
    const p = appDB.profile || DEFAULT_DB.profile;
    document.getElementById("inputStudentName").value = p.studentName || "";
    document.getElementById("inputUniversity").value = p.university || "";
    document.getElementById("inputCareer").value = p.career || "";
    document.getElementById("inputProfessor").value = p.professor || "";
    document.getElementById("inputSemester").value = p.semester || "";
    document.getElementById("inputObjectives").value = p.objectives || "";
    document.getElementById("inputPresentation").value = p.presentation || "";
    openModal("profileModal");
  };

  document.getElementById("editProfileBtn")?.addEventListener("click", openProfileModal);
  document.getElementById("sidebarEditProfileBtn")?.addEventListener("click", openProfileModal);
  document.getElementById("topbarProfileBtn")?.addEventListener("click", openProfileModal);

  document.getElementById("profileForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameVal = document.getElementById("inputStudentName").value.trim();
    if (!nameVal) {
      showToast("Ingresa el nombre del estudiante.", "warning");
      document.getElementById("inputStudentName").focus();
      return;
    }

    appDB.profile = {
      studentName: nameVal,
      university: document.getElementById("inputUniversity").value.trim(),
      career: document.getElementById("inputCareer").value.trim(),
      professor: document.getElementById("inputProfessor").value.trim(),
      semester: document.getElementById("inputSemester").value.trim(),
      objectives: document.getElementById("inputObjectives").value.trim(),
      presentation: document.getElementById("inputPresentation").value.trim()
    };

    saveDatabase();
    updateProfileUI();
    closeModal("profileModal");
    showToast("Datos académicos guardados exitosamente.", "success");
  });

  // 17. Confirmación y cierre de modales
  document.getElementById("confirmModalAcceptBtn")?.addEventListener("click", () => {
    if (currentConfirmAction) currentConfirmAction();
    closeConfirmDialog();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal.active").forEach(m => m.classList.remove("active"));
      closeMobileMenu();
    }
  });

  // 18. Exportar e importar respaldos JSON
  document.getElementById("sidebarExportBtn")?.addEventListener("click", exportBackupJSON);
  document.getElementById("exportBackupFullBtn")?.addEventListener("click", exportBackupJSON);

  const handleImportFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      importBackupJSON(e.target.files[0]);
      e.target.value = "";
    }
  };
  document.getElementById("sidebarImportFile")?.addEventListener("change", handleImportFile);
  document.getElementById("importBackupFullFile")?.addEventListener("change", handleImportFile);

  document.getElementById("restoreDefaultsBtn")?.addEventListener("click", restoreDefaultData);
  document.getElementById("clearAllDataBtn")?.addEventListener("click", clearAllData);

  // 19. Arranque inicial
  renderApp();
  console.log("Portafolio Digital de Física I v3.0 inicializado con éxito.");
});
