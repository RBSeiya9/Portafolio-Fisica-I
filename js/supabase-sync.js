/**
 * Módulo de Sincronización Automática en Tiempo Real con Supabase
 * Permite que cualquier cambio en temas, prácticas, talleres, parciales
 * o perfil se guarde en la nube y se refleje al instante en la web pública.
 */
(function () {
  let client = null;
  let realtimeChannel = null;
  let pushDebounceTimer = null;
  let isReceivingRemoteUpdate = false;

  const STORAGE_KEY_URL = "portafolio_supabase_url";
  const STORAGE_KEY_KEY = "portafolio_supabase_anon_key";

  function getCredentials() {
    const localUrl = localStorage.getItem(STORAGE_KEY_URL);
    const localKey = localStorage.getItem(STORAGE_KEY_KEY);
    const configUrl = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || "";
    const configKey = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || "";

    return {
      url: (localUrl || configUrl).trim(),
      anonKey: (localKey || configKey).trim()
    };
  }

  function setStatusBadge(status, text) {
    const autosaveEl = document.getElementById("topbarAutosave");
    const autosaveText = document.getElementById("autosaveText");
    const cloudStatusEl = document.getElementById("supabaseCloudStatus");

    if (autosaveEl) {
      autosaveEl.className = `topbar-autosave ${status}`;
    }
    if (autosaveText && text) {
      autosaveText.textContent = text;
    }
    if (cloudStatusEl) {
      if (status === "saved") {
        cloudStatusEl.innerHTML = `<span style="color: #10b981; font-weight: 600;">● Conectado a la nube</span> (Sincronizado)`;
      } else if (status === "syncing") {
        cloudStatusEl.innerHTML = `<span style="color: #f59e0b; font-weight: 600;">● Sincronizando...</span>`;
      } else if (status === "error") {
        cloudStatusEl.innerHTML = `<span style="color: #ef4444; font-weight: 600;">● Error de sincronización</span>`;
      } else {
        cloudStatusEl.innerHTML = `<span style="color: #64748b; font-weight: 500;">● Modo local (sin sincronización en la nube)</span>`;
      }
    }
  }

  const SupabaseSync = {
    isConfigured: function () {
      const { url, anonKey } = getCredentials();
      return Boolean(url && anonKey && url.startsWith("https://") && window.supabase);
    },

    getClient: function () {
      return client;
    },

    init: async function () {
      const { url, anonKey } = getCredentials();

      // Rellenar formulario en vista de respaldo si existe
      const urlInput = document.getElementById("supabaseUrlInput");
      const keyInput = document.getElementById("supabaseKeyInput");
      if (urlInput && url) urlInput.value = url;
      if (keyInput && anonKey) keyInput.value = anonKey;

      if (!this.isConfigured()) {
        setStatusBadge("local", "Guardado local");
        return false;
      }

      try {
        client = window.supabase.createClient(url, anonKey, {
          auth: { persistSession: false }
        });

        setStatusBadge("syncing", "Conectando...");

        // Cargar datos remotos al iniciar
        await this.pullRemoteData();

        // Suscribirse a cambios en tiempo real
        this.subscribeRealtime();

        setStatusBadge("saved", "Nube conectada");
        return true;
      } catch (err) {
        console.error("Error al inicializar Supabase:", err);
        setStatusBadge("error", "Error en nube");
        return false;
      }
    },

    subscribeRealtime: function () {
      if (!client) return;

      if (realtimeChannel) {
        client.removeChannel(realtimeChannel);
      }

      realtimeChannel = client
        .channel("public:portfolio_data")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "portfolio_data" },
          (payload) => {
            if (payload && payload.new && payload.new.data) {
              if (isReceivingRemoteUpdate) return;
              try {
                isReceivingRemoteUpdate = true;
                const remoteData = payload.new.data;
                const localStr = JSON.stringify(window.appDB || {});
                const remoteStr = JSON.stringify(remoteData);

                // Solo actualizar si hay diferencia real
                if (localStr !== remoteStr) {
                  console.info("Actualización en tiempo real recibida de la nube.");
                  if (typeof window.sanitizePortfolioDatabase === "function") {
                    window.appDB = window.sanitizePortfolioDatabase(remoteData);
                  } else {
                    window.appDB = remoteData;
                  }
                  localStorage.setItem("portafolio_fisica_db_v3", JSON.stringify(window.appDB));
                  if (typeof window.renderApp === "function") {
                    window.renderApp();
                  }
                  if (typeof window.showToast === "function") {
                    window.showToast("✓ Datos actualizados en tiempo real desde la nube.", "info");
                  }
                  setStatusBadge("saved", "Actualizado");
                }
              } finally {
                setTimeout(() => {
                  isReceivingRemoteUpdate = false;
                }, 500);
              }
            }
          }
        )
        .subscribe();
    },

    pullRemoteData: async function () {
      if (!client) return false;

      try {
        const { data, error } = await client
          .from("portfolio_data")
          .select("data, updated_at")
          .eq("id", "main")
          .single();

        if (error) {
          // Si la tabla no tiene el registro 'main' aún, subimos los datos locales
          if (error.code === "PGRST116") {
            console.info("El registro 'main' aún no existe en Supabase. Subiendo datos locales...");
            await this.pushDataNow(window.appDB);
            return true;
          }
          console.warn("Aviso al consultar Supabase:", error.message);
          return false;
        }

        if (data && data.data && typeof data.data === "object") {
          const remoteData = data.data;
          const hasRemoteContent = (remoteData.topics && remoteData.topics.length > 0) ||
                                   (remoteData.profile && remoteData.profile.name);
          const hasLocalContent = (window.appDB && window.appDB.topics && window.appDB.topics.length > 0) ||
                                  (window.appDB && window.appDB.profile && window.appDB.profile.name);

          // Si en la nube no hay contenido real pero en local sí, subimos el contenido local
          if (!hasRemoteContent && hasLocalContent) {
            console.info("La nube no contiene temas aún; subiendo datos locales...");
            await this.pushDataNow(window.appDB);
            return true;
          }

          if (typeof window.sanitizePortfolioDatabase === "function") {
            window.appDB = window.sanitizePortfolioDatabase(remoteData);
          } else {
            window.appDB = remoteData;
          }
          localStorage.setItem("portafolio_fisica_db_v3", JSON.stringify(window.appDB));
          if (typeof window.renderApp === "function") {
            window.renderApp();
          }
          setStatusBadge("saved", "Sincronizado");
          return true;
        }
      } catch (err) {
        console.error("Fallo al traer datos de Supabase:", err);
      }
      return false;
    },

    queuePush: function (data) {
      if (!this.isConfigured() || !client) return;
      if (isReceivingRemoteUpdate) return;

      setStatusBadge("syncing", "Guardando...");

      clearTimeout(pushDebounceTimer);
      pushDebounceTimer = setTimeout(() => {
        this.pushDataNow(data);
      }, 1200);
    },

    pushDataNow: async function (data) {
      if (!client) return false;

      try {
        setStatusBadge("syncing", "Subiendo...");
        const payload = {
          id: "main",
          data: data || window.appDB || {},
          updated_at: new Date().toISOString()
        };

        const { error } = await client
          .from("portfolio_data")
          .upsert(payload, { onConflict: "id" });

        if (error) {
          console.error("Error al guardar en Supabase:", error);
          setStatusBadge("error", "Error nube");
          if (typeof window.showToast === "function") {
            window.showToast("No se pudo sincronizar con la nube: " + error.message, "error");
          }
          return false;
        }

        setStatusBadge("saved", "Guardado en nube");
        return true;
      } catch (err) {
        console.error("Excepción al guardar en Supabase:", err);
        setStatusBadge("error", "Error nube");
        return false;
      }
    },

    saveSettings: async function (url, anonKey) {
      url = (url || "").trim();
      anonKey = (anonKey || "").trim();

      if (!url || !anonKey) {
        localStorage.removeItem(STORAGE_KEY_URL);
        localStorage.removeItem(STORAGE_KEY_KEY);
        if (realtimeChannel && client) {
          client.removeChannel(realtimeChannel);
        }
        client = null;
        setStatusBadge("local", "Guardado local");
        return { success: true, message: "Modo nube desactivado. Ahora funciona únicamente en local." };
      }

      if (!url.startsWith("https://")) {
        return { success: false, message: "La URL de Supabase debe comenzar con https://" };
      }

      localStorage.setItem(STORAGE_KEY_URL, url);
      localStorage.setItem(STORAGE_KEY_KEY, anonKey);

      const initialized = await this.init();
      if (initialized) {
        // Al conectar con éxito, sincronizar de inmediato
        await this.pushDataNow(window.appDB);
        return { success: true, message: "¡Conectado exitosamente a Supabase! Sincronización automática activa." };
      } else {
        return { success: false, message: "No se pudo conectar a Supabase. Verifica la URL y la Anon Key." };
      }
    }
  };

  window.SupabaseSync = SupabaseSync;
})();
