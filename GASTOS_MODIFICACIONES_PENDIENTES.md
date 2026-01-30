# 📋 Modificaciones en Sección de Gastos

## ✅ Cambios Realizados

### 1. Traducción al Español
- ✅ Buscador: "Buscar por nombre, proveedor, concepto..."
- ✅ Botón Filtros: "Filtros"
- ✅ Meses: "Enero, Febrero, Marzo"  
- ✅ Columnas de la tabla:
  - "Customer name" → "Proveedor"
  - "Email" → "Concepto"  
  - "Location" → "Fecha"
  - "Spent" → "Importe"
  - "Amount Spent" → "Importe gastado"
- ✅ Filtro "Location" → "Categoría"

## ⏳ Pendiente de Completar

### 2. Eliminar Datos de Ejemplo
**Acción requerida**: Necesito eliminar TODAS las filas de datos de ejemplo:
- Devon Lane (aparece 3 veces)
- Bessie Cooper (aparece 3 veces)
- Ralph Edwards (1 vez)
- Arlene McCoy (1 vez)
- Dianne Russell (1 vez)

**Total**: 8 filas a eliminar completamente

**Reemplazar con**: Mensaje de estado vacío
```html
<tr>
  <td colspan="6" class="py-12 text-center">
    <div class="flex flex-col items-center gap-4">
      <svg class="stroke-bgray-300 dark:stroke-darkblack-400" width="64" height="64" viewBox="0 0 24 24" fill="none">
        <path d="M9 2H15M9 22H15M3.17 7.44L5.11 4.42M18.88 7.44L20.82 4.42M21 12H3M18.88 16.56L20.82 19.58M5.11 16.56L3.17 19.58" stroke-width="2"/>
      </svg>
      <div>
        <p class="text-lg font-semibold text-bgray-900 dark:text-white">No hay gastos aún</p>
        <p class="mt-1 text-sm text-bgray-600 dark:text-bgray-50">Añade tu primer gasto para comenzar</p>
      </div>
      <button onclick="openAddExpenseModal()" class="inline-flex items-center gap-2 rounded-lg bg-success-300 px-4 py-2 text-sm font-semibold text-white hover:bg-success-400">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3V13M3 8H13" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Añadir Gasto
      </button>
    </div>
  </td>
</tr>
```

### 3. Reorganizar Botones de Acciones Rápidas

**Cambios necesarios**:

1. **Botón Principal (GRANDE, NARANJA)**: "Añadir gasto"
   ```html
   <button 
     onclick="openAddExpenseModal()"
     class="w-full flex items-center justify-center gap-3 py-6 px-8 rounded-2xl bg-warning-300 hover:bg-warning-400 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-98"
   >
     <svg>...</svg>
     <span class="text-lg font-bold text-white">Añadir gasto</span>
   </button>
   ```

2. **Grid de Acciones Secundarias**:
   - Añadir nuevo contacto (mantener)
   - **Crear factura** (mover aquí donde estaba "Subir gasto")
   - Crear un presupuesto (mantener)

### 4. Crear Modal de Añadir Gasto

**Campos necesarios**:

```html
<div id="add-expense-modal" class="modal fixed inset-0 z-50 hidden flex items-center justify-center bg-black/50 backdrop-blur-sm">
  <div class="modal-content relative w-full max-w-2xl mx-4 bg-white dark:bg-darkblack-600 rounded-2xl shadow-2xl">
    <div class="px-6 py-5">
      <h3>Añadir Nuevo Gasto</h3>
      
      <form id="expense-form">
        <!-- Proveedor -->
        <input type="text" id="expense-supplier" placeholder="Nombre del proveedor" required />
        
        <!-- Concepto -->
        <input type="text" id="expense-concept" placeholder="Concepto del gasto" required />
        
        <!-- Importe -->
        <input type="number" id="expense-amount" step="0.01" placeholder="0,00 €" required />
        
        <!-- Fecha -->
        <input type="date" id="expense-date" required />
        
        <!-- Categoría -->
        <select id="expense-category">
          <option>Material de oficina</option>
          <option>Servicios</option>
          <option>Suministros</option>
          <option>Otros</option>
        </select>
        
        <!-- Botones -->
        <button type="submit">Guardar Gasto</button>
        <button type="button" onclick="closeExpenseModal()">Cancelar</button>
      </form>
    </div>
  </div>
</div>
```

### 5. JavaScript para el Modal

**Archivo**: `assets/js/expenses-page.js` (CREAR)

```javascript
// Abrir modal
function openAddExpenseModal() {
  const modal = document.getElementById('add-expense-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

// Cerrar modal
function closeExpenseModal() {
  const modal = document.getElementById('add-expense-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.getElementById('expense-form').reset();
}

// Guardar gasto
async function handleSaveExpense(event) {
  event.preventDefault();
  
  const expenseData = {
    supplier: document.getElementById('expense-supplier').value,
    concept: document.getElementById('expense-concept').value,
    amount: parseFloat(document.getElementById('expense-amount').value),
    date: document.getElementById('expense-date').value,
    category: document.getElementById('expense-category').value
  };
  
  // TODO: Guardar en Supabase
  console.log('Gasto:', expenseData);
  
  showToast('Gasto añadido correctamente', 'success');
  closeExpenseModal();
  loadExpenses(); // Recargar tabla
}

window.openAddExpenseModal = openAddExpenseModal;
window.closeExpenseModal = closeExpenseModal;
```

## 🚀 Próximos Pasos

1. Eliminar filas de datos de ejemplo de `expenses.html`
2. Reorganizar sección de botones (línea ~4542)  
3. Añadir modal HTML al final de `expenses.html`
4. Crear `assets/js/expenses-page.js`
5. Añadir scripts en `expenses.html`:
   ```html
   <script src="./assets/js/toast.js"></script>
   <script src="./assets/js/expenses-page.js"></script>
   ```

## 📝 Notas Importantes

- El color naranja para el botón principal es `bg-warning-300` (Tailwind)
- Mantener consistencia con el diseño actual
- Usar las mismas animaciones que en otros modales
- Los gastos se guardarán en una nueva tabla `gastos` en Supabase (pendiente de crear)

---

**Estado**: Parcialmente completado  
**Fecha**: 29 enero 2026
