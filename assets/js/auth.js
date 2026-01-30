/**
 * Authentication Module
 * Módulo de autenticación con Supabase Auth
 */

// Referencia al cliente de Supabase
const getSupabase = () => {
  if (!window.supabaseClient) {
    throw new Error('Supabase client no está inicializado');
  }
  return window.supabaseClient;
};

/**
 * Registrar un nuevo usuario
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña
 * @param {Object} metadata - Datos adicionales del usuario (opcional)
 * @returns {Promise<Object>} Resultado de la operación
 */
async function signUp(email, password, metadata = {}) {
  try {
    const supabase = getSupabase();
    
    // Validaciones básicas
    if (!email || !email.trim()) {
      throw new Error('El email es obligatorio');
    }
    if (!password || password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: metadata
      }
    });

    if (error) {
      console.error('Error al registrar usuario:', error);
      
      // Mensajes de error personalizados
      if (error.message.includes('already registered')) {
        throw new Error('Este email ya está registrado');
      }
      if (error.message.includes('invalid email')) {
        throw new Error('Email inválido');
      }
      
      throw new Error(error.message || 'Error al registrar usuario');
    }

    console.log('✅ Usuario registrado exitosamente:', data);
    return { success: true, data, user: data.user, session: data.session };
  } catch (error) {
    console.error('Error en signUp:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Iniciar sesión con email y contraseña
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña
 * @returns {Promise<Object>} Resultado de la operación
 */
async function signIn(email, password) {
  try {
    const supabase = getSupabase();
    
    // Validaciones básicas
    if (!email || !email.trim()) {
      throw new Error('El email es obligatorio');
    }
    if (!password) {
      throw new Error('La contraseña es obligatoria');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (error) {
      console.error('Error al iniciar sesión:', error);
      
      // Mensajes de error personalizados
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Email o contraseña incorrectos');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Debes confirmar tu email antes de iniciar sesión');
      }
      
      throw new Error(error.message || 'Error al iniciar sesión');
    }

    console.log('✅ Sesión iniciada exitosamente:', data.user.email);
    return { success: true, data, user: data.user, session: data.session };
  } catch (error) {
    console.error('Error en signIn:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cerrar sesión
 * @returns {Promise<Object>} Resultado de la operación
 */
async function signOut() {
  try {
    const supabase = getSupabase();
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error al cerrar sesión:', error);
      throw new Error('Error al cerrar sesión');
    }

    console.log('✅ Sesión cerrada exitosamente');
    return { success: true };
  } catch (error) {
    console.error('Error en signOut:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener usuario actual
 * @returns {Promise<Object>} Usuario actual o null
 */
async function getCurrentUser() {
  try {
    const supabase = getSupabase();
    
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error al obtener usuario:', error);
      return { success: false, user: null };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Error en getCurrentUser:', error);
    return { success: false, user: null };
  }
}

/**
 * Obtener sesión actual
 * @returns {Promise<Object>} Sesión actual o null
 */
async function getCurrentSession() {
  try {
    const supabase = getSupabase();
    
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error al obtener sesión:', error);
      return { success: false, session: null };
    }

    return { success: true, session };
  } catch (error) {
    console.error('Error en getCurrentSession:', error);
    return { success: false, session: null };
  }
}

/**
 * Verificar si el usuario está autenticado
 * @returns {Promise<boolean>} true si está autenticado, false si no
 */
async function checkAuth() {
  try {
    const result = await getCurrentSession();
    return result.success && result.session !== null;
  } catch (error) {
    console.error('Error en checkAuth:', error);
    return false;
  }
}

/**
 * Escuchar cambios en el estado de autenticación
 * @param {Function} callback - Función que se ejecuta cuando cambia el estado
 * @returns {Object} Subscription object para cancelar el listener
 */
function onAuthStateChange(callback) {
  try {
    const supabase = getSupabase();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        callback(event, session);
      }
    );

    return subscription;
  } catch (error) {
    console.error('Error en onAuthStateChange:', error);
    return null;
  }
}

/**
 * Enviar email de recuperación de contraseña
 * @param {string} email - Email del usuario
 * @returns {Promise<Object>} Resultado de la operación
 */
async function resetPassword(email) {
  try {
    const supabase = getSupabase();
    
    if (!email || !email.trim()) {
      throw new Error('El email es obligatorio');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password.html`,
      }
    );

    if (error) {
      console.error('Error al enviar email de recuperación:', error);
      throw new Error('Error al enviar email de recuperación');
    }

    console.log('✅ Email de recuperación enviado a:', email);
    return { success: true };
  } catch (error) {
    console.error('Error en resetPassword:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualizar contraseña del usuario
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<Object>} Resultado de la operación
 */
async function updatePassword(newPassword) {
  try {
    const supabase = getSupabase();
    
    if (!newPassword || newPassword.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('Error al actualizar contraseña:', error);
      throw new Error('Error al actualizar contraseña');
    }

    console.log('✅ Contraseña actualizada exitosamente');
    return { success: true, data };
  } catch (error) {
    console.error('Error en updatePassword:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualizar perfil del usuario
 * @param {Object} updates - Datos a actualizar
 * @returns {Promise<Object>} Resultado de la operación
 */
async function updateProfile(updates) {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) {
      console.error('Error al actualizar perfil:', error);
      throw new Error('Error al actualizar perfil');
    }

    console.log('✅ Perfil actualizado exitosamente');
    return { success: true, data };
  } catch (error) {
    console.error('Error en updateProfile:', error);
    return { success: false, error: error.message };
  }
}

// Exportar funciones globalmente
window.auth = {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getCurrentSession,
  checkAuth,
  onAuthStateChange,
  resetPassword,
  updatePassword,
  updateProfile,
};

// Exportar también las funciones individuales
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
window.getCurrentSession = getCurrentSession;
window.checkAuth = checkAuth;
window.onAuthStateChange = onAuthStateChange;
window.resetPassword = resetPassword;
window.updatePassword = updatePassword;
window.updateProfile = updateProfile;

console.log('✅ Auth module loaded successfully');
