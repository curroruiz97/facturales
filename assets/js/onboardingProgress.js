/**
 * onboardingProgress.js
 * Sistema de seguimiento de progreso para "Primeros Pasos"
 */

/**
 * Obtener el progreso del usuario desde la base de datos
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Resultado con datos de progreso
 */
async function getUserProgress(userId) {
  try {
    const supabase = window.supabaseClient;
    if (!supabase) {
      throw new Error('Supabase no está inicializado');
    }

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error al obtener progreso:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || null };
  } catch (error) {
    console.error('Error en getUserProgress:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Crear registro inicial de progreso para un nuevo usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Resultado de la operación
 */
async function createUserProgress(userId) {
  try {
    const supabase = window.supabaseClient;
    if (!supabase) {
      throw new Error('Supabase no está inicializado');
    }

    // Verificar si el usuario tiene clientes
    const hasClients = await checkUserHasClients(userId);

    const { data, error } = await supabase
      .from('user_progress')
      .insert([
        {
          user_id: userId,
          step1_business_info: true, // Siempre true (tienen business_info)
          step2_first_client: hasClients,
          step3_customize_invoice: true, // Siempre true por ahora
          step4_first_invoice: false // Siempre false por ahora
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error al crear progreso:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Progreso creado exitosamente');
    return { success: true, data };
  } catch (error) {
    console.error('Error en createUserProgress:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Actualizar un paso específico del progreso
 * @param {string} userId - ID del usuario
 * @param {number} stepNumber - Número del paso (1, 2, 3, 4)
 * @param {boolean} completed - Estado completado (true/false)
 * @returns {Promise<Object>} Resultado de la operación
 */
async function updateStepProgress(userId, stepNumber, completed = true) {
  try {
    const supabase = window.supabaseClient;
    if (!supabase) {
      throw new Error('Supabase no está inicializado');
    }

    // Mapear número de paso a nombre de columna
    const stepColumns = {
      1: 'step1_business_info',
      2: 'step2_first_client',
      3: 'step3_customize_invoice',
      4: 'step4_first_invoice'
    };

    const columnName = stepColumns[stepNumber];
    if (!columnName) {
      throw new Error(`Número de paso inválido: ${stepNumber}`);
    }

    const { data, error } = await supabase
      .from('user_progress')
      .update({ [columnName]: completed })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar progreso:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Paso ${stepNumber} actualizado a ${completed}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error en updateStepProgress:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verificar si el usuario tiene al menos un cliente
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} True si tiene clientes
 */
async function checkUserHasClients(userId) {
  try {
    const supabase = window.supabaseClient;
    if (!supabase) {
      return false;
    }

    const { count, error } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error al verificar clientes:', error);
      return false;
    }

    return count > 0;
  } catch (error) {
    console.error('Error en checkUserHasClients:', error);
    return false;
  }
}

/**
 * Calcular porcentaje de progreso completado
 * @param {Object} progressData - Datos de progreso del usuario
 * @returns {Object} Información de progreso { completed, total, percentage }
 */
function calculateProgress(progressData) {
  if (!progressData) {
    return { completed: 0, total: 4, percentage: 0 };
  }

  const steps = [
    progressData.step1_business_info,
    progressData.step2_first_client,
    progressData.step3_customize_invoice,
    progressData.step4_first_invoice
  ];

  const completed = steps.filter(step => step === true).length;
  const total = steps.length;
  const percentage = Math.round((completed / total) * 100);

  return { completed, total, percentage };
}

/**
 * Calcular stroke-dashoffset para el círculo de progreso
 * @param {number} percentage - Porcentaje completado (0-100)
 * @returns {number} Valor de stroke-dashoffset
 */
function calculateStrokeDashoffset(percentage) {
  const circumference = 201; // 2 * PI * r (r=32)
  return circumference - (circumference * percentage / 100);
}

/**
 * Renderizar los pasos del onboarding dinámicamente
 * @param {Object} progressData - Datos de progreso del usuario
 * @param {string} containerId - ID del contenedor donde renderizar
 */
function renderOnboardingSteps(progressData, containerId = 'onboarding-steps-container') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Contenedor de onboarding no encontrado');
    return;
  }

  // Definición de pasos
  const steps = [
    {
      number: 1,
      title: 'Añade los datos de tu negocio',
      description: 'Rellena los datos de tu negocio que aparecerán en tus facturas',
      completed: progressData?.step1_business_info || false,
      buttonText: 'Ir a Configuración',
      buttonUrl: 'settings.html'
    },
    {
      number: 2,
      title: 'Añade tu primer contacto',
      description: 'Crea tu listado de clientes y proveedores a los que facturas habitualmente',
      completed: progressData?.step2_first_client || false,
      buttonText: 'Crear contacto',
      buttonUrl: 'users.html'
    },
    {
      number: 3,
      title: 'Personaliza tu factura',
      description: 'Elige una plantilla para tu factura y personalízala a tu gusto',
      completed: progressData?.step3_customize_invoice || false,
      buttonText: 'Personalizar',
      buttonUrl: 'invoices/new.html'
    },
    {
      number: 4,
      title: 'Crea tu primera factura',
      description: 'Crea tu primera factura digital en menos de un minuto',
      completed: progressData?.step4_first_invoice || false,
      buttonText: 'Crear factura',
      buttonUrl: 'invoices/new.html'
    }
  ];

  // Limpiar contenedor
  container.innerHTML = '';

  // Renderizar cada paso
  steps.forEach((step, index) => {
    const isLast = index === steps.length - 1;
    const stepHtml = createStepHTML(step, isLast);
    container.insertAdjacentHTML('beforeend', stepHtml);
  });
}

/**
 * Crear HTML para un paso individual
 * @param {Object} step - Datos del paso
 * @param {boolean} isLast - Es el último paso
 * @returns {string} HTML del paso
 */
function createStepHTML(step, isLast) {
  const { number, title, description, completed, buttonText, buttonUrl } = step;

  // Icono y estilo según estado
  const iconHtml = completed
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M20 6L9 17L4 12" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M9 5L16 12L9 19" stroke="#ec8228" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`;

  const circleClass = completed
    ? 'bg-success-300 shadow-md'
    : 'bg-white border-2 border-bgray-300 shadow-sm';

  const actionHtml = completed
    ? `<span class="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-info-600 bg-info-50 border border-info-200 dark:bg-info-900/20 dark:text-info-400 dark:border-info-800 rounded-lg">
         Completado
       </span>`
    : `<button onclick="location.href='${buttonUrl}'" class="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-warning-300 hover:bg-warning-400 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md">
         ${buttonText}
         <svg class="ml-2 w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
           <path d="M9 5L16 12L9 19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>
       </button>`;

  const lineHtml = !isLast
    ? `<div class="w-0.5 flex-1 min-h-[60px]" style="background: repeating-linear-gradient(to bottom, #CBD5E0 0px, #CBD5E0 8px, transparent 8px, transparent 16px);"></div>`
    : '';

  return `
    <div class="flex items-start gap-4">
      <div class="flex-shrink-0 flex flex-col items-center">
        <div class="flex items-center justify-center w-11 h-11 rounded-full ${circleClass}">
          ${iconHtml}
        </div>
        ${lineHtml}
      </div>
      <div class="flex-1 pb-8">
        <p class="text-xs font-bold tracking-wider text-bgray-500 dark:text-bgray-400 mb-2">PASO ${number}</p>
        <h3 class="text-base font-bold text-bgray-900 dark:text-white mb-2">
          ${title}
        </h3>
        <p class="text-sm text-bgray-600 dark:text-bgray-400 leading-relaxed mb-3">
          ${description}
        </p>
        ${actionHtml}
      </div>
    </div>
  `;
}

/**
 * Actualizar el círculo de progreso y el texto
 * @param {Object} progress - Información de progreso { completed, total, percentage }
 */
function updateProgressCircle(progress) {
  const { completed, total, percentage } = progress;

  // Actualizar texto de progreso
  const progressText = document.getElementById('onboarding-progress-text');
  if (progressText) {
    progressText.innerHTML = `${percentage}<span class="text-lg font-medium text-bgray-500">/${total * 25}</span>`;
  }

  // Actualizar estado
  const progressState = document.getElementById('onboarding-progress-state');
  if (progressState) {
    progressState.textContent = percentage === 100 ? 'COMPLETADO' : 'EN PROGRESO';
    progressState.className = percentage === 100
      ? 'text-xs font-bold tracking-wider text-success-300 uppercase'
      : 'text-xs font-bold tracking-wider text-warning-300 uppercase';
  }

  // Actualizar círculo SVG
  const progressCircle = document.getElementById('onboarding-progress-circle');
  if (progressCircle) {
    const dashoffset = calculateStrokeDashoffset(percentage);
    progressCircle.style.strokeDashoffset = dashoffset;
  }

  // Actualizar icono si está completo
  const progressIcon = document.getElementById('onboarding-progress-icon');
  if (progressIcon && percentage === 100) {
    progressIcon.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="#ec8228" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }
}

/**
 * Cargar y renderizar el progreso del onboarding
 */
async function loadOnboardingProgress() {
  try {
    console.log('🔄 Cargando progreso de onboarding...');

    // Esperar a que los módulos estén disponibles
    let attempts = 0;
    while ((!window.getCurrentUser || !window.supabaseClient) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.getCurrentUser || !window.supabaseClient) {
      console.error('❌ Módulos necesarios no disponibles');
      return;
    }

    // Obtener usuario actual
    const userResult = await window.getCurrentUser();
    if (!userResult.success || !userResult.user) {
      console.warn('⚠️ Usuario no autenticado');
      return;
    }

    const userId = userResult.user.id;
    console.log('✅ Usuario obtenido:', userId);

    // Obtener o crear progreso
    let progressResult = await getUserProgress(userId);

    if (!progressResult.success || !progressResult.data) {
      console.log('📝 Creando registro de progreso...');
      progressResult = await createUserProgress(userId);
    }

    if (!progressResult.success || !progressResult.data) {
      console.error('❌ No se pudo obtener el progreso');
      return;
    }

    let progressData = progressResult.data;
    console.log('✅ Progreso obtenido:', progressData);

    // SINCRONIZAR paso 2 con la cantidad real de clientes (siempre)
    const hasClients = await checkUserHasClients(userId);
    const shouldBeCompleted = hasClients; // true si tiene >= 1 cliente
    
    // Solo actualizar si el estado actual es diferente al real
    if (progressData.step2_first_client !== shouldBeCompleted) {
      console.log(`🔄 Sincronizando paso 2: ${progressData.step2_first_client} → ${shouldBeCompleted}`);
      const updateResult = await updateStepProgress(userId, 2, shouldBeCompleted);
      if (updateResult.success) {
        progressData = updateResult.data;
        console.log('✅ Paso 2 sincronizado correctamente');
      }
    }

    // Calcular progreso
    const progress = calculateProgress(progressData);
    console.log('📊 Progreso calculado:', progress);

    // Renderizar UI
    renderOnboardingSteps(progressData);
    updateProgressCircle(progress);

    // Re-inicializar el estado del colapso después de renderizar
    setTimeout(() => {
      const content = document.getElementById('primerosPasosContent');
      const arrow = document.getElementById('arrowPrimerosPasos');
      
      if (content && arrow) {
        // Expandir por defecto con transición
        content.style.transition = 'all 0.5s ease-in-out';
        content.style.maxHeight = content.scrollHeight + 'px';
        content.style.opacity = '1';
        content.style.marginTop = '1.5rem';
        arrow.style.transform = 'rotate(0deg)';
      }
    }, 100);

    console.log('✅ Onboarding renderizado exitosamente');
  } catch (error) {
    console.error('❌ Error al cargar onboarding:', error);
  }
}

// Exportar funciones globalmente
window.getUserProgress = getUserProgress;
window.createUserProgress = createUserProgress;
window.updateStepProgress = updateStepProgress;
window.checkUserHasClients = checkUserHasClients;
window.calculateProgress = calculateProgress;
window.renderOnboardingSteps = renderOnboardingSteps;
window.loadOnboardingProgress = loadOnboardingProgress;

console.log('✅ onboardingProgress.js cargado');
