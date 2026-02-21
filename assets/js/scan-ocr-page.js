/**
 * Scan OCR Page — Upload → Scan → Review → Save as expense
 */
(function () {
  const MAX_SIZE = 10 * 1024 * 1024;
  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

  let selectedFile = null;
  let ocrData = null;
  let _contactResults = [];
  let _contactSearchTimeout = null;

  const $ = (id) => document.getElementById(id);

  function setStep(n) {
    [1, 2, 3].forEach((i) => {
      const el = $("step-" + i);
      if (!el) return;
      const span = el.querySelector("span");
      if (i < n) {
        el.style.borderColor = "rgba(34,197,94,.35)";
        if (span) { span.style.background = "#22c55e"; span.style.color = "#fff"; }
      } else if (i === n) {
        el.style.borderColor = "rgba(34,197,94,.35)";
        if (span) { span.style.background = "#22c55e"; span.style.color = "#fff"; }
      } else {
        el.style.borderColor = "#e5e7eb";
        if (span) { span.style.background = "#f3f4f6"; span.style.color = "#9ca3af"; }
      }
    });
  }

  function showPanel(name) {
    ["panel-upload", "panel-results", "panel-success"].forEach((id) => {
      const el = $(id);
      if (el) el.classList.toggle("hidden", id !== "panel-" + name);
    });
  }

  function formatBytes(b) {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  }

  function handleFile(file) {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast("Formato no soportado. Usa JPG, PNG, WEBP o PDF.", "error");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast("El archivo supera los 10 MB.", "error");
      return;
    }
    selectedFile = file;
    $("ocr-file-name").textContent = file.name;
    $("ocr-file-size").textContent = formatBytes(file.size);
    $("ocr-drop-empty").classList.add("hidden");
    var camBtn = $("ocr-camera-btn");
    if (camBtn) camBtn.classList.add("hidden");
    $("ocr-drop-file").classList.remove("hidden");
    $("ocr-scan-btn").disabled = false;
    showPanel("upload");
    setStep(1);
  }

  function clearAll() {
    selectedFile = null;
    ocrData = null;
    _contactResults = [];
    $("ocr-file-input").value = "";
    var camInput = $("ocr-camera-input");
    if (camInput) camInput.value = "";
    $("ocr-drop-empty").classList.remove("hidden");
    var camBtn = $("ocr-camera-btn");
    if (camBtn) camBtn.classList.remove("hidden");
    $("ocr-drop-file").classList.add("hidden");
    $("ocr-scan-btn").disabled = true;
    $("ocr-scan-text").textContent = "Escanear documento";
    $("ocr-progress").classList.add("hidden");
    $("ocr-status-msg").classList.add("hidden");

    var contactInput = $("ocr-contact");
    if (contactInput) contactInput.value = "";
    var contactId = $("ocr-contact-id");
    if (contactId) contactId.value = "";
    var contactHint = $("ocr-contact-hint");
    if (contactHint) contactHint.classList.add("hidden");
    var contactResults = $("ocr-contact-results");
    if (contactResults) { contactResults.classList.add("hidden"); contactResults.innerHTML = ""; }

    showPanel("upload");
    setStep(1);
  }

  // --- Contact Autocomplete ---
  function handleContactSearch(term) {
    var resultsDiv = $("ocr-contact-results");
    var hint = $("ocr-contact-hint");

    $("ocr-contact-id").value = "";
    if (hint) hint.classList.add("hidden");

    if (!term || term.trim().length < 2) {
      resultsDiv.classList.add("hidden");
      resultsDiv.innerHTML = "";
      return;
    }

    if (_contactSearchTimeout) clearTimeout(_contactSearchTimeout);
    _contactSearchTimeout = setTimeout(async function () {
      try {
        if (!window.searchClientsAutocomplete) return;
        var result = await window.searchClientsAutocomplete(term.trim());
        if (result.success && result.data.length > 0) {
          _contactResults = result.data;
          resultsDiv.innerHTML = result.data.map(function (c) {
            return '<div class="px-4 py-3 cursor-pointer hover:bg-bgray-100 dark:hover:bg-darkblack-400 border-b border-bgray-100 dark:border-darkblack-400 last:border-b-0" data-id="' + c.id + '">'
              + '<p class="text-sm font-semibold text-bgray-900 dark:text-white">' + esc(c.nombre_razon_social) + '</p>'
              + '<p class="text-xs text-bgray-500 dark:text-bgray-400">' + esc(c.identificador || "Sin NIF") + '</p>'
              + '</div>';
          }).join("");
          resultsDiv.classList.remove("hidden");

          resultsDiv.querySelectorAll("[data-id]").forEach(function (el) {
            el.addEventListener("click", function () {
              var id = this.getAttribute("data-id");
              selectOcrContact(id);
            });
          });
        } else {
          resultsDiv.innerHTML = '<div class="px-4 py-3 text-sm text-bgray-500 dark:text-bgray-400">No se encontraron contactos</div>';
          resultsDiv.classList.remove("hidden");
          if (hint) hint.classList.remove("hidden");
        }
      } catch (e) {
        console.error("Contact search error:", e);
        resultsDiv.classList.add("hidden");
      }
    }, 300);
  }

  function selectOcrContact(clientId) {
    var client = _contactResults.find(function (c) { return c.id === clientId; });
    if (!client) return;
    $("ocr-contact").value = client.nombre_razon_social;
    $("ocr-contact-id").value = clientId;
    $("ocr-contact-results").classList.add("hidden");
    $("ocr-contact-results").innerHTML = "";
    var hint = $("ocr-contact-hint");
    if (hint) hint.classList.add("hidden");
  }

  // --- Scan ---
  async function doScan() {
    if (!selectedFile) return;
    var supabase = window.supabaseClient;
    if (!supabase) { toast("Supabase no listo", "error"); return; }

    var authResult = await supabase.auth.getUser();
    var user = authResult.data.user;
    if (!user) { toast("Inicia sesión primero", "error"); return; }

    $("ocr-scan-btn").disabled = true;
    $("ocr-scan-text").textContent = "Analizando...";
    $("ocr-progress").classList.remove("hidden");
    setStatus("Subiendo archivo...");

    try {
      var ext = selectedFile.name.split(".").pop() || "jpg";
      var filePath = user.id + "/" + crypto.randomUUID() + "." + ext;

      var uploadResult = await supabase.storage
        .from("expense-ocr-temp")
        .upload(filePath, selectedFile, { contentType: selectedFile.type, upsert: false });
      if (uploadResult.error) throw new Error("Error subiendo: " + uploadResult.error.message);

      setStatus("Ejecutando OCR con inteligencia artificial...");

      var fnResult = await supabase.functions.invoke(
        "analyze-expense-document",
        { body: { filePath: filePath } }
      );

      if (fnResult.error) {
        var msg = "Error del servidor";
        try {
          if (fnResult.error.context) {
            var resp = fnResult.error.context;
            if (typeof resp.json === "function") {
              var b = await resp.json();
              if (b && b.error) msg = b.error;
            }
          }
        } catch (_) {}
        throw new Error(msg);
      }

      var body = fnResult.data;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch (_) {}
      }
      if (!body || typeof body !== "object") throw new Error("Respuesta vacía del OCR");
      if (body.error) throw new Error(body.error);

      ocrData = body;
      fillResults(body);
      showPanel("results");
      setStep(2);
      toast("Documento analizado correctamente", "success");
    } catch (err) {
      console.error("OCR error:", err);
      toast(err.message || "Error al escanear", "error");
    } finally {
      $("ocr-scan-btn").disabled = false;
      $("ocr-scan-text").textContent = "Escanear documento";
      $("ocr-progress").classList.add("hidden");
      $("ocr-status-msg").classList.add("hidden");
    }
  }

  function fillResults(d) {
    var conf = d.confidence != null ? d.confidence : 0;
    var veryLow = conf < 0.5;

    $("ocr-invoice-num").value = d.invoiceNumber || "";
    $("ocr-total").value = (!veryLow && d.total != null) ? d.total : "";
    $("ocr-subtotal").value = (!veryLow && d.subtotal != null) ? d.subtotal : "";
    $("ocr-tax").value = (!veryLow && d.tax != null) ? d.tax : "";
    $("ocr-date").value = "";
    $("ocr-category").value = "otros";

    // Contacto: pre-rellenar búsqueda con proveedor
    var contactInput = $("ocr-contact");
    $("ocr-contact-id").value = "";
    if (d.vendorName) {
      contactInput.value = d.vendorName;
      handleContactSearch(d.vendorName);
    } else {
      contactInput.value = "";
    }

    // Concepto: descripción del gasto, no el nombre del proveedor
    if (d.invoiceNumber) {
      $("ocr-concepto").value = "Factura " + d.invoiceNumber;
    } else {
      $("ocr-concepto").value = "";
    }

    if (!veryLow && d.invoiceDate) {
      var dt = new Date(d.invoiceDate);
      if (!isNaN(dt)) $("ocr-date").value = dt.toISOString().split("T")[0];
    }

    var pct = Math.round(conf * 100);
    var badge = $("ocr-confidence-badge");
    badge.textContent = pct + "% confianza";

    var low = $("ocr-low-confidence");
    if (conf < 0.5) {
      low.classList.remove("hidden");
      $("ocr-conf-text").textContent = "Confianza muy baja — importe y fecha no autocompletados. Rellena manualmente.";
      badge.className = "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-red-100 text-red-600 dark:bg-red-400/10 dark:text-red-400";
    } else if (conf < 0.65) {
      low.classList.remove("hidden");
      $("ocr-conf-text").textContent = "Confianza baja — revisa los datos antes de guardar.";
      badge.className = "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400";
    } else if (conf < 0.85) {
      low.classList.add("hidden");
      badge.className = "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-blue-100 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400";
    } else {
      low.classList.add("hidden");
      badge.className = "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-400";
    }
  }

  // --- Save ---
  async function saveExpense() {
    var contactId = $("ocr-contact-id").value.trim();
    var concepto = $("ocr-concepto").value.trim();
    var invoiceNum = $("ocr-invoice-num").value.trim();
    var total = parseFloat($("ocr-total").value);
    var date = $("ocr-date").value;
    var category = $("ocr-category").value;

    if (!contactId) { toast("Selecciona un contacto de la lista", "error"); $("ocr-contact").focus(); return; }
    if (!concepto) { toast("El concepto es obligatorio", "error"); $("ocr-concepto").focus(); return; }
    if (!total || total <= 0) { toast("Importe obligatorio y mayor que 0", "error"); $("ocr-total").focus(); return; }
    if (!date) { toast("La fecha es obligatoria", "error"); $("ocr-date").focus(); return; }

    var obsParts = [];
    if (invoiceNum) obsParts.push("Fact: " + invoiceNum);
    var sub = $("ocr-subtotal").value;
    var tax = $("ocr-tax").value;
    if (sub) obsParts.push("Base: " + parseFloat(sub).toFixed(2) + " \u20AC");
    if (tax) obsParts.push("IVA: " + parseFloat(tax).toFixed(2) + " \u20AC");
    if (ocrData && ocrData.confidence != null) obsParts.push("OCR: " + Math.round(ocrData.confidence * 100) + "%");
    var observaciones = obsParts.join(" | ");
    if (observaciones.length > 150) observaciones = observaciones.substring(0, 150);

    $("ocr-save-btn").disabled = true;
    $("ocr-save-btn").textContent = "Guardando...";

    try {
      if (!window.createTransaction) throw new Error("createTransaction no disponible");

      var result = await window.createTransaction({
        cliente_id: contactId,
        concepto: concepto,
        importe: total,
        fecha: date,
        categoria: category,
        tipo: "gasto",
        observaciones: observaciones || null
      });

      if (!result.success) throw new Error(result.error || "Error al guardar");

      showPanel("success");
      setStep(3);
      loadHistory();
      toast("Gasto guardado en transacciones", "success");
    } catch (err) {
      console.error("Save error:", err);
      toast(err.message || "Error al guardar", "error");
    } finally {
      $("ocr-save-btn").disabled = false;
      $("ocr-save-btn").innerHTML = '<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg> Guardar como gasto';
    }
  }

  function setStatus(msg) {
    var el = $("ocr-status-msg");
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function toast(msg, type) {
    if (window.showToast) window.showToast(msg, type);
  }

  async function loadHistory() {
    var hist = $("ocr-history");
    var supabase = window.supabaseClient;
    if (!supabase || !hist) return;

    var authResult = await supabase.auth.getUser();
    var user = authResult.data.user;
    if (!user) { hist.innerHTML = '<p class="text-sm text-bgray-400">Inicia sesi\u00F3n</p>'; return; }

    var queryResult = await supabase
      .from("expense_ocr_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    var logs = queryResult.data;
    if (!logs || logs.length === 0) {
      hist.innerHTML = '<p class="text-sm text-bgray-400 dark:text-bgray-300">No hay escaneos recientes</p>';
      return;
    }

    hist.innerHTML = logs.map(function (l) {
      var dt = new Date(l.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      var sc = l.status === "success"
        ? "bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-400"
        : l.status === "low_confidence"
          ? "bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400"
          : "bg-red-100 text-red-600 dark:bg-red-400/10 dark:text-red-400";
      var sl = l.status === "success" ? "OK" : l.status === "low_confidence" ? "Baja" : "Error";
      var v = l.vendor ? esc(l.vendor) : '<span class="italic text-bgray-400">Sin proveedor</span>';
      var a = l.total ? parseFloat(l.total).toFixed(2) + " " + (l.currency || "EUR") : "\u2014";
      return '<div class="flex items-center gap-3 rounded-xl border border-bgray-100 bg-bgray-50/50 px-3 py-2.5 sm:px-4 sm:py-3 dark:border-darkblack-400 dark:bg-darkblack-500">'
        + '<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ' + sc + '">' + sl + '</span>'
        + '<div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-bgray-900 dark:text-white">' + v + '</p><p class="text-xs text-bgray-400 dark:text-bgray-300">' + dt + '</p></div>'
        + '<span class="text-sm font-bold text-bgray-900 dark:text-white">' + a + '</span></div>';
    }).join("");
  }

  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  function init() {
    var fi = $("ocr-file-input");
    if (!fi) return;

    fi.addEventListener("change", function (e) { if (e.target.files[0]) handleFile(e.target.files[0]); });

    // Camera button (mobile)
    var cameraBtn = $("ocr-camera-btn");
    var cameraInput = $("ocr-camera-input");
    if (cameraBtn && cameraInput) {
      cameraBtn.addEventListener("click", function () { cameraInput.click(); });
      cameraInput.addEventListener("change", function (e) { if (e.target.files[0]) handleFile(e.target.files[0]); });
    }

    $("ocr-remove-file")?.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearAll();
    });
    $("ocr-scan-btn")?.addEventListener("click", doScan);
    $("ocr-save-btn")?.addEventListener("click", saveExpense);
    $("ocr-reset-btn")?.addEventListener("click", clearAll);
    $("ocr-scan-another")?.addEventListener("click", clearAll);

    // Contact autocomplete
    var contactInput = $("ocr-contact");
    if (contactInput) {
      contactInput.addEventListener("input", function () { handleContactSearch(this.value); });
      contactInput.addEventListener("focus", function () {
        if (this.value.trim().length >= 2) handleContactSearch(this.value);
      });
      document.addEventListener("click", function (e) {
        var results = $("ocr-contact-results");
        if (results && !results.contains(e.target) && e.target !== contactInput) {
          results.classList.add("hidden");
        }
      });
    }

    // Drag & drop
    var uploadPanel = $("panel-upload");
    var dropZone = $("ocr-drop-empty");
    if (uploadPanel) {
      ["dragenter", "dragover"].forEach(function (ev) {
        uploadPanel.addEventListener(ev, function (e) {
          e.preventDefault();
          if (dropZone && !dropZone.classList.contains("hidden")) dropZone.style.borderColor = "#22c55e";
        });
      });
      ["dragleave", "drop"].forEach(function (ev) {
        uploadPanel.addEventListener(ev, function (e) {
          e.preventDefault();
          if (dropZone) dropZone.style.borderColor = "#d1d5db";
        });
      });
      uploadPanel.addEventListener("drop", function (e) {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      });
    }

    loadHistory();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
