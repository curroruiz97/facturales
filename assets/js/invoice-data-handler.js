/**
 * Sistema para capturar y transferir datos de factura entre páginas
 */

class InvoiceDataHandler {
  constructor() {
    this.storageKey = 'invoice_draft_data';
  }

  /**
   * Captura todos los datos del formulario de factura
   */
  captureFormData() {
    // Capturar conceptos primero (necesarios para calcular el resumen)
    const concepts = this.captureConceptsData();
    const expenses = this.captureExpensesData();
    
    const formData = {
      issuer: this.captureIssuerData(),
      client: this.captureClientData(),
      invoice: this.captureInvoiceData(),
      concepts: concepts,
      expenses: expenses,
      taxSettings: this.captureTaxSettings(),
      paymentMethods: this.capturePaymentMethods(),
      observations: this.captureObservations(),
      summary: this.captureSummary()
    };

    return formData;
  }

  /**
   * Captura datos del emisor
   */
  captureIssuerData() {
    return {
      name: document.getElementById('issuer-name')?.value || '',
      nif: document.getElementById('issuer-nif')?.value || '',
      email: document.getElementById('issuer-email')?.value || '',
      address: document.getElementById('issuer-address')?.value || '',
      postalCode: document.getElementById('issuer-postal-code')?.value || ''
    };
  }

  /**
   * Captura datos del cliente
   */
  captureClientData() {
    return {
      name: document.getElementById('client-name')?.value || '',
      nif: document.getElementById('client-nif')?.value || '',
      email: document.getElementById('client-email')?.value || '',
      address: document.getElementById('client-address')?.value || '',
      postalCode: document.getElementById('client-postal-code')?.value || ''
    };
  }

  /**
   * Captura datos de la factura
   */
  captureInvoiceData() {
    return {
      series: document.getElementById('invoice-series')?.value || 'A',
      number: document.getElementById('invoice-number')?.value || this.generateInvoiceNumber(),
      reference: document.getElementById('invoice-reference')?.value || '',
      issueDate: document.getElementById('issue-date')?.value || this.getCurrentDate(),
      dueDate: document.getElementById('due-date')?.value || this.getDefaultDueDate()
    };
  }

  /**
   * Captura conceptos/líneas de factura
   */
  captureConceptsData() {
    const concepts = [];
    // Buscar todas las líneas de concepto por su estructura
    const conceptContainers = document.querySelectorAll('#invoice-lines > div.rounded-lg');
    
    conceptContainers.forEach((line, index) => {
      const inputs = line.querySelectorAll('input');
      const selects = line.querySelectorAll('select');
      
      // Asumiendo el orden: Descripción, Cantidad, Precio, [Select de impuestos], Descuento, Total
      const description = inputs[0]?.value || '';
      const quantity = parseFloat(inputs[1]?.value) || 0;
      const unitPrice = parseFloat(inputs[2]?.value) || 0;
      const discount = parseFloat(inputs[3]?.value) || 0;
      
      // Extraer tasa de impuestos del select (formato: TIPO_VALOR, ej: IVA_21, IGIC_9.5, IPSI_0.5, IRPF_-2)
      const taxSelect = selects[0];
      const taxValue = taxSelect?.value || 'IVA_21';
      let tax = 0;
      let taxLabel = taxValue; // Guardar label original para el PDF
      if (taxValue === 'EXENTO') {
        tax = 0;
      } else {
        const parts = taxValue.split('_');
        tax = parseFloat(parts[1]) || 0;
      }
      
      // Verificar si el recargo de equivalencia está activado
      const reCheckbox = document.getElementById('recargo-equivalencia');
      const applyRE = reCheckbox?.checked || false;
      
      // Calcular RE según el IVA solo si está activado
      let re = 0;
      if (applyRE) {
        if (tax === 21) re = 5.2;
        else if (tax === 10) re = 1.4;
        else if (tax === 4) re = 0.5;
      }
      
      // Calcular total
      const subtotal = quantity * unitPrice * (1 - discount / 100);
      const taxAmount = subtotal * (tax / 100);
      const reAmount = subtotal * (re / 100);
      const total = subtotal + taxAmount + reAmount;
      
      if (description || quantity > 0 || unitPrice > 0) {
        concepts.push({
          description: description || 'Producto/Servicio',
          quantity,
          unitPrice,
          discount,
          tax,
          taxLabel,
          taxRate: Math.abs(tax),
          re,
          total
        });
      }
    });
    
    // Si no hay conceptos, añadir uno por defecto
    if (concepts.length === 0) {
      concepts.push({
        description: 'Sin conceptos',
        quantity: 0,
        unitPrice: 0,
        tax: 0,
        re: 0,
        total: 0
      });
    }
    
    return concepts;
  }

  /**
   * Captura gastos suplidos
   */
  captureExpensesData() {
    const expenses = [];
    
    const checkbox = document.getElementById('gastos-suplidos');
    if (!checkbox?.checked) return expenses;
    
    const container = document.getElementById('gastos-suplidos-fields');
    if (!container || container.classList.contains('hidden')) return expenses;
    
    const descInput = document.getElementById('gastos-suplidos-description');
    const amountInput = document.getElementById('gastos-suplidos-amount');
    
    const description = descInput?.value || 'Gasto suplido';
    const amount = parseFloat(amountInput?.value) || 0;
    
    if (amount > 0) {
      expenses.push({ description, amount });
    }
    
    return expenses;
  }

  /**
   * Captura configuración fiscal
   */
  captureTaxSettings() {
    return {
      taxType: document.getElementById('tax-type')?.value || 'iva',
      retentionRate: parseFloat(document.getElementById('withholding')?.value) || 0,
      applyRE: document.getElementById('recargo-equivalencia')?.checked || false
    };
  }

  /**
   * Captura métodos de pago
   */
  capturePaymentMethods() {
    const methods = [];
    const methodBadges = document.querySelectorAll('#payment-methods-list > .payment-method-badge, #payment-methods-list > div');
    
    methodBadges.forEach(badge => {
      // Preferir data-attributes (fiables) sobre regex de texto
      const type = badge.getAttribute('data-type');
      const iban = badge.getAttribute('data-iban');
      const phone = badge.getAttribute('data-phone');
      
      if (type) {
        const method = { type: type };
        if (iban) method.iban = iban;
        if (phone) method.phone = phone;
        methods.push(method);
      } else {
        // Fallback: análisis de texto para badges legacy
        const text = badge.textContent.trim();
        if (text.includes('Transferencia')) {
          // Buscar IBAN en sub-elemento o texto
          const infoEl = badge.querySelector('.text-xs');
          const ibanText = infoEl ? infoEl.textContent.trim() : '';
          methods.push({ type: 'transferencia', iban: ibanText });
        } else if (text.includes('Bizum')) {
          const infoEl = badge.querySelector('.text-xs');
          const phoneText = infoEl ? infoEl.textContent.trim() : '';
          methods.push({ type: 'bizum', phone: phoneText });
        } else if (text.includes('Efectivo')) {
          methods.push({ type: 'efectivo' });
        } else if (text.includes('Domiciliación')) {
          methods.push({ type: 'domiciliacion' });
        } else if (text.includes('Contrareembolso')) {
          methods.push({ type: 'contrareembolso' });
        } else if (text.includes('Otro')) {
          methods.push({ type: 'otro' });
        }
      }
    });
    
    return methods;
  }

  /**
   * Captura observaciones
   */
  captureObservations() {
    const obsContainer = document.getElementById('observaciones-field');
    if (!obsContainer || obsContainer.classList.contains('hidden')) {
      return '';
    }
    const textarea = obsContainer.querySelector('textarea');
    return textarea?.value || '';
  }

  /**
   * Captura el resumen financiero
   */
  captureSummary() {
    // CALCULAR los valores basándose en los conceptos capturados
    const concepts = this.captureConceptsData();
    const expenses = this.captureExpensesData();
    
    // Calcular subtotal de conceptos
    let subtotal = 0;
    let taxBase = 0;
    let taxAmount = 0;
    let reAmount = 0;
    let taxRate = 0;
    
    let totalDiscounts = 0;
    
    concepts.forEach(concept => {
      // Aplicar descuento individual del producto
      const conceptSubtotalBeforeDiscount = concept.quantity * concept.unitPrice;
      const discountAmount = conceptSubtotalBeforeDiscount * ((concept.discount || 0) / 100);
      const conceptSubtotal = conceptSubtotalBeforeDiscount - discountAmount;
      
      subtotal += conceptSubtotalBeforeDiscount;
      totalDiscounts += discountAmount;
      
      // Calcular impuestos sobre el subtotal con descuento aplicado
      const conceptTaxAmount = conceptSubtotal * (concept.tax / 100);
      const conceptReAmount = conceptSubtotal * (concept.re / 100);
      
      taxBase += conceptSubtotal;
      taxAmount += conceptTaxAmount;
      reAmount += conceptReAmount;
      
      // Usar la tasa más alta encontrada
      if (concept.tax > taxRate) {
        taxRate = concept.tax;
      }
    });
    
    // Calcular gastos suplidos
    let expensesTotal = 0;
    expenses.forEach(expense => {
      expensesTotal += expense.amount;
    });
    
    // Capturar descuento general
    const generalDiscountInput = document.getElementById('discount');
    const generalDiscount = parseFloat(generalDiscountInput?.value) || 0;
    const generalDiscountAmount = taxBase * (generalDiscount / 100);
    
    // Aplicar descuento general proporcionalmente a la base imponible y a los impuestos ya calculados
    const discountMultiplier = 1 - (generalDiscount / 100);
    const finalTaxBase = taxBase * discountMultiplier;
    const finalTaxAmount = taxAmount * discountMultiplier;
    const finalReAmount = reAmount * discountMultiplier;
    
    totalDiscounts += generalDiscountAmount;
    
    // Obtener retención desde el formulario si existe
    const retentionSelect = document.getElementById('withholding');
    const retentionRate = parseFloat(retentionSelect?.value) || 0;
    const retentionAmount = finalTaxBase * (retentionRate / 100);
    
    // Calcular total
    const total = finalTaxBase + finalTaxAmount + finalReAmount + expensesTotal - retentionAmount;
    
    // Obtener cantidad pagada si existe
    const paidInput = document.getElementById('paid-amount');
    const paid = parseFloat(paidInput?.value) || 0;
    
    const totalToPay = total - paid;
    
    return {
      subtotal,
      discount: totalDiscounts,
      taxBase: finalTaxBase,
      taxRate,
      taxAmount: finalTaxAmount,
      reRate: 5.2,
      reAmount: finalReAmount,
      retentionRate,
      retentionAmount,
      expenses: expensesTotal,
      total,
      paid,
      totalToPay
    };
  }

  /**
   * Parsea un string de cantidad a número
   */
  parseAmount(text) {
    if (!text) return 0;
    // Remover el símbolo € y espacios
    let cleaned = text.replace(/€/g, '').replace(/\s/g, '');
    // Reemplazar punto de miles por nada y coma decimal por punto
    cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    // Parsear
    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : value;
  }

  /**
   * Guarda los datos en localStorage
   */
  saveToStorage(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error guardando datos:', error);
      return false;
    }
  }

  /**
   * Carga los datos desde localStorage
   */
  loadFromStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error cargando datos:', error);
      return null;
    }
  }

  /**
   * Limpia los datos del storage
   */
  clearStorage() {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Genera un número de factura automático
   */
  generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000);
    return `F${year}${random}`;
  }

  /**
   * Obtiene la fecha actual en formato dd/mm/yyyy
   */
  getCurrentDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Obtiene una fecha de vencimiento por defecto (30 días)
   */
  getDefaultDueDate() {
    const now = new Date();
    now.setDate(now.getDate() + 30);
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Navega a la página de preview con los datos
   */
  goToPreview() {
    const data = this.captureFormData();
    if (this.saveToStorage(data)) {
      window.location.href = 'preview.html';
    } else {
      alert('Error al guardar los datos de la factura');
    }
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.InvoiceDataHandler = InvoiceDataHandler;
}
