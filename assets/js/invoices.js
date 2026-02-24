/**
 * invoices.js
 * Módulo para gestión de facturas con Supabase
 */

console.log('🔄 Cargando invoices.js...');

/**
 * Obtener cliente de Supabase (con espera si no está listo)
 * @returns {Promise<Object>} Cliente de Supabase
 */
async function getSupabaseForInvoices() {
  // Esperar a que supabaseClient esté disponible (hasta 20 segundos)
  let attempts = 0;
  while (!window.supabaseClient && attempts < 200) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!window.supabaseClient) {
    console.error('❌ Supabase client no está disponible después de 20 segundos');
    throw new Error('Supabase client no está inicializado');
  }
  
  return window.supabaseClient;
}

/**
 * Crear una nueva factura
 * @param {Object} invoiceData - Datos de la factura
 * @param {string} status - Estado: 'draft' o 'issued'
 * @returns {Promise<Object>} Resultado de la operación
 */
async function createInvoice(invoiceData, status = 'draft') {
  try {
    if (window.planLimits) {
      var limitCheck = await window.planLimits.canCreateInvoice();
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.reason);
      }
    }

    const supabase = await getSupabaseForInvoices();
    
    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Usuario no autenticado. Por favor, inicia sesión.');
    }
    
    // Validaciones básicas
    if (!invoiceData.client_name || !invoiceData.client_name.trim()) {
      throw new Error('El nombre del cliente es obligatorio');
    }
    
    if (!invoiceData.issue_date) {
      throw new Error('La fecha de emisión es obligatoria');
    }
    
    if (!invoiceData.invoice_data) {
      throw new Error('Los datos de la factura son obligatorios');
    }
    
    // Preparar datos
    const data = {
      user_id: user.id,
      invoice_series: invoiceData.invoice_series || 'A',
      client_id: invoiceData.client_id || null,
      client_name: invoiceData.client_name.trim(),
      issue_date: invoiceData.issue_date,
      due_date: invoiceData.due_date || null,
      subtotal: parseFloat(invoiceData.subtotal) || 0,
      tax_amount: parseFloat(invoiceData.tax_amount) || 0,
      total_amount: parseFloat(invoiceData.total_amount) || 0,
      currency: invoiceData.currency || 'EUR',
      status: status,
      is_paid: false,
      invoice_data: invoiceData.invoice_data
    };
    
    // Si hay un número manual, incluirlo (sino, el trigger de BD lo genera)
    if (invoiceData.invoice_number && invoiceData.invoice_number.trim() !== '') {
      data.invoice_number = invoiceData.invoice_number.trim();
    }
    
    // Insertar en Supabase
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert([data])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating invoice:', error);
      
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        throw new Error('No tienes permisos para crear facturas. Por favor, inicia sesión.');
      }
      
      throw new Error(error.message || 'Error al crear la factura');
    }
    
    console.log('Factura creada:', invoice.invoice_number);
    if (window.planLimits) {
      window.planLimits.recordInvoiceUsage().catch(function () {});
    }
    return { success: true, data: invoice };
  } catch (error) {
    console.error('Error in createInvoice:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener facturas con filtros
 * @param {Object} filters - Filtros: { status, client_id, from_date, to_date }
 * @returns {Promise<Object>} Lista de facturas
 */
async function getInvoices(filters = {}) {
  try {
    const supabase = await getSupabaseForInvoices();
    
    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Usuario no autenticado');
    }
    
    let query = supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    // Aplicar filtros
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id);
    }
    
    if (filters.from_date) {
      query = query.gte('issue_date', filters.from_date);
    }
    
    if (filters.to_date) {
      query = query.lte('issue_date', filters.to_date);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching invoices:', error);
      throw new Error(error.message || 'Error al obtener las facturas');
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getInvoices:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Obtener una factura por ID
 * @param {string} invoiceId - UUID de la factura
 * @returns {Promise<Object>} Factura encontrada
 */
async function getInvoiceById(invoiceId) {
  try {
    if (!invoiceId) {
      throw new Error('ID de factura no proporcionado');
    }
    
    const supabase = await getSupabaseForInvoices();
    
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();
    
    if (error) {
      console.error('Error fetching invoice by ID:', error);
      throw new Error('Factura no encontrada');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in getInvoiceById:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualizar una factura
 * @param {string} invoiceId - UUID de la factura
 * @param {Object} invoiceData - Datos actualizados
 * @returns {Promise<Object>} Factura actualizada
 */
async function updateInvoice(invoiceId, invoiceData) {
  try {
    if (!invoiceId) {
      throw new Error('ID de factura no proporcionado');
    }
    
    const supabase = await getSupabaseForInvoices();
    
    // Preparar datos
    const data = {};
    
    if (invoiceData.invoice_series !== undefined) {
      data.invoice_series = invoiceData.invoice_series;
    }
    
    if (invoiceData.client_id !== undefined) {
      data.client_id = invoiceData.client_id;
    }
    
    if (invoiceData.client_name !== undefined) {
      data.client_name = invoiceData.client_name.trim();
    }
    
    if (invoiceData.issue_date !== undefined) {
      data.issue_date = invoiceData.issue_date;
    }
    
    if (invoiceData.due_date !== undefined) {
      data.due_date = invoiceData.due_date;
    }
    
    if (invoiceData.subtotal !== undefined) {
      data.subtotal = parseFloat(invoiceData.subtotal);
    }
    
    if (invoiceData.tax_amount !== undefined) {
      data.tax_amount = parseFloat(invoiceData.tax_amount);
    }
    
    if (invoiceData.total_amount !== undefined) {
      data.total_amount = parseFloat(invoiceData.total_amount);
    }
    
    if (invoiceData.currency !== undefined) {
      data.currency = invoiceData.currency;
    }
    
    if (invoiceData.status !== undefined) {
      data.status = invoiceData.status;
    }
    
    if (invoiceData.is_paid !== undefined) {
      data.is_paid = invoiceData.is_paid;
    }
    
    if (invoiceData.paid_at !== undefined) {
      data.paid_at = invoiceData.paid_at;
    }
    
    if (invoiceData.invoice_data !== undefined) {
      data.invoice_data = invoiceData.invoice_data;
    }
    
    // Actualizar en Supabase
    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(data)
      .eq('id', invoiceId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating invoice:', error);
      
      if (error.message && error.message.includes('No se pueden modificar los datos de una factura emitida')) {
        throw new Error('No se pueden modificar los datos de una factura emitida. Solo se puede marcar como pagada o anularla.');
      }
      
      throw new Error(error.message || 'Error al actualizar la factura');
    }
    
    console.log('✅ Factura actualizada:', invoice.invoice_number);
    return { success: true, data: invoice };
  } catch (error) {
    console.error('Error in updateInvoice:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Eliminar una factura (soft delete - marcar como cancelled)
 * @param {string} invoiceId - UUID de la factura
 * @returns {Promise<Object>} Resultado de la operación
 */
async function deleteInvoice(invoiceId) {
  try {
    if (!invoiceId) {
      throw new Error('ID de factura no proporcionado');
    }
    
    const supabase = await getSupabaseForInvoices();
    
    // Soft delete: cambiar status a 'cancelled'
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'cancelled' })
      .eq('id', invoiceId)
      .select()
      .single();
    
    if (error) {
      console.error('Error deleting invoice:', error);
      throw new Error(error.message || 'Error al anular la factura');
    }
    
    console.log('✅ Factura anulada:', data.invoice_number);
    return { success: true, data };
  } catch (error) {
    console.error('Error in deleteInvoice:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Eliminar permanentemente una factura (solo borradores)
 * @param {string} invoiceId - UUID de la factura
 * @returns {Promise<Object>} Resultado de la operación
 */
async function permanentlyDeleteInvoice(invoiceId) {
  try {
    if (!invoiceId) {
      throw new Error('ID de factura no proporcionado');
    }
    
    const supabase = await getSupabaseForInvoices();
    
    // Verificar que sea un borrador
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', invoiceId)
      .single();
    
    if (fetchError) {
      throw new Error('Factura no encontrada');
    }
    
    if (invoice.status !== 'draft') {
      throw new Error('Solo se pueden eliminar borradores');
    }
    
    // Eliminar
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);
    
    if (error) {
      console.error('Error permanently deleting invoice:', error);
      throw new Error(error.message || 'Error al eliminar el borrador');
    }
    
    console.log('✅ Borrador eliminado');
    return { success: true };
  } catch (error) {
    console.error('Error in permanentlyDeleteInvoice:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Alternar estado de pago de una factura
 * @param {string} invoiceId - UUID de la factura
 * @param {boolean} isPaid - Nuevo estado de pago
 * @returns {Promise<Object>} Resultado de la operación
 */
async function togglePaidStatus(invoiceId, isPaid) {
  try {
    if (!invoiceId) {
      throw new Error('ID de factura no proporcionado');
    }
    
    const supabase = await getSupabaseForInvoices();
    
    const updateData = {
      is_paid: isPaid,
      paid_at: isPaid ? new Date().toISOString() : null
    };
    
    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select()
      .single();
    
    if (error) {
      console.error('Error toggling paid status:', error);
      throw new Error(error.message || 'Error al actualizar el estado de pago');
    }
    
    console.log(`✅ Estado de pago actualizado: ${isPaid ? 'Pagada' : 'No pagada'}`);
    
    // Gestionar transacción asociada a la factura
    try {
      if (isPaid) {
        await _createInvoiceTransaction(supabase, data);
      } else {
        await _deleteInvoiceTransaction(supabase, invoiceId);
      }
    } catch (txError) {
      console.error('⚠️ Error al gestionar transacción de factura:', txError);
      // No fallar la operación principal si la transacción falla
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in togglePaidStatus:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Crear transacción automática de ingreso al pagar una factura
 * @param {Object} supabase - Cliente Supabase
 * @param {Object} invoice - Datos de la factura pagada
 */
async function _createInvoiceTransaction(supabase, invoice) {
  // Verificar que no exista ya una transacción para esta factura
  const { data: existing } = await supabase
    .from('transacciones')
    .select('id')
    .eq('invoice_id', invoice.id)
    .maybeSingle();
  
  if (existing) {
    console.log('ℹ️ Ya existe transacción para esta factura, omitiendo creación');
    return;
  }
  
  const invoiceData = invoice.invoice_data || {};
  const invoiceNumber = invoice.invoice_number || 'Sin número';
  const totalAmount = invoice.total_amount || invoiceData.summary?.total || 0;
  
  const transactionData = {
    user_id: invoice.user_id,
    cliente_id: invoice.client_id || null,
    importe: parseFloat(totalAmount),
    concepto: `Factura ${invoiceNumber}`,
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'factura',
    tipo: 'ingreso',
    invoice_id: invoice.id,
    observaciones: null
  };
  
  const { error } = await supabase
    .from('transacciones')
    .insert([transactionData]);
  
  if (error) {
    console.error('Error creando transacción de factura:', error);
    throw error;
  }
  
  console.log(`✅ Transacción de ingreso creada para factura ${invoiceNumber}`);
}

/**
 * Eliminar transacción asociada a una factura al desmarcar como pagada
 * @param {Object} supabase - Cliente Supabase
 * @param {string} invoiceId - UUID de la factura
 */
async function _deleteInvoiceTransaction(supabase, invoiceId) {
  const { error } = await supabase
    .from('transacciones')
    .delete()
    .eq('invoice_id', invoiceId);
  
  if (error) {
    console.error('Error eliminando transacción de factura:', error);
    throw error;
  }
  
  console.log(`✅ Transacción de factura eliminada para invoice ${invoiceId}`);
}

/**
 * Emitir una factura (cambiar de draft a issued)
 * @param {string} invoiceId - UUID de la factura
 * @returns {Promise<Object>} Resultado de la operación
 */
async function emitInvoice(invoiceId) {
  try {
    if (!invoiceId) {
      throw new Error('ID de factura no proporcionado');
    }
    
    const supabase = await getSupabaseForInvoices();
    
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'issued' })
      .eq('id', invoiceId)
      .select()
      .single();
    
    if (error) {
      console.error('Error emitting invoice:', error);
      throw new Error(error.message || 'Error al emitir la factura');
    }
    
    console.log('✅ Factura emitida:', data.invoice_number);
    
    // Marcar paso 4 del onboarding como completado
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && window.updateStepProgress) {
        await window.updateStepProgress(user.id, 4, true);
        console.log('✅ Paso 4 de onboarding completado');
      }
    } catch (onboardingError) {
      console.warn('⚠️ No se pudo actualizar el progreso de onboarding:', onboardingError);
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in emitInvoice:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Formatear número de factura para mostrar
 * @param {string} invoiceNumber - Número de factura
 * @returns {string} Número formateado
 */
function formatInvoiceNumber(invoiceNumber) {
  if (!invoiceNumber) return 'Sin número';
  return invoiceNumber;
}

/**
 * Formatear fecha
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} Fecha formateada (dd/mm/yyyy)
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formatear moneda
 * @param {number} amount - Cantidad
 * @param {string} currency - Código de moneda
 * @returns {string} Cantidad formateada
 */
function formatCurrency(amount, currency = 'EUR') {
  const symbols = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£'
  };
  
  const symbol = symbols[currency] || '€';
  const formatted = parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/\.(\d{2})$/, ',$1');
  
  return `${formatted} ${symbol}`;
}

/**
 * Obtener badge HTML según estado
 * @param {string} status - Estado de la factura
 * @returns {string} HTML del badge
 */
function getStatusBadge(status) {
  const badges = {
    'draft': '<span class="inline-flex items-center rounded-lg bg-bgray-100 px-3 py-1 text-xs font-semibold text-bgray-700 dark:bg-darkblack-500 dark:text-bgray-50">Borrador</span>',
    'issued': '<span class="inline-flex items-center rounded-lg bg-success-50 px-3 py-1 text-xs font-semibold text-success-300 dark:bg-darkblack-500">Emitida</span>',
    'cancelled': '<span class="inline-flex items-center rounded-lg bg-error-50 px-3 py-1 text-xs font-semibold text-error-300 dark:bg-darkblack-500">Anulada</span>'
  };
  
  return badges[status] || badges['draft'];
}

// Exportar funciones globalmente
try {
  window.createInvoice = createInvoice;
  window.getInvoices = getInvoices;
  window.getInvoiceById = getInvoiceById;
  window.updateInvoice = updateInvoice;
  window.deleteInvoice = deleteInvoice;
  window.permanentlyDeleteInvoice = permanentlyDeleteInvoice;
  window.togglePaidStatus = togglePaidStatus;
  window.emitInvoice = emitInvoice;
  window.formatInvoiceNumber = formatInvoiceNumber;
  window.formatDate = formatDate;
  window.formatCurrency = formatCurrency;
  window.getStatusBadge = getStatusBadge;
  
  console.log('✅ invoices.js cargado correctamente');
  console.log('✅ Funciones exportadas:', {
    createInvoice: typeof window.createInvoice,
    updateInvoice: typeof window.updateInvoice,
    getInvoiceById: typeof window.getInvoiceById
  });
} catch (error) {
  console.error('❌ Error al exportar funciones de invoices.js:', error);
}
