/**
 * userHeader.js
 * Script para cargar y mostrar la información del usuario en el header
 * Muestra: imagen de perfil (52x52), nombre de usuario y correo electrónico
 */

/**
 * Carga y muestra la información del usuario en el header
 */
async function loadUserHeader() {
  try {
    console.log('🔄 Cargando información del usuario para el header...');
    
    // Obtener usuario actual
    const userResult = await window.getCurrentUser();
    if (!userResult.success || !userResult.user) {
      console.warn('⚠️ No hay usuario autenticado');
      return;
    }

    const currentUser = userResult.user;
    console.log('✅ Usuario obtenido:', currentUser.email);

    // Obtener información de negocio (para imagen de perfil y nombre fiscal)
    const businessResult = await window.getBusinessInfo(currentUser.id);
    
    let userName = 'Usuario';
    let profileImageUrl = './assets/images/avatar/profile-52x52.png'; // Imagen por defecto

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
}

/**
 * Inicializar cuando el DOM esté listo
 */
(function initUserHeader() {
  console.log('🔄 Inicializando userHeader.js...');
  
  // Esperar a que el DOM y los módulos estén listos
  async function init() {
    // Esperar a que los módulos de Supabase estén disponibles
    let attempts = 0;
    while ((!window.getCurrentUser || !window.getBusinessInfo) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.getCurrentUser || !window.getBusinessInfo) {
      console.error('❌ Módulos de Supabase no disponibles');
      return;
    }

    // Cargar información del usuario
    await loadUserHeader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Exportar función para uso global
window.loadUserHeader = loadUserHeader;
