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
      name: document.getElementById('issuer-name')?.value || 'avenue sl',
      cif: document.getElementById('issuer-cif')?.value || '87082987',
      address: document.getElementById('issuer-address')?.value || 'Valladolid, España',
      phone: document.getElementById('issuer-phone')?.value || '655658565'
    };
  }

  /**
   * Captura datos del cliente
   */
  captureClientData() {
    // Buscar el dropdown del cliente seleccionado
    const clientDropdown = document.getElementById('client-dropdown');
    const selectedClient = clientDropdown?.querySelector('[data-selected="true"]');
    
    return {
      name: selectedClient?.querySelector('.font-semibold')?.textContent || 
            document.getElementById('client-name')?.value || 
            'AVENUE DIGITAL GROUP SL',
      cif: document.getElementById('client-nif')?.value || '87082987',
      address: document.getElementById('client-address')?.value || 'PLAZA MAYOR 23, 1A',
      city: document.getElementById('client-city')?.value || '47001 VALLADOLID, Valladolid, España'
    };
  }

  /**
   * Captura datos de la factura
   */
  captureInvoiceData() {
    return {
      number: document.getElementById('invoice-number')?.value || this.generateInvoiceNumber(),
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
    const conceptContainers = document.querySelectorAll('.space-y-4 > div.rounded-lg');
    
    conceptContainers.forEach((line, index) => {
      const inputs = line.querySelectorAll('input');
      const selects = line.querySelectorAll('select');
      
      // Asumiendo el orden: Descripción, Cantidad, Precio, [Select de impuestos], Descuento, Total
      const description = inputs[0]?.value || '';
      const quantity = parseFloat(inputs[1]?.value) || 0;
      const unitPrice = parseFloat(inputs[2]?.value) || 0;
      const discount = parseFloat(inputs[3]?.value) || 0;
      
      // Extraer tasa de impuestos del select
      const taxSelect = selects[0];
      const taxValue = taxSelect?.value || 'IVA_21';
      let tax = 21; // Por defecto
      if (taxValue.includes('21')) tax = 21;
      else if (taxValue.includes('10')) tax = 10;
      else if (taxValue.includes('4')) tax = 4;
      else if (taxValue.includes('7')) tax = 7;
      else if (taxValue.includes('3')) tax = 3;
      else if (taxValue.includes('0')) tax = 0;
      
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
    
    // Buscar el contenedor de gastos suplidos
    const expenseContainer = document.getElementById('gastos-suplidos-fields');
    if (expenseContainer && !expenseContainer.classList.contains('hidden')) {
      const inputs = expenseContainer.querySelectorAll('input');
      // Asumir que los inputs vienen en pares: descripción, importe, descripción, importe...
      for (let i = 0; i < inputs.length; i += 2) {
        const description = inputs[i]?.value || '';
        const amount = parseFloat(inputs[i + 1]?.value) || 0;
        
        if (description || amount > 0) {
          expenses.push({
            description: description || 'Gasto suplido',
            amount
          });
        }
      }
    }
    
    return expenses;
  }

  /**
   * Captura configuración fiscal
   */
  captureTaxSettings() {
    return {
      taxType: document.getElementById('tax-type')?.value || 'iva',
      retentionRate: parseFloat(document.getElementById('retention-rate')?.value) || 0,
      applyRE: document.getElementById('recargo-equivalencia')?.checked || false
    };
  }

  /**
   * Captura métodos de pago
   */
  capturePaymentMethods() {
    const methods = [];
    const methodBadges = document.querySelectorAll('#payment-methods-list .inline-flex');
    
    methodBadges.forEach(badge => {
      const text = badge.textContent.trim();
      
      if (text.includes('Transferencia')) {
        const ibanMatch = text.match(/ES\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}/);
        methods.push({
          type: 'transferencia',
          iban: ibanMatch ? ibanMatch[0] : ''
        });
      } else if (text.includes('Bizum')) {
        const phoneMatch = text.match(/\d{3}\s?\d{3}\s?\d{3}/);
        methods.push({
          type: 'bizum',
          phone: phoneMatch ? phoneMatch[0] : ''
        });
      } else if (text.includes('Efectivo')) {
        methods.push({ type: 'efectivo' });
      } else if (text.includes('Domiciliación')) {
        methods.push({ type: 'domiciliacion' });
      }
    });
    
    return methods;
  }

  /**
   * Captura observaciones
   */
  captureObservations() {
    return document.getElementById('observations')?.value || '';
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
    const retentionText = retentionSelect?.value || '0%';
    const retentionRate = parseFloat(retentionText.replace('%', '')) || 0;
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
