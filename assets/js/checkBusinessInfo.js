/**
 * Check Business Info Module
 * Middleware para verificar que el usuario tenga información de negocio completa
 * 
 * Este script debe importarse en todas las páginas protegidas del dashboard
 */

/**
 * Verificar que el usuario esté autenticado y tenga business_info completo
 * Si no está autenticado, redirige a signin.html
 * Si no tiene business_info, redirige a complete-profile.html
 * @returns {Promise<Object>} Usuario y datos de negocio si todo está correcto
 */
async function checkBusinessInfoComplete() {
  try {
    // Esperar a que Supabase haya terminado de leer la sesión de localStorage
    if (window.supabaseAuthReady) {
      await window.supabaseAuthReady;
    }

    // Verificar autenticación
    const userResult = await window.getCurrentUser();
    
    if (!userResult.success || !userResult.user) {
      console.log('❌ Usuario no autenticado, redirigiendo a signin...');
      window.location.href = './signin.html';
      return null;
    }

    const user = userResult.user;

    // Verificar si tiene información de negocio
    const businessResult = await window.getBusinessInfo(user.id);
    
    if (!businessResult.success || !businessResult.data) {
      console.log('⚠️ Usuario sin información de negocio, redirigiendo a complete-profile...');
      window.location.href = './complete-profile.html';
      return null;
    }

    console.log('✅ Usuario con acceso completo verificado');
    return {
      user: user,
      businessInfo: businessResult.data
    };
  } catch (error) {
    console.error('❌ Error al verificar acceso:', error);
    // En caso de error, por seguridad redirigir a signin
    window.location.href = './signin.html';
    return null;
  }
}

/**
 * Verificar solo autenticación (sin verificar business_info)
 * Útil para páginas como complete-profile.html y settings.html
 * @returns {Promise<Object>} Usuario si está autenticado
 */
async function checkAuthOnly() {
  try {
    const userResult = await window.getCurrentUser();
    
    if (!userResult.success || !userResult.user) {
      console.log('❌ Usuario no autenticado, redirigiendo a signin...');
      window.location.href = './signin.html';
      return null;
    }

    console.log('✅ Usuario autenticado verificado');
    return userResult.user;
  } catch (error) {
    console.error('❌ Error al verificar autenticación:', error);
    window.location.href = './signin.html';
    return null;
  }
}

// Exportar funciones globalmente
window.checkBusinessInfoComplete = checkBusinessInfoComplete;
window.checkAuthOnly = checkAuthOnly;

console.log('✅ CheckBusinessInfo module loaded successfully');
