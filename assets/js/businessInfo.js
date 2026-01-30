/**
 * Business Info Module
 * Módulo para gestionar información de negocio/facturación con Supabase
 */

// Función auxiliar para obtener el cliente de Supabase
// Usamos función anónima para evitar conflictos con otros módulos
const getSupabaseForBusinessInfo = () => {
  if (!window.supabaseClient) {
    throw new Error('Supabase client no está inicializado');
  }
  return window.supabaseClient;
};

/**
 * Guardar información de negocio (crear nuevo registro)
 * @param {Object} businessData - Datos del negocio
 * @returns {Promise<Object>} Resultado de la operación
 */
async function saveBusinessInfo(businessData) {
  try {
    const supabase = getSupabaseForBusinessInfo();
    
    // Validaciones básicas
    if (!businessData.user_id) {
      throw new Error('user_id es obligatorio');
    }
    if (!businessData.nombre_fiscal || !businessData.nombre_fiscal.trim()) {
      throw new Error('El nombre fiscal es obligatorio');
    }
    if (!businessData.nif_cif || !businessData.nif_cif.trim()) {
      throw new Error('El NIF/CIF es obligatorio');
    }
    if (!businessData.telefono || !businessData.telefono.trim()) {
      throw new Error('El teléfono es obligatorio');
    }
    if (!businessData.direccion_facturacion || !businessData.direccion_facturacion.trim()) {
      throw new Error('La dirección de facturación es obligatoria');
    }
    if (!businessData.ciudad || !businessData.ciudad.trim()) {
      throw new Error('La ciudad es obligatoria');
    }
    if (!businessData.codigo_postal || !businessData.codigo_postal.trim()) {
      throw new Error('El código postal es obligatorio');
    }
    if (!businessData.provincia || !businessData.provincia.trim()) {
      throw new Error('La provincia es obligatoria');
    }
    if (!businessData.sector) {
      throw new Error('El sector es obligatorio');
    }

    const { data, error } = await supabase
      .from('business_info')
      .insert([businessData])
      .select()
      .single();

    if (error) {
      console.error('Error al guardar business_info:', error);
      
      // Mensajes de error personalizados
      if (error.message.includes('duplicate key') || error.code === '23505') {
        if (error.message.includes('nif_cif')) {
          throw new Error('Este NIF/CIF ya está registrado');
        }
        throw new Error('Ya existe un registro para este usuario');
      }
      
      throw new Error(error.message || 'Error al guardar información de negocio');
    }

    console.log('✅ Información de negocio guardada exitosamente:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error en saveBusinessInfo:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener información de negocio de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Resultado de la operación
 */
async function getBusinessInfo(userId) {
  try {
    const supabase = getSupabaseForBusinessInfo();
    
    if (!userId) {
      throw new Error('userId es obligatorio');
    }

    const { data, error } = await supabase
      .from('business_info')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Si no encuentra el registro, no es un error crítico
      if (error.code === 'PGRST116') {
        console.log('ℹ️ No se encontró información de negocio para el usuario');
        return { success: true, data: null };
      }
      
      console.error('Error al obtener business_info:', error);
      throw new Error(error.message || 'Error al obtener información de negocio');
    }

    console.log('✅ Información de negocio obtenida:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error en getBusinessInfo:', error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Actualizar información de negocio
 * @param {string} userId - ID del usuario
 * @param {Object} updates - Datos a actualizar
 * @returns {Promise<Object>} Resultado de la operación
 */
async function updateBusinessInfo(userId, updates) {
  try {
    const supabase = getSupabaseForBusinessInfo();
    
    if (!userId) {
      throw new Error('userId es obligatorio');
    }

    // Eliminar campos que no se deben actualizar
    const { user_id, id, created_at, ...allowedUpdates } = updates;

    if (Object.keys(allowedUpdates).length === 0) {
      throw new Error('No hay datos para actualizar');
    }

    const { data, error } = await supabase
      .from('business_info')
      .update(allowedUpdates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar business_info:', error);
      
      // Mensajes de error personalizados
      if (error.message.includes('duplicate key') || error.code === '23505') {
        if (error.message.includes('nif_cif')) {
          throw new Error('Este NIF/CIF ya está registrado');
        }
      }
      
      throw new Error(error.message || 'Error al actualizar información de negocio');
    }

    console.log('✅ Información de negocio actualizada exitosamente:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error en updateBusinessInfo:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Eliminar información de negocio
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Resultado de la operación
 */
async function deleteBusinessInfo(userId) {
  try {
    const supabase = getSupabaseForBusinessInfo();
    
    if (!userId) {
      throw new Error('userId es obligatorio');
    }

    const { error } = await supabase
      .from('business_info')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error al eliminar business_info:', error);
      throw new Error(error.message || 'Error al eliminar información de negocio');
    }

    console.log('✅ Información de negocio eliminada exitosamente');
    return { success: true };
  } catch (error) {
    console.error('Error en deleteBusinessInfo:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verificar si un usuario tiene información de negocio completa
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} true si tiene información completa, false si no
 */
async function hasBusinessInfo(userId) {
  try {
    const result = await getBusinessInfo(userId);
    return result.success && result.data !== null;
  } catch (error) {
    console.error('Error en hasBusinessInfo:', error);
    return false;
  }
}

/**
 * Verificar si un NIF/CIF ya está registrado
 * @param {string} nifCif - NIF/CIF a verificar
 * @param {string} excludeUserId - ID de usuario a excluir (opcional, para actualizaciones)
 * @returns {Promise<boolean>} true si ya existe, false si no
 */
async function checkNifCifExists(nifCif, excludeUserId = null) {
  try {
    const supabase = getSupabaseForBusinessInfo();
    
    if (!nifCif) {
      return false;
    }

    let query = supabase
      .from('business_info')
      .select('id, user_id')
      .eq('nif_cif', nifCif.trim());

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al verificar NIF/CIF:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error en checkNifCifExists:', error);
    return false;
  }
}

// Exportar funciones globalmente
window.businessInfo = {
  saveBusinessInfo,
  getBusinessInfo,
  updateBusinessInfo,
  deleteBusinessInfo,
  hasBusinessInfo,
  checkNifCifExists,
};

// Exportar también las funciones individuales
window.saveBusinessInfo = saveBusinessInfo;
window.getBusinessInfo = getBusinessInfo;
window.updateBusinessInfo = updateBusinessInfo;
window.deleteBusinessInfo = deleteBusinessInfo;
window.hasBusinessInfo = hasBusinessInfo;
window.checkNifCifExists = checkNifCifExists;

console.log('✅ BusinessInfo module loaded successfully');
