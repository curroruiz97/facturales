/**
 * Invoice Series - Database Module
 * Gestión de series de facturación con Supabase
 * Compartido entre settings.html, new.html y quote.html
 */

// Series por defecto (se insertan la primera vez)
var DEFAULT_SERIES = [
  { code: 'A', description: 'Serie general' },
  { code: 'B', description: 'Serie simplificada' },
  { code: 'R', description: 'Rectificativas' }
];

/**
 * Obtener todas las series del usuario desde Supabase
 * Si no tiene ninguna, crea las series por defecto
 */
async function getUserSeries() {
  try {
    var supabase = window.supabaseClient;
    if (!supabase) {
      console.warn('Supabase no disponible, usando series por defecto');
      return DEFAULT_SERIES.map(function (s) {
        return { id: null, code: s.code, description: s.description };
      });
    }

    var userResult = await supabase.auth.getUser();
    if (!userResult.data || !userResult.data.user) {
      console.warn('Usuario no autenticado');
      return [];
    }
    var userId = userResult.data.user.id;

    // Intentar obtener series existentes
    var result = await supabase
      .from('invoice_series')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (result.error) {
      console.error('Error al obtener series:', result.error);
      return DEFAULT_SERIES.map(function (s) {
        return { id: null, code: s.code, description: s.description };
      });
    }

    // Si no hay series, crear las por defecto
    if (!result.data || result.data.length === 0) {
      var inserts = DEFAULT_SERIES.map(function (s) {
        return { user_id: userId, code: s.code, description: s.description };
      });
      var insertResult = await supabase
        .from('invoice_series')
        .insert(inserts)
        .select();

      if (insertResult.error) {
        console.error('Error al crear series por defecto:', insertResult.error);
        return DEFAULT_SERIES.map(function (s) {
          return { id: null, code: s.code, description: s.description };
        });
      }

      return insertResult.data;
    }

    return result.data;
  } catch (e) {
    console.error('Error en getUserSeries:', e);
    return DEFAULT_SERIES.map(function (s) {
      return { id: null, code: s.code, description: s.description };
    });
  }
}

/**
 * Crear una nueva serie
 */
async function createSeries(code, description) {
  try {
    var supabase = window.supabaseClient;
    if (!supabase) return { success: false, error: 'Supabase no disponible' };

    var userResult = await supabase.auth.getUser();
    if (!userResult.data || !userResult.data.user) {
      return { success: false, error: 'Usuario no autenticado' };
    }
    var userId = userResult.data.user.id;

    var result = await supabase
      .from('invoice_series')
      .insert({ user_id: userId, code: code, description: description || '' })
      .select()
      .single();

    if (result.error) {
      // Duplicado
      if (result.error.code === '23505') {
        return { success: false, error: 'Ya existe una serie con el código "' + code + '"' };
      }
      return { success: false, error: result.error.message };
    }

    return { success: true, data: result.data };
  } catch (e) {
    console.error('Error en createSeries:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Actualizar una serie existente
 */
async function updateSeries(seriesId, code, description) {
  try {
    var supabase = window.supabaseClient;
    if (!supabase) return { success: false, error: 'Supabase no disponible' };

    var result = await supabase
      .from('invoice_series')
      .update({ code: code, description: description || '' })
      .eq('id', seriesId)
      .select()
      .single();

    if (result.error) {
      if (result.error.code === '23505') {
        return { success: false, error: 'Ya existe una serie con el código "' + code + '"' };
      }
      return { success: false, error: result.error.message };
    }

    return { success: true, data: result.data };
  } catch (e) {
    console.error('Error en updateSeries:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Eliminar una serie
 */
async function deleteSeries(seriesId) {
  try {
    var supabase = window.supabaseClient;
    if (!supabase) return { success: false, error: 'Supabase no disponible' };

    var result = await supabase
      .from('invoice_series')
      .delete()
      .eq('id', seriesId);

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (e) {
    console.error('Error en deleteSeries:', e);
    return { success: false, error: e.message };
  }
}

// Exponer globalmente
window.getUserSeries = getUserSeries;
window.createSeries = createSeries;
window.updateSeriesDB = updateSeries;
window.deleteSeriesDB = deleteSeries;
