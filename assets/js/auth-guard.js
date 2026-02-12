/**
 * Auth Guard Middleware
 * Protege rutas que requieren autenticación
 */

// Páginas públicas que no requieren autenticación
const PUBLIC_PAGES = [
  '/signin.html',
  '/signup.html',
  '/index-2.html',
  '/404.html',
  '/coming-soon.html'
];

/**
 * Verificar si la página actual es pública
 * @returns {boolean}
 */
function isPublicPage() {
  const currentPath = window.location.pathname;
  return PUBLIC_PAGES.some(page => currentPath.endsWith(page));
}

/**
 * Obtener URL de destino después del login
 * @returns {string}
 */
function getIntendedUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect') || '/index.html';
}

/**
 * Guardar URL actual para redirigir después del login
 */
function saveIntendedUrl() {
  const currentPath = window.location.pathname + window.location.search;
  sessionStorage.setItem('intended_url', currentPath);
}

/**
 * Redirigir a la URL guardada o al dashboard
 */
function redirectToIntended() {
  const intendedUrl = sessionStorage.getItem('intended_url');
  sessionStorage.removeItem('intended_url');
  window.location.href = intendedUrl || '/index.html';
}

/**
 * Proteger la página actual
 * Si el usuario no está autenticado, redirige al login
 */
async function protectPage() {
  try {
    // Esperar a que el cliente de Supabase esté listo
    if (!window.supabaseClient) {
      console.warn('Esperando inicialización de Supabase...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Esperar a que Supabase haya terminado de leer la sesión de localStorage
    if (window.supabaseAuthReady) {
      console.log('⏳ Esperando a que Supabase auth esté listo...');
      await window.supabaseAuthReady;
      console.log('✅ Supabase auth listo');
    }

    const isAuthenticated = await window.checkAuth();

    if (!isAuthenticated) {
      console.log('⚠️ Usuario no autenticado, redirigiendo al login...');
      
      // Guardar la URL actual para redirigir después del login
      saveIntendedUrl();
      
      // Redirigir al login
      window.location.href = '/signin.html';
      return false;
    }

    console.log('✅ Usuario autenticado, acceso permitido');
    return true;
  } catch (error) {
    console.error('Error en auth guard:', error);
    window.location.href = '/signin.html';
    return false;
  }
}

/**
 * Verificar autenticación al cargar la página
 */
async function checkAuthOnLoad() {
  // No proteger páginas públicas
  if (isPublicPage()) {
    console.log('📄 Página pública, no requiere autenticación');
    return;
  }

  // Mostrar loading mientras se verifica
  showLoadingScreen();

  // Proteger la página
  const isAllowed = await protectPage();

  // Ocultar loading si el usuario tiene acceso
  if (isAllowed) {
    hideLoadingScreen();
  }
}

/**
 * Mostrar pantalla de carga
 */
function showLoadingScreen() {
  // Crear overlay de loading si no existe
  if (!document.getElementById('auth-loading')) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'auth-loading';
    loadingDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    loadingDiv.innerHTML = `
      <div style="text-align: center;">
        <svg class="animate-spin h-12 w-12 mx-auto text-success-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-bgray-600 dark:text-white">Verificando autenticación...</p>
      </div>
    `;
    document.body.appendChild(loadingDiv);
  }
}

/**
 * Ocultar pantalla de carga
 */
function hideLoadingScreen() {
  const loadingDiv = document.getElementById('auth-loading');
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

/**
 * Obtener información del usuario actual
 * @returns {Promise<Object|null>}
 */
async function getUserInfo() {
  try {
    const result = await window.getCurrentUser();
    return result.user;
  } catch (error) {
    console.error('Error al obtener info del usuario:', error);
    return null;
  }
}

/**
 * Mostrar información del usuario en la UI
 * @param {Object} user - Objeto de usuario
 */
function displayUserInfo(user) {
  if (!user) return;

  // Actualizar elementos con clase .user-email
  document.querySelectorAll('.user-email').forEach(el => {
    el.textContent = user.email;
  });

  // Actualizar elementos con clase .user-name
  const fullName = user.user_metadata?.full_name || user.email.split('@')[0];
  document.querySelectorAll('.user-name').forEach(el => {
    el.textContent = fullName;
  });

  // Actualizar elementos con clase .user-avatar
  const initials = getInitials(fullName);
  document.querySelectorAll('.user-avatar').forEach(el => {
    if (el.tagName === 'IMG') {
      // Si es una imagen, usar avatar por defecto o Gravatar
      el.src = user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=10b981&color=fff`;
    } else {
      // Si es un div, mostrar iniciales
      el.textContent = initials;
    }
  });
}

/**
 * Obtener iniciales del nombre
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Configurar listeners para botones de logout
 */
function setupLogoutButtons() {
  document.querySelectorAll('.logout-button, [data-action="logout"]').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const confirmed = confirm('¿Estás seguro de que quieres cerrar sesión?');
      if (!confirmed) return;

      try {
        const result = await window.signOut();
        if (result.success) {
          window.location.href = '/signin.html';
        } else {
          alert('Error al cerrar sesión');
        }
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Error al cerrar sesión');
      }
    });
  });
}

/**
 * Inicializar auth guard y cargar info del usuario
 */
async function initAuthGuard() {
  // Verificar autenticación
  await checkAuthOnLoad();

  // Si estamos en una página protegida, cargar info del usuario
  if (!isPublicPage()) {
    const user = await getUserInfo();
    if (user) {
      displayUserInfo(user);
      setupLogoutButtons();
    }
  }
}

// Exportar funciones
window.authGuard = {
  protectPage,
  checkAuthOnLoad,
  getUserInfo,
  displayUserInfo,
  setupLogoutButtons,
  initAuthGuard,
  isPublicPage,
  redirectToIntended,
  saveIntendedUrl,
};

// Auto-inicializar si el DOM está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthGuard);
} else {
  initAuthGuard();
}

console.log('✅ Auth guard module loaded');
