/**
 * Sistema de generación de PDF para facturas - Multipágina
 * Utiliza jsPDF para crear facturas profesionales con soporte de varias páginas
 */

class InvoicePDFGenerator {
  constructor() {
    this.doc = null;
    this.pageWidth = 210;
    this.pageHeight = 297;
    this.margin = 20;
    this.currentY = 20;
    this.pageNumber = 1;
    this.totalPages = 1;
    this.footerHeight = 15;
    this.maxY = this.pageHeight - this.margin - this.footerHeight; // Zona segura antes del pie

    // Color de marca del usuario
    var brandColor = this.loadBrandColor();
    this.colors = {
      primary: brandColor,
      dark: '#1a1a1a',
      gray: '#6b7280',
      lightGray: '#e5e7eb',
      white: '#ffffff'
    };

    this.logoData = this.loadInvoiceLogo();
    this.invoiceNumber = '';
  }

  loadBrandColor() {
    try {
      var cached = localStorage.getItem('business_info_cache');
      if (cached) { var d = JSON.parse(cached); if (d.brand_color) return d.brand_color; }
    } catch (e) {}
    var el = document.getElementById('brand-color');
    if (el && el.value && el.value !== '#000000') return el.value;
    return '#22C55E';
  }

  loadInvoiceLogo() {
    try {
      var data = localStorage.getItem('invoice_logo_data') || null;
      // Si no hay logo en cache directo, intentar desde business_info_cache
      if (!data) {
        var cached = localStorage.getItem('business_info_cache');
        if (cached) {
          var info = JSON.parse(cached);
          if (info.invoice_image_url) {
            data = info.invoice_image_url;
            localStorage.setItem('invoice_logo_data', data);
          }
        }
      }
      if (data) {
        var dims = localStorage.getItem('invoice_logo_dimensions');
        if (dims) try { this.logoDimensions = JSON.parse(dims); } catch (e) {}
      }
      return data;
    } catch (e) { return null; }
  }

  hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 34, g: 197, b: 94 };
  }

  formatCurrency(value) {
    return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(value) || 0) + ' \u20AC';
  }

  getInitials(name) {
    if (!name) return 'SE';
    var words = name.trim().split(' ');
    return words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  // ============================================
  // PAGINACIÓN
  // ============================================

  /**
   * Verifica si hay espacio suficiente; si no, crea nueva página
   * @param {number} requiredSpace - Espacio necesario en mm
   */
  checkPageBreak(requiredSpace) {
    if (this.currentY + requiredSpace > this.maxY) {
      this.addNewPage();
      return true;
    }
    return false;
  }

  /**
   * Añade una nueva página con pie de la anterior y cabecera de la nueva
   */
  addNewPage() {
    // Pie de la página actual
    this.drawPageFooter();
    // Nueva página
    this.doc.addPage();
    this.pageNumber++;
    this.currentY = this.margin;
    // Mini cabecera de continuación
    this.drawContinuationHeader();
  }

  /**
   * Dibuja el pie de página con número de factura y paginación
   */
  drawPageFooter() {
    var gray = this.hexToRgb(this.colors.gray);
    this.doc.setFontSize(8);
    this.doc.setFont(undefined, 'normal');
    this.doc.setTextColor(gray.r, gray.g, gray.b);
    this.doc.text(this.invoiceNumber || 'Factura', this.margin, this.pageHeight - 10);
    // Placeholder: se actualizará al final
    this.doc.text(this.pageNumber + ' / __TOTAL__', this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
  }

  /**
   * Cabecera mini para páginas de continuación
   */
  drawContinuationHeader() {
    var brandRgb = this.hexToRgb(this.colors.primary);
    this.doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 0.5, 'F');
    this.currentY += 4;

    this.doc.setFontSize(8);
    this.doc.setFont(undefined, 'normal');
    this.doc.setTextColor(150, 150, 150);
    this.doc.text(this.invoiceNumber ? 'Factura ' + this.invoiceNumber + ' (cont.)' : 'Continuación', this.margin, this.currentY);
    this.currentY += 8;
  }

  // ============================================
  // GENERACIÓN PRINCIPAL
  // ============================================

  generatePDF(invoiceData) {
    this.doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.currentY = this.margin;
    this.pageNumber = 1;
    this.invoiceNumber = invoiceData.invoice?.number || '';

    // Página 1: Cabecera completa
    this.drawHeader(invoiceData.issuer);
    this.drawClientAndInvoiceInfo(invoiceData.client, invoiceData.invoice);

    // Combinar conceptos + gastos suplidos como líneas de la misma tabla
    var allConcepts = (invoiceData.concepts || []).slice();
    if (invoiceData.expenses && invoiceData.expenses.length > 0) {
      invoiceData.expenses.forEach(function(exp) {
        allConcepts.push({
          description: 'Gastos suplidos: ' + (exp.description || 'Gasto suplido'),
          quantity: 1,
          unitPrice: exp.amount || 0,
          tax: 0,
          re: 0,
          discount: 0,
          total: exp.amount || 0
        });
      });
    }

    // Tabla de conceptos (con paginación)
    this.drawConceptsTable(allConcepts);

    // Resumen financiero
    this.checkPageBreak(60);
    this.drawFinancialSummary(invoiceData.summary);

    // Métodos de pago
    if (invoiceData.paymentMethods && invoiceData.paymentMethods.length > 0) {
      this.checkPageBreak(20);
      this.drawPaymentMethods(invoiceData.paymentMethods);
    }

    // Observaciones
    if (invoiceData.observations && invoiceData.observations !== 'on' && invoiceData.observations.trim()) {
      this.checkPageBreak(20);
      this.drawObservations(invoiceData.observations);
    }

    // Pie de la última página
    this.drawPageFooter();

    // Actualizar total de páginas en todos los pies
    this.totalPages = this.pageNumber;
    this.updateTotalPages();

    return this.doc;
  }

  /**
   * Reemplaza __TOTAL__ en todos los pies de página con el total real
   */
  updateTotalPages() {
    var totalStr = String(this.totalPages);
    for (var p = 1; p <= this.totalPages; p++) {
      this.doc.setPage(p);
      // Dibujar sobre el placeholder
      var gray = this.hexToRgb(this.colors.gray);
      this.doc.setFontSize(8);
      this.doc.setFont(undefined, 'normal');
      this.doc.setTextColor(255, 255, 255); // Blanco para tapar
      this.doc.text(p + ' / __TOTAL__', this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
      this.doc.setTextColor(gray.r, gray.g, gray.b);
      this.doc.text(p + ' / ' + totalStr, this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
    }
  }

  // ============================================
  // CABECERA
  // ============================================

  drawHeader(issuer) {
    var brandRgb = this.hexToRgb(this.colors.primary);

    if (this.logoData) {
      try {
        var format = 'PNG';
        if (this.logoData.indexOf('image/jpeg') !== -1 || this.logoData.indexOf('image/jpg') !== -1) format = 'JPEG';
        var maxW = 45, maxH = 20, imgW = 30, imgH = 15;
        var dims = this.logoDimensions;
        if (dims && dims.w > 0 && dims.h > 0) {
          var ratio = dims.w / dims.h;
          if (ratio >= 1) { imgW = maxW; imgH = imgW / ratio; if (imgH > maxH) { imgH = maxH; imgW = imgH * ratio; } }
          else { imgH = maxH; imgW = imgH * ratio; if (imgW > maxW) { imgW = maxW; imgH = imgW / ratio; } }
        }
        this.doc.addImage(this.logoData, format, this.margin, this.currentY + Math.max(0, (26 - imgH) / 2), imgW, imgH);
      } catch (e) { this.drawLogoFallback(issuer, brandRgb); }
    } else {
      this.drawLogoFallback(issuer, brandRgb);
    }

    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(14);
    this.doc.setFont(undefined, 'bold');
    this.doc.text(issuer.name || 'Sin nombre', this.pageWidth - this.margin, this.currentY, { align: 'right' });

    this.doc.setFontSize(9);
    this.doc.setFont(undefined, 'normal');
    var lines = [];
    if (issuer.nif) lines.push(issuer.nif);
    if (issuer.address && issuer.postalCode) lines.push(issuer.address + ', ' + issuer.postalCode);
    else if (issuer.address) lines.push(issuer.address);
    if (issuer.email) lines.push(issuer.email);
    var ly = this.currentY + 7;
    lines.forEach(function(l) { this.doc.text(l, this.pageWidth - this.margin, ly, { align: 'right' }); ly += 5; }.bind(this));

    this.currentY += 38;
  }

  drawLogoFallback(issuer, brandRgb) {
    this.doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
    this.doc.roundedRect(this.margin, this.currentY, 28, 28, 3, 3, 'F');
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(16);
    this.doc.setFont(undefined, 'bold');
    this.doc.text(this.getInitials(issuer.name), this.margin + 14, this.currentY + 18, { align: 'center' });
  }

  // ============================================
  // CLIENTE + FACTURA
  // ============================================

  drawClientAndInvoiceInfo(client, invoice) {
    var lightGray = this.hexToRgb(this.colors.lightGray);
    this.doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 8;

    // CLIENTE
    this.doc.setFontSize(10); this.doc.setFont(undefined, 'bold'); this.doc.setTextColor(0, 0, 0);
    this.doc.text('CLIENTE', this.margin, this.currentY);
    this.doc.setFontSize(10);
    this.doc.text(client.name || 'Sin nombre', this.margin, this.currentY + 6);
    this.doc.setFont(undefined, 'normal'); this.doc.setFontSize(8);
    var cLines = [];
    if (client.nif) cLines.push('NIF: ' + client.nif);
    if (client.email) cLines.push(client.email);
    if (client.address) cLines.push(client.postalCode ? client.address + ', ' + client.postalCode : client.address);
    var cY = this.currentY + 12;
    cLines.forEach(function(l) { this.doc.text(l, this.margin, cY); cY += 4.5; }.bind(this));

    // FACTURA
    var rx = 120;
    this.doc.setFontSize(10); this.doc.setFont(undefined, 'bold');
    this.doc.text('FACTURA', rx, this.currentY);
    this.doc.setFontSize(8);
    var info = [];
    if (invoice.series) info.push({ l: 'Serie', v: invoice.series });
    if (invoice.number) info.push({ l: 'Nº factura', v: invoice.number });
    if (invoice.reference) info.push({ l: 'Referencia', v: invoice.reference });
    if (invoice.issueDate) info.push({ l: 'Fecha', v: invoice.issueDate });
    if (invoice.dueDate) info.push({ l: 'Vencimiento', v: invoice.dueDate });
    if (invoice.paymentTerms) info.push({ l: 'Condiciones', v: invoice.paymentTerms });
    var iY = this.currentY + 6;
    info.forEach(function(item) {
      this.doc.setFont(undefined, 'normal'); this.doc.text(item.l, rx, iY);
      this.doc.setFont(undefined, 'bold'); this.doc.text(item.v, this.pageWidth - this.margin, iY, { align: 'right' });
      iY += 4.5;
    }.bind(this));

    this.currentY = Math.max(cY, iY) + 5;
  }

  // ============================================
  // TABLA DE CONCEPTOS (con paginación)
  // ============================================

  drawConceptsTableHeader() {
    var brandRgb = this.hexToRgb(this.colors.primary);
    this.doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 7, 'F');
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(8);
    this.doc.setFont(undefined, 'bold');

    this.doc.text('Concepto', this.margin + 2, this.currentY + 5);
    this.doc.text('Cant.', 82, this.currentY + 5, { align: 'center' });
    this.doc.text('Precio', 108, this.currentY + 5, { align: 'right' });
    this.doc.text('Imp.', 125, this.currentY + 5, { align: 'center' });
    this.doc.text('Dto.', 145, this.currentY + 5, { align: 'center' });
    this.doc.text('Total', this.pageWidth - this.margin - 2, this.currentY + 5, { align: 'right' });

    this.currentY += 7;
    this.doc.setTextColor(0, 0, 0);
  }

  drawConceptsTable(concepts) {
    this.drawConceptsTableHeader();

    var lightGray = this.hexToRgb(this.colors.lightGray);

    for (var i = 0; i < concepts.length; i++) {
      var concept = concepts[i];
      var description = concept.description || '';
      var descLines = this.doc.splitTextToSize(description, 55);
      var rowHeight = Math.max(8, descLines.length * 4 + 2);

      // Verificar si cabe en esta página
      if (this.currentY + rowHeight > this.maxY) {
        this.addNewPage();
        this.drawConceptsTableHeader();
      }

      // Fondo alternado
      if (i % 2 === 0) {
        this.doc.setFillColor(248, 249, 250);
        this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, rowHeight, 'F');
      }

      var rowY = this.currentY + 5.5;
      this.doc.setFontSize(8);
      this.doc.setFont(undefined, 'normal');

      // Descripción
      this.doc.text(descLines, this.margin + 2, this.currentY + 4);
      // Cantidad
      this.doc.text(String(concept.quantity || 0), 82, rowY, { align: 'center' });
      // Precio
      this.doc.text(this.formatCurrency(concept.unitPrice || 0), 108, rowY, { align: 'right' });
      // Impuesto
      this.doc.text((concept.taxRate || concept.tax || 0) + '%', 125, rowY, { align: 'center' });
      // Descuento
      this.doc.text((concept.discount || 0) + '%', 145, rowY, { align: 'center' });
      // Total
      this.doc.setFont(undefined, 'bold');
      this.doc.text(this.formatCurrency(concept.total || 0), this.pageWidth - this.margin - 2, rowY, { align: 'right' });

      this.currentY += rowHeight;

      // Línea separadora
      this.doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
      this.doc.setLineWidth(0.15);
      this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    }

    this.currentY += 5;
  }

  // ============================================
  // GASTOS SUPLIDOS
  // ============================================

  drawExpensesTable(expenses) {
    this.doc.setFontSize(9); this.doc.setFont(undefined, 'bold'); this.doc.setTextColor(0, 0, 0);
    this.doc.text('GASTOS SUPLIDOS', this.margin, this.currentY);
    this.currentY += 6;
    expenses.forEach(function(exp) {
      this.checkPageBreak(6);
      this.doc.setFont(undefined, 'normal'); this.doc.setFontSize(8);
      this.doc.text(exp.description || 'Gasto suplido', this.margin + 2, this.currentY);
      this.doc.setFont(undefined, 'bold');
      this.doc.text(this.formatCurrency(exp.amount || 0), this.pageWidth - this.margin - 2, this.currentY, { align: 'right' });
      this.currentY += 5;
    }.bind(this));
    this.currentY += 4;
  }

  // ============================================
  // RESUMEN FINANCIERO
  // ============================================

  drawFinancialSummary(summary) {
    var lightGray = this.hexToRgb(this.colors.lightGray);
    var brandRgb = this.hexToRgb(this.colors.primary);

    this.doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 7;

    var rx = 130, vx = this.pageWidth - this.margin - 2;
    this.doc.setFontSize(8);
    var items = [];
    if (summary.discount && summary.discount > 0) {
      items.push({ l: 'Subtotal', v: summary.subtotal });
      items.push({ l: 'Descuento', v: -summary.discount, color: 'red' });
    }
    items.push({ l: 'Base imponible', v: summary.taxBase || summary.subtotal || 0 });
    var totalTaxes = (parseFloat(summary.taxAmount) || 0) + (parseFloat(summary.reAmount) || 0);
    if (totalTaxes > 0) items.push({ l: 'Impuestos', v: totalTaxes });
    if (summary.retentionAmount && summary.retentionAmount > 0) items.push({ l: 'Retención IRPF (' + (summary.retentionRate || 0) + '%)', v: -summary.retentionAmount, color: 'red' });
    if (summary.expenses && summary.expenses > 0) items.push({ l: 'Gastos suplidos', v: summary.expenses });

    items.forEach(function(item) {
      if (item.color === 'red') {
        this.doc.setFont(undefined, 'normal'); this.doc.setTextColor(220, 38, 38);
      } else {
        this.doc.setFont(undefined, 'normal'); this.doc.setTextColor(100, 100, 100);
      }
      this.doc.text(item.l, rx, this.currentY);
      if (item.color === 'red') {
        this.doc.setTextColor(220, 38, 38);
      } else {
        this.doc.setTextColor(0, 0, 0);
      }
      this.doc.text(this.formatCurrency(item.v), vx, this.currentY, { align: 'right' });
      this.currentY += 5.5;
    }.bind(this));

    // Línea
    this.doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
    this.doc.line(rx, this.currentY, vx, this.currentY);
    this.currentY += 6;

    // Total
    this.doc.setFontSize(10); this.doc.setFont(undefined, 'bold'); this.doc.setTextColor(0, 0, 0);
    this.doc.text('Total', rx, this.currentY);
    this.doc.text(this.formatCurrency(summary.total), vx, this.currentY, { align: 'right' });
    this.currentY += 7;

    // Pagado
    if (summary.paid && summary.paid > 0) {
      this.doc.setFontSize(8); this.doc.setFont(undefined, 'normal'); this.doc.setTextColor(220, 38, 38);
      this.doc.text('Cantidad ya pagada', rx, this.currentY);
      this.doc.text('-' + this.formatCurrency(summary.paid), vx, this.currentY, { align: 'right' });
      this.currentY += 6;
      this.doc.setDrawColor(lightGray.r, lightGray.g, lightGray.b);
      this.doc.line(rx, this.currentY, vx, this.currentY);
      this.currentY += 6;
    }

    // Total a pagar
    var totalToPay = summary.totalToPay || summary.total;
    this.doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
    this.doc.roundedRect(rx - 2, this.currentY - 5, vx - rx + 4, 9, 1, 1, 'F');
    this.doc.setFontSize(10); this.doc.setFont(undefined, 'bold'); this.doc.setTextColor(255, 255, 255);
    this.doc.text('Total a pagar', rx, this.currentY);
    this.doc.text(this.formatCurrency(totalToPay), vx, this.currentY, { align: 'right' });
    this.doc.setTextColor(0, 0, 0);
    this.currentY += 12;
  }

  // ============================================
  // MÉTODOS DE PAGO
  // ============================================

  drawPaymentMethods(methods) {
    this.doc.setFontSize(9); this.doc.setFont(undefined, 'bold'); this.doc.setTextColor(0, 0, 0);
    this.doc.text('Métodos de pago', this.margin, this.currentY);
    this.currentY += 6;
    this.doc.setFontSize(8); this.doc.setFont(undefined, 'normal');
    methods.forEach(function(m) {
      this.checkPageBreak(6);
      var text = '';
      if (m.type === 'transferencia') text = 'Transferencia bancaria' + (m.iban ? ': ' + m.iban : '');
      else if (m.type === 'bizum') text = 'Bizum' + (m.phone ? ': ' + m.phone : '');
      else if (m.type === 'efectivo') text = 'Efectivo';
      else if (m.type === 'domiciliacion') text = 'Domiciliación bancaria';
      else if (m.type === 'contrareembolso') text = 'Contrareembolso';
      else text = m.type || 'Otro';
      var lines = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin);
      this.doc.text(lines, this.margin, this.currentY);
      this.currentY += lines.length * 4.5;
    }.bind(this));
    this.currentY += 4;
  }

  // ============================================
  // OBSERVACIONES
  // ============================================

  drawObservations(observations) {
    this.doc.setFontSize(9); this.doc.setFont(undefined, 'bold'); this.doc.setTextColor(0, 0, 0);
    this.doc.text('OBSERVACIONES', this.margin, this.currentY);
    this.currentY += 6;
    this.doc.setFontSize(8); this.doc.setFont(undefined, 'normal');
    var lines = this.doc.splitTextToSize(observations, this.pageWidth - 2 * this.margin);
    // Imprimir línea a línea con paginación
    for (var i = 0; i < lines.length; i++) {
      this.checkPageBreak(5);
      this.doc.text(lines[i], this.margin, this.currentY);
      this.currentY += 4.5;
    }
    this.currentY += 5;
  }

  // ============================================
  // UTILIDADES
  // ============================================

  downloadPDF(filename) { if (this.doc) this.doc.save(filename || 'factura.pdf'); }
  getPDFBlob() { return this.doc ? this.doc.output('blob') : null; }
  getPDFDataUrl() { return this.doc ? this.doc.output('dataurlstring') : null; }
  getBase64() { return this.doc ? this.doc.output('base64') : null; }
}

if (typeof window !== 'undefined') {
  window.InvoicePDFGenerator = InvoicePDFGenerator;
}
