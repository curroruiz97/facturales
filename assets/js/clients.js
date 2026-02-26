/**
 * Clients CRUD Module
 * Módulo para gestión de clientes con Supabase
 */

// Función auxiliar para obtener el cliente de Supabase
// Usamos nombre único para evitar conflictos con otros módulos
const getSupabaseForClients = () => {
  if (!window.supabaseClient) {
    throw new Error('Supabase client no está inicializado');
  }
  return window.supabaseClient;
};

/**
 * Crear un nuevo cliente
 * @param {Object} clientData - Datos del cliente
 * @returns {Promise<Object>} Cliente creado o error
 */
async function createClient(clientData) {
  try {
    if (window.planLimits) {
      var limitCheck = await window.planLimits.canCreateClient();
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.reason);
      }
    }

    const supabase = getSupabaseForClients();
    
    // Obtener usuario autenticado para asignar user_id
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Usuario no autenticado. Por favor, inicia sesión.');
    }
    
    // Preparar datos con user_id
    const data = {
      nombre_razon_social: clientData.nombre_razon_social?.trim(),
      identificador: clientData.identificador?.trim().toUpperCase(),
      email: clientData.email?.trim() || null,
      telefono: clientData.telefono?.trim() || null,
      direccion: clientData.direccion?.trim() || null,
      codigo_postal: clientData.codigo_postal?.trim() || null,
      ciudad: clientData.ciudad?.trim() || null,
      pais: clientData.pais?.trim() || null,
      dia_facturacion: clientData.dia_facturacion ? parseInt(clientData.dia_facturacion) : null,
      estado: clientData.estado || 'activo',
      tipo_cliente: clientData.tipo_cliente || 'autonomo',
      user_id: user.id // Auto-asignar user_id
    };

    // Validaciones básicas
    if (!data.nombre_razon_social) {
      throw new Error('El nombre/razón social es obligatorio');
    }
    if (!data.identificador) {
      throw new Error('El identificador es obligatorio');
    }
    if (!['autonomo', 'sociedad'].includes(data.tipo_cliente)) {
      throw new Error('El tipo de cliente debe ser "autonomo" o "sociedad"');
    }
    
    // Insertar en Supabase
    const { data: cliente, error } = await supabase
      .from('clientes')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      
      // Manejar errores específicos
      if (error.code === '23505') {
        throw new Error('Ya existe un cliente con ese identificador');
      }
      
      // Error de autenticación/RLS
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        throw new Error('No tienes permisos para crear clientes. Por favor, inicia sesión.');
      }
      
      if (error.code === '42501') {
        throw new Error('No tienes permisos para realizar esta acción');
      }
      
      throw new Error(error.message || 'Error al crear el cliente');
    }

    // Marcar paso 2 como completado (primer cliente creado)
    if (cliente && window.updateStepProgress) {
      try {
        await window.updateStepProgress(user.id, 2, true);
        console.log('✅ Paso 2 marcado como completado');
      } catch (progressError) {
        console.warn('⚠️ No se pudo actualizar el progreso:', progressError);
        // No lanzar error, el cliente se creó exitosamente
      }
    }

    return { success: true, data: cliente };
  } catch (error) {
    console.error('Error in createClient:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener todos los clientes o buscar por término
 * @param {string} searchTerm - Término de búsqueda (opcional)
 * @returns {Promise<Array>} Lista de clientes
 */
async function getClients(searchTerm = '') {
  try {
    const supabase = getSupabaseForClients();
    
    let query = supabase
      .from('clientes')
      .select('*')
      .order('nombre_razon_social', { ascending: true });

    // Aplicar búsqueda si hay término
    if (searchTerm && searchTerm.trim()) {
      query = query.ilike('nombre_razon_social', `%${searchTerm.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      
      // Error de autenticación/RLS
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        throw new Error('No tienes permisos para ver clientes. Por favor, inicia sesión.');
      }
      
      throw new Error(error.message || 'Error al obtener los clientes');
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getClients:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Obtener un cliente por ID
 * @param {string} clientId - UUID del cliente
 * @returns {Promise<Object>} Cliente encontrado
 */
async function getClientById(clientId) {
  try {
    if (!clientId) {
      throw new Error('ID de cliente no proporcionado');
    }

    const supabase = getSupabaseForClients();
    
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      console.error('Error fetching client by ID:', error);
      throw new Error('Cliente no encontrado');
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getClientById:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualizar un cliente existente
 * @param {string} clientId - UUID del cliente
 * @param {Object} clientData - Datos actualizados
 * @returns {Promise<Object>} Cliente actualizado o error
 */
async function updateClient(clientId, clientData) {
  try {
    if (!clientId) {
      throw new Error('ID de cliente no proporcionado');
    }

    const supabase = getSupabaseForClients();
    
    // Preparar datos - SOLO los campos que se están enviando
    const data = {};
    
    // Procesar cada campo solo si existe en clientData
    if (clientData.nombre_razon_social !== undefined) {
      data.nombre_razon_social = clientData.nombre_razon_social?.trim();
    }
    
    if (clientData.identificador !== undefined) {
      data.identificador = clientData.identificador?.trim().toUpperCase();
    }
    
    if (clientData.email !== undefined) {
      data.email = clientData.email?.trim() || null;
    }
    
    if (clientData.telefono !== undefined) {
      data.telefono = clientData.telefono?.trim() || null;
    }
    
    if (clientData.direccion !== undefined) {
      data.direccion = clientData.direccion?.trim() || null;
    }
    
    if (clientData.codigo_postal !== undefined) {
      data.codigo_postal = clientData.codigo_postal?.trim() || null;
    }
    
    if (clientData.ciudad !== undefined) {
      data.ciudad = clientData.ciudad?.trim() || null;
    }
    
    if (clientData.pais !== undefined) {
      data.pais = clientData.pais?.trim() || null;
    }
    
    if (clientData.dia_facturacion !== undefined) {
      data.dia_facturacion = clientData.dia_facturacion ? parseInt(clientData.dia_facturacion) : null;
    }
    
    if (clientData.estado !== undefined) {
      data.estado = clientData.estado || 'activo';
    }

    if (clientData.tipo_cliente !== undefined) {
      data.tipo_cliente = clientData.tipo_cliente;
    }

    // Validaciones SOLO si se están actualizando esos campos
    if (data.nombre_razon_social !== undefined && !data.nombre_razon_social) {
      throw new Error('El nombre/razón social es obligatorio');
    }
    
    if (data.identificador !== undefined && !data.identificador) {
      throw new Error('El identificador es obligatorio');
    }

    // Actualizar en Supabase
    const { data: cliente, error } = await supabase
      .from('clientes')
      .update(data)
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      
      // Manejar error de identificador duplicado
      if (error.code === '23505') {
        throw new Error('Ya existe un cliente con ese identificador');
      }
      
      // Error de autenticación/RLS
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        throw new Error('No tienes permisos para actualizar clientes. Por favor, inicia sesión.');
      }
      
      if (error.code === '42501') {
        throw new Error('No tienes permisos para realizar esta acción');
      }
      
      throw new Error(error.message || 'Error al actualizar el cliente');
    }

    return { success: true, data: cliente };
  } catch (error) {
    console.error('Error in updateClient:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Eliminar un cliente
 * @param {string} clientId - UUID del cliente
 * @returns {Promise<Object>} Resultado de la operación
 */
async function deleteClient(clientId) {
  try {
    if (!clientId) {
      throw new Error('ID de cliente no proporcionado');
    }

    const supabase = getSupabaseForClients();
    
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', clientId);

    if (error) {
      console.error('Error deleting client:', error);
      
      // Error de autenticación/RLS
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        throw new Error('No tienes permisos para eliminar clientes. Por favor, inicia sesión.');
      }
      
      if (error.code === '42501') {
        throw new Error('No tienes permisos para realizar esta acción');
      }
      
      throw new Error(error.message || 'Error al eliminar el cliente');
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteClient:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Buscar clientes para autocompletado (mínimo 1 carácter)
 * @param {string} term - Término de búsqueda
 * @returns {Promise<Array>} Lista filtrada de clientes
 */
async function searchClientsAutocomplete(term) {
  try {
    if (!term || term.trim().length < 1) {
      return { success: true, data: [] };
    }

    const supabase = getSupabaseForClients();
    
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre_razon_social, identificador, email, telefono, direccion, codigo_postal, ciudad, pais')
      .ilike('nombre_razon_social', `%${term.trim()}%`)
      .order('nombre_razon_social', { ascending: true })
      .limit(10); // Máximo 10 resultados

    if (error) {
      console.error('Error in autocomplete search:', error);
      throw new Error('Error al buscar clientes');
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in searchClientsAutocomplete:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Obtener iniciales del nombre para el avatar
 * @param {string} nombre - Nombre completo
 * @returns {string} Iniciales (máximo 2 letras)
 */
function getInitials(nombre) {
  if (!nombre) return '??';
  
  const palabras = nombre.trim().split(' ');
  if (palabras.length === 1) {
    return palabras[0].substring(0, 2).toUpperCase();
  }
  
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
}

/**
 * Formatear dirección completa
 * @param {Object} cliente - Objeto cliente
 * @returns {string} Dirección formateada
 */
function formatFullAddress(cliente) {
  const parts = [];
  
  if (cliente.direccion) parts.push(cliente.direccion);
  if (cliente.codigo_postal) parts.push(cliente.codigo_postal);
  if (cliente.ciudad) parts.push(cliente.ciudad);
  if (cliente.pais) parts.push(cliente.pais);
  
  return parts.join(', ') || 'Sin dirección';
}

// Exportar funciones globalmente
window.createClient = createClient;
window.getClients = getClients;
window.getClientById = getClientById;
window.updateClient = updateClient;
window.deleteClient = deleteClient;
window.searchClientsAutocomplete = searchClientsAutocomplete;
window.getInitials = getInitials;
window.formatFullAddress = formatFullAddress;

/**
 * Validar datos de cliente
 * @param {Object} data - Datos del cliente
 * @returns {Object} Resultado de validación
 */
function validateClientData(data) {
  const errors = {};
  
  // Nombre obligatorio
  if (!data.nombre_razon_social?.trim()) {
    errors.nombre_razon_social = 'El nombre/razón social es obligatorio';
  }
  
  // Identificador obligatorio
  if (!data.identificador?.trim()) {
    errors.identificador = 'El NIF/CIF es obligatorio';
  }
  
  // Email válido (si se proporciona)
  if (data.email && !isValidEmail(data.email)) {
    errors.email = 'El formato del email no es válido';
  }
  
  // Teléfono válido (si se proporciona)
  if (data.telefono && data.telefono.trim() && !isValidPhone(data.telefono)) {
    errors.telefono = 'El formato del teléfono no es válido';
  }
  
  // Tipo de cliente obligatorio
  if (!data.tipo_cliente || !['autonomo', 'sociedad'].includes(data.tipo_cliente)) {
    errors.tipo_cliente = 'El tipo de cliente es obligatorio (autónomo o sociedad)';
  }

  // Día de facturación válido
  if (data.dia_facturacion) {
    const day = parseInt(data.dia_facturacion);
    if (isNaN(day) || day < 1 || day > 31) {
      errors.dia_facturacion = 'El día debe estar entre 1 y 31';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validar formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} true si es válido
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validar formato de teléfono
 * @param {string} phone - Teléfono a validar
 * @returns {boolean} true si es válido
 */
function isValidPhone(phone) {
  // Permitir formatos: +34 600 000 000, 600000000, +34600000000
  const re = /^[\+]?[0-9\s\-\(\)]{9,20}$/;
  return re.test(phone);
}

/**
 * Importación masiva de clientes en lotes.
 * Inserta filas validadas, salta duplicados por identificador y reporta errores.
 * @param {Object[]} validRows - Array de objetos con datos normalizados (output de csv-import.js)
 * @param {Object} options
 * @param {Function} [options.onProgress] - Callback (processed, total) para actualizar UI
 * @returns {Promise<{ insertedCount: number, skippedDuplicates: number, errorRows: Array }>}
 */
async function importClientsBulk(validRows, options) {
  const BATCH_SIZE = 200;
  const onProgress = (options && options.onProgress) || function () {};
  const supabase = getSupabaseForClients();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Usuario no autenticado. Por favor, inicia sesión.');
  }

  if (window.planLimits) {
    var limitCheck = await window.planLimits.canCreateClient();
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.reason);
    }
    var remaining = limitCheck.limit === Infinity ? Infinity : limitCheck.limit - limitCheck.current;
    if (remaining !== Infinity && validRows.length > remaining) {
      throw new Error('Solo puedes añadir ' + remaining + ' clientes más con tu plan actual (' + limitCheck.current + '/' + limitCheck.limit + ').');
    }
  }

  let insertedCount = 0;
  let skippedDuplicates = 0;
  const errorRows = [];
  let processed = 0;

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batchItems = validRows.slice(i, i + BATCH_SIZE);
    const batchData = batchItems.map(function (item) {
      const d = item.data || item;
      return {
        nombre_razon_social: d.nombre_razon_social,
        identificador: d.identificador,
        email: d.email || null,
        telefono: d.telefono || null,
        direccion: d.direccion || null,
        codigo_postal: d.codigo_postal || null,
        ciudad: d.ciudad || null,
        pais: d.pais || null,
        dia_facturacion: d.dia_facturacion || null,
        estado: d.estado || 'recurrente',
        tipo_cliente: d.tipo_cliente || 'autonomo',
        user_id: user.id
      };
    });

    const { data, error } = await supabase.from('clientes').insert(batchData).select();

    if (!error) {
      insertedCount += batchData.length;
      processed += batchData.length;
      onProgress(processed, validRows.length);
      continue;
    }

    // Si el lote falla (probablemente por duplicado), insertar fila a fila
    if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
      for (let j = 0; j < batchData.length; j++) {
        const singleRow = batchData[j];
        const rowRef = batchItems[j];
        const { error: singleError } = await supabase.from('clientes').insert([singleRow]).select();

        if (!singleError) {
          insertedCount++;
        } else if (singleError.code === '23505' || singleError.message.includes('duplicate') || singleError.message.includes('unique')) {
          skippedDuplicates++;
        } else {
          errorRows.push({
            row: rowRef.rowIndex || (i + j + 2),
            identificador: singleRow.identificador,
            reason: singleError.message || 'Error desconocido'
          });
        }

        processed++;
        onProgress(processed, validRows.length);
      }
    } else {
      // Error genérico del lote completo
      batchData.forEach(function (row, j) {
        errorRows.push({
          row: batchItems[j].rowIndex || (i + j + 2),
          identificador: row.identificador,
          reason: error.message || 'Error desconocido'
        });
      });
      processed += batchData.length;
      onProgress(processed, validRows.length);
    }
  }

  // Marcar paso 2 si se insertó al menos un cliente
  if (insertedCount > 0 && window.updateStepProgress) {
    try {
      await window.updateStepProgress(user.id, 2, true);
    } catch (e) {
      // No bloquear por error de progreso
    }
  }

  return { insertedCount: insertedCount, skippedDuplicates: skippedDuplicates, errorRows: errorRows };
}

// Utilidades adicionales
window.clientsUtils = {
  getInitials,
  formatFullAddress,
  validateClientData,
  isValidEmail,
  isValidPhone
};

// Exportar funciones de validación
window.validateClientData = validateClientData;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.importClientsBulk = importClientsBulk;
