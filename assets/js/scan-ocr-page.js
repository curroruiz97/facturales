/**
 * Scan OCR Page — Upload → Scan → Review → Save as expense
 */
(function () {
  const MAX_SIZE = 10 * 1024 * 1024;
  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

  let selectedFile = null;
  let ocrData = null;

  const $ = (id) => document.getElementById(id);

  function setStep(n) {
    [1, 2, 3].forEach((i) => {
      const el = $("step-" + i);
      if (!el) return;
      el.classList.remove("active", "done");
      if (i < n) el.classList.add("done");
      if (i === n) el.classList.add("active");
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
    $("ocr-drop-file").classList.remove("hidden");
    $("ocr-scan-btn").disabled = false;
    showPanel("upload");
    setStep(1);
  }

  function clearAll() {
    selectedFile = null;
    ocrData = null;
    $("ocr-file-input").value = "";
    $("ocr-drop-empty").classList.remove("hidden");
    $("ocr-drop-file").classList.add("hidden");
    $("ocr-scan-btn").disabled = true;
    $("ocr-scan-text").textContent = "Escanear documento";
    $("ocr-progress").classList.add("hidden");
    $("ocr-status-msg").classList.add("hidden");
    showPanel("upload");
    setStep(1);
  }

  async function doScan() {
    if (!selectedFile) return;
    const supabase = window.supabaseClient;
    if (!supabase) { toast("Supabase no listo", "error"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast("Inicia sesión primero", "error"); return; }

    $("ocr-scan-btn").disabled = true;
    $("ocr-scan-text").textContent = "Analizando...";
    $("ocr-progress").classList.remove("hidden");
    setStatus("Subiendo archivo...");

    try {
      const ext = selectedFile.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("expense-ocr-temp")
        .upload(filePath, selectedFile, { contentType: selectedFile.type, upsert: false });
      if (upErr) throw new Error("Error subiendo: " + upErr.message);

      setStatus("Ejecutando OCR con inteligencia artificial...");

      const { data: rawData, error: fnErr } = await supabase.functions.invoke(
        "analyze-expense-document",
        { body: { filePath } },
      );

      if (fnErr) {
        let msg = "Error del servidor";
        try {
          if (fnErr.context) {
            const resp = fnErr.context;
            if (typeof resp.json === "function") {
              const b = await resp.json();
              if (b && b.error) msg = b.error;
            }
          }
        } catch (_) {}
        throw new Error(msg);
      }

      let body = rawData;
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
    const conf = d.confidence ?? 0;
    const veryLow = conf < 0.5;

    $("ocr-vendor").value = d.vendorName || "";
    $("ocr-invoice-num").value = d.invoiceNumber || "";
    $("ocr-total").value = (!veryLow && d.total != null) ? d.total : "";
    $("ocr-subtotal").value = (!veryLow && d.subtotal != null) ? d.subtotal : "";
    $("ocr-tax").value = (!veryLow && d.tax != null) ? d.tax : "";
    $("ocr-date").value = "";
    $("ocr-category").value = "otros";

    var conceptoAuto = "";
    if (d.vendorName) conceptoAuto = "Gasto " + d.vendorName;
    else conceptoAuto = "Gasto escaneado";
    $("ocr-concepto").value = conceptoAuto;

    if (!veryLow && d.invoiceDate) {
      const dt = new Date(d.invoiceDate);
      if (!isNaN(dt)) $("ocr-date").value = dt.toISOString().split("T")[0];
    }

    const pct = Math.round(conf * 100);
    const badge = $("ocr-confidence-badge");
    badge.textContent = pct + "% confianza";

    const low = $("ocr-low-confidence");
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

  async function saveExpense() {
    const concepto = $("ocr-concepto").value.trim();
    const vendor = $("ocr-vendor").value.trim();
    const invoiceNum = $("ocr-invoice-num").value.trim();
    const total = parseFloat($("ocr-total").value);
    const date = $("ocr-date").value;
    const category = $("ocr-category").value;

    if (!concepto) { toast("El concepto es obligatorio", "error"); return; }
    if (!total || total <= 0) { toast("Importe obligatorio y mayor que 0", "error"); return; }
    if (!date) { toast("La fecha es obligatoria", "error"); return; }

    const obsParts = [];
    if (vendor) obsParts.push("Prov: " + vendor);
    if (invoiceNum) obsParts.push("Fact: " + invoiceNum);
    const sub = $("ocr-subtotal").value;
    const tax = $("ocr-tax").value;
    if (sub) obsParts.push("Base: " + parseFloat(sub).toFixed(2) + " €");
    if (tax) obsParts.push("IVA: " + parseFloat(tax).toFixed(2) + " €");
    let observaciones = obsParts.join(" | ");
    if (observaciones.length > 150) observaciones = observaciones.substring(0, 150);

    $("ocr-save-btn").disabled = true;
    $("ocr-save-btn").textContent = "Guardando...";

    try {
      if (!window.createTransaction) throw new Error("createTransaction no disponible");

      const result = await window.createTransaction({
        concepto: concepto,
        importe: total,
        fecha: date,
        categoria: category,
        tipo: "gasto",
        observaciones: observaciones || null,
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
    const el = $("ocr-status-msg");
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function toast(msg, type) {
    if (window.showToast) window.showToast(msg, type);
  }

  async function loadHistory() {
    const hist = $("ocr-history");
    const supabase = window.supabaseClient;
    if (!supabase || !hist) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { hist.innerHTML = '<p class="text-sm text-bgray-400">Inicia sesión</p>'; return; }

    const { data: logs } = await supabase
      .from("expense_ocr_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!logs || logs.length === 0) {
      hist.innerHTML = '<p class="text-sm text-bgray-400 dark:text-bgray-300">No hay escaneos recientes</p>';
      return;
    }

    hist.innerHTML = logs.map((l) => {
      const dt = new Date(l.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const sc = l.status === "success"
        ? "bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-400"
        : l.status === "low_confidence"
          ? "bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400"
          : "bg-red-100 text-red-600 dark:bg-red-400/10 dark:text-red-400";
      const sl = l.status === "success" ? "OK" : l.status === "low_confidence" ? "Baja" : "Error";
      const v = l.vendor ? esc(l.vendor) : '<span class="italic text-bgray-400">Sin proveedor</span>';
      const a = l.total ? parseFloat(l.total).toFixed(2) + " " + (l.currency || "EUR") : "—";
      return '<div class="flex items-center gap-3 rounded-xl border border-bgray-100 bg-bgray-50/50 px-4 py-3 dark:border-darkblack-400 dark:bg-darkblack-500">'
        + '<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ' + sc + '">' + sl + '</span>'
        + '<div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-bgray-900 dark:text-white">' + v + '</p><p class="text-xs text-bgray-400 dark:text-bgray-300">' + dt + '</p></div>'
        + '<span class="text-sm font-bold text-bgray-900 dark:text-white">' + a + '</span></div>';
    }).join("");
  }

  function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  function init() {
    const fi = $("ocr-file-input");
    if (!fi) return;

    fi.addEventListener("change", (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });

    $("ocr-remove-file")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearAll();
    });
    $("ocr-scan-btn")?.addEventListener("click", doScan);
    $("ocr-save-btn")?.addEventListener("click", saveExpense);
    $("ocr-reset-btn")?.addEventListener("click", clearAll);
    $("ocr-scan-another")?.addEventListener("click", clearAll);

    const dropZone = $("ocr-drop-empty");
    const uploadPanel = $("panel-upload");
    if (uploadPanel) {
      ["dragenter", "dragover"].forEach((ev) => uploadPanel.addEventListener(ev, (e) => {
        e.preventDefault();
        if (dropZone && !dropZone.classList.contains("hidden")) dropZone.style.borderColor = "#22c55e";
      }));
      ["dragleave", "drop"].forEach((ev) => uploadPanel.addEventListener(ev, (e) => {
        e.preventDefault();
        if (dropZone) dropZone.style.borderColor = "#d1d5db";
      }));
      uploadPanel.addEventListener("drop", (e) => {
        if (e.dataTransfer?.files?.[0]) handleFile(e.dataTransfer.files[0]);
      });
    }

    loadHistory();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
