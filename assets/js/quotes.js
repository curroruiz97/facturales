/**
 * quotes.js
 * Módulo para gestión de presupuestos con Supabase
 */

console.log('🔄 Cargando quotes.js...');

/**
 * Obtener cliente de Supabase (con espera si no está listo)
 * @returns {Promise<Object>} Cliente de Supabase
 */
async function getSupabaseForQuotes() {
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
 * Crear un nuevo presupuesto
 * @param {Object} quoteData - Datos del presupuesto
 * @param {string} status - Estado: 'draft' o 'issued'
 * @returns {Promise<Object>} Resultado de la operación
 */
async function createQuote(quoteData, status = 'draft') {
  try {
    if (window.planLimits) {
      var limitCheck = await window.planLimits.canCreateInvoice();
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.reason.replace('facturas', 'documentos'));
      }
    }

    const supabase = await getSupabaseForQuotes();
    
    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Usuario no autenticado. Por favor, inicia sesión.');
    }
    
    // Validaciones básicas
    if (!quoteData.client_name || !quoteData.client_name.trim()) {
      throw new Error('El nombre del cliente es obligatorio');
    }
    
    if (!quoteData.issue_date) {
      throw new Error('La fecha de emisión es obligatoria');
    }
    
    if (!quoteData.quote_data) {
      throw new Error('Los datos del presupuesto son obligatorios');
    }
    
    // Preparar datos
    const data = {
      user_id: user.id,
      quote_series: quoteData.quote_series || 'P',
      client_id: quoteData.client_id || null,
      client_name: quoteData.client_name.trim(),
      issue_date: quoteData.issue_date,
      due_date: quoteData.due_date || null,
      subtotal: parseFloat(quoteData.subtotal) || 0,
      tax_amount: parseFloat(quoteData.tax_amount) || 0,
      total_amount: parseFloat(quoteData.total_amount) || 0,
      currency: quoteData.currency || 'EUR',
      status: status,
      is_paid: false,
      quote_data: quoteData.quote_data
    };
    
    // Insertar en Supabase
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert([data])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating quote:', error);
      
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        throw new Error('No tienes permisos para crear presupuestos. Por favor, inicia sesión.');
      }
      
      throw new Error(error.message || 'Error al crear el presupuesto');
    }
    
    console.log('Presupuesto creado:', quote.quote_number);
    if (window.planLimits) {
      window.planLimits.recordInvoiceUsage().catch(function () {});
    }
    return { success: true, data: quote };
  } catch (error) {
    console.error('Error in createQuote:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener presupuestos con filtros
 * @param {Object} filters - Filtros: { status, client_id, from_date, to_date }
 * @returns {Promise<Object>} Lista de presupuestos
 */
async function getQuotes(filters = {}) {
  try {
    const supabase = await getSupabaseForQuotes();
    
    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Usuario no autenticado');
    }
    
    let query = supabase
      .from('quotes')
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
      console.error('Error fetching quotes:', error);
      throw new Error(error.message || 'Error al obtener los presupuestos');
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getQuotes:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Obtener un presupuesto por ID
 * @param {string} quoteId - UUID del presupuesto
 * @returns {Promise<Object>} Presupuesto encontrado
 */
async function getQuoteById(quoteId) {
  try {
    if (!quoteId) {
      throw new Error('ID de presupuesto no proporcionado');
    }
    
    const supabase = await getSupabaseForQuotes();
    
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();
    
    if (error) {
      console.error('Error fetching quote by ID:', error);
      throw new Error('Presupuesto no encontrado');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in getQuoteById:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualizar un presupuesto
 * @param {string} quoteId - UUID del presupuesto
 * @param {Object} quoteData - Datos actualizados
 * @returns {Promise<Object>} Presupuesto actualizado
 */
async function updateQuote(quoteId, quoteData) {
  try {
    if (!quoteId) {
      throw new Error('ID de presupuesto no proporcionado');
    }
    
    const supabase = await getSupabaseForQuotes();
    
    // Preparar datos
    const data = {};
    
    if (quoteData.quote_series !== undefined) {
      data.quote_series = quoteData.quote_series;
    }
    
    if (quoteData.client_id !== undefined) {
      data.client_id = quoteData.client_id;
    }
    
    if (quoteData.client_name !== undefined) {
      data.client_name = quoteData.client_name.trim();
    }
    
    if (quoteData.issue_date !== undefined) {
      data.issue_date = quoteData.issue_date;
    }
    
    if (quoteData.due_date !== undefined) {
      data.due_date = quoteData.due_date;
    }
    
    if (quoteData.subtotal !== undefined) {
      data.subtotal = parseFloat(quoteData.subtotal);
    }
    
    if (quoteData.tax_amount !== undefined) {
      data.tax_amount = parseFloat(quoteData.tax_amount);
    }
    
    if (quoteData.total_amount !== undefined) {
      data.total_amount = parseFloat(quoteData.total_amount);
    }
    
    if (quoteData.currency !== undefined) {
      data.currency = quoteData.currency;
    }
    
    if (quoteData.status !== undefined) {
      data.status = quoteData.status;
    }
    
    if (quoteData.is_paid !== undefined) {
      data.is_paid = quoteData.is_paid;
    }
    
    if (quoteData.paid_at !== undefined) {
      data.paid_at = quoteData.paid_at;
    }
    
    if (quoteData.quote_data !== undefined) {
      data.quote_data = quoteData.quote_data;
    }
    
    // Actualizar en Supabase
    const { data: quote, error } = await supabase
      .from('quotes')
      .update(data)
      .eq('id', quoteId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating quote:', error);
      
      if (error.message && error.message.includes('No se pueden modificar los datos de un presupuesto emitido')) {
        throw new Error('No se pueden modificar los datos de un presupuesto emitido. Solo se puede marcar como pagado o anularlo.');
      }
      
      throw new Error(error.message || 'Error al actualizar el presupuesto');
    }
    
    console.log('✅ Presupuesto actualizado:', quote.quote_number);
    return { success: true, data: quote };
  } catch (error) {
    console.error('Error in updateQuote:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Eliminar un presupuesto (soft delete - marcar como cancelled)
 * @param {string} quoteId - UUID del presupuesto
 * @returns {Promise<Object>} Resultado de la operación
 */
async function deleteQuote(quoteId) {
  try {
    if (!quoteId) {
      throw new Error('ID de presupuesto no proporcionado');
    }
    
    const supabase = await getSupabaseForQuotes();
    
    // Soft delete: cambiar status a 'cancelled'
    const { data, error } = await supabase
      .from('quotes')
      .update({ status: 'cancelled' })
      .eq('id', quoteId)
      .select()
      .single();
    
    if (error) {
      console.error('Error deleting quote:', error);
      throw new Error(error.message || 'Error al anular el presupuesto');
    }
    
    console.log('✅ Presupuesto anulado:', data.quote_number);
    return { success: true, data };
  } catch (error) {
    console.error('Error in deleteQuote:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Eliminar permanentemente un presupuesto (solo borradores)
 * @param {string} quoteId - UUID del presupuesto
 * @returns {Promise<Object>} Resultado de la operación
 */
async function permanentlyDeleteQuote(quoteId) {
  try {
    if (!quoteId) {
      throw new Error('ID de presupuesto no proporcionado');
    }
    
    const supabase = await getSupabaseForQuotes();
    
    // Verificar que sea un borrador
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('status')
      .eq('id', quoteId)
      .single();
    
    if (fetchError) {
      throw new Error('Presupuesto no encontrado');
    }
    
    if (quote.status !== 'draft') {
      throw new Error('Solo se pueden eliminar borradores');
    }
    
    // Eliminar
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', quoteId);
    
    if (error) {
      console.error('Error permanently deleting quote:', error);
      throw new Error(error.message || 'Error al eliminar el borrador');
    }
    
    console.log('✅ Borrador eliminado');
    return { success: true };
  } catch (error) {
    console.error('Error in permanentlyDeleteQuote:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Alternar estado de pago de un presupuesto
 * @param {string} quoteId - UUID del presupuesto
 * @param {boolean} isPaid - Nuevo estado de pago
 * @returns {Promise<Object>} Resultado de la operación
 */
async function togglePaidStatus(quoteId, isPaid) {
  try {
    if (!quoteId) {
      throw new Error('ID de presupuesto no proporcionado');
    }
    
    const supabase = await getSupabaseForQuotes();
    
    const updateData = {
      is_paid: isPaid,
      paid_at: isPaid ? new Date().toISOString() : null
    };
    
    const { data, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', quoteId)
      .select()
      .single();
    
    if (error) {
      console.error('Error toggling paid status:', error);
      throw new Error(error.message || 'Error al actualizar el estado de pago');
    }
    
    console.log(`✅ Estado de pago actualizado: ${isPaid ? 'Pagado' : 'No pagado'}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error in togglePaidStatus:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Emitir un presupuesto (cambiar de draft a issued)
 * @param {string} quoteId - UUID del presupuesto
 * @returns {Promise<Object>} Resultado de la operación
 */
async function emitQuote(quoteId) {
  try {
    if (!quoteId) {
      throw new Error('ID de presupuesto no proporcionado');
    }
    
    const supabase = await getSupabaseForQuotes();
    
    const { data, error } = await supabase
      .from('quotes')
      .update({ status: 'issued' })
      .eq('id', quoteId)
      .select()
      .single();
    
    if (error) {
      console.error('Error emitting quote:', error);
      throw new Error(error.message || 'Error al emitir el presupuesto');
    }
    
    console.log('✅ Presupuesto emitido:', data.quote_number);
    
    return { success: true, data };
  } catch (error) {
    console.error('Error in emitQuote:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Formatear número de presupuesto para mostrar
 * @param {string} quoteNumber - Número de presupuesto
 * @returns {string} Número formateado
 */
function formatQuoteNumber(quoteNumber) {
  if (!quoteNumber) return 'Sin número';
  return quoteNumber;
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
 * @param {string} status - Estado del presupuesto
 * @returns {string} HTML del badge
 */
function getStatusBadge(status) {
  const badges = {
    'draft': '<span class="inline-flex items-center rounded-lg bg-bgray-100 px-3 py-1 text-xs font-semibold text-bgray-700 dark:bg-darkblack-500 dark:text-bgray-50">Borrador</span>',
    'issued': '<span class="inline-flex items-center rounded-lg bg-success-50 px-3 py-1 text-xs font-semibold text-success-300 dark:bg-darkblack-500">Emitido</span>',
    'cancelled': '<span class="inline-flex items-center rounded-lg bg-error-50 px-3 py-1 text-xs font-semibold text-error-300 dark:bg-darkblack-500">Anulado</span>'
  };
  
  return badges[status] || badges['draft'];
}

// Exportar funciones globalmente
try {
  window.createQuote = createQuote;
  window.getQuotes = getQuotes;
  window.getQuoteById = getQuoteById;
  window.updateQuote = updateQuote;
  window.deleteQuote = deleteQuote;
  window.permanentlyDeleteQuote = permanentlyDeleteQuote;
  window.toggleQuotePaidStatus = togglePaidStatus;
  window.emitQuote = emitQuote;
  window.formatQuoteNumber = formatQuoteNumber;
  window.formatQuoteDate = formatDate;
  window.formatQuoteCurrency = formatCurrency;
  window.getQuoteStatusBadge = getStatusBadge;
  
  console.log('✅ quotes.js cargado correctamente');
  console.log('✅ Funciones exportadas:', {
    createQuote: typeof window.createQuote,
    updateQuote: typeof window.updateQuote,
    getQuoteById: typeof window.getQuoteById
  });
} catch (error) {
  console.error('❌ Error al exportar funciones de quotes.js:', error);
}
