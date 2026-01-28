/**
 * Invoice Management JavaScript
 * Funciones para gestión de facturas y formularios
 */

// ============================================
// UTILIDADES Y FORMATEO
// ============================================

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value || 0);

const parseNumber = (value) => {
  if (typeof value !== "string") return Number(value) || 0;
  return Number(value.replace(/,/g, ".")) || 0;
};

// ============================================
// CÁLCULOS DE TOTALES
// ============================================

const updateTotals = () => {
  const lines = document.querySelectorAll(".invoice-line");
  let subtotal = 0;
  let ivaTotal = 0;
  let irpfTotal = 0;

  lines.forEach((line) => {
    const quantity = parseNumber(
      line.querySelector(".line-quantity")?.value
    );
    const price = parseNumber(line.querySelector(".line-price")?.value);
    const ivaRate = parseNumber(line.querySelector(".line-iva")?.value);
    const irpfRate = parseNumber(
      line.querySelector(".line-irpf")?.value
    );

    const base = quantity * price;
    const iva = (base * ivaRate) / 100;
    const irpf = (base * irpfRate) / 100;
    const total = base + iva - irpf;

    subtotal += base;
    ivaTotal += iva;
    irpfTotal += irpf;

    const totalElement = line.querySelector(".line-total");
    if (totalElement) {
      totalElement.textContent = formatCurrency(total);
    }
  });

  // Actualizar resumen si existe
  const summarySubtotal = document.getElementById("summary-subtotal");
  const summaryIva = document.getElementById("summary-iva");
  const summaryIrpf = document.getElementById("summary-irpf");
  const summaryTotal = document.getElementById("summary-total");

  if (summarySubtotal) summarySubtotal.textContent = formatCurrency(subtotal);
  if (summaryIva) summaryIva.textContent = formatCurrency(ivaTotal);
  if (summaryIrpf) summaryIrpf.textContent = formatCurrency(irpfTotal);
  if (summaryTotal) summaryTotal.textContent = formatCurrency(subtotal + ivaTotal - irpfTotal);
};

const updateIrpfState = (type) => {
  const irpfEnabled = type === "autonomo";
  document.querySelectorAll(".line-irpf").forEach((select) => {
    select.disabled = !irpfEnabled;
    if (!irpfEnabled) {
      select.value = "0";
    }
  });
  updateTotals();
};

// ============================================
// GESTIÓN DE LÍNEAS DE FACTURA
// ============================================

const attachLineListeners = (line) => {
  line.querySelectorAll("input, select").forEach((input) => {
    input.addEventListener("input", updateTotals);
    input.addEventListener("change", updateTotals);
  });

  const removeButton = line.querySelector(".remove-line");
  if (removeButton) {
    removeButton.addEventListener("click", () => {
      const lines = document.querySelectorAll(".invoice-line");
      if (lines.length > 1) {
        line.remove();
        updateTotals();
      }
    });
  }
};

const addLine = () => {
  const container = document.getElementById("invoice-lines");
  const firstLine = container.querySelector(".invoice-line");
  if (!firstLine) return;
  
  const clone = firstLine.cloneNode(true);
  
  clone.querySelectorAll("input").forEach((input) => {
    if (input.classList.contains("line-quantity")) {
      input.value = "1";
    } else if (input.classList.contains("line-price")) {
      input.value = "0";
    } else {
      input.value = "";
    }
  });
  
  clone.querySelectorAll("select").forEach((select) => {
    if (select.classList.contains("line-iva")) {
      select.value = "21";
    } else {
      select.value = "0";
    }
  });
  
  const lineTotal = clone.querySelector(".line-total");
  if (lineTotal) lineTotal.textContent = "€0,00";
  
  container.appendChild(clone);
  attachLineListeners(clone);
  updateTotals();
};

// ============================================
// OPCIONES AVANZADAS
// ============================================

function toggleAdvancedOptions() {
  const content = document.getElementById('advanced-options-content');
  const arrow = document.getElementById('arrow-advanced-options');
  if (content && arrow) {
    content.classList.toggle('hidden');
    arrow.classList.toggle('rotate-180');
  }
}

function toggleConditionalField(checkboxId, fieldId) {
  const checkbox = document.getElementById(checkboxId);
  const field = document.getElementById(fieldId);
  if (checkbox && field) {
    if (checkbox.checked) {
      field.classList.remove('hidden');
    } else {
      field.classList.add('hidden');
    }
  }
}

// ============================================
// GESTIÓN DE CLIENTES
// ============================================

function toggleClientDropdown() {
  const dropdown = document.getElementById('client-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

function filterClients(searchTerm) {
  const options = document.querySelectorAll('.client-option');
  const term = searchTerm.toLowerCase();
  
  options.forEach(option => {
    const name = option.dataset.name?.toLowerCase() || '';
    const nif = option.dataset.nif?.toLowerCase() || '';
    
    if (name.includes(term) || nif.includes(term)) {
      option.classList.remove('hidden');
    } else {
      option.classList.add('hidden');
    }
  });
}

function selectClient(name, nif, address) {
  const clientName = document.getElementById('client-name');
  const clientNif = document.getElementById('client-nif');
  const clientAddress = document.getElementById('client-address');
  const dropdown = document.getElementById('client-dropdown');
  
  if (clientName) clientName.value = name;
  if (clientNif) clientNif.value = nif;
  if (clientAddress) clientAddress.value = address;
  if (dropdown) dropdown.classList.add('hidden');
}

function openCreateClientModal() {
  const modal = document.getElementById('create-client-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  
  const dropdown = document.getElementById('client-dropdown');
  if (dropdown) dropdown.classList.add('hidden');
}

function closeCreateClientModal() {
  const modal = document.getElementById('create-client-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  
  // Limpiar formulario
  const form = modal?.querySelector('form');
  if (form) form.reset();
}

function saveNewClient(event) {
  event.preventDefault();
  
  const name = document.getElementById('new-client-name')?.value;
  const nif = document.getElementById('new-client-nif')?.value;
  const email = document.getElementById('new-client-email')?.value;
  const address = document.getElementById('new-client-address')?.value;
  
  // Rellenar los campos del formulario principal
  const clientName = document.getElementById('client-name');
  const clientNif = document.getElementById('client-nif');
  const clientEmail = document.getElementById('client-email');
  const clientAddress = document.getElementById('client-address');
  
  if (clientName) clientName.value = name || '';
  if (clientNif) clientNif.value = nif || '';
  if (clientEmail) clientEmail.value = email || '';
  if (clientAddress) clientAddress.value = address || '';
  
  // Cerrar modal
  closeCreateClientModal();
  
  // Mostrar mensaje de éxito
  alert('Cliente creado y añadido correctamente');
}

// ============================================
// GESTIÓN DE MÉTODOS DE PAGO
// ============================================

function openPaymentMethodModal() {
  const modal = document.getElementById('payment-method-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closePaymentMethodModal() {
  const modal = document.getElementById('payment-method-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  
  // Limpiar selección
  document.querySelectorAll('input[name="payment-method"]').forEach(input => {
    input.checked = false;
  });
  
  // Ocultar todos los campos condicionales
  const transferenciaFields = document.getElementById('transferencia-fields');
  const bizumFields = document.getElementById('bizum-fields');
  
  if (transferenciaFields) transferenciaFields.classList.add('hidden');
  if (bizumFields) bizumFields.classList.add('hidden');
}

function onPaymentMethodChange(method) {
  // Ocultar todos los campos condicionales
  const transferenciaFields = document.getElementById('transferencia-fields');
  const bizumFields = document.getElementById('bizum-fields');
  
  if (transferenciaFields) transferenciaFields.classList.add('hidden');
  if (bizumFields) bizumFields.classList.add('hidden');
  
  // Mostrar campos según el método seleccionado
  if (method === 'transferencia' && transferenciaFields) {
    transferenciaFields.classList.remove('hidden');
  } else if (method === 'bizum' && bizumFields) {
    bizumFields.classList.remove('hidden');
  }
}

function addPaymentMethod() {
  const selectedMethod = document.querySelector('input[name="payment-method"]:checked');
  
  if (!selectedMethod) {
    alert('Por favor, selecciona un método de pago');
    return;
  }
  
  // Aquí puedes agregar la lógica para guardar el método de pago
  console.log('Método de pago seleccionado:', selectedMethod.value);
  
  // Cerrar el modal
  closePaymentMethodModal();
  
  // Mostrar mensaje de éxito o actualizar la interfaz
  alert('Método de pago añadido correctamente');
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  // Inicializar Flatpickr (calendario en español)
  if (window.flatpickr) {
    window.flatpickr(".js-date", {
      dateFormat: "d/m/Y",
      locale: {
        weekdays: {
          shorthand: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
          longhand: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
        },
        months: {
          shorthand: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
          longhand: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        },
        firstDayOfWeek: 1,
        rangeSeparator: " a ",
        weekAbbreviation: "Sem",
        scrollTitle: "Desplazar para aumentar",
        toggleTitle: "Click para cambiar",
        time_24hr: true
      }
    });
  }

  // Botón añadir línea
  const addLineBtn = document.getElementById("add-line");
  if (addLineBtn) {
    addLineBtn.addEventListener("click", addLine);
  }

  // Inicializar listeners de líneas existentes
  document.querySelectorAll(".invoice-line").forEach(attachLineListeners);

  // Gestión de clientes
  const clientSearch = document.getElementById("client-search");
  const clientOptions = Array.from(document.querySelectorAll(".client-option"));
  const clientName = document.getElementById("client-name");
  const clientNif = document.getElementById("client-nif");
  const clientAddress = document.getElementById("client-address");
  const clientType = document.getElementById("client-type");

  clientOptions.forEach((option) => {
    option.addEventListener("click", () => {
      if (clientName) clientName.value = option.dataset.name || "";
      if (clientNif) clientNif.value = option.dataset.nif || "";
      if (clientAddress) clientAddress.value = option.dataset.address || "";
      
      const type = option.dataset.type || "empresa";
      if (clientType) clientType.value = type;
      updateIrpfState(type);
    });
  });

  if (clientSearch) {
    clientSearch.addEventListener("input", (event) => {
      const value = event.target.value.toLowerCase();
      clientOptions.forEach((option) => {
        const text = option.textContent.toLowerCase();
        option.classList.toggle("hidden", !text.includes(value));
      });
    });
  }

  if (clientType) {
    clientType.addEventListener("change", (event) => {
      updateIrpfState(event.target.value);
    });
  }

  // Cerrar dropdown al hacer clic fuera
  document.addEventListener('click', function(event) {
    const clientNameInput = document.getElementById('client-name');
    const dropdown = document.getElementById('client-dropdown');
    
    if (clientNameInput && dropdown && 
        !clientNameInput.contains(event.target) && 
        !dropdown.contains(event.target)) {
      dropdown.classList.add('hidden');
    }
  });

  // Cerrar modales con botones de cierre
  document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', function() {
      const modal = this.closest('[class*="modal"]');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    });
  });

  // Actualizar totales al cargar
  updateTotals();
});

// ============================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================

// Hacer funciones disponibles globalmente para onclick handlers
window.toggleAdvancedOptions = toggleAdvancedOptions;
window.toggleConditionalField = toggleConditionalField;
window.toggleClientDropdown = toggleClientDropdown;
window.filterClients = filterClients;
window.selectClient = selectClient;
window.openCreateClientModal = openCreateClientModal;
window.closeCreateClientModal = closeCreateClientModal;
window.saveNewClient = saveNewClient;
window.openPaymentMethodModal = openPaymentMethodModal;
window.closePaymentMethodModal = closePaymentMethodModal;
window.onPaymentMethodChange = onPaymentMethodChange;
window.addPaymentMethod = addPaymentMethod;
