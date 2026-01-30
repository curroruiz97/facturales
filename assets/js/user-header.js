/**
 * User Header Module
 * Módulo para mostrar información del usuario en el header y manejar logout
 */

/**
 * Manejar cierre de sesión
 */
async function handleLogout(event) {
  if (event) {
    event.preventDefault();
  }
  
  try {
    console.log('Cerrando sesión...');
    
    // Llamar a la función signOut de auth.js
    const result = await signOut();
    
    if (result.success) {
      console.log('✅ Sesión cerrada exitosamente');
      // Redirigir a la página de login
      window.location.href = '/signin.html';
    } else {
      console.error('❌ Error al cerrar sesión:', result.error);
      showToast('Error al cerrar sesión', 'error');
    }
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error);
    showToast('Error al cerrar sesión', 'error');
  }
}

/**
 * Cargar y mostrar información del usuario en el header
 */
async function loadUserInfo() {
  try {
    // Obtener usuario actual
    const result = await getCurrentUser();
    
    if (result.success && result.user) {
      const user = result.user;
      
      // Obtener nombre de empresa del metadata o usar email
      const companyName = user.user_metadata?.company_name || 
                          user.user_metadata?.name || 
                          user.email.split('@')[0];
      
      const email = user.email;
      
      // Actualizar elementos del header (versión escritorio)
      const companyNameElement = document.getElementById('user-company-name');
      if (companyNameElement) {
        companyNameElement.textContent = companyName;
      }
      
      const emailElement = document.getElementById('user-email-display');
      if (emailElement) {
        emailElement.textContent = email;
      }
      
      // Actualizar elementos del header (versión móvil si existen)
      const companyNameMobile = document.getElementById('user-company-name-mobile');
      if (companyNameMobile) {
        companyNameMobile.textContent = companyName;
      }
      
      const emailMobile = document.getElementById('user-email-display-mobile');
      if (emailMobile) {
        emailMobile.textContent = email;
      }
      
      console.log('✅ Información de usuario cargada:', { companyName, email });
    } else {
      console.warn('⚠️ No se pudo obtener información del usuario');
      // Mantener valores por defecto
    }
  } catch (error) {
    console.error('❌ Error al cargar información del usuario:', error);
    // Mantener valores por defecto
  }
}

// Cargar información del usuario cuando se carga la página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadUserInfo);
} else {
  // El DOM ya está cargado
  loadUserInfo();
}

// Exportar funciones globalmente
window.handleLogout = handleLogout;
window.loadUserInfo = loadUserInfo;
