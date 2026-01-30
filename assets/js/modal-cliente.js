/**
 * Cliente Modal Component
 * Componente reutilizable para crear/editar clientes
 * Incluye validaciones, estados de carga y manejo de errores
 */

class ClienteModal {
  constructor(modalId, options = {}) {
    this.modalId = modalId;
    this.mode = 'create'; // 'create' | 'edit'
    this.currentClientId = null;
    this.onSave = options.onSave || (() => {});
    this.onClose = options.onClose || (() => {});
    this.isSubmitting = false;
    
    // Referencias a elementos del DOM
    this.modal = null;
    this.form = null;
    this.saveBtn = null;
    this.title = null;
    
    // Inicializar después del DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
  
  /**
   * Inicializar el modal y sus event listeners
   */
  init() {
    this.modal = document.getElementById(this.modalId);
    if (!this.modal) {
      console.error(`Modal con ID "${this.modalId}" no encontrado`);
      return;
    }
    
    this.form = this.modal.querySelector('#cliente-form');
    this.saveBtn = this.modal.querySelector('#cliente-save-btn');
    this.title = this.modal.querySelector('.modal-title');
    
    // Event listeners
    this.setupEventListeners();
    
    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.close();
      }
    });
  }
  
  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    // Submit del formulario
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
    
    // Botones de cerrar
    const closeButtons = this.modal.querySelectorAll('[data-action="close-modal"]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });
    
    // Overlay para cerrar
    const overlay = this.modal.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.close());
    }
    
    // Validación en tiempo real
    this.setupRealTimeValidation();
  }
  
  /**
   * Configurar validación en tiempo real
   */
  setupRealTimeValidation() {
    const fields = [
      'cliente-name',
      'cliente-taxid',
      'cliente-email',
      'cliente-phone'
    ];
    
    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('blur', () => {
          this.validateField(fieldId);
        });
        
        // Limpiar error al escribir
        field.addEventListener('input', () => {
          this.clearFieldError(fieldId);
        });
      }
    });
  }
  
  /**
   * Abrir el modal
   * @param {string} mode - 'create' o 'edit'
   * @param {string} clientId - ID del cliente (solo para modo edit)
   */
  async open(mode = 'create', clientId = null) {
    this.mode = mode;
    this.currentClientId = clientId;
    
    // Limpiar formulario y errores
    this.clearForm();
    this.clearAllErrors();
    
    // Actualizar título
    if (this.title) {
      this.title.textContent = mode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente';
    }
    
    // Actualizar texto del botón
    if (this.saveBtn) {
      this.saveBtn.textContent = mode === 'create' ? 'Guardar Cliente' : 'Actualizar Cliente';
    }
    
    // Si es modo editar, cargar datos del cliente
    if (mode === 'edit' && clientId) {
      await this.loadClient(clientId);
    }
    
    // Mostrar modal con animación
    this.showModal();
    
    // Focus en primer campo
    setTimeout(() => {
      const firstInput = this.form?.querySelector('input:not([type="hidden"])');
      if (firstInput) firstInput.focus();
    }, 100);
  }
  
  /**
   * Mostrar el modal con animación
   */
  showModal() {
    if (!this.modal) return;
    
    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');
    
    // Animación de entrada
    requestAnimationFrame(() => {
      this.modal.classList.add('modal-enter');
      const content = this.modal.querySelector('.modal-content');
      if (content) {
        content.classList.add('modal-content-enter');
      }
    });
  }
  
  /**
   * Cerrar el modal
   */
  close() {
    if (!this.modal) return;
    
    // Animación de salida
    this.modal.classList.remove('modal-enter');
    const content = this.modal.querySelector('.modal-content');
    if (content) {
      content.classList.remove('modal-content-enter');
    }
    
    // Ocultar después de la animación
    setTimeout(() => {
      this.modal.classList.add('hidden');
      this.modal.classList.remove('flex');
      
      // Limpiar estado
      this.currentClientId = null;
      this.clearForm();
      this.clearAllErrors();
      
      // Callback
      this.onClose();
    }, 200);
  }
  
  /**
   * Cargar datos del cliente para edición
   * @param {string} clientId - ID del cliente
   */
  async loadClient(clientId) {
    try {
      // Mostrar loading
      this.setLoading(true, 'Cargando cliente...');
      
      const result = await window.getClientById(clientId);
      
      if (result.success) {
        const client = result.data;
        
        // Rellenar formulario
        this.fillForm(client);
      } else {
        this.showError('Error al cargar el cliente');
        this.close();
      }
    } catch (error) {
      console.error('Error loading client:', error);
      this.showError('Error al cargar el cliente');
      this.close();
    } finally {
      this.setLoading(false);
    }
  }
  
  /**
   * Rellenar formulario con datos del cliente
   * @param {Object} client - Datos del cliente
   */
  fillForm(client) {
    const fields = {
      'cliente-id': client.id,
      'cliente-name': client.nombre_razon_social || '',
      'cliente-taxid': client.identificador || '',
      'cliente-email': client.email || '',
      'cliente-phone': client.telefono || '',
      'cliente-address': client.direccion || '',
      'cliente-postal-code': client.codigo_postal || '',
      'cliente-city': client.ciudad || '',
      'cliente-country': client.pais || '',
      'cliente-billing-day': client.dia_facturacion || '30',
      'cliente-status': client.estado === 'activo' ? 'active' : 'inactive'
    };
    
    Object.entries(fields).forEach(([fieldId, value]) => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = value;
      }
    });
  }
  
  /**
   * Limpiar formulario
   */
  clearForm() {
    if (this.form) {
      this.form.reset();
      const hiddenId = document.getElementById('cliente-id');
      if (hiddenId) hiddenId.value = '';
    }
  }
  
  /**
   * Manejar envío del formulario
   * @param {Event} event - Evento submit
   */
  async handleSubmit(event) {
    event.preventDefault();
    
    // Evitar doble submit
    if (this.isSubmitting) return;
    
    // Limpiar errores previos
    this.clearAllErrors();
    
    // Recoger datos del formulario
    const clientData = this.getFormData();
    
    // Validar
    const validation = this.validateForm(clientData);
    if (!validation.isValid) {
      this.showValidationErrors(validation.errors);
      return;
    }
    
    // Guardar
    await this.saveClient(clientData);
  }
  
  /**
   * Obtener datos del formulario
   * @returns {Object} Datos del cliente
   */
  getFormData() {
    return {
      nombre_razon_social: document.getElementById('cliente-name')?.value.trim() || '',
      identificador: document.getElementById('cliente-taxid')?.value.trim() || '',
      email: document.getElementById('cliente-email')?.value.trim() || null,
      telefono: document.getElementById('cliente-phone')?.value.trim() || null,
      direccion: document.getElementById('cliente-address')?.value.trim() || null,
      codigo_postal: document.getElementById('cliente-postal-code')?.value.trim() || null,
      ciudad: document.getElementById('cliente-city')?.value.trim() || null,
      pais: document.getElementById('cliente-country')?.value.trim() || null,
      dia_facturacion: document.getElementById('cliente-billing-day')?.value || null,
      estado: document.getElementById('cliente-status')?.value === 'active' ? 'activo' : 'inactivo'
    };
  }
  
  /**
   * Validar formulario completo
   * @param {Object} data - Datos a validar
   * @returns {Object} Resultado de validación
   */
  validateForm(data) {
    const errors = {};
    
    // Nombre obligatorio
    if (!data.nombre_razon_social) {
      errors['cliente-name'] = 'El nombre o razón social es obligatorio';
    }
    
    // Identificador obligatorio
    if (!data.identificador) {
      errors['cliente-taxid'] = 'El NIF/CIF es obligatorio';
    }
    
    // Email válido (si se proporciona)
    if (data.email && !this.isValidEmail(data.email)) {
      errors['cliente-email'] = 'El email no es válido';
    }
    
    // Día de facturación válido
    if (data.dia_facturacion) {
      const day = parseInt(data.dia_facturacion);
      if (isNaN(day) || day < 1 || day > 31) {
        errors['cliente-billing-day'] = 'Debe ser un día entre 1 y 31';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
  
  /**
   * Validar un campo específico
   * @param {string} fieldId - ID del campo
   */
  validateField(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const value = field.value.trim();
    let error = null;
    
    switch (fieldId) {
      case 'cliente-name':
        if (!value) error = 'El nombre es obligatorio';
        break;
      case 'cliente-taxid':
        if (!value) error = 'El identificador es obligatorio';
        break;
      case 'cliente-email':
        if (value && !this.isValidEmail(value)) error = 'Email no válido';
        break;
    }
    
    if (error) {
      this.showFieldError(fieldId, error);
    } else {
      this.clearFieldError(fieldId);
    }
  }
  
  /**
   * Validar formato de email
   * @param {string} email - Email a validar
   * @returns {boolean} true si es válido
   */
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
  
  /**
   * Guardar cliente (crear o actualizar)
   * @param {Object} clientData - Datos del cliente
   */
  async saveClient(clientData) {
    try {
      this.isSubmitting = true;
      this.setLoading(true, 'Guardando...');
      
      let result;
      
      if (this.mode === 'edit' && this.currentClientId) {
        // Actualizar
        result = await window.updateClient(this.currentClientId, clientData);
      } else {
        // Crear
        result = await window.createClient(clientData);
      }
      
      if (result.success) {
        // Mostrar mensaje de éxito
        const message = this.mode === 'create' 
          ? 'Cliente creado correctamente' 
          : 'Cliente actualizado correctamente';
        
        if (window.showToast) {
          window.showToast(message, 'success');
        }
        
        // Callback con datos del cliente
        this.onSave(result.data);
        
        // Cerrar modal
        this.close();
      } else {
        // Mostrar error
        this.showError(result.error || 'Error al guardar el cliente');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      this.showError('Error inesperado al guardar el cliente');
    } finally {
      this.isSubmitting = false;
      this.setLoading(false);
    }
  }
  
  /**
   * Mostrar errores de validación
   * @param {Object} errors - Objeto con errores por campo
   */
  showValidationErrors(errors) {
    Object.entries(errors).forEach(([fieldId, message]) => {
      this.showFieldError(fieldId, message);
    });
    
    // Focus en el primer campo con error
    const firstErrorField = Object.keys(errors)[0];
    const field = document.getElementById(firstErrorField);
    if (field) field.focus();
  }
  
  /**
   * Mostrar error en un campo específico
   * @param {string} fieldId - ID del campo
   * @param {string} message - Mensaje de error
   */
  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Agregar clase de error al campo
    field.classList.add('border-red-500', 'dark:border-red-500');
    field.classList.remove('border-bgray-300', 'dark:border-darkblack-400');
    
    // Buscar o crear elemento de error
    let errorEl = field.parentElement.querySelector('.field-error');
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'field-error text-xs text-red-500 mt-1';
      field.parentElement.appendChild(errorEl);
    }
    
    errorEl.textContent = message;
  }
  
  /**
   * Limpiar error de un campo específico
   * @param {string} fieldId - ID del campo
   */
  clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Quitar clase de error
    field.classList.remove('border-red-500', 'dark:border-red-500');
    field.classList.add('border-bgray-300', 'dark:border-darkblack-400');
    
    // Eliminar mensaje de error
    const errorEl = field.parentElement.querySelector('.field-error');
    if (errorEl) {
      errorEl.remove();
    }
  }
  
  /**
   * Limpiar todos los errores
   */
  clearAllErrors() {
    // Limpiar errores de campos
    const errorMessages = this.modal?.querySelectorAll('.field-error');
    errorMessages?.forEach(el => el.remove());
    
    // Quitar clases de error
    const errorFields = this.modal?.querySelectorAll('.border-red-500');
    errorFields?.forEach(field => {
      field.classList.remove('border-red-500', 'dark:border-red-500');
      field.classList.add('border-bgray-300', 'dark:border-darkblack-400');
    });
    
    // Limpiar error general
    const generalError = this.modal?.querySelector('.general-error');
    if (generalError) {
      generalError.remove();
    }
  }
  
  /**
   * Mostrar error general
   * @param {string} message - Mensaje de error
   */
  showError(message) {
    // Limpiar error anterior
    const oldError = this.form?.querySelector('.general-error');
    if (oldError) oldError.remove();
    
    // Crear nuevo elemento de error
    const errorEl = document.createElement('div');
    errorEl.className = 'general-error p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm mb-4';
    errorEl.textContent = message;
    
    // Insertar al inicio del formulario
    if (this.form) {
      this.form.insertBefore(errorEl, this.form.firstChild);
    }
    
    // También mostrar toast si está disponible
    if (window.showToast) {
      window.showToast(message, 'error');
    }
  }
  
  /**
   * Establecer estado de carga
   * @param {boolean} loading - Si está cargando
   * @param {string} message - Mensaje de carga (opcional)
   */
  setLoading(loading, message = 'Cargando...') {
    if (!this.saveBtn) return;
    
    if (loading) {
      this.saveBtn.disabled = true;
      this.saveBtn.dataset.originalText = this.saveBtn.textContent;
      this.saveBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${message}
      `;
      
      // Deshabilitar campos del formulario
      const inputs = this.form?.querySelectorAll('input, select, textarea');
      inputs?.forEach(input => input.disabled = true);
    } else {
      this.saveBtn.disabled = false;
      this.saveBtn.textContent = this.saveBtn.dataset.originalText || 'Guardar';
      
      // Habilitar campos del formulario
      const inputs = this.form?.querySelectorAll('input, select, textarea');
      inputs?.forEach(input => input.disabled = false);
    }
  }
}

// Exportar globalmente
window.ClienteModal = ClienteModal;

console.log('✅ ClienteModal class loaded successfully');
