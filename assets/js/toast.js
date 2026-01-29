/**
 * Toast Notification System
 * Sistema de notificaciones estilo toast para feedback al usuario
 */

// Contenedor para los toasts
let toastContainer = null;

/**
 * Inicializar el contenedor de toasts
 */
function initToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2';
    toastContainer.style.cssText = 'pointer-events: none;';
    document.body.appendChild(toastContainer);
  }
}

/**
 * Mostrar una notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duración en milisegundos (default: 3000)
 */
function showToast(message, type = 'success', duration = 3000) {
  // Asegurar que el contenedor existe
  initToastContainer();

  // Crear el elemento toast
  const toast = document.createElement('div');
  toast.style.cssText = 'pointer-events: auto;';
  
  // Configurar clases según el tipo
  const typeConfig = {
    success: {
      bgColor: 'bg-success-300',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>`
    },
    error: {
      bgColor: 'bg-red-500',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>`
    },
    info: {
      bgColor: 'bg-blue-500',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`
    },
    warning: {
      bgColor: 'bg-yellow-500',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>`
    }
  };

  const config = typeConfig[type] || typeConfig.success;

  // Estructura del toast
  toast.className = `${config.bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[400px] transform transition-all duration-300 ease-out opacity-0 translate-x-full`;
  
  toast.innerHTML = `
    <div class="flex-shrink-0">
      ${config.icon}
    </div>
    <p class="flex-1 text-sm font-medium">${message}</p>
    <button onclick="this.parentElement.remove()" class="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  `;

  // Añadir al contenedor
  toastContainer.appendChild(toast);

  // Animar entrada
  setTimeout(() => {
    toast.classList.remove('opacity-0', 'translate-x-full');
    toast.classList.add('opacity-100', 'translate-x-0');
  }, 10);

  // Auto-cerrar después de la duración especificada
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, duration);
}

/**
 * Atajos para tipos específicos de toast
 */
const toast = {
  success: (message, duration) => showToast(message, 'success', duration),
  error: (message, duration) => showToast(message, 'error', duration),
  info: (message, duration) => showToast(message, 'info', duration),
  warning: (message, duration) => showToast(message, 'warning', duration)
};

// Hacer disponible globalmente
window.showToast = showToast;
window.toast = toast;
