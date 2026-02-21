/**
 * Scan OCR Page
 * Upload, scan, preview & save expenses from invoices/receipts via Azure DI
 */
(function () {
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  let selectedFile = null;
  let ocrData = null;

  // DOM refs (lazy)
  const $ = (id) => document.getElementById(id);

  function refs() {
    return {
      zone: $("ocr-upload-zone"),
      fileInput: $("ocr-file-input"),
      preview: $("ocr-preview"),
      fileName: $("ocr-file-name"),
      fileSize: $("ocr-file-size"),
      removeBtn: $("ocr-remove-file"),
      scanBtn: $("ocr-scan-btn"),
      scanText: $("ocr-scan-text"),
      spinner: $("ocr-spinner"),
      results: $("ocr-results"),
      lowConf: $("ocr-low-confidence"),
      vendor: $("ocr-vendor"),
      invoiceNum: $("ocr-invoice-num"),
      total: $("ocr-total"),
      date: $("ocr-date"),
      subtotal: $("ocr-subtotal"),
      tax: $("ocr-tax"),
      confBadge: $("ocr-confidence-badge"),
      saveBtn: $("ocr-save-btn"),
      resetBtn: $("ocr-reset-btn"),
      history: $("ocr-history"),
    };
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  function handleFileSelect(file) {
    const r = refs();
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      window.showToast &&
        window.showToast(
          "Formato no soportado. Usa JPG, PNG, WEBP o PDF.",
          "error",
        );
      return;
    }
    if (file.size > MAX_SIZE) {
      window.showToast &&
        window.showToast("El archivo supera los 10 MB.", "error");
      return;
    }

    selectedFile = file;
    r.fileName.textContent = file.name;
    r.fileSize.textContent = formatBytes(file.size);
    r.preview.classList.remove("hidden");
    r.scanBtn.disabled = false;

    r.results.classList.add("hidden");
    ocrData = null;
  }

  function clearFile() {
    const r = refs();
    selectedFile = null;
    ocrData = null;
    r.fileInput.value = "";
    r.preview.classList.add("hidden");
    r.scanBtn.disabled = true;
    r.results.classList.add("hidden");
  }

  async function uploadAndScan() {
    const r = refs();
    if (!selectedFile) return;

    const supabase = window.supabaseClient;
    if (!supabase) {
      window.showToast && window.showToast("Cliente Supabase no listo", "error");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.showToast && window.showToast("Inicia sesión primero", "error");
      return;
    }

    r.scanBtn.disabled = true;
    r.scanText.textContent = "Escaneando...";
    r.spinner.classList.remove("hidden");
    r.results.classList.add("hidden");

    try {
      const ext = selectedFile.name.split(".").pop() || "jpg";
      const uuid = crypto.randomUUID();
      const filePath = `${user.id}/${uuid}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("expense-ocr-temp")
        .upload(filePath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (upErr) throw new Error("Error subiendo archivo: " + upErr.message);

      const { data, error: fnErr } = await supabase.functions.invoke(
        "analyze-expense-document",
        { body: { filePath } },
      );

      if (fnErr) {
        let detail = fnErr.message || "Error del servidor OCR";
        try {
          if (fnErr.context && typeof fnErr.context.json === "function") {
            const errBody = await fnErr.context.json();
            if (errBody && errBody.error) detail = errBody.error;
          }
        } catch (_) {}
        console.error("Edge Function error detail:", detail, fnErr);
        throw new Error(detail);
      }
      if (data && data.error) throw new Error(data.error);

      const body = data;

      ocrData = body;
      showResults(body);
    } catch (err) {
      console.error("OCR scan error:", err);
      window.showToast &&
        window.showToast(err.message || "Error al escanear", "error");
    } finally {
      r.scanBtn.disabled = false;
      r.scanText.textContent = "Escanear documento";
      r.spinner.classList.add("hidden");
    }
  }

  function showResults(data) {
    const r = refs();
    r.results.classList.remove("hidden");

    const veryLow = (data.confidence ?? 0) < 0.5;

    r.vendor.value = data.vendorName || "";
    r.invoiceNum.value = data.invoiceNumber || "";

    if (veryLow) {
      r.total.value = "";
      r.date.value = "";
      r.subtotal.value = "";
      r.tax.value = "";
    } else {
      r.total.value = data.total != null ? data.total : "";
      r.subtotal.value = data.subtotal != null ? data.subtotal : "";
      r.tax.value = data.tax != null ? data.tax : "";
      if (data.invoiceDate) {
        const d = new Date(data.invoiceDate);
        if (!isNaN(d)) r.date.value = d.toISOString().split("T")[0];
      }
    }

    const conf = data.confidence ?? 0;
    const pct = Math.round(conf * 100);

    if (conf < 0.5) {
      r.lowConf.classList.remove("hidden");
      r.lowConf.querySelector("span").textContent =
        "Confianza muy baja \u2014 importe y fecha no autocompletados. Revisa todo manualmente.";
      r.confBadge.className =
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-error-100 text-error-300 dark:bg-error-300/10 dark:text-error-300";
    } else if (conf < 0.65) {
      r.lowConf.classList.remove("hidden");
      r.lowConf.querySelector("span").textContent =
        "Confianza baja \u2014 revisa los datos antes de guardar";
      r.confBadge.className =
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-warning-100 text-warning-600 dark:bg-warning-300/10 dark:text-warning-300";
    } else if (conf < 0.85) {
      r.lowConf.classList.add("hidden");
      r.confBadge.className =
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300";
    } else {
      r.lowConf.classList.add("hidden");
      r.confBadge.className =
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-success-100 text-success-600 dark:bg-success-300/10 dark:text-success-300";
    }
    r.confBadge.textContent = pct + "%";

    r.results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveAsExpense() {
    const r = refs();
    const vendor = r.vendor.value.trim();
    const invoiceNum = r.invoiceNum.value.trim();
    const total = parseFloat(r.total.value);
    const date = r.date.value;

    if (!total || total <= 0) {
      window.showToast &&
        window.showToast("El importe es obligatorio y debe ser mayor que 0", "error");
      return;
    }
    if (!date) {
      window.showToast &&
        window.showToast("La fecha es obligatoria", "error");
      return;
    }

    let concepto = vendor || "Gasto escaneado";
    if (invoiceNum) concepto += ` (${invoiceNum})`;

    const txData = {
      concepto,
      importe: total,
      fecha: date,
      categoria: "otros",
      tipo: "gasto",
      observaciones: buildObservaciones(r),
    };

    try {
      if (!window.createTransaction)
        throw new Error("createTransaction no disponible");

      const result = await window.createTransaction(txData);
      if (result.error) throw new Error(result.error.message || "Error al guardar");

      window.showToast &&
        window.showToast("Gasto guardado correctamente", "success");

      clearFile();
      loadHistory();
    } catch (err) {
      console.error("Save expense error:", err);
      window.showToast &&
        window.showToast(err.message || "Error al guardar el gasto", "error");
    }
  }

  function buildObservaciones(r) {
    const parts = [];
    const sub = r.subtotal.value;
    const tax = r.tax.value;
    if (sub) parts.push("Base: " + parseFloat(sub).toFixed(2) + " €");
    if (tax) parts.push("IVA: " + parseFloat(tax).toFixed(2) + " €");
    if (ocrData && ocrData.confidence != null)
      parts.push("OCR conf: " + Math.round(ocrData.confidence * 100) + "%");
    const obs = parts.join(" | ");
    return obs.length > 150 ? obs.substring(0, 150) : obs;
  }

  async function loadHistory() {
    const r = refs();
    const supabase = window.supabaseClient;
    if (!supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      r.history.innerHTML =
        '<p class="text-sm text-bgray-400">Inicia sesión para ver el historial</p>';
      return;
    }

    const { data: logs, error } = await supabase
      .from("expense_ocr_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !logs || logs.length === 0) {
      r.history.innerHTML =
        '<p class="text-sm text-bgray-400 dark:text-bgray-300">No hay escaneos recientes</p>';
      return;
    }

    r.history.innerHTML = logs
      .map((log) => {
        const date = new Date(log.created_at).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const statusColor =
          log.status === "success"
            ? "bg-success-100 text-success-600 dark:bg-success-300/10 dark:text-success-300"
            : log.status === "low_confidence"
              ? "bg-warning-100 text-warning-600 dark:bg-warning-300/10 dark:text-warning-300"
              : "bg-error-100 text-error-300 dark:bg-error-300/10 dark:text-error-300";
        const statusLabel =
          log.status === "success"
            ? "OK"
            : log.status === "low_confidence"
              ? "Baja conf."
              : "Error";
        const vendor = log.vendor
          ? escapeHtml(log.vendor)
          : '<span class="italic">Sin proveedor</span>';
        const amount = log.total
          ? parseFloat(log.total).toFixed(2) + " " + (log.currency || "€")
          : "—";

        return `
        <div class="flex items-center gap-3 rounded-lg border border-bgray-200 bg-white p-3 dark:border-darkblack-400 dark:bg-darkblack-600">
          <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor}">${statusLabel}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-bgray-900 dark:text-white">${vendor}</p>
            <p class="text-xs text-bgray-500 dark:text-bgray-300">${date}</p>
          </div>
          <span class="text-sm font-semibold text-bgray-900 dark:text-white">${amount}</span>
        </div>`;
      })
      .join("");
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // Drag & drop styling
  function initDragDrop() {
    const r = refs();
    const zone = r.zone;
    if (!zone) return;

    ["dragenter", "dragover"].forEach((evt) =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.add("border-success-300", "bg-success-50/50");
        zone.classList.remove("border-bgray-300");
      }),
    );

    ["dragleave", "drop"].forEach((evt) =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.remove("border-success-300", "bg-success-50/50");
        zone.classList.add("border-bgray-300");
      }),
    );

    zone.addEventListener("drop", (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFileSelect(file);
    });
  }

  function init() {
    const r = refs();
    if (!r.fileInput) return;

    r.fileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    });

    r.removeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      clearFile();
    });

    r.scanBtn?.addEventListener("click", uploadAndScan);
    r.saveBtn?.addEventListener("click", saveAsExpense);
    r.resetBtn?.addEventListener("click", clearFile);

    initDragDrop();
    loadHistory();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
