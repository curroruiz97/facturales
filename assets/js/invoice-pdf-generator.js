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
    
    // Colores del proyecto
    this.colors = {
      primary: '#f59e0b', // naranja
      dark: '#1a1a1a',
      gray: '#6b7280',
      lightGray: '#e5e7eb',
      white: '#ffffff'
    };
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
    const orange = this.hexToRgb(this.colors.primary);
    
    // Logo placeholder (cuadrado naranja con iniciales)
    this.doc.setFillColor(orange.r, orange.g, orange.b);
    this.doc.rect(this.margin, this.currentY, 30, 30, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(20);
    this.doc.setFont(undefined, 'bold');
    this.doc.text('SE', this.margin + 15, this.currentY + 20, { align: 'center' });
    
    // Datos del emisor (derecha)
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(14);
    this.doc.setFont(undefined, 'bold');
    this.doc.text(issuer.name || 'avenue sl', this.pageWidth - this.margin, this.currentY, { align: 'right' });
    
    this.doc.setFontSize(9);
    this.doc.setFont(undefined, 'normal');
    const issuerLines = [
      issuer.cif || '87082987',
      issuer.address || 'Valladolid, España',
      issuer.phone ? `Tel. ${issuer.phone}` : 'Tel. 655658565'
    ];
    
    let lineY = this.currentY + 7;
    issuerLines.forEach(line => {
      this.doc.text(line, this.pageWidth - this.margin, lineY, { align: 'right' });
      lineY += 5;
    });
    
    this.currentY += 40;
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
    this.doc.setFont(undefined, 'bold');
    this.doc.text(client.name || 'AVENUE DIGITAL GROUP SL', this.margin, this.currentY + 7);
    
    this.doc.setFont(undefined, 'normal');
    this.doc.setFontSize(9);
    const clientLines = [
      client.cif || '87082987',
      client.address || 'PLAZA MAYOR 23, 1A',
      client.city || '47001 VALLADOLID, Valladolid, España'
    ];
    
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
    const invoiceInfo = [
      { label: 'Nº de factura', value: invoice.number || 'F20261' },
      { label: 'Fecha factura', value: invoice.issueDate || '27/01/2026' },
      { label: 'Fecha vencimiento', value: invoice.dueDate || '31/01/2026' }
    ];
    
    let invoiceY = this.currentY + 7;
    invoiceInfo.forEach(item => {
      this.doc.setFont(undefined, 'normal');
      this.doc.text(item.label, rightX, invoiceY);
      this.doc.setFont(undefined, 'bold');
      this.doc.text(item.value, this.pageWidth - this.margin, invoiceY, { align: 'right' });
      invoiceY += 5;
    });
    
    this.currentY += 40;
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
      this.doc.text(String(concept.quantity || '100'), 85, rowY, { align: 'center' });
      this.doc.text(this.formatCurrency(concept.unitPrice || 567), 125, rowY, { align: 'right' });
      this.doc.text(`${concept.tax || '21'}%`, 148, rowY, { align: 'center' });
      this.doc.text(`${concept.re || '5.2'}%`, 168, rowY, { align: 'center' });
      this.doc.text(this.formatCurrency(concept.total || 715.55), this.pageWidth - this.margin - 2, rowY, { align: 'right' });
      
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
      this.doc.text(expense.description || 'gasto suplido', this.margin + 2, this.currentY);
      this.doc.setFont(undefined, 'bold');
      this.doc.text(this.formatCurrency(expense.amount || 100), this.pageWidth - this.margin - 2, this.currentY, { align: 'right' });
      
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
    
    const summaryItems = [
      { label: 'Base imponible', value: summary.taxBase || 567.00, bold: false },
      { label: `IVA ${summary.taxRate || 21}%`, value: summary.taxAmount || 119.07, bold: false },
      { label: `Recargo de equivalencia ${summary.reRate || 5.2}%`, value: summary.reAmount || 29.48, bold: false },
      { label: `Retención ${summary.retentionRate || 2.00}%`, value: -summary.retentionAmount || -28.35, bold: false, negative: true }
    ];
    
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
    this.doc.text(this.formatCurrency(summary.total || 787.20), valueX, this.currentY, { align: 'right' });
    
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
    this.doc.setFillColor(orange.r, orange.g, orange.b);
    this.doc.rect(rightColX - 2, this.currentY - 6, valueX - rightColX + 4, 10, 'F');
    
    this.doc.setFontSize(12);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(255, 255, 255);
    this.doc.text('Total a pagar', rightColX, this.currentY);
    this.doc.text(this.formatCurrency(summary.totalToPay || 687.20), valueX, this.currentY, { align: 'right' });
    
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
      if (method.type === 'transferencia') {
        text = `Transferencia bancaria al número de cuenta ${method.iban || 'ES00 0000 0000 0000 0000 0000'}`;
      } else if (method.type === 'bizum') {
        text = `Bizum: ${method.phone || '655 8555 5555'}`;
      } else if (method.type === 'efectivo') {
        text = 'Efectivo';
      } else {
        text = method.type || 'Otro método de pago';
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
    this.doc.text(invoiceNumber || 'B7082987', this.margin, this.pageHeight - 10);
    this.doc.text('1 / 1', this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
  }

  /**
   * Formatea valores monetarios
   */
  formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace('.', ',') + ' €';
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
