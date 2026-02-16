/**
 * Email Sender Module
 * Encapsula la llamada a la Supabase Edge Function send-document-email
 * para enviar facturas/presupuestos por email con PDF adjunto.
 */

/**
 * Enviar documento por email vía Edge Function
 * @param {Object} payload - Datos del envío
 * @param {string} payload.documentType - 'invoice' o 'quote'
 * @param {string} payload.documentId - UUID del documento
 * @param {string} payload.to - Email del destinatario
 * @param {string} [payload.subject] - Asunto del email (opcional, se genera automáticamente)
 * @param {string} [payload.body] - Cuerpo personalizado del email (opcional)
 * @param {string} [payload.pdfBase64] - PDF en base64 (opcional)
 * @param {string} [payload.pdfFilename] - Nombre del archivo PDF (opcional)
 * @returns {Promise<Object>} { success: boolean, data?: Object, error?: string, alreadySent?: boolean }
 */
async function sendDocumentEmail(payload) {
  try {
    if (!window.supabaseClient) {
      throw new Error('Supabase client no está inicializado');
    }

    if (!payload.documentType || !payload.documentId || !payload.to) {
      throw new Error('Faltan campos obligatorios: documentType, documentId, to');
    }

    console.log('📧 Enviando email de documento:', payload.documentType, payload.documentId);

    var result = await window.supabaseClient.functions.invoke('send-document-email', {
      body: payload
    });

    // supabase.functions.invoke devuelve { data, error }
    if (result.error) {
      console.error('❌ Error al invocar Edge Function:', result.error);

      // Intentar extraer el error real de la respuesta de la Edge Function
      var actualError = '';
      try {
        // En supabase-js v2, el contexto del error puede contener la respuesta JSON
        if (result.error.context) {
          var ctx = result.error.context;
          if (typeof ctx === 'object' && ctx.json) {
            var body = await ctx.json();
            actualError = body.error || '';
          } else if (typeof ctx === 'string') {
            var parsed = JSON.parse(ctx);
            actualError = parsed.error || '';
          } else if (typeof ctx === 'object' && ctx.error) {
            actualError = ctx.error;
          }
        }
      } catch (parseErr) {
        console.warn('No se pudo parsear el contexto del error:', parseErr);
      }

      // Si no pudimos extraer el error real, usar el mensaje genérico
      if (!actualError) {
        actualError = result.error.message || 'Error al invocar el servicio de email';
      }

      console.error('❌ Error detallado:', actualError);
      throw new Error(actualError);
    }

    var responseData = result.data;

    // La Edge Function devuelve JSON con { success, data/error, alreadyProcessed }
    if (responseData && responseData.success) {
      if (responseData.alreadyProcessed) {
        console.log('ℹ️ Email ya fue enviado previamente para este documento');
      } else {
        console.log('✅ Email enviado correctamente:', responseData.data?.providerMessageId);
      }
      return {
        success: true,
        data: responseData.data,
        alreadySent: responseData.alreadyProcessed || false
      };
    } else {
      var errorMsg = responseData?.error || 'Error desconocido al enviar email';
      console.error('❌ Error del servicio de email:', errorMsg);
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    console.error('❌ Error en sendDocumentEmail:', error);
    return { success: false, error: error.message || 'Error al enviar email' };
  }
}

// Exportar globalmente
window.sendDocumentEmail = sendDocumentEmail;

console.log('✅ Email sender module loaded');
