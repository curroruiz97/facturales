/**
 * Layout Loader - Carga dinámica de componentes compartidos (header y sidebar)
 * 
 * Este script carga los componentes HTML (sidebar y header) de forma dinámica
 * en todas las páginas, eliminando la duplicación de código.
 */

(function() {
  'use strict';

  /**
   * Detecta si estamos en un subdirectorio para ajustar rutas
   */
  function getBasePath() {
    const pathname = window.location.pathname;
    // Si estamos en el subdirectorio invoices/, ajustar ruta
    const isSubdirectory = pathname.includes('/invoices/');
    return isSubdirectory ? '../' : './';
  }

  /**
   * Carga un componente HTML desde una ruta específica
   * @param {string} componentPath - Ruta del componente HTML
   * @param {string} targetSelector - Selector CSS del contenedor destino
   * @returns {Promise<boolean>} - true si se cargó correctamente
   */
  async function loadComponent(componentPath, targetSelector) {
    try {
      const targetElement = document.querySelector(targetSelector);
      
      if (!targetElement) {
        console.error(`⚠️ No se encontró el elemento: ${targetSelector}`);
        return false;
      }

      const response = await fetch(componentPath);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      targetElement.innerHTML = html;
      
      console.log(`✅ Componente cargado: ${componentPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Error cargando ${componentPath}:`, error);
      return false;
    }
  }

  /**
   * Marca el item del menú activo según la página actual
   */
  function setActiveMenuItem() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    
    // Buscar todos los enlaces del sidebar
    const menuItems = document.querySelectorAll('.sidebar-body a, .sidebar-wrapper a');
    
    menuItems.forEach(link => {
      const href = link.getAttribute('href');
      const linkPage = href ? href.split('/').pop() : '';
      
      // Limpiar clases active previas
      const parentItem = link.closest('.item');
      if (parentItem) {
        parentItem.classList.remove('active');
      }
      
      // Marcar como activo si coincide
      if (linkPage === currentPage || 
          (currentPage === '' && linkPage === 'index.html') ||
          (currentPage === 'index.html' && linkPage === 'index.html')) {
        if (parentItem) {
          parentItem.classList.add('active');
        }
        link.classList.add('active');
      }
    });
  }

  /**
   * Actualiza el título de la página en el header
   */
  function updatePageTitle() {
    const pageTitle = document.body.getAttribute('data-page-title');
    
    if (pageTitle) {
      const titleElements = document.querySelectorAll('.header-wrapper h3, .mobile-wrapper h3');
      titleElements.forEach(element => {
        element.textContent = pageTitle;
      });
    }
  }

  /**
   * Inicializa el layout cargando sidebar y header
   */
  async function initializeLayout() {
    console.log('🔧 Inicializando layout...');
    
    const basePath = getBasePath();
    const sidebarPath = `${basePath}components/sidebar.html`;
    const headerPath = `${basePath}components/header.html`;
    
    try {
      // Cargar sidebar y header en paralelo
      const [sidebarLoaded, headerLoaded] = await Promise.all([
        loadComponent(sidebarPath, '#sidebar-container'),
        loadComponent(headerPath, '#header-container')
      ]);
      
      if (sidebarLoaded && headerLoaded) {
        console.log('✅ Layout cargado correctamente');
        
        // Aplicar configuraciones después de cargar
        setActiveMenuItem();
        updatePageTitle();
        
        // Emitir evento para que otros scripts sepan que el layout está listo
        document.dispatchEvent(new Event('layout-loaded'));
        console.log('📢 Evento "layout-loaded" emitido');
      } else {
        console.error('❌ Error: No se pudieron cargar todos los componentes');
      }
    } catch (error) {
      console.error('❌ Error fatal inicializando layout:', error);
    }
  }

  /**
   * Espera a que el DOM esté listo y luego inicializa el layout
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLayout);
  } else {
    // DOM ya está listo
    initializeLayout();
  }

  // Exportar funciones para uso global si es necesario
  window.layoutLoader = {
    initializeLayout,
    loadComponent,
    setActiveMenuItem,
    updatePageTitle
  };

})();
