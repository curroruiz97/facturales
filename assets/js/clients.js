/**
 * Clients CRUD Module
 * Módulo para gestión de clientes con Supabase
 */

// Referencia al cliente de Supabase
//const supabase = window.supabaseClient;

/**
 * Crear un nuevo cliente
 * @param {Object} clientData - Datos del cliente
 * @returns {Promise<Object>} Cliente creado o error
 */
async function createClient(clientData) {
  try {
    // Preparar datos
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
      estado: clientData.estado || 'activo'
    };

    // Validaciones básicas
    if (!data.nombre_razon_social) {
      throw new Error('El nombre/razón social es obligatorio');
    }
    if (!data.identificador) {
      throw new Error('El identificador es obligatorio');
    }

    // Insertar en Supabase
    const { data: cliente, error } = await supabase
      .from('clientes')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      
      // Manejar error de identificador duplicado
      if (error.code === '23505') {
        throw new Error('Ya existe un cliente con ese identificador');
      }
      
      throw new Error('Error al crear el cliente');
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
      throw new Error('Error al obtener los clientes');
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

    // Preparar datos (similar a createClient)
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
      estado: clientData.estado || 'activo'
    };

    // Validaciones
    if (!data.nombre_razon_social) {
      throw new Error('El nombre/razón social es obligatorio');
    }
    if (!data.identificador) {
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
      
      throw new Error('Error al actualizar el cliente');
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

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', clientId);

    if (error) {
      console.error('Error deleting client:', error);
      throw new Error('Error al eliminar el cliente');
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteClient:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Buscar clientes para autocompletado (mínimo 3 caracteres)
 * @param {string} term - Término de búsqueda
 * @returns {Promise<Array>} Lista filtrada de clientes
 */
async function searchClientsAutocomplete(term) {
  try {
    // Validar que el término tenga al menos 3 caracteres
    if (!term || term.trim().length < 3) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre_razon_social, identificador, email, telefono, direccion, codigo_postal, ciudad, pais')
      .ilike('nombre_razon_social', `%${term.trim()}%`)
      .eq('estado', 'activo') // Solo clientes activos
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

// Utilidades adicionales
window.clientsUtils = {
  getInitials,
  formatFullAddress
};
