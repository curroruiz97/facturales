/**
 * Transactions CRUD Module
 * Módulo para gestión de transacciones (gastos e ingresos) con Supabase
 */

// Función auxiliar para obtener el cliente de Supabase
const getSupabaseForTransactions = () => {
  if (!window.supabaseClient) {
    throw new Error('Supabase client no está inicializado');
  }
  return window.supabaseClient;
};

/**
 * Crear una nueva transacción
 * @param {Object} transactionData - Datos de la transacción
 * @returns {Promise<Object>} Transacción creada o error
 */
async function createTransaction(transactionData) {
  try {
    const supabase = getSupabaseForTransactions();
    
    // Obtener usuario autenticado para asignar user_id
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Usuario no autenticado. Por favor, inicia sesión.');
    }
    
    // Preparar datos con user_id
    const data = {
      user_id: user.id,
      cliente_id: transactionData.cliente_id || null,
      importe: parseFloat(transactionData.importe),
      concepto: transactionData.concepto?.trim(),
      fecha: transactionData.fecha,
      categoria: transactionData.categoria,
      observaciones: transactionData.observaciones?.trim() || null,
      tipo: transactionData.tipo
    };

    // Validaciones básicas
    if (!data.importe || data.importe <= 0) {
      throw new Error('El importe debe ser mayor que 0');
    }
    if (!data.concepto) {
      throw new Error('El concepto es obligatorio');
    }
    if (!data.fecha) {
      throw new Error('La fecha es obligatoria');
    }
    if (!data.categoria) {
      throw new Error('La categoría es obligatoria');
    }
    if (!data.tipo || !['gasto', 'ingreso'].includes(data.tipo)) {
      throw new Error('El tipo debe ser "gasto" o "ingreso"');
    }
    
    // Validar longitud de observaciones
    if (data.observaciones && data.observaciones.length > 150) {
      throw new Error('Las observaciones no pueden exceder 150 caracteres');
    }
    
    // Insertar en Supabase
    const { data: transaccion, error } = await supabase
      .from('transacciones')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      
      // Error de autenticación/RLS
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        throw new Error('No tienes permisos para crear transacciones. Por favor, inicia sesión.');
      }
      
      if (error.code === '42501') {
        throw new Error('No tienes permisos para realizar esta acción');
      }
      
      throw new Error(error.message || 'Error al crear la transacción');
    }

    return { success: true, data: transaccion };
  } catch (error) {
    console.error('Error in createTransaction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener transacciones con filtros opcionales
 * @param {Object} filters - Filtros para aplicar
 * @param {string} filters.search - Búsqueda por concepto o nombre de cliente
 * @param {number} filters.minAmount - Importe mínimo
 * @param {number} filters.maxAmount - Importe máximo
 * @param {string} filters.startDate - Fecha inicial
 * @param {string} filters.endDate - Fecha final
 * @param {string} filters.tipo - Tipo de transacción (gasto/ingreso)
 * @param {string} filters.categoria - Categoría
 * @returns {Promise<Array>} Lista de transacciones
 */
async function getTransactions(filters = {}) {
  try {
    const supabase = getSupabaseForTransactions();
    
    // Iniciar query base con JOIN para obtener datos del cliente
    let query = supabase
      .from('transacciones')
      .select(`
        *,
        clientes (
          id,
          nombre_razon_social
        )
      `)
      .order('fecha', { ascending: false });

    // Aplicar filtro de rango de importe
    if (filters.minAmount !== undefined && filters.minAmount !== null) {
      query = query.gte('importe', filters.minAmount);
    }
    if (filters.maxAmount !== undefined && filters.maxAmount !== null) {
      query = query.lte('importe', filters.maxAmount);
    }

    // Aplicar filtro de rango de fechas
    if (filters.startDate) {
      query = query.gte('fecha', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('fecha', filters.endDate);
    }

    // Aplicar filtro de tipo
    if (filters.tipo && ['gasto', 'ingreso'].includes(filters.tipo)) {
      query = query.eq('tipo', filters.tipo);
    }

    // Aplicar filtro de categoría
    if (filters.categoria) {
      query = query.eq('categoria', filters.categoria);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      
      // Error de autenticación/RLS
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        throw new Error('No tienes permisos para ver transacciones. Por favor, inicia sesión.');
      }
      
      throw new Error(error.message || 'Error al obtener las transacciones');
    }

    // Filtrar en cliente por búsqueda en concepto o nombre de cliente
    let filteredData = data || [];
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim().toLowerCase();
      filteredData = filteredData.filter(transaction => {
        const concepto = transaction.concepto?.toLowerCase() || '';
        const clienteName = transaction.clientes?.nombre_razon_social?.toLowerCase() || 'sin contacto';
        return concepto.includes(searchTerm) || clienteName.includes(searchTerm);
      });
    }

    return { success: true, data: filteredData };
  } catch (error) {
    console.error('Error in getTransactions:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Obtener una transacción por ID
 * @param {string} transactionId - UUID de la transacción
 * @returns {Promise<Object>} Transacción encontrada
 */
async function getTransactionById(transactionId) {
  try {
    if (!transactionId) {
      throw new Error('ID de transacción no proporcionado');
    }

    const supabase = getSupabaseForTransactions();
    
    const { data, error } = await supabase
      .from('transacciones')
      .select(`
        *,
        clientes (
          id,
          nombre_razon_social
        )
      `)
      .eq('id', transactionId)
      .single();

    if (error) {
      console.error('Error fetching transaction by ID:', error);
      throw new Error('Transacción no encontrada');
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getTransactionById:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualizar una transacción existente
 * @param {string} transactionId - UUID de la transacción
 * @param {Object} transactionData - Datos actualizados
 * @returns {Promise<Object>} Transacción actualizada o error
 */
async function updateTransaction(transactionId, transactionData) {
  try {
    if (!transactionId) {
      throw new Error('ID de transacción no proporcionado');
    }

    const supabase = getSupabaseForTransactions();
    
    // Preparar datos - SOLO los campos que se están enviando
    const data = {};
    
    if (transactionData.cliente_id !== undefined) {
      data.cliente_id = transactionData.cliente_id || null;
    }
    
    if (transactionData.importe !== undefined) {
      data.importe = parseFloat(transactionData.importe);
      if (data.importe <= 0) {
        throw new Error('El importe debe ser mayor que 0');
      }
    }
    
    if (transactionData.concepto !== undefined) {
      data.concepto = transactionData.concepto?.trim();
      if (!data.concepto) {
        throw new Error('El concepto es obligatorio');
      }
    }
    
    if (transactionData.fecha !== undefined) {
      data.fecha = transactionData.fecha;
      if (!data.fecha) {
        throw new Error('La fecha es obligatoria');
      }
    }
    
    if (transactionData.categoria !== undefined) {
      data.categoria = transactionData.categoria;
    }
    
    if (transactionData.observaciones !== undefined) {
      data.observaciones = transactionData.observaciones?.trim() || null;
      if (data.observaciones && data.observaciones.length > 150) {
        throw new Error('Las observaciones no pueden exceder 150 caracteres');
      }
    }
    
    if (transactionData.tipo !== undefined) {
      if (!['gasto', 'ingreso'].includes(transactionData.tipo)) {
        throw new Error('El tipo debe ser "gasto" o "ingreso"');
      }
      data.tipo = transactionData.tipo;
    }

    // Actualizar en Supabase
    const { data: transaccion, error } = await supabase
      .from('transacciones')
      .update(data)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      
      // Error de autenticación/RLS
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        throw new Error('No tienes permisos para actualizar transacciones. Por favor, inicia sesión.');
      }
      
      if (error.code === '42501') {
        throw new Error('No tienes permisos para realizar esta acción');
      }
      
      throw new Error(error.message || 'Error al actualizar la transacción');
    }

    return { success: true, data: transaccion };
  } catch (error) {
    console.error('Error in updateTransaction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Eliminar una transacción
 * @param {string} transactionId - UUID de la transacción
 * @returns {Promise<Object>} Resultado de la operación
 */
async function deleteTransaction(transactionId) {
  try {
    if (!transactionId) {
      throw new Error('ID de transacción no proporcionado');
    }

    const supabase = getSupabaseForTransactions();
    
    const { error } = await supabase
      .from('transacciones')
      .delete()
      .eq('id', transactionId);

    if (error) {
      console.error('Error deleting transaction:', error);
      
      // Error de autenticación/RLS
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        throw new Error('No tienes permisos para eliminar transacciones. Por favor, inicia sesión.');
      }
      
      if (error.code === '42501') {
        throw new Error('No tienes permisos para realizar esta acción');
      }
      
      throw new Error(error.message || 'Error al eliminar la transacción');
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteTransaction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Formatear importe a moneda EUR
 * @param {number} amount - Cantidad a formatear
 * @returns {string} Importe formateado
 */
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '0,00 €';
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formatear fecha a formato español
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  
  const date = new Date(dateString + 'T00:00:00');
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/**
 * Obtener nombre del cliente por ID
 * @param {string} clienteId - UUID del cliente
 * @returns {Promise<string>} Nombre del cliente
 */
async function getClientName(clienteId) {
  if (!clienteId) return 'Sin contacto';
  
  try {
    const result = await window.getClientById(clienteId);
    if (result.success && result.data) {
      return result.data.nombre_razon_social;
    }
    return 'Cliente no encontrado';
  } catch (error) {
    console.error('Error getting client name:', error);
    return 'Error al cargar cliente';
  }
}

/**
 * Validar datos de transacción
 * @param {Object} data - Datos de la transacción
 * @returns {Object} Resultado de validación
 */
function validateTransactionData(data) {
  const errors = {};
  
  // Importe obligatorio y mayor que 0
  if (!data.importe || parseFloat(data.importe) <= 0) {
    errors.importe = 'El importe debe ser mayor que 0';
  }
  
  // Concepto obligatorio
  if (!data.concepto?.trim()) {
    errors.concepto = 'El concepto es obligatorio';
  }
  
  // Fecha obligatoria
  if (!data.fecha) {
    errors.fecha = 'La fecha es obligatoria';
  }
  
  // Categoría obligatoria
  if (!data.categoria) {
    errors.categoria = 'La categoría es obligatoria';
  }
  
  // Tipo obligatorio
  if (!data.tipo || !['gasto', 'ingreso'].includes(data.tipo)) {
    errors.tipo = 'El tipo debe ser "gasto" o "ingreso"';
  }
  
  // Observaciones máximo 150 caracteres
  if (data.observaciones && data.observaciones.length > 150) {
    errors.observaciones = 'Las observaciones no pueden exceder 150 caracteres';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Obtener texto legible de categoría
 * @param {string} categoria - Código de categoría
 * @returns {string} Nombre legible de la categoría
 */
function getCategoryLabel(categoria) {
  const labels = {
    'material_oficina': 'Material de oficina',
    'servicios_profesionales': 'Servicios profesionales',
    'suministros': 'Suministros',
    'alquiler': 'Alquiler',
    'transporte': 'Transporte',
    'marketing': 'Marketing',
    'otros': 'Otros',
    'factura': 'Factura'
  };
  
  return labels[categoria] || categoria;
}

/**
 * Comprobar si una transacción es de tipo factura (no editable/eliminable manualmente)
 * @param {Object} transaction - Datos de la transacción
 * @returns {boolean}
 */
function isInvoiceTransaction(transaction) {
  return transaction.categoria === 'factura' || transaction.invoice_id != null;
}

/**
 * Obtener estadísticas de transacciones
 * @param {Array} transactions - Lista de transacciones
 * @returns {Object} Estadísticas calculadas
 */
function getTransactionStats(transactions) {
  const stats = {
    totalGastos: 0,
    totalIngresos: 0,
    balance: 0,
    countGastos: 0,
    countIngresos: 0
  };
  
  transactions.forEach(t => {
    if (t.tipo === 'gasto') {
      stats.totalGastos += parseFloat(t.importe);
      stats.countGastos++;
    } else if (t.tipo === 'ingreso') {
      stats.totalIngresos += parseFloat(t.importe);
      stats.countIngresos++;
    }
  });
  
  stats.balance = stats.totalIngresos - stats.totalGastos;
  
  return stats;
}

// Exportar funciones globalmente
window.createTransaction = createTransaction;
window.getTransactions = getTransactions;
window.getTransactionById = getTransactionById;
window.updateTransaction = updateTransaction;
window.deleteTransaction = deleteTransaction;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.getClientName = getClientName;
window.validateTransactionData = validateTransactionData;
window.getCategoryLabel = getCategoryLabel;
window.isInvoiceTransaction = isInvoiceTransaction;
window.getTransactionStats = getTransactionStats;

// Exportar utilidades
window.transactionsUtils = {
  formatCurrency,
  formatDate,
  getClientName,
  validateTransactionData,
  getCategoryLabel,
  isInvoiceTransaction,
  getTransactionStats
};

console.log('✅ Transactions module loaded successfully');
