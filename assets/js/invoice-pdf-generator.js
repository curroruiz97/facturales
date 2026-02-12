/**
 * Sistema de generación de PDF para facturas
 * Utiliza jsPDF para crear facturas profesionales
 */

class InvoicePDFGenerator {
  constructor() {
    this.doc = null;
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margin = 20;
    this.currentY = 20;
    
    // Cargar color de marca del usuario (desde business_info o localStorage)
    var brandColor = this.loadBrandColor();
    
    // Colores del proyecto - usa el color de marca del usuario
    this.colors = {
      primary: brandColor,
      dark: '#1a1a1a',
      gray: '#6b7280',
      lightGray: '#e5e7eb',
      white: '#ffffff'
    };
    
    // Logo de factura (desde localStorage)
    this.logoData = this.loadInvoiceLogo();
  }

  /**
   * Carga el color de marca del usuario
   */
  loadBrandColor() {
    // 1. Intentar desde DOM (si estamos en settings.html)
    var colorInput = document.getElementById('brand-color');
    if (colorInput && colorInput.value && colorInput.value !== '#000000') {
      return colorInput.value;
    }
    // 2. Intentar desde localStorage de business_info cache
    try {
      var cached = localStorage.getItem('business_info_cache');
      if (cached) {
        var data = JSON.parse(cached);
        if (data.brand_color) return data.brand_color;
      }
    } catch (e) {}
    // 3. Default
    return '#22C55E';
  }

  /**
   * Carga el logo de factura desde localStorage
   */
  loadInvoiceLogo() {
    try {
      return localStorage.getItem('invoice_logo_data') || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Convierte color hex a RGB para jsPDF
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Genera el PDF de la factura
   */
  generatePDF(invoiceData) {
    this.doc = new jspdf.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    this.currentY = this.margin;

    // Cabecera con logo y datos del emisor
    this.drawHeader(invoiceData.issuer);
    
    // Datos del cliente y factura
    this.drawClientAndInvoiceInfo(invoiceData.client, invoiceData.invoice);
    
    // Tabla de conceptos
    this.drawConceptsTable(invoiceData.concepts);
    
    // Gastos suplidos (si existen)
    if (invoiceData.expenses && invoiceData.expenses.length > 0) {
      this.drawExpensesTable(invoiceData.expenses);
    }
    
    // Resumen financiero
    this.drawFinancialSummary(invoiceData.summary);
    
    // Métodos de pago
    if (invoiceData.paymentMethods && invoiceData.paymentMethods.length > 0) {
      this.drawPaymentMethods(invoiceData.paymentMethods);
    }
    
    // Observaciones
    if (invoiceData.observations) {
      this.drawObservations(invoiceData.observations);
    }
    
    // Pie de página
    this.drawFooter(invoiceData.invoice.number);

    return this.doc;
  }

  /**
   * Dibuja la cabecera con logo y datos del emisor
   */
  drawHeader(issuer) {
    const brandRgb = this.hexToRgb(this.colors.primary);
    
    // Logo: imagen real o cuadrado con iniciales
    if (this.logoData) {
      try {
        // Detectar formato del logo
        var format = 'PNG';
        if (this.logoData.includes('image/jpeg') || this.logoData.includes('image/jpg')) format = 'JPEG';
        this.doc.addImage(this.logoData, format, this.margin, this.currentY, 30, 30);
      } catch (e) {
        // Fallback: cuadrado con color de marca + iniciales
        this.drawLogoFallback(issuer, brandRgb);
      }
    } else {
      this.drawLogoFallback(issuer, brandRgb);
    }
    
    // Datos del emisor (derecha)
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(14);
    this.doc.setFont(undefined, 'bold');
    this.doc.text(issuer.name || 'Sin nombre', this.pageWidth - this.margin, this.currentY, { align: 'right' });
    
    this.doc.setFontSize(9);
    this.doc.setFont(undefined, 'normal');
    const issuerLines = [];
    
    if (issuer.nif) issuerLines.push(issuer.nif);
    if (issuer.address && issuer.postalCode) {
      issuerLines.push(`${issuer.address}, ${issuer.postalCode}`);
    } else if (issuer.address) {
      issuerLines.push(issuer.address);
    }
    if (issuer.email) issuerLines.push(issuer.email);
    
    let lineY = this.currentY + 7;
    issuerLines.forEach(line => {
      this.doc.text(line, this.pageWidth - this.margin, lineY, { align: 'right' });
      lineY += 5;
    });
    
    this.currentY += 40;
  }

  /**
   * Dibuja el logo fallback (cuadrado con color de marca + iniciales)
   */
  drawLogoFallback(issuer, brandRgb) {
    this.doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
    this.doc.roundedRect(this.margin, this.currentY, 30, 30, 3, 3, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(18);
    this.doc.setFont(undefined, 'bold');
    
    const initials = this.getInitials(issuer.name);
    this.doc.text(initials, this.margin + 15, this.currentY + 19, { align: 'center' });
  }

  /**
   * Obtiene las iniciales de un nombre
   */
  getInitials(name) {
    if (!name) return 'SE';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Dibuja información del cliente y factura
   */
  drawClientAndInvoiceInfo(client, invoice) {
    const gray = this.hexToRgb(this.colors.gray);
    const lightGray = this.hexToRgb(this.colors.lightGray);
    
    // Línea separadora
    this.doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    
    this.currentY += 10;
    
    // CLIENTE (izquierda)
    this.doc.setFontSize(11);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('CLIENTE', this.margin, this.currentY);
    
    this.doc.setFontSize(10);
    this.doc.text(client.name || 'Sin nombre', this.margin, this.currentY + 7);
    
    this.doc.setFont(undefined, 'normal');
    this.doc.setFontSize(9);
    const clientLines = [];
    
    if (client.nif) clientLines.push(`NIF: ${client.nif}`);
    if (client.email) clientLines.push(client.email);
    if (client.address) {
      const fullAddress = client.postalCode 
        ? `${client.address}, ${client.postalCode}` 
        : client.address;
      clientLines.push(fullAddress);
    }
    
    let clientY = this.currentY + 13;
    clientLines.forEach(line => {
      this.doc.text(line, this.margin, clientY);
      clientY += 5;
    });
    
    // FACTURA (derecha)
    const rightX = 120;
    this.doc.setFontSize(11);
    this.doc.setFont(undefined, 'bold');
    this.doc.text('FACTURA', rightX, this.currentY);
    
    this.doc.setFontSize(9);
    const invoiceInfo = [];
    
    if (invoice.series) {
      invoiceInfo.push({ label: 'Serie', value: invoice.series });
    }
    if (invoice.number) {
      invoiceInfo.push({ label: 'Nº de factura', value: invoice.number });
    }
    if (invoice.reference) {
      invoiceInfo.push({ label: 'Referencia', value: invoice.reference });
    }
    if (invoice.issueDate) {
      invoiceInfo.push({ label: 'Fecha factura', value: invoice.issueDate });
    }
    if (invoice.dueDate) {
      invoiceInfo.push({ label: 'Vencimiento', value: invoice.dueDate });
    }
    
    let invoiceY = this.currentY + 7;
    invoiceInfo.forEach(item => {
      this.doc.setFont(undefined, 'normal');
      this.doc.text(item.label, rightX, invoiceY);
      this.doc.setFont(undefined, 'bold');
      this.doc.text(item.value, this.pageWidth - this.margin, invoiceY, { align: 'right' });
      invoiceY += 5;
    });
    
    this.currentY = Math.max(clientY, invoiceY) + 5;
  }

  /**
   * Dibuja la tabla de conceptos
   */
  drawConceptsTable(concepts) {
    const orange = this.hexToRgb(this.colors.primary);
    const lightGray = this.hexToRgb(this.colors.lightGray);
    
    // Cabecera de la tabla
    this.doc.setFillColor(orange.r, orange.g, orange.b);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (2 * this.margin), 8, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(9);
    this.doc.setFont(undefined, 'bold');
    
    const headers = [
      { text: 'Conceptos', x: this.margin + 2 },
      { text: 'Cant.', x: 80 },
      { text: 'Precio uni.', x: 105 },
      { text: 'Imp.', x: 140 },
      { text: 'R.E.', x: 160 },
      { text: 'Total', x: this.pageWidth - this.margin - 2, align: 'right' }
    ];
    
    headers.forEach(header => {
      this.doc.text(header.text, header.x, this.currentY + 5.5, { align: header.align || 'left' });
    });
    
    this.currentY += 8;
    
    // Filas de conceptos
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFont(undefined, 'normal');
    
    concepts.forEach((concept, index) => {
      const rowY = this.currentY + 7;
      
      // Fondo alternado
      if (index % 2 === 0) {
        this.doc.setFillColor(250, 250, 250);
        this.doc.rect(this.margin, this.currentY, this.pageWidth - (2 * this.margin), 10, 'F');
      }
      
      // Descripción (puede ser multilínea)
      const description = concept.description || '';
      const maxWidth = 70;
      const descLines = this.doc.splitTextToSize(description, maxWidth);
      this.doc.text(descLines, this.margin + 2, rowY);
      
      // Datos numéricos
      this.doc.text(String(concept.quantity || 0), 85, rowY, { align: 'center' });
      this.doc.text(this.formatCurrency(concept.unitPrice || 0), 125, rowY, { align: 'right' });
      this.doc.text(`${concept.taxRate || concept.tax || 0}%`, 148, rowY, { align: 'center' });
      this.doc.text(`${concept.re || 0}%`, 168, rowY, { align: 'center' });
      this.doc.text(this.formatCurrency(concept.total || 0), this.pageWidth - this.margin - 2, rowY, { align: 'right' });
      
      this.currentY += Math.max(10, descLines.length * 5);
      
      // Línea separadora
      this.doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
      this.doc.setLineWidth(0.2);
      this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    });
    
    this.currentY += 5;
  }

  /**
   * Dibuja la tabla de gastos suplidos
   */
  drawExpensesTable(expenses) {
    this.doc.setFontSize(10);
    this.doc.setFont(undefined, 'bold');
    this.doc.text('GASTOS SUPLIDOS', this.margin, this.currentY);
    
    this.currentY += 7;
    
    const lightGray = this.hexToRgb(this.colors.lightGray);
    
    expenses.forEach(expense => {
      this.doc.setFont(undefined, 'normal');
      this.doc.setFontSize(9);
      this.doc.text(expense.description || 'Gasto suplido', this.margin + 2, this.currentY);
      this.doc.setFont(undefined, 'bold');
      this.doc.text(this.formatCurrency(expense.amount || 0), this.pageWidth - this.margin - 2, this.currentY, { align: 'right' });
      
      this.currentY += 5;
    });
    
    this.currentY += 5;
  }

  /**
   * Dibuja el resumen financiero
   */
  drawFinancialSummary(summary) {
    const lightGray = this.hexToRgb(this.colors.lightGray);
    const orange = this.hexToRgb(this.colors.primary);
    
    // Línea separadora superior
    this.doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    
    this.currentY += 8;
    
    const rightColX = 130;
    const valueX = this.pageWidth - this.margin - 2;
    
    this.doc.setFontSize(9);
    
    const summaryItems = [];
    
    // Subtotal (si hay descuento general)
    if (summary.discount && summary.discount > 0) {
      summaryItems.push({ label: 'Subtotal', value: summary.subtotal, bold: false });
      summaryItems.push({ label: 'Descuento', value: -summary.discount, bold: false, negative: true });
    }
    
    // Base imponible
    summaryItems.push({ label: 'Base imponible', value: summary.taxBase, bold: false });
    
    // IVA (si existe)
    if (summary.taxAmount && summary.taxAmount > 0) {
      summaryItems.push({ 
        label: `IVA ${summary.taxRate || 21}%`, 
        value: summary.taxAmount, 
        bold: false 
      });
    }
    
    // Recargo de equivalencia (si existe)
    if (summary.reAmount && summary.reAmount > 0) {
      summaryItems.push({ 
        label: `R.E. ${summary.reRate || 5.2}%`, 
        value: summary.reAmount, 
        bold: false 
      });
    }
    
    // Retención (si existe)
    if (summary.retentionAmount && summary.retentionAmount > 0) {
      summaryItems.push({ 
        label: `Retención ${summary.retentionRate}%`, 
        value: -summary.retentionAmount, 
        bold: false, 
        negative: true 
      });
    }
    
    // Gastos suplidos si existen
    if (summary.expenses && summary.expenses > 0) {
      summaryItems.push({ label: 'Gastos suplidos', value: summary.expenses, bold: false });
    }
    
    summaryItems.forEach(item => {
      this.doc.setFont(undefined, 'normal');
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(item.label, rightColX, this.currentY);
      
      this.doc.setFont(undefined, item.bold ? 'bold' : 'normal');
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(this.formatCurrency(item.value), valueX, this.currentY, { align: 'right' });
      
      this.currentY += 6;
    });
    
    // Línea antes del total
    this.doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
    this.doc.line(rightColX, this.currentY, valueX, this.currentY);
    
    this.currentY += 8;
    
    // TOTAL
    this.doc.setFontSize(11);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('Total', rightColX, this.currentY);
    this.doc.text(this.formatCurrency(summary.total), valueX, this.currentY, { align: 'right' });
    
    this.currentY += 8;
    
    // Cantidad ya pagada
    if (summary.paid && summary.paid > 0) {
      this.doc.setFontSize(9);
      this.doc.setFont(undefined, 'normal');
      this.doc.setTextColor(220, 38, 38); // rojo
      this.doc.text('Cantidad ya pagada', rightColX, this.currentY);
      this.doc.text(`-${this.formatCurrency(summary.paid)}`, valueX, this.currentY, { align: 'right' });
      
      this.currentY += 8;
      
      // Línea antes de total a pagar
      this.doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
      this.doc.line(rightColX, this.currentY, valueX, this.currentY);
      
      this.currentY += 8;
    }
    
    // TOTAL A PAGAR (destacado)
    const totalToPay = summary.totalToPay || summary.total;
    this.doc.setFillColor(orange.r, orange.g, orange.b);
    this.doc.rect(rightColX - 2, this.currentY - 6, valueX - rightColX + 4, 10, 'F');
    
    this.doc.setFontSize(12);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(255, 255, 255);
    this.doc.text('Total a pagar', rightColX, this.currentY);
    this.doc.text(this.formatCurrency(totalToPay), valueX, this.currentY, { align: 'right' });
    
    this.doc.setTextColor(0, 0, 0); // Reset color
    this.currentY += 15;
  }

  /**
   * Dibuja los métodos de pago
   */
  drawPaymentMethods(methods) {
    this.doc.setFontSize(10);
    this.doc.setFont(undefined, 'bold');
    this.doc.text('Métodos de pago', this.margin, this.currentY);
    
    this.currentY += 7;
    
    this.doc.setFontSize(9);
    this.doc.setFont(undefined, 'normal');
    
    methods.forEach(method => {
      let text = '';
      if (method.type === 'transferencia' && method.iban) {
        text = `Transferencia bancaria: ${method.iban}`;
      } else if (method.type === 'bizum' && method.phone) {
        text = `Bizum: ${method.phone}`;
      } else if (method.type === 'efectivo') {
        text = 'Efectivo';
      } else if (method.type === 'domiciliacion') {
        text = 'Domiciliación bancaria';
      } else if (method.type === 'contrareembolso') {
        text = 'Contrareembolso';
      } else {
        text = method.type || 'Método de pago';
      }
      
      const lines = this.doc.splitTextToSize(text, this.pageWidth - (2 * this.margin));
      this.doc.text(lines, this.margin, this.currentY);
      this.currentY += lines.length * 5;
    });
    
    this.currentY += 5;
  }

  /**
   * Dibuja las observaciones
   */
  drawObservations(observations) {
    this.doc.setFontSize(10);
    this.doc.setFont(undefined, 'bold');
    this.doc.text('OBSERVACIONES', this.margin, this.currentY);
    
    this.currentY += 7;
    
    this.doc.setFontSize(9);
    this.doc.setFont(undefined, 'normal');
    
    const lines = this.doc.splitTextToSize(observations, this.pageWidth - (2 * this.margin));
    this.doc.text(lines, this.margin, this.currentY);
    this.currentY += lines.length * 5 + 10;
  }

  /**
   * Dibuja el pie de página
   */
  drawFooter(invoiceNumber) {
    const gray = this.hexToRgb(this.colors.gray);
    
    // Número de factura en la parte inferior
    this.doc.setFontSize(8);
    this.doc.setFont(undefined, 'normal');
    this.doc.setTextColor(gray.r, gray.g, gray.b);
    this.doc.text(invoiceNumber || 'Factura', this.margin, this.pageHeight - 10);
    this.doc.text('1 / 1', this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
  }

  /**
   * Formatea valores monetarios
   */
  formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' €';
  }

  /**
   * Descarga el PDF
   */
  downloadPDF(filename = 'factura.pdf') {
    if (this.doc) {
      this.doc.save(filename);
    }
  }

  /**
   * Obtiene el PDF como blob para previsualización
   */
  getPDFBlob() {
    if (this.doc) {
      return this.doc.output('blob');
    }
    return null;
  }

  /**
   * Obtiene el PDF como data URL para iframe
   */
  getPDFDataUrl() {
    if (this.doc) {
      return this.doc.output('dataurlstring');
    }
    return null;
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.InvoicePDFGenerator = InvoicePDFGenerator;
}
