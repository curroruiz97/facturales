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
    console.log('🔄 Cerrando sesión...');
    
    // Llamar a la función signOut de auth.js
    if (typeof window.signOut === 'function') {
      const result = await window.signOut();
      
      if (result.success) {
        console.log('✅ Sesión cerrada exitosamente');
        // Redirigir a la página de login
        window.location.href = '/signin.html';
      } else {
        console.error('❌ Error al cerrar sesión:', result.error);
        if (typeof window.showToast === 'function') {
          window.showToast('Error al cerrar sesión', 'error');
        }
      }
    } else {
      console.error('❌ Función signOut no disponible');
      // Redirigir de todas formas
      window.location.href = '/signin.html';
    }
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error);
    // Redirigir de todas formas en caso de error
    window.location.href = '/signin.html';
  }
}

/**
 * Cargar y mostrar información del usuario en el header
 */
async function loadUserHeader() {
  try {
    console.log('🔄 Cargando información del usuario para el header...');
    
    // Esperar a que las funciones estén disponibles
    let attempts = 0;
    while ((!window.getCurrentUser || !window.getBusinessInfo) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.getCurrentUser) {
      console.warn('⚠️ getCurrentUser no disponible');
      return;
    }

    // Obtener usuario actual
    const userResult = await window.getCurrentUser();
    if (!userResult.success || !userResult.user) {
      console.warn('⚠️ No hay usuario autenticado');
      return;
    }

    const currentUser = userResult.user;
    console.log('✅ Usuario obtenido:', currentUser.email);

    let userName = 'Usuario';
    let profileImageUrl = './assets/images/avatar/profile-52x52.png';

    // Intentar obtener información de negocio si está disponible
    if (typeof window.getBusinessInfo === 'function') {
      const businessResult = await window.getBusinessInfo(currentUser.id);
      
      if (businessResult.success && businessResult.data) {
        const businessData = businessResult.data;
        
        // Usar nombre fiscal como nombre de usuario
        if (businessData.nombre_fiscal) {
          userName = businessData.nombre_fiscal;
        }
        
        // Usar imagen de perfil si existe
        if (businessData.profile_image_url) {
          profileImageUrl = businessData.profile_image_url;
        }
      }
    } else {
      // Si no está disponible getBusinessInfo, usar metadata
      userName = currentUser.user_metadata?.company_name || 
                currentUser.user_metadata?.name || 
                currentUser.email.split('@')[0];
    }

    // Actualizar elementos del DOM
    updateHeaderDOM(userName, currentUser.email, profileImageUrl);
    
    console.log('✅ Header del usuario actualizado correctamente');
  } catch (error) {
    console.error('❌ Error al cargar información del usuario:', error);
  }
}

/**
 * Actualiza los elementos del DOM con la información del usuario
 */
function updateHeaderDOM(userName, userEmail, profileImageUrl) {
  // Actualizar imagen de perfil
  const profileImages = document.querySelectorAll('.user-profile-image');
  profileImages.forEach(img => {
    img.src = profileImageUrl;
    img.alt = userName;
  });

  // Actualizar nombre de usuario
  const userNames = document.querySelectorAll('.user-profile-name');
  userNames.forEach(element => {
    element.textContent = userName;
  });

  // Actualizar correo electrónico
  const userEmails = document.querySelectorAll('.user-profile-email');
  userEmails.forEach(element => {
    element.textContent = userEmail;
  });

  // También actualizar elementos con IDs específicos (para compatibilidad)
  const companyNameElement = document.getElementById('user-company-name');
  if (companyNameElement) {
    companyNameElement.textContent = userName;
  }
  
  const emailElement = document.getElementById('user-email-display');
  if (emailElement) {
    emailElement.textContent = userEmail;
  }
  
  const companyNameMobile = document.getElementById('user-company-name-mobile');
  if (companyNameMobile) {
    companyNameMobile.textContent = userName;
  }
  
  const emailMobile = document.getElementById('user-email-display-mobile');
  if (emailMobile) {
    emailMobile.textContent = userEmail;
  }
}

/**
 * Inicializar cuando el DOM esté listo
 */
(function initUserHeader() {
  console.log('🔄 Inicializando user-header.js...');
  
  async function init() {
    await loadUserHeader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Exportar funciones globalmente
window.handleLogout = handleLogout;
window.loadUserHeader = loadUserHeader;
window.updateHeaderDOM = updateHeaderDOM;
