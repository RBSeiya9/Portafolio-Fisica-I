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

function createEmptyDatabase() {
  return {
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
}

function sanitizePortfolioDatabase(data) {
  const base = createEmptyDatabase();
  const source = data && typeof data === "object" ? data : {};

  return {
    version: 3,
    profile: {
      ...base.profile,
      ...(source.profile && typeof source.profile === "object" ? source.profile : {})
    },
    topics: Array.isArray(source.topics) ? source.topics.filter(Boolean) : [],
    practiceFiles: Array.isArray(source.practiceFiles) ? source.practiceFiles.filter(Boolean) : [],
    workshops: Array.isArray(source.workshops) ? source.workshops.filter(Boolean) : [],
    exams: Array.isArray(source.exams) ? source.exams.filter(Boolean) : [],
    learnings: Array.isArray(source.learnings) ? source.learnings.filter(Boolean) : []
  };
}

function resolveBootstrapDatabase() {
  if (typeof window !== "undefined" && window.PORTAFOLIO_SEED) {
    return sanitizePortfolioDatabase(window.PORTAFOLIO_SEED);
  }
  return createEmptyDatabase();
}

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
    const db = await this.init();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        store.put({ id, name, type, size, data, updatedAt: Date.now() });
        tx.oncomplete = () => {
          this._cache.set(id, data);
          resolve(true);
        };
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  async saveBlob(id, name, type, size, blob) {
    const db = await this.init();
    if (!db || !(blob instanceof Blob)) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, "readwrite");
        tx.objectStore(this.storeName).put({ id, name, type, size, blob, updatedAt: Date.now() });
        tx.oncomplete = () => {
          this._cache.set(id, blob);
          resolve(true);
        };
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
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

  async getBlob(id) {
    const cached = this._cache.get(id);
    if (cached instanceof Blob) return cached;
    const db = await this.init();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, "readonly");
        const request = tx.objectStore(this.storeName).get(id);
        request.onsuccess = () => {
          const record = request.result;
          if (record?.blob instanceof Blob) {
            this._cache.set(id, record.blob);
            resolve(record.blob);
          } else if (record?.data instanceof Blob) {
            this._cache.set(id, record.data);
            resolve(record.data);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
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

  async deleteFiles(ids) {
    const uniqueIds = [...new Set((ids || []).filter(Boolean))];
    const results = await Promise.all(uniqueIds.map(id => this.deleteFile(id)));
    return results.every(Boolean);
  },

  async clear() {
    this._cache.clear();
    const db = await this.init();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, "readwrite");
        tx.objectStore(this.storeName).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
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

function sanitizeImportedId(value) {
  if (typeof value !== "string") return "";
  return value.trim().match(/^[\w-]+$/) ? value.trim() : "";
}

function isSafeAssetUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("blob:")) return true;
  if (/^data:(image\/(png|jpeg|jpg|webp|gif|avif|bmp)|application\/pdf)(;base64)?,/i.test(trimmed)) return true;
  if (/^assets\//i.test(trimmed)) return true;
  return false;
}

function safeObjectUrl(data, fallback = "") {
  if (!data || typeof data !== "string") return fallback;
  if (isSafeAssetUrl(data)) return data;
  return fallback;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const SUPPORTED_UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const renderedFileObjectUrls = new Set();

function createTrackedObjectUrl(blob) {
  const url = URL.createObjectURL(blob);
  renderedFileObjectUrls.add(url);
  return url;
}

function revokeRenderedObjectUrls() {
  renderedFileObjectUrls.forEach(url => URL.revokeObjectURL(url));
  renderedFileObjectUrls.clear();
}

function inferSupportedFileType(file) {
  const extension = String(file?.name || "").split(".").pop().toLowerCase();
  const byExtension = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    pdf: "application/pdf"
  };
  const type = String(file?.type || "").toLowerCase();
  return SUPPORTED_UPLOAD_TYPES.has(type) ? type : (byExtension[extension] || "");
}

async function processUploadFile(file, imagesOnly = false) {
  const type = inferSupportedFileType(file);
  if (!type || (imagesOnly && type === "application/pdf")) {
    throw new Error("Formato no admitido. Usa PNG, JPG/JPEG, WEBP o PDF.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("El archivo supera el máximo permitido de 10 MB.");
  }

  if (type === "application/pdf") {
    return { blob: file.slice(0, file.size, type), type, size: file.size };
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (error) {
    throw new Error("No se pudo leer la imagen seleccionada.");
  }

  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) {
    bitmap.close?.();
    return { blob: file.slice(0, file.size, type), type, size: file.size };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob) throw new Error("No se pudo optimizar la imagen.");
  return { blob, type: blob.type || "image/webp", size: blob.size };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("No se pudo preparar el archivo para el respaldo."));
    reader.readAsDataURL(blob);
  });
}

function getReferencedFileIds(database = appDB) {
  const ids = [];
  (database.practiceFiles || []).forEach(file => {
    if (!file.assetPath) ids.push(file.fileId || file.id);
  });
  for (const topic of database.topics || []) {
    for (const section of ["definitions", "formulas", "metacognition", "evidencias"]) {
      for (const card of topic[section] || []) if (card.imageFileId) ids.push(card.imageFileId);
    }
  }
  for (const record of [...(database.workshops || []), ...(database.exams || []), ...(database.learnings || [])]) {
    (record.files || []).forEach(file => {
      if (!file.assetPath) ids.push(file.fileId || file.id);
    });
  }
  return [...new Set(ids.filter(Boolean))];
}

function dataUrlToBlob(dataUrl, fallbackType = "application/octet-stream") {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) return null;
  const metadata = dataUrl.slice(5, commaIndex);
  const mimeType = metadata.split(";")[0] || fallbackType;
  const payload = dataUrl.slice(commaIndex + 1);
  try {
    if (/;base64/i.test(metadata)) {
      const binary = atob(payload);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      return new Blob([bytes], { type: mimeType });
    }
    return new Blob([decodeURIComponent(payload)], { type: mimeType });
  } catch (error) {
    return null;
  }
}

async function migrateEmbeddedFilesToIndexedDB(database = appDB) {
  const sourceDatabase = database;
  const workingDatabase = structuredClone(database);
  let changed = false;
  const persistLegacyData = async (record, dataKey, fileIdKey, nameKey, typeKey) => {
    const data = record[dataKey];
    if (typeof data !== "string") return;
    if (data.startsWith("assets/")) {
      record.assetPath = data;
      delete record[dataKey];
      changed = true;
      return;
    }
    if (!data.startsWith("data:")) return;
    const blob = dataUrlToBlob(data, record[typeKey]);
    if (!blob) throw new Error(`No se pudo migrar el archivo "${record[nameKey] || "adjunto"}".`);
    const fileId = record[fileIdKey] || record.id || generateUniqueId("file");
    const type = blob.type || record[typeKey] || "application/octet-stream";
    const saved = await FileStorage.saveBlob(fileId, record[nameKey] || "archivo", type, blob.size, blob);
    if (!saved) throw new Error(`No se pudo guardar "${record[nameKey] || "adjunto"}" en IndexedDB; los datos originales se conservaron.`);
    record[fileIdKey] = fileId;
    record[typeKey] = type;
    delete record[dataKey];
    changed = true;
  };

  for (const topic of workingDatabase.topics || []) {
    for (const section of ["definitions", "formulas", "metacognition", "evidencias"]) {
      for (const card of topic[section] || []) {
        if (typeof card.imageData === "string" && card.imageData.startsWith("assets/")) {
          card.imageAsset = card.imageData;
          delete card.imageData;
          changed = true;
        } else if (typeof card.imageData === "string" && card.imageData.startsWith("data:")) {
          await persistLegacyData(card, "imageData", "imageFileId", "imageName", "imageType");
        }
      }
    }
  }

  for (const record of workingDatabase.practiceFiles || []) {
    if (typeof record.data === "string" && (record.data.startsWith("data:") || record.data.startsWith("assets/"))) {
      record.fileId = record.fileId || record.id || generateUniqueId("file");
      await persistLegacyData(record, "data", "fileId", "name", "type");
    }
  }

  for (const record of [...(workingDatabase.workshops || []), ...(workingDatabase.exams || []), ...(workingDatabase.learnings || [])]) {
    for (const attachment of record.files || []) {
      if (typeof attachment.data === "string" && (attachment.data.startsWith("data:") || attachment.data.startsWith("assets/"))) {
        await persistLegacyData(attachment, "data", "fileId", "name", "type");
      }
    }
  }

  if (changed) {
    if (sourceDatabase === appDB) {
      const previousDatabase = appDB;
      appDB = workingDatabase;
      if (!saveDatabase()) {
        appDB = previousDatabase;
        throw new Error("Los archivos se copiaron a IndexedDB, pero no se pudo guardar la migración en LocalStorage.");
      }
    } else {
      for (const key of Object.keys(sourceDatabase)) delete sourceDatabase[key];
      Object.assign(sourceDatabase, workingDatabase);
    }
  }
  return changed;
}

async function saveUploadedFile(file, imagesOnly = false, existingFileId = null) {
  const processed = await processUploadFile(file, imagesOnly);
  const fileId = existingFileId || generateUniqueId("file");
  const saved = await FileStorage.saveBlob(fileId, file.name, processed.type, processed.size, processed.blob);
  if (!saved) throw new Error("No se pudo guardar el archivo en IndexedDB. Comprueba el espacio disponible y vuelve a intentarlo.");
  return { fileId, name: file.name, type: processed.type, size: processed.size, blob: processed.blob };
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
    professor: "Dr. Carlos E. Mendoza",
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
          imageAsset: "assets/imagenes/mapa_vectores.svg",
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
          imageAsset: "assets/evidencias/correccion_parcial_tiro.svg",
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
          imageAsset: "assets/evidencias/dcl_plano_inclinado.svg",
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
      assetPath: "assets/imagenes/laboratorio_fotopuertas.svg"
    },
    {
      id: "pfile-2",
      name: "guia_practica_mesa_fuerzas.svg",
      type: "image/svg+xml",
      size: 18400,
      uploadDate: "2026-03-12",
      assetPath: "assets/evidencias/dcl_plano_inclinado.svg"
    },
    {
      id: "pfile-3",
      name: "informe_segunda_ley_newton.svg",
      type: "image/svg+xml",
      size: 21100,
      uploadDate: "2026-04-09",
      assetPath: "assets/imagenes/mapa_vectores.svg"
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

function migrateLegacyStorageIfNeeded() {
  if (localStorage.getItem(STORAGE_KEY_DB)) return true;

  const legacyProfileRaw = localStorage.getItem(LEGACY_STORAGE_KEY_PROFILE);
  const legacyTopicsRaw = localStorage.getItem(LEGACY_STORAGE_KEY_TOPICS);

  if (!legacyProfileRaw && !legacyTopicsRaw) {
    const emptySeed = resolveBootstrapDatabase();
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(emptySeed));
    return true;
  }

  try {
    const migrated = sanitizePortfolioDatabase(DEFAULT_DB);
    const legacyProfile = legacyProfileRaw ? JSON.parse(legacyProfileRaw) : null;
    const legacyTopics = legacyTopicsRaw ? JSON.parse(legacyTopicsRaw) : [];

    if (legacyProfile && typeof legacyProfile === "object") {
      migrated.profile = { ...migrated.profile, ...legacyProfile };
    }

    if (Array.isArray(legacyTopics) && legacyTopics.length > 0) {
      migrated.topics = legacyTopics.map((topic, index) => ({
        ...structuredClone(DEFAULT_DB.topics[0] || {}),
        ...topic,
        id: topic.id || generateUniqueId("tema"),
        order: typeof topic.order === "number" ? topic.order : index + 1,
        definitions: Array.isArray(topic.definitions) ? topic.definitions : [],
        formulas: Array.isArray(topic.formulas) ? topic.formulas : [],
        metacognition: Array.isArray(topic.metacognition) ? topic.metacognition : [],
        evidencias: Array.isArray(topic.evidencias) ? topic.evidencias : []
      }));
    }

    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(migrated));
    return true;
  } catch (err) {
    console.warn("No fue posible migrar datos antiguos de LocalStorage:", err);
    const emptySeed = resolveBootstrapDatabase();
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(emptySeed));
    return false;
  }
}

function loadDatabase() {
  try {
    migrateLegacyStorageIfNeeded();
    const raw = localStorage.getItem(STORAGE_KEY_DB);
    if (raw) {
      const parsed = JSON.parse(raw);
      const normalized = sanitizePortfolioDatabase(parsed);
      if (!normalized.profile.name && !normalized.profile.career && !normalized.profile.university && !normalized.profile.professor && !normalized.profile.term && normalized.topics.length === 0 && normalized.workshops.length === 0 && normalized.exams.length === 0 && normalized.learnings.length === 0 && normalized.practiceFiles.length === 0) {
        const seed = resolveBootstrapDatabase();
        localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(seed));
        return seed;
      }
      return normalized;
    }

    const initial = resolveBootstrapDatabase();
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(initial));
    return initial;
  } catch (err) {
    console.error("Error al cargar la base de datos:", err);
    return createEmptyDatabase();
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
      showToast("LocalStorage está lleno; no se pudieron guardar los cambios del portafolio. Exporta un respaldo y libera espacio.", "error");
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

async function updateStorageMeter() {
  try {
    let totalBytes = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalBytes += (localStorage[key].length + key.length) * 2;
      }
    }
    let usage = totalBytes;
    let quota = 0;
    let detail = `Uso local: ${formatBytes(totalBytes)}. Cuota del navegador no disponible.`;
    if (navigator.storage && typeof navigator.storage.estimate === "function") {
      const estimate = await navigator.storage.estimate();
      usage = Number(estimate.usage) || totalBytes;
      quota = Number(estimate.quota) || 0;
      detail = quota
        ? `Uso: ${formatBytes(usage)} de ${formatBytes(quota)} (${Math.min(100, Math.round((usage / quota) * 100))}%).`
        : `Uso del navegador: ${formatBytes(usage)}. Cuota no disponible.`;
    }
    const percentage = quota ? Math.min(100, Math.max(1, Math.round((usage / quota) * 100))) : 1;
    const usedText = quota ? `${formatBytes(usage)} / ${formatBytes(quota)}` : `${formatBytes(usage)} usados`;
    const sideText = document.getElementById("storageUsedText");
    const sideBar = document.getElementById("storageUsedBar");
    const detUsed = document.getElementById("storageDetailUsed");
    const detBar = document.getElementById("storageDetailBar");

    if (sideText) sideText.textContent = usedText;
    if (sideBar) sideBar.style.width = `${percentage}%`;
    if (detUsed) detUsed.textContent = detail;
    if (detBar) detBar.style.width = `${percentage}%`;
  } catch (e) {
    console.warn("Error en monitor de almacenamiento:", e);
  }
}

function getTopicTitleById(topicId) {
  if (!topicId) return "";
  const t = (appDB && appDB.topics) ? appDB.topics.find(x => x.id === topicId) : null;
  return t ? t.title : "";
}

// ============================================================================
// CONTROLADOR DE NAVEGACIÓN ENTRE VISTAS
// ============================================================================

function navigateToView(viewName) {
  flushAutoSave();
  revokeRenderedObjectUrls();
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
  const p = appDB.profile || {};
  const avatar = document.getElementById("sidebarAvatar");
  const name = document.getElementById("sidebarStudentName");
  const meta = document.getElementById("sidebarStudentMeta");

  if (name) name.textContent = p.name || "Estudiante";
  if (meta) meta.textContent = `${p.career || "Física I"} · ${p.term || "2026-I"}`;
  if (avatar) {
    const initials = (p.name || "E").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    avatar.textContent = initials || "AM";
  }

  // Tarjeta de perfil en el Inicio (Dashboard)
  const sName = document.getElementById("profileStudentName");
  const sCareer = document.getElementById("profileCareer");
  const sUniv = document.getElementById("profileUniversity");
  const sProf = document.getElementById("profileProfessor");
  const sSem = document.getElementById("profileSemester");
  const sObj = document.getElementById("profileObjectives");
  const sPres = document.getElementById("profilePresentation");

  if (sName) sName.textContent = p.name || "Estudiante";
  if (sCareer) sCareer.textContent = p.career || "Ingeniería Mecánica";
  if (sUniv) sUniv.textContent = p.university || "Facultad de Ingeniería";
  if (sProf) sProf.textContent = p.professor || "Dr. Carlos E. Mendoza";
  if (sSem) sSem.textContent = p.term || "2026-I";
  if (sObj) sObj.textContent = p.goals || "Sin objetivos registrados.";
  if (sPres) sPres.textContent = p.bio || "Sin presentación registrada.";
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
  revokeRenderedObjectUrls();
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
  hydrateAcademicCardImages(container);

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
  const assetImage = typeof card.imageAsset === "string" && card.imageAsset.startsWith("assets/") ? card.imageAsset : "";
  const hasImage = Boolean(card.imageFileId || assetImage);
  const hasTitle = Boolean(card.title && card.title.trim());
  const hasText = Boolean(card.text && card.text.trim());
  const hasLatex = Boolean(card.latex && card.latex.trim());

  let imageBlock = "";
  if (hasImage) {
    imageBlock = `
      <div class="card-media-wrap" onclick="openCardImageViewer('${escapeHTML(topicId)}', '${section}', '${escapeHTML(card.id)}')">
        <img ${assetImage ? `src="${escapeHTML(assetImage)}"` : `data-image-file-id="${escapeHTML(card.imageFileId)}"`} alt="${escapeHTML(card.title || 'Evidencia')}" loading="lazy">
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

async function hydrateAcademicCardImages(container) {
  if (!container) return;
  for (const image of container.querySelectorAll("img[data-image-file-id]")) {
    const blob = await FileStorage.getBlob(image.dataset.imageFileId);
    if (blob && image.isConnected) image.src = createTrackedObjectUrl(blob);
  }
}

// ============================================================================
// MODAL EDITOR DE TARJETA FLEXIBLE CON GUARDADO EN TIEMPO REAL
// ============================================================================

let currentActiveCard = null;
let isNewCard = false;
let currentActiveCardContext = { topicId: null, section: null };
let cardEditorImageObjectUrl = null;
let pendingCardFileDeletes = [];

function openCardModal(section, cardId = null, topicId = null) {
  pendingCardFileDeletes = [];
  const topic = appDB.topics.find(t => t.id === topicId);
  if (!topic) return;

  if (!Array.isArray(topic[section])) topic[section] = [];

  let card = null;
  if (cardId) {
    const existing = topic[section].find(c => c.id === cardId);
    if (existing) {
      card = existing;
      isNewCard = false;
    }
  }

  if (!card) {
    isNewCard = true;
    card = {
      id: generateUniqueId("card"),
      title: "",
      text: "",
      latex: "",
      imageAsset: null,
      imageFileId: null,
      imageName: null
    };
  }

  currentActiveCard = card;
  currentActiveCardContext = { topicId, section };

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
  document.getElementById("cardEditorModalTitle").textContent = isNewCard
    ? `Nueva Tarjeta (${icons[section] || 'Académica'})`
    : `Editar Tarjeta (${icons[section] || 'Académica'})`;

  renderCardEditorImageUI();

  // Enlazar eventos de borrador al escribir
  titleInput.oninput = () => {
    currentActiveCard.title = titleInput.value;
  };

  textInput.oninput = () => {
    currentActiveCard.text = textInput.value;
  };

  latexInput.oninput = () => {
    currentActiveCard.latex = latexInput.value;
    updateCardEditorLatexPreview(currentActiveCard.latex);
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
    if (currentActiveCard.imageFileId) pendingCardFileDeletes.push(currentActiveCard.imageFileId);
    currentActiveCard.imageAsset = null;
    currentActiveCard.imageData = null;
    currentActiveCard.imageFileId = null;
    currentActiveCard.imageName = null;
    currentActiveCard.imageType = null;
    renderCardEditorImageUI();
    showToast("Imagen eliminada de la tarjeta.", "info");
  };

  // Botón para eliminar tarjeta
  const deleteBtn = document.getElementById("cardEditorDeleteBtn");
  if (deleteBtn) {
    if (isNewCard) {
      deleteBtn.style.display = "none";
    } else {
      deleteBtn.style.display = "inline-flex";
      deleteBtn.onclick = () => {
        closeModal("cardEditorModal");
        confirmDelete("card", card.id, { topicId, section });
      };
    }
  }

  openModal("cardEditorModal");
}

async function saveCardEditorChanges() {
  const { topicId, section } = currentActiveCardContext;
  if (!topicId || !section || !currentActiveCard) {
    closeModal("cardEditorModal");
    return;
  }
  const topic = appDB.topics.find(t => t.id === topicId);
  if (!topic) {
    closeModal("cardEditorModal");
    return;
  }
  if (!Array.isArray(topic[section])) topic[section] = [];

  const titleInput = document.getElementById("cardEditorTitle");
  const textInput = document.getElementById("cardEditorText");
  const latexInput = document.getElementById("cardEditorLatex");

  if (titleInput) currentActiveCard.title = titleInput.value.trim();
  if (textInput) currentActiveCard.text = textInput.value.trim();
  if (latexInput && section === "formulas") currentActiveCard.latex = latexInput.value.trim();

  const hasContent = Boolean(
    (currentActiveCard.title && currentActiveCard.title.trim()) ||
    (currentActiveCard.text && currentActiveCard.text.trim()) ||
    (section === "formulas" && currentActiveCard.latex && currentActiveCard.latex.trim()) ||
    currentActiveCard.imageAsset || currentActiveCard.imageData || currentActiveCard.imageFileId
  );

  if (isNewCard) {
    if (hasContent) {
      topic[section].push(currentActiveCard);
    } else {
      showToast("La tarjeta no contiene información y no fue creada.", "info");
      closeModal("cardEditorModal");
      return;
    }
  }

  saveDatabase();
  if (pendingCardFileDeletes.length) {
    const deleted = await FileStorage.deleteFiles(pendingCardFileDeletes);
    if (!deleted) showToast("La tarjeta se guardó, pero no se pudieron limpiar todos los archivos antiguos.", "error");
  }
  pendingCardFileDeletes = [];
  closeModal("cardEditorModal");
  renderTopicDetail(topicId);
  updateNavBadges();
  showToast("✓ Tarjeta guardada correctamente.", "success");
}

async function renderCardEditorImageUI() {
  const currentWrap = document.getElementById("cardEditorImageCurrentWrap");
  const uploadWrap = document.getElementById("cardEditorImageUploadWrap");
  const previewImg = document.getElementById("cardEditorImageCurrentPreview");

  if (cardEditorImageObjectUrl) {
    URL.revokeObjectURL(cardEditorImageObjectUrl);
    renderedFileObjectUrls.delete(cardEditorImageObjectUrl);
    cardEditorImageObjectUrl = null;
  }

  const assetImage = currentActiveCard?.imageAsset?.startsWith("assets/") ? currentActiveCard.imageAsset : "";
  if (currentActiveCard && (currentActiveCard.imageFileId || assetImage)) {
    if (assetImage) {
      previewImg.src = assetImage;
    } else {
      const blob = await FileStorage.getBlob(currentActiveCard.imageFileId);
      if (!blob) {
        showToast("No se encontró la imagen guardada en IndexedDB.", "error");
        return;
      }
      cardEditorImageObjectUrl = createTrackedObjectUrl(blob);
      previewImg.src = cardEditorImageObjectUrl;
    }
    currentWrap.classList.remove("hidden");
    uploadWrap.classList.add("hidden");
  } else {
    currentWrap.classList.add("hidden");
    uploadWrap.classList.remove("hidden");
  }
}

async function handleCardImageUpload(file) {
  if (!file || !currentActiveCard) return;
  try {
    const uploaded = await saveUploadedFile(file, true);
    if (currentActiveCard.imageFileId) pendingCardFileDeletes.push(currentActiveCard.imageFileId);
    currentActiveCard.imageFileId = uploaded.fileId;
    currentActiveCard.imageAsset = null;
    currentActiveCard.imageData = null;
    currentActiveCard.imageName = uploaded.name;
    currentActiveCard.imageType = uploaded.type;
    await renderCardEditorImageUI();
    scheduleAutoSave(0);
    showToast(`✓ Imagen "${file.name}" adjuntada y guardada.`, "success");
  } catch (error) {
    showToast(error.message, "error");
  }
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

  // Botón para alternar visibilidad de la zona de arrastre
  const toggleBtn = document.getElementById("togglePracticeDropzoneBtn");
  if (toggleBtn && !toggleBtn._hasListener) {
    toggleBtn._hasListener = true;
    toggleBtn.onclick = () => {
      dropzone.classList.toggle("visible");
      const isVis = dropzone.classList.contains("visible");
      toggleBtn.classList.toggle("active", isVis);
      toggleBtn.textContent = isVis ? "✕ Ocultar zona de arrastre" : "📂 Zona de arrastre";
    };
  }

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
  return (async () => {
    for (const file of Array.from(fileList)) {
      try {
        const uploaded = await saveUploadedFile(file);
        if (!Array.isArray(appDB.practiceFiles)) appDB.practiceFiles = [];
        appDB.practiceFiles.unshift({
          id: generateUniqueId("practice"),
          fileId: uploaded.fileId,
          name: uploaded.name,
          type: uploaded.type,
          size: uploaded.size,
          uploadDate: new Date().toISOString().slice(0, 10)
        });
        showToast(`✓ Archivo "${file.name}" subido y guardado.`, "success");
      } catch (error) {
        showToast(`No se cargó "${file.name}": ${error.message}`, "error");
      }
    }
    saveDatabase();
    renderPracticasFilesList();
    updateNavBadges();
  })();
}

function renderPracticasFilesList() {
  revokeRenderedObjectUrls();
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
        <div class="practice-file-thumb" onclick="openPracticeViewer('${escapeHTML(f.id)}')">
          <span class="file-type-pill ${isPdf ? 'pdf' : ''}">${isPdf ? 'PDF' : 'IMAGEN'}</span>
          ${isImage ? `
            <img ${f.fileId ? `data-practice-file-id="${escapeHTML(f.fileId)}"` : `src="${escapeHTML(f.assetPath || 'assets/imagenes/laboratorio_fotopuertas.svg')}"`} alt="${escapeHTML(f.name)}" loading="lazy">
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
            <button class="btn btn-primary btn-sm" onclick="openPracticeViewer('${escapeHTML(f.id)}')">
              👁 Abrir
            </button>
            <button class="btn btn-outline btn-sm" onclick="downloadPracticeFile('${escapeHTML(f.id)}')">
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
  hydratePracticeImages(grid);
}

async function hydratePracticeImages(grid) {
  if (!grid) return;
  for (const image of grid.querySelectorAll("img[data-practice-file-id]")) {
    const blob = await FileStorage.getBlob(image.dataset.practiceFileId);
    if (blob && image.isConnected) image.src = createTrackedObjectUrl(blob);
  }
}

function replacePracticeFile(fileId, newFile) {
  if (!newFile) return;
  const fileRecord = appDB.practiceFiles.find(f => f.id === fileId);
  if (!fileRecord) return;

  saveUploadedFile(newFile, false, fileRecord.fileId || fileRecord.id).then(uploaded => {
    fileRecord.fileId = uploaded.fileId;
    fileRecord.name = uploaded.name;
    fileRecord.type = uploaded.type;
    fileRecord.size = uploaded.size;
    fileRecord.uploadDate = new Date().toISOString().slice(0, 10);
    delete fileRecord.data;
    saveDatabase();
    renderPracticasFilesList();
    showToast(`✓ Archivo reemplazado por "${newFile.name}".`, "success");
  }).catch(error => showToast(error.message, "error"));
}

function downloadFileDirectly(filename, fileOrUrl) {
  if (!fileOrUrl) {
    showToast("Archivo no disponible para descarga local directa.", "info");
    return;
  }
  const a = document.createElement("a");
  const generatedUrl = fileOrUrl instanceof Blob ? URL.createObjectURL(fileOrUrl) : "";
  a.href = generatedUrl || fileOrUrl;
  a.download = filename || "archivo_practica";
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (generatedUrl) setTimeout(() => URL.revokeObjectURL(generatedUrl), 1000);
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
      (w.title && w.title.toLowerCase().includes(filters.workshopsSearch.toLowerCase())) ||
      (w.reflection && w.reflection.toLowerCase().includes(filters.workshopsSearch.toLowerCase()));
    const matchTopic = filters.workshopsTopic === "all" || w.topicId === filters.workshopsTopic;
    return matchSearch && matchTopic;
  });

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
  } else {
    if (empty) empty.classList.add("hidden");
    grid.innerHTML = filtered.map(w => {
      const topicTitle = w.topicId ? getTopicTitleById(w.topicId) : "";
      return `
      <div class="activity-card" id="workshop-el-${escapeHTML(w.id)}">
        <div class="activity-card-top">
          <span class="activity-type-badge taller">📝 Taller</span>
          <span class="activity-date">${escapeHTML(w.date || '')}</span>
        </div>
        ${topicTitle ? `<div class="activity-card-topic">${escapeHTML(topicTitle)}</div>` : ''}
        <h3 class="activity-card-title">${escapeHTML(w.title)}</h3>
        ${w.reflection ? `<p class="activity-card-snippet">${escapeHTML(w.reflection)}</p>` : ''}
        <div class="activity-card-footer">
          <button class="btn btn-primary btn-sm" onclick="openItemViewerModal('workshop', '${escapeHTML(w.id)}')">
            Ver taller
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
    `;
    }).join("");
  }
}

function setupModalFilesAttachment(inputElId, previewElId, item) {
  const input = document.getElementById(inputElId);
  const preview = document.getElementById(previewElId);
  if (!input || !preview || !item) return;

  if (!Array.isArray(item.files)) item.files = [];

  const renderPreviews = () => {
    if (!item.files || item.files.length === 0) {
      preview.innerHTML = "";
      return;
    }
    preview.innerHTML = item.files.map((f, idx) => `
      <div class="attached-file-pill" style="display: inline-flex; align-items: center; gap: 8px; background: #e2e8f0; padding: 4px 10px; border-radius: 6px; font-size: 12px; margin: 4px 4px 4px 0;">
        <span>📎 ${escapeHTML(f.name)} (${formatBytes(f.size)})</span>
        <button type="button" class="remove-attach-btn" data-index="${idx}" style="background: none; border: none; cursor: pointer; color: #ef4444; font-weight: bold;" title="Quitar archivo">✕</button>
      </div>
    `).join("");

    preview.querySelectorAll(".remove-attach-btn").forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const index = parseInt(btn.getAttribute("data-index"), 10);
        const removed = item.files[index];
        if (removed?.fileId || removed?.id) {
          FileStorage.deleteFile(removed.fileId || removed.id).then(deleted => {
            if (!deleted) {
              showToast("No se pudo borrar el adjunto de IndexedDB; sigue asociado al registro.", "error");
              return;
            }
            item.files.splice(index, 1);
            renderPreviews();
            scheduleAutoSave(0);
          });
          return;
        }
        item.files.splice(index, 1);
        renderPreviews();
        scheduleAutoSave(0);
      };
    });
  };

  renderPreviews();

  input.onchange = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    Array.from(e.target.files).forEach(file => {
      saveUploadedFile(file).then(uploaded => {
        item.files.push({
          id: generateUniqueId("attachment"),
          fileId: uploaded.fileId,
          name: uploaded.name,
          type: uploaded.type,
          size: uploaded.size
        });
        renderPreviews();
        scheduleAutoSave(0);
        showToast(`Archivo "${file.name}" adjuntado.`, "success");
      }).catch(error => showToast(`No se adjuntó "${file.name}": ${error.message}`, "error"));
    });
    input.value = "";
  };
}

let activeEditingWorkshop = null;
let isNewWorkshop = false;

function openWorkshopModal(workshopId = null) {
  let item = null;
  if (workshopId) {
    const existing = appDB.workshops.find(w => w.id === workshopId);
    if (existing) {
      item = existing;
      isNewWorkshop = false;
    }
  }

  if (!item) {
    isNewWorkshop = true;
    item = {
      id: generateUniqueId("tall"),
      topicId: "",
      title: "",
      date: new Date().toISOString().slice(0, 10),
      reflection: "",
      files: []
    };
  }

  activeEditingWorkshop = item;

  const existingWorkshopIndex = isNewWorkshop ? -1 : appDB.workshops.findIndex(w => w.id === item.id);

  document.getElementById("workshopModalTitle").textContent = isNewWorkshop ? "Registrar Nuevo Taller" : "Editar Taller";
  document.getElementById("workshopFormId").value = item.id;
  document.getElementById("workshopFormTitle").value = item.title || "";
  document.getElementById("workshopFormDate").value = item.date || new Date().toISOString().slice(0, 10);
  document.getElementById("workshopFormTopicSelect").value = item.topicId || "";
  document.getElementById("workshopFormReflection").value = item.reflection || "";

  setupModalFilesAttachment("workshopFormFiles", "workshopFormFilesPreview", item);

  const form = document.getElementById("workshopForm");
  form.onsubmit = (e) => {
    e.preventDefault();
    const titleVal = document.getElementById("workshopFormTitle").value.trim();
    if (!titleVal) {
      showToast("Ingresa un título para el taller.", "error");
      document.getElementById("workshopFormTitle").focus();
      return;
    }
    item.title = titleVal;
    item.date = document.getElementById("workshopFormDate").value;
    item.topicId = document.getElementById("workshopFormTopicSelect").value;
    item.reflection = document.getElementById("workshopFormReflection").value;

    if (isNewWorkshop) {
      appDB.workshops.unshift(item);
    } else {
      const index = appDB.workshops.findIndex(w => w.id === item.id);
      if (index >= 0) {
        appDB.workshops[index] = { ...appDB.workshops[index], ...item };
      }
    }

    saveDatabase();
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
      (e.title && e.title.toLowerCase().includes(filters.examsSearch.toLowerCase())) ||
      (e.evaluatedContents && e.evaluatedContents.toLowerCase().includes(filters.examsSearch.toLowerCase())) ||
      (e.preventionReflection && e.preventionReflection.toLowerCase().includes(filters.examsSearch.toLowerCase()));
    const matchTopic = filters.examsTopic === "all" || e.topicId === filters.examsTopic;
    return matchSearch && matchTopic;
  });

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
  } else {
    if (empty) empty.classList.add("hidden");
    grid.innerHTML = filtered.map(e => {
      const topicTitle = e.topicId ? getTopicTitleById(e.topicId) : "";
      return `
      <div class="activity-card" id="exam-el-${escapeHTML(e.id)}">
        <div class="activity-card-top">
          <span class="activity-type-badge parcial">🎯 Parcial</span>
          <span class="activity-date">${escapeHTML(e.date || '')}</span>
        </div>
        ${topicTitle ? `<div class="activity-card-topic">${escapeHTML(topicTitle)}</div>` : ''}
        <h3 class="activity-card-title">${escapeHTML(e.title)}</h3>
        ${e.evaluatedContents ? `<p class="activity-card-snippet"><strong>Contenidos:</strong> ${escapeHTML(e.evaluatedContents)}</p>` : ''}
        ${e.preventionReflection ? `<p class="activity-card-snippet">${escapeHTML(e.preventionReflection)}</p>` : ''}
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
    `;
    }).join("");
  }
}

let activeEditingExam = null;
let isNewExam = false;

function openExamModal(examId = null) {
  let item = null;
  if (examId) {
    const existing = appDB.exams.find(e => e.id === examId);
    if (existing) {
      item = existing;
      isNewExam = false;
    }
  }

  if (!item) {
    isNewExam = true;
    item = {
      id: generateUniqueId("parc"),
      topicId: "",
      title: "",
      date: new Date().toISOString().slice(0, 10),
      evaluatedContents: "",
      preventionReflection: "",
      files: []
    };
  }

  activeEditingExam = item;

  const existingExamIndex = isNewExam ? -1 : appDB.exams.findIndex(e => e.id === item.id);

  document.getElementById("examModalTitle").textContent = isNewExam ? "Registrar Nuevo Parcial" : "Editar Corrección de Parcial";
  document.getElementById("examFormId").value = item.id;
  document.getElementById("examFormTitle").value = item.title || "";
  document.getElementById("examFormDate").value = item.date || new Date().toISOString().slice(0, 10);
  document.getElementById("examFormTopicSelect").value = item.topicId || "";
  document.getElementById("examFormContents").value = item.evaluatedContents || "";
  document.getElementById("examFormReflection").value = item.preventionReflection || "";

  setupModalFilesAttachment("examFormFiles", "examFormFilesPreview", item);

  const form = document.getElementById("examForm");
  form.onsubmit = (e) => {
    e.preventDefault();
    const titleVal = document.getElementById("examFormTitle").value.trim();
    if (!titleVal) {
      showToast("Ingresa el título o número del examen parcial.", "error");
      document.getElementById("examFormTitle").focus();
      return;
    }
    const reflectionVal = document.getElementById("examFormReflection").value.trim();
    if (!reflectionVal) {
      showToast("Ingresa una reflexión sobre lo aprendido y los temas que necesitas reforzar.", "error");
      document.getElementById("examFormReflection").focus();
      return;
    }

    item.title = titleVal;
    item.date = document.getElementById("examFormDate").value;
    item.topicId = document.getElementById("examFormTopicSelect").value;
    item.evaluatedContents = document.getElementById("examFormContents").value;
    item.preventionReflection = reflectionVal;

    if (isNewExam) {
      appDB.exams.unshift(item);
    } else {
      const index = appDB.exams.findIndex(e => e.id === item.id);
      if (index >= 0) {
        appDB.exams[index] = { ...appDB.exams[index], ...item };
      }
    }

    saveDatabase();
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
      (l.title && l.title.toLowerCase().includes(filters.learningsSearch.toLowerCase())) ||
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
    grid.innerHTML = filtered.map(l => {
      const topicTitle = l.topicId ? getTopicTitleById(l.topicId) : "";
      return `
      <div class="activity-card" id="learning-el-${escapeHTML(l.id)}">
        <div class="activity-card-top">
          <span class="activity-type-badge aprendizaje">✦ Metacognición</span>
        </div>
        ${topicTitle ? `<div class="activity-card-topic">${escapeHTML(topicTitle)}</div>` : ''}
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
    `;
    }).join("");
  }
}

let activeEditingLearning = null;
let isNewLearning = false;

function openLearningModal(learnId = null) {
  let item = null;
  if (learnId) {
    const existing = appDB.learnings.find(l => l.id === learnId);
    if (existing) {
      item = existing;
      isNewLearning = false;
    }
  }

  if (!item) {
    isNewLearning = true;
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
  }

  activeEditingLearning = item;

  const existingLearningIndex = isNewLearning ? -1 : appDB.learnings.findIndex(l => l.id === item.id);

  document.getElementById("learningModalTitle").textContent = isNewLearning ? "Registrar Nueva Situación" : "Editar Situación de Aprendizaje";
  document.getElementById("learningFormId").value = item.id;
  document.getElementById("learningFormTitle").value = item.title || "";
  document.getElementById("learningFormTopicSelect").value = item.topicId || "";
  document.getElementById("learningFormDifficulty").value = item.difficulty || "";
  document.getElementById("learningFormConcept").value = item.uncomprehendedConcept || "";
  document.getElementById("learningFormStrategy").value = item.strategyUsed || "";
  const resEl = document.getElementById("learningFormResources");
  if (resEl) resEl.value = item.helpfulResources || "";
  const whatLearnedEl = document.getElementById("learningFormWhatLearned");
  if (whatLearnedEl) whatLearnedEl.value = item.whatILearned || "";
  const verificationEl = document.getElementById("learningFormVerification");
  if (verificationEl) verificationEl.value = item.howIVerified || "";
  document.getElementById("learningFormReflection").value = item.personalReflection || "";

  setupModalFilesAttachment("learningFormFiles", "learningFormFilesPreview", item);

  const form = document.getElementById("learningForm");
  form.onsubmit = (e) => {
    e.preventDefault();
    const titleVal = document.getElementById("learningFormTitle").value.trim();
    if (!titleVal) {
      showToast("Ingresa un título para la situación de aprendizaje.", "error");
      document.getElementById("learningFormTitle").focus();
      return;
    }

    item.title = titleVal;
    item.topicId = document.getElementById("learningFormTopicSelect").value;
    item.difficulty = document.getElementById("learningFormDifficulty").value;
    item.uncomprehendedConcept = document.getElementById("learningFormConcept").value;
    item.strategyUsed = document.getElementById("learningFormStrategy").value;
    if (resEl) item.helpfulResources = resEl.value;
    if (whatLearnedEl) item.whatILearned = whatLearnedEl.value;
    if (verificationEl) item.howIVerified = verificationEl.value;
    item.personalReflection = document.getElementById("learningFormReflection").value;

    if (isNewLearning) {
      appDB.learnings.unshift(item);
    } else {
      const index = appDB.learnings.findIndex(l => l.id === item.id);
      if (index >= 0) {
        appDB.learnings[index] = { ...appDB.learnings[index], ...item };
      }
    }

    saveDatabase();
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

let activeEditingTopic = null;
let isNewTopic = false;

function openTopicModal(topicId = null) {
  let topic = null;
  if (topicId) {
    const existing = appDB.topics.find(t => t.id === topicId);
    if (existing) {
      topic = existing;
      isNewTopic = false;
    }
  }

  if (!topic) {
    isNewTopic = true;
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
  }

  activeEditingTopic = topic;

  const existingTopicIndex = isNewTopic ? -1 : appDB.topics.findIndex(t => t.id === topic.id);

  document.getElementById("topicModalTitle").textContent = isNewTopic ? "Crear Nuevo Tema" : "Editar Información del Tema";
  document.getElementById("topicFormId").value = topic.id;
  document.getElementById("topicFormTitle").value = topic.title || "";
  document.getElementById("topicFormOrder").value = topic.order || (appDB.topics.length + 1);
  document.getElementById("topicFormStatus").value = topic.status || "Pendiente";
  document.getElementById("topicFormHours").value = topic.estimatedHours || "20 horas";
  document.getElementById("topicFormDesc").value = topic.description || "";

  const form = document.getElementById("topicForm");
  form.onsubmit = (e) => {
    e.preventDefault();
    const titleVal = document.getElementById("topicFormTitle").value.trim();
    if (!titleVal) {
      showToast("Ingresa un título para el tema.", "error");
      document.getElementById("topicFormTitle").focus();
      return;
    }

    topic.title = titleVal;
    topic.order = parseInt(document.getElementById("topicFormOrder").value, 10) || (appDB.topics.length + 1);
    topic.status = document.getElementById("topicFormStatus").value;
    topic.estimatedHours = document.getElementById("topicFormHours").value;
    topic.description = document.getElementById("topicFormDesc").value;

    if (isNewTopic) {
      appDB.topics.push(topic);
    } else {
      const index = appDB.topics.findIndex(t => t.id === topic.id);
      if (index >= 0) {
        appDB.topics[index] = { ...appDB.topics[index], ...topic };
      }
    }

    saveDatabase();
    closeModal("topicModal");
    renderTemas();
    populateTopicSelects();
    updateNavBadges();
    if (activeDetailTopicId === topic.id) {
      renderTopicDetail(topic.id);
    }
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
    const topicTitle = w.topicId ? getTopicTitleById(w.topicId) : "";
    contentHTML = `
      <div class="viewer-section">
        <span class="viewer-tag">${topicTitle ? `TEMA: ${escapeHTML(topicTitle)} · ` : ''}FECHA: ${escapeHTML(w.date || '')}</span>
        <h3 class="viewer-title">${escapeHTML(w.title)}</h3>
      </div>
      ${w.reflection ? `
        <div class="viewer-block">
          <h4>Reflexión:</h4>
          <p>${escapeHTML(w.reflection)}</p>
        </div>
      ` : ''}
      ${w.files && w.files.length > 0 ? `
        <div class="viewer-block">
          <h4>Hojas de Trabajo y Archivos Adjuntos:</h4>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${w.files.map(f => `
              <button class="btn btn-outline btn-sm" onclick="openStoredFileViewer('${escapeHTML(f.fileId || f.id)}', '${escapeHTML(f.name)}', '${escapeHTML(f.type)}', '${escapeHTML(f.data || '')}')">
                📎 ${escapeHTML(f.name)} (${formatBytes(f.size)})
              </button>
            `).join("")}
          </div>
        </div>
      ` : ''}
    `;
  } else if (type === "exam") {
    const e = appDB.exams.find(x => x.id === itemId);
    if (!e) return;
    title = e.title;
    const topicTitle = e.topicId ? getTopicTitleById(e.topicId) : "";
    contentHTML = `
      <div class="viewer-section">
        <span class="viewer-tag">EVALUACIÓN${topicTitle ? ` · ${escapeHTML(topicTitle)}` : ''} · FECHA: ${escapeHTML(e.date || '')}</span>
        <h3 class="viewer-title">${escapeHTML(e.title)}</h3>
      </div>
      ${e.evaluatedContents ? `
        <div class="viewer-block">
          <h4>Contenidos Evaluados:</h4>
          <p>${escapeHTML(e.evaluatedContents)}</p>
        </div>
      ` : ''}
      ${e.preventionReflection ? `
        <div class="viewer-block success">
          <h4>Estrategia para evitar el error:</h4>
          <p>${escapeHTML(e.preventionReflection)}</p>
        </div>
      ` : ''}
      ${e.files && e.files.length > 0 ? `
        <div class="viewer-block">
          <h4>Archivos y Evaluaciones Adjuntas:</h4>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${e.files.map(f => `
              <button class="btn btn-outline btn-sm" onclick="openStoredFileViewer('${escapeHTML(f.fileId || f.id)}', '${escapeHTML(f.name)}', '${escapeHTML(f.type)}', '${escapeHTML(f.data || '')}')">
                📎 ${escapeHTML(f.name)} (${formatBytes(f.size)})
              </button>
            `).join("")}
          </div>
        </div>
      ` : ''}
    `;
  } else if (type === "learning") {
    const l = appDB.learnings.find(x => x.id === itemId);
    if (!l) return;
    title = l.title;
    const topicTitle = l.topicId ? getTopicTitleById(l.topicId) : "";
    contentHTML = `
      <div class="viewer-section">
        <span class="viewer-tag">METACOGNICIÓN${topicTitle ? ` · ${escapeHTML(topicTitle)}` : ''}</span>
        <h3 class="viewer-title">${escapeHTML(l.title)}</h3>
      </div>
      <div class="viewer-block">
        <h4>1. Dificultad Encontrada:</h4>
        <p>${escapeHTML(l.difficulty)}</p>
      </div>
      ${l.uncomprehendedConcept ? `
        <div class="viewer-block">
          <h4>Concepto no comprendido inicialmente:</h4>
          <p>${escapeHTML(l.uncomprehendedConcept)}</p>
        </div>
      ` : ''}
      <div class="viewer-block">
        <h4>2. Estrategia Utilizada:</h4>
        <p>${escapeHTML(l.strategyUsed)}</p>
      </div>
      ${l.helpfulResources ? `
        <div class="viewer-block">
          <h4>Recursos que facilitaron la comprensión:</h4>
          <p>${escapeHTML(l.helpfulResources)}</p>
        </div>
      ` : ''}
      <div class="viewer-block highlight">
        <h4>3. Qué Aprendí:</h4>
        <p>${escapeHTML(l.whatILearned)}</p>
      </div>
      ${l.howIVerified ? `
        <div class="viewer-block">
          <h4>Cómo verifiqué mi aprendizaje:</h4>
          <p>${escapeHTML(l.howIVerified)}</p>
        </div>
      ` : ''}
      ${l.personalReflection ? `
        <div class="viewer-block">
          <h4>Reflexión Personal:</h4>
          <p>${escapeHTML(l.personalReflection)}</p>
        </div>
      ` : ''}
      ${l.files && l.files.length > 0 ? `
        <div class="viewer-block">
          <h4>Archivos y Apuntes Adjuntos:</h4>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${l.files.map(f => `
              <button class="btn btn-outline btn-sm" onclick="openStoredFileViewer('${escapeHTML(f.fileId || f.id)}', '${escapeHTML(f.name)}', '${escapeHTML(f.type)}', '${escapeHTML(f.data || '')}')">
                📎 ${escapeHTML(f.name)} (${formatBytes(f.size)})
              </button>
            `).join("")}
          </div>
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
  const promptEl = document.getElementById("confirmModalMessage");

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

function getStoredFileIds(record, includeTopicCards = false) {
  const ids = [];
  (record?.files || []).forEach(file => ids.push(file.fileId || file.id));
  if (record?.fileId) ids.push(record.fileId);
  if (includeTopicCards) {
    for (const section of ["definitions", "formulas", "metacognition", "evidencias"]) {
      for (const card of record?.[section] || []) {
        if (card.imageFileId) ids.push(card.imageFileId);
        (card.files || []).forEach(file => ids.push(file.fileId || file.id));
      }
    }
  }
  return [...new Set(ids.filter(Boolean))];
}

async function deleteStoredFiles(ids) {
  const success = await FileStorage.deleteFiles(ids);
  if (!success) showToast("No se pudieron borrar los archivos de IndexedDB; el registro se conserva. Inténtalo nuevamente.", "error");
  return success;
}

async function executeDelete() {
  if (!currentConfirmAction) return;

  if (currentConfirmAction.type === "custom") {
    if (typeof currentConfirmAction.callback === "function") {
      currentConfirmAction.callback();
    }
    closeModal("confirmModal");
    currentConfirmAction = null;
    return;
  }

  const { type, id, extra } = currentConfirmAction;

  if (type === "topic") {
    const topic = appDB.topics.find(t => t.id === id);
    if (!(await deleteStoredFiles(getStoredFileIds(topic, true)))) return;
    appDB.topics = appDB.topics.filter(t => t.id !== id);
    if (activeDetailTopicId === id) navigateToView("temas");
    renderTemas();
    showToast("Tema eliminado.", "info");
  } else if (type === "card") {
    const { topicId, section } = extra;
    const topic = appDB.topics.find(t => t.id === topicId);
    if (topic && Array.isArray(topic[section])) {
      const card = topic[section].find(c => c.id === id);
      if (card?.imageFileId && !(await deleteStoredFiles([card.imageFileId]))) return;
      topic[section] = topic[section].filter(c => c.id !== id);
      renderTopicDetail(topicId);
      showToast("Tarjeta eliminada.", "info");
    }
  } else if (type === "practiceFile") {
    const file = (appDB.practiceFiles || []).find(f => f.id === id);
    if (file && !(await deleteStoredFiles([file.fileId || file.id]))) return;
    appDB.practiceFiles = (appDB.practiceFiles || []).filter(f => f.id !== id);
    renderPracticasFilesList();
    showToast("Archivo de práctica eliminado.", "info");
  } else if (type === "workshop") {
    const workshop = appDB.workshops.find(w => w.id === id);
    if (!(await deleteStoredFiles(getStoredFileIds(workshop)))) return;
    appDB.workshops = appDB.workshops.filter(w => w.id !== id);
    renderTalleres();
    showToast("Taller eliminado.", "info");
  } else if (type === "exam") {
    const exam = appDB.exams.find(e => e.id === id);
    if (!(await deleteStoredFiles(getStoredFileIds(exam)))) return;
    appDB.exams = appDB.exams.filter(e => e.id !== id);
    renderParciales();
    showToast("Parcial eliminado.", "info");
  } else if (type === "learning") {
    const learning = appDB.learnings.find(l => l.id === id);
    if (!(await deleteStoredFiles(getStoredFileIds(learning)))) return;
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

let fileViewerObjectUrl = null;
let fileViewerRequestId = 0;

async function openFileViewer(name, type, data) {
  const isPdf = (type && type.includes("pdf")) || (name && name.toLowerCase().endsWith(".pdf"));
  let fileBlob = data instanceof Blob ? data : null;
  let safeValue = typeof data === "string" ? safeObjectUrl(data, "") : "";
  if (!fileBlob && safeValue.startsWith("data:")) fileBlob = dataUrlToBlob(safeValue, type);
  if (!fileBlob && safeValue.startsWith("blob:")) {
    try {
      fileBlob = await (await fetch(safeValue)).blob();
    } catch (error) {
      fileBlob = null;
    }
  }
  if (!fileBlob && !safeValue) {
    showToast("No hay vista previa disponible para este archivo.", "info");
    return;
  }

  const requestId = ++fileViewerRequestId;
  if (fileViewerObjectUrl) {
    URL.revokeObjectURL(fileViewerObjectUrl);
    fileViewerObjectUrl = null;
  }

  document.getElementById("fileViewerTitle").textContent = name || "Vista de Archivo";
  const body = document.getElementById("fileViewerBody");
  const previewUrl = fileBlob ? (fileViewerObjectUrl = URL.createObjectURL(fileBlob)) : safeValue;

  if (isPdf) {
    if (!fileBlob) {
      showToast("El PDF guardado no está disponible en IndexedDB.", "error");
      return;
    }
    openModal("fileViewerModal");
    body.innerHTML = `<iframe title="Vista previa: ${escapeHTML(name || "documento PDF")}" src="${previewUrl}" style="width: 100%; height: 70vh; min-height: 420px; border: 0; background: #fff;"></iframe>`;
  } else {
    body.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; max-height: 70vh; overflow: auto;">
        <img src="${previewUrl}" alt="${escapeHTML(name)}" style="max-width: 100%; max-height: 68vh; object-fit: contain; border-radius: 8px;">
      </div>
    `;
    openModal("fileViewerModal");
  }

  const downloadBtn = document.getElementById("fileViewerDownloadBtn");
  if (downloadBtn) {
    downloadBtn.href = previewUrl;
    downloadBtn.setAttribute("download", String(name || "archivo"));
    downloadBtn.onclick = (event) => {
      event.preventDefault();
      downloadFileDirectly(name, fileBlob || safeValue);
    };
  }

}

function closeFileViewer() {
  fileViewerRequestId++;
  if (fileViewerObjectUrl) {
    URL.revokeObjectURL(fileViewerObjectUrl);
    fileViewerObjectUrl = null;
  }
  closeModal("fileViewerModal");
}

function closeConfirmDialog() {
  closeModal("confirmModal");
  currentConfirmAction = null;
}

async function openCardImageViewer(topicId, section, cardId) {
  const topic = appDB.topics.find(t => t.id === topicId);
  if (!topic || !Array.isArray(topic[section])) return;
  const card = topic[section].find(c => c.id === cardId);
  if (!card || (!card.imageAsset && !card.imageData && !card.imageFileId)) {
    showToast("No hay imagen adjunta en esta tarjeta.", "info");
    return;
  }
  if (card.imageFileId) {
    const blob = await FileStorage.getBlob(card.imageFileId);
    if (!blob) return showToast("No se encontró la imagen en IndexedDB.", "error");
    openFileViewer(card.imageName || card.title || "Evidencia Gráfica", card.imageType || blob.type, blob);
  } else {
    openFileViewer(card.title || "Evidencia Gráfica", "image/jpeg", card.imageAsset || card.imageData);
  }
}

async function openPracticeViewer(fileId) {
  const f = (appDB.practiceFiles || []).find(x => x.id === fileId);
  if (!f) return;
  const blob = await FileStorage.getBlob(f.fileId || f.id);
  if (!blob && f.assetPath?.startsWith("assets/")) return openFileViewer(f.name, f.type, f.assetPath);
  if (!blob) return showToast("No se encontró el archivo en IndexedDB.", "error");
  openFileViewer(f.name, f.type, blob);
}

async function downloadPracticeFile(fileId) {
  const f = (appDB.practiceFiles || []).find(x => x.id === fileId);
  if (!f) return;
  const blob = await FileStorage.getBlob(f.fileId || f.id);
  if (!blob && f.assetPath?.startsWith("assets/")) return downloadFileDirectly(f.name, f.assetPath);
  if (!blob) return showToast("No se encontró el archivo en IndexedDB.", "error");
  downloadFileDirectly(f.name, blob);
}

async function openStoredFileViewer(fileId, name, type, assetFallback = "") {
  const blob = await FileStorage.getBlob(fileId);
  if (!blob) {
    if (typeof assetFallback === "string" && assetFallback.startsWith("assets/")) {
      return openFileViewer(name, type, assetFallback);
    }
    return showToast("No se encontró el archivo en IndexedDB.", "error");
  }
  openFileViewer(name, type || blob.type, blob);
}

// ============================================================================
// GESTIÓN DE MODALES (APERTURA Y CIERRE CON RETENCIÓN DE SCROLL)
// ============================================================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("open");
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(modalId) {
  if (modalId === "cardEditorModal" && cardEditorImageObjectUrl) {
    URL.revokeObjectURL(cardEditorImageObjectUrl);
    renderedFileObjectUrls.delete(cardEditorImageObjectUrl);
    cardEditorImageObjectUrl = null;
  }
  if (modalId === "fileViewerModal") {
    fileViewerRequestId++;
    if (fileViewerObjectUrl) {
      URL.revokeObjectURL(fileViewerObjectUrl);
      fileViewerObjectUrl = null;
    }
  }
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("open");
    modal.classList.remove("active");
    const anyModalOpen = document.querySelector(".modal.open, .modal.active");
    if (!anyModalOpen) {
      document.body.style.overflow = "";
    }
  }
  flushAutoSave();
}

// ============================================================================
// RESPALDO Y COPIAS DE SEGURIDAD (EXPORTACIÓN E IMPORTACIÓN JSON COMPLETA)
// ============================================================================

async function exportBackupJSON() {
  flushAutoSave();
  showToast("Preparando exportación completa con archivos...", "info");
  try {
    await migrateEmbeddedFilesToIndexedDB();
    const records = await FileStorage.getAllFiles();
    const files = [];
    for (const record of records) {
      const storedBlob = record.blob instanceof Blob ? record.blob : (record.data instanceof Blob ? record.data : null);
      const data = storedBlob ? await blobToDataUrl(storedBlob) : (typeof record.data === "string" ? record.data : null);
      if (data) {
        files.push({
          id: record.id,
          name: record.name || "archivo",
          type: record.type || storedBlob?.type || "application/octet-stream",
          size: Number(record.size || storedBlob?.size || 0),
          data
        });
      }
    }
    const availableIds = new Set(files.map(file => file.id));
    const missingIds = getReferencedFileIds().filter(id => !availableIds.has(id));
    if (missingIds.length) throw new Error(`Faltan ${missingIds.length} archivo(s) en IndexedDB; no se generó un respaldo incompleto.`);

    const payload = {
      app: "Portafolio Digital de Física I",
      version: "4.0",
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("✓ Copia de seguridad exportada con éxito.", "success");
  } catch (error) {
    showToast(error.message || "No se pudo generar el respaldo completo.", "error");
  }
}

function validateImportedPayload(data) {
  if (!data || typeof data !== "object") return null;

  const candidate = data.db || data;
  if (!candidate || typeof candidate !== "object") return null;
  const version = Number(candidate.version || 3);
  if (!Number.isFinite(version) || version < 3) return null;

  const profile = candidate.profile && typeof candidate.profile === "object" ? candidate.profile : {};
  const topics = Array.isArray(candidate.topics) ? candidate.topics : [];
  const practiceFiles = Array.isArray(candidate.practiceFiles) ? candidate.practiceFiles : [];
  const workshops = Array.isArray(candidate.workshops) ? candidate.workshops : [];
  const exams = Array.isArray(candidate.exams) ? candidate.exams : [];
  const learnings = Array.isArray(candidate.learnings) ? candidate.learnings : [];

  if (!profile && topics.length === 0 && practiceFiles.length === 0 && workshops.length === 0 && exams.length === 0 && learnings.length === 0) {
    return null;
  }

  for (const list of [topics, practiceFiles, workshops, exams, learnings]) {
    for (const item of list) {
      if (!item || typeof item !== "object") return null;
      if (item.id && !sanitizeImportedId(item.id)) return null;
    }
  }

  return {
    version,
    profile: {
      name: typeof profile.name === "string" ? profile.name.slice(0, 120) : "",
      career: typeof profile.career === "string" ? profile.career.slice(0, 120) : "",
      university: typeof profile.university === "string" ? profile.university.slice(0, 120) : "",
      professor: typeof profile.professor === "string" ? profile.professor.slice(0, 120) : "",
      term: typeof profile.term === "string" ? profile.term.slice(0, 80) : "",
      bio: typeof profile.bio === "string" ? profile.bio.slice(0, 500) : "",
      goals: typeof profile.goals === "string" ? profile.goals.slice(0, 500) : ""
    },
    topics,
    practiceFiles,
    workshops,
    exams,
    learnings
  };
}

function importBackupJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const normalized = validateImportedPayload(data);

      if (!normalized) {
        showToast("El archivo seleccionado no tiene un formato de portafolio válido o contiene datos peligrosos.", "error");
        return;
      }

      const summary = `Temas: ${normalized.topics.length} · Talleres: ${normalized.workshops.length} · Parciales: ${normalized.exams.length} · Archivos: ${normalized.practiceFiles.length}`;
      openCustomConfirmDialog(`Esto reemplaza todo tu trabajo actual. ${summary}. ¿Deseas continuar?`, async () => {
        const previousDb = appDB;
        try {
          await FileStorage.init();
          for (const storedFile of Array.isArray(data.storedFiles) ? data.storedFiles : []) {
            if (!storedFile?.id) continue;
            const type = String(storedFile.type || "application/octet-stream");
            let blob = storedFile.blob instanceof Blob ? storedFile.blob : null;
            if (!blob && typeof storedFile.data === "string") blob = dataUrlToBlob(storedFile.data, type);
            if (!blob) throw new Error(`El adjunto "${storedFile.name || storedFile.id}" no tiene datos válidos en el respaldo.`);
            const saved = await FileStorage.saveBlob(storedFile.id, String(storedFile.name || "archivo"), type, Number(storedFile.size || blob.size), blob);
            if (!saved) throw new Error(`No se pudo restaurar "${storedFile.name || storedFile.id}" en IndexedDB.`);
          }

          appDB = sanitizePortfolioDatabase(normalized);
          await migrateEmbeddedFilesToIndexedDB();
          if (!saveDatabase()) throw new Error("No se pudieron guardar los datos importados en LocalStorage.");
          renderApp();
          showToast("✓ Portafolio restaurado correctamente desde el respaldo.", "success");
        } catch (error) {
          appDB = previousDb;
          showToast(error.message || "No se pudo restaurar el respaldo.", "error");
        }
      });
    } catch (err) {
      console.error("Error al importar JSON:", err);
      showToast("Error al procesar el archivo JSON.", "error");
    }
  };
  reader.readAsText(file);
}

function openCustomConfirmDialog(message, onAccept) {
  currentConfirmAction = { type: "custom", callback: onAccept };
  const promptEl = document.getElementById("confirmModalMessage");
  if (promptEl) promptEl.textContent = message;
  openModal("confirmModal");
}

function restoreDefaultData() {
  openCustomConfirmDialog("Esto reemplaza todo tu trabajo actual. ¿Deseas cargar los datos de ejemplo?", () => {
    const demoData = (typeof window !== "undefined" && window.PORTAFOLIO_DEMO_DATA) ? window.PORTAFOLIO_DEMO_DATA : createEmptyDatabase();
    appDB = sanitizePortfolioDatabase(demoData);
    saveDatabase();
    renderApp();
    showToast("✓ Datos de ejemplo cargados.", "success");
  });
}

function clearAllData() {
  openCustomConfirmDialog("Esto elimina todos los datos y archivos guardados en este navegador. ¿Deseas continuar?", async () => {
    const cleared = await FileStorage.clear();
    if (!cleared) {
      showToast("No se pudo limpiar IndexedDB; tus datos no se borraron.", "error");
      return;
    }
    appDB = createEmptyDatabase();
    saveDatabase();
    renderApp();
    showToast("Todos los datos han sido borrados.", "info");
  });
}

// ============================================================================
// INICIALIZACIÓN DE LA APLICACIÓN Y EVENT LISTENERS
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  document.addEventListener("click", (event) => {
    const actionTarget = event.target.closest("[data-action]");
    if (actionTarget) {
      const action = actionTarget.getAttribute("data-action");
      if (action === "open-workshop-modal") openWorkshopModal();
      if (action === "open-exam-modal") openExamModal();
      if (action === "open-learning-modal") openLearningModal();
      if (action === "save-card-editor") saveCardEditorChanges();
      if (action === "close-modal") closeModal(actionTarget.getAttribute("data-modal-id") || "");
    }

    const closeTarget = event.target.closest("[data-close-modal]");
    if (closeTarget) {
      const modalId = closeTarget.getAttribute("data-close-modal");
      if (modalId) closeModal(modalId);
    }

    const fileViewerCloseTarget = event.target.closest("[data-close-file-viewer]");
    if (fileViewerCloseTarget) closeFileViewer();

    const confirmCloseTarget = event.target.closest("[data-close-confirm]");
    if (confirmCloseTarget) closeConfirmDialog();

    const latexTarget = event.target.closest("[data-latex]");
    if (latexTarget) {
      const value = latexTarget.getAttribute("data-latex") || "";
      insertLatexSnippet(value);
    }
  });

  // Inicializar IndexedDB en segundo plano
  await FileStorage.init();
  if (navigator.storage && typeof navigator.storage.persist === "function") {
    try {
      Promise.resolve(navigator.storage.persist()).catch(error => console.info("El navegador no concedió almacenamiento persistente:", error));
    } catch (error) {
      console.info("No se pudo solicitar almacenamiento persistente:", error);
    }
  }
  try {
    await migrateEmbeddedFilesToIndexedDB();
  } catch (error) {
    console.error("No se pudo completar la migración de archivos:", error);
    showToast(error.message || "No se pudieron migrar algunos archivos. No se borraron los datos originales.", "error");
  }

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
  document.getElementById("confirmModalAcceptBtn")?.addEventListener("click", executeDelete);
  document.getElementById("confirmModalCancelBtn")?.addEventListener("click", closeConfirmDialog);

  // Perfil de estudiante
  const openProfile = () => {
    const nameEl = document.getElementById("inputStudentName");
    const univEl = document.getElementById("inputUniversity");
    const careerEl = document.getElementById("inputCareer");
    const profEl = document.getElementById("inputProfessor");
    const termEl = document.getElementById("inputSemester");
    const bioEl = document.getElementById("inputPresentation");
    const goalsEl = document.getElementById("inputObjectives");

    if (nameEl) nameEl.value = appDB.profile.name || "";
    if (univEl) univEl.value = appDB.profile.university || "";
    if (careerEl) careerEl.value = appDB.profile.career || "";
    if (profEl) profEl.value = appDB.profile.professor || "";
    if (termEl) termEl.value = appDB.profile.term || "";
    if (bioEl) bioEl.value = appDB.profile.bio || "";
    if (goalsEl) goalsEl.value = appDB.profile.goals || "";

    openModal("profileModal");
  };

  document.getElementById("sidebarEditProfileBtn")?.addEventListener("click", openProfile);
  document.getElementById("topbarProfileBtn")?.addEventListener("click", openProfile);
  document.getElementById("editProfileBtn")?.addEventListener("click", openProfile);

  document.getElementById("profileForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameEl = document.getElementById("inputStudentName");
    const univEl = document.getElementById("inputUniversity");
    const careerEl = document.getElementById("inputCareer");
    const profEl = document.getElementById("inputProfessor");
    const termEl = document.getElementById("inputSemester");
    const bioEl = document.getElementById("inputPresentation");
    const goalsEl = document.getElementById("inputObjectives");

    if (nameEl) appDB.profile.name = nameEl.value.trim() || "Estudiante";
    if (univEl) appDB.profile.university = univEl.value.trim();
    if (careerEl) appDB.profile.career = careerEl.value.trim();
    if (profEl) appDB.profile.professor = profEl.value.trim();
    if (termEl) appDB.profile.term = termEl.value.trim();
    if (bioEl) appDB.profile.bio = bioEl.value.trim();
    if (goalsEl) appDB.profile.goals = goalsEl.value.trim();

    saveDatabase();
    updateProfileUI();
    closeModal("profileModal");
    showToast("✓ Perfil actualizado con éxito.", "success");
  });

  // Cerrar cualquier modal al hacer clic en el backdrop
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  // Cerrar modal activo con tecla Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const activeModal = document.querySelector(".modal.open, .modal.active");
      if (activeModal) closeModal(activeModal.id);
    }
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
  document.getElementById("loadDemoDataBtn")?.addEventListener("click", restoreDefaultData);

  // Renderizar la app completa
  renderApp();
});
