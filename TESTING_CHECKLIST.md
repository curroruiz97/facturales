# Checklist de Testing - Sistema de Gestión de Clientes

## Instrucciones Previas

Antes de empezar el testing, asegúrate de:

1. ✅ Aplicar la migración SQL en Supabase Dashboard
   - Ir a: https://supabase.com/dashboard/project/nukslmpdwjqlepacukul/sql
   - Ejecutar el contenido de `supabase/migrations/20260129120604_create_clientes_table.sql`
   
2. ✅ Tener un servidor local corriendo (ej: `live-server` o similar)

3. ✅ Verificar que no hay errores en la consola del navegador al cargar las páginas

---

## 1. Testing en users.html

### 1.1 Visualización Inicial

- [ ] Abrir `users.html`
- [ ] Verificar que aparece "0 clientes registrados"
- [ ] Verificar que aparece el mensaje "No hay clientes aún. Crea tu primer cliente"
- [ ] Verificar que el botón "Nuevo Cliente" es visible

### 1.2 Crear Primer Cliente

- [ ] Click en "Nuevo Cliente"
- [ ] Verificar que se abre el modal con título "Nuevo Cliente"
- [ ] Llenar el formulario:
  - Nombre: TRESIERRA Y ASOCIADOS
  - Identificador: B75985688055
  - Email: contacto@tresierra.com
  - Teléfono: +34 689 936 481
  - Dirección: C/ Libertad 1, 2B
  - Código postal: 28001
  - Ciudad: Madrid
  - País: España
  - Día facturación: 31
  - Estado: Activo
- [ ] Click en "Guardar"
- [ ] Verificar que aparece toast de éxito: "Cliente creado correctamente"
- [ ] Verificar que el modal se cierra
- [ ] Verificar que la tabla muestra el cliente
- [ ] Verificar que el contador muestra "1 clientes registrados"
- [ ] Verificar que las iniciales son "TD"
- [ ] Verificar que el badge de estado es "Activo" (verde)

### 1.3 Crear Segundo Cliente

- [ ] Crear otro cliente con:
  - Nombre: RUIZ DEL TORO SL
  - Identificador: B787585786
  - Email: paco@paco.com
  - Teléfono: +34 655 777 888
  - Dirección: C/ Gamazo 1, 7B
  - Estado: Inactivo
- [ ] Verificar que se crea correctamente
- [ ] Verificar que el contador muestra "2 clientes registrados"
- [ ] Verificar que el badge de estado es "Inactivo" (gris)

### 1.4 Búsqueda en Tiempo Real

- [ ] En el campo "Buscar clientes..." escribir "TRESIERRA"
- [ ] Verificar que la tabla filtra y solo muestra TRESIERRA Y ASOCIADOS
- [ ] Borrar el campo de búsqueda
- [ ] Verificar que vuelven a aparecer ambos clientes
- [ ] Escribir "RU"
- [ ] Verificar que solo muestra RUIZ DEL TORO SL
- [ ] Escribir "XYZ" (algo que no existe)
- [ ] Verificar que la tabla muestra mensaje de "No se encontraron resultados"

### 1.5 Editar Cliente

- [ ] Click en el botón de editar (lápiz) de TRESIERRA Y ASOCIADOS
- [ ] Verificar que se abre el modal con título "Editar Cliente"
- [ ] Verificar que todos los campos están pre-llenados
- [ ] Cambiar el teléfono a: +34 999 999 999
- [ ] Click en "Actualizar"
- [ ] Verificar toast de éxito: "Cliente actualizado correctamente"
- [ ] Verificar que el teléfono se actualizó en la tabla

### 1.6 Eliminar Cliente

- [ ] Click en el botón de eliminar (papelera) de RUIZ DEL TORO SL
- [ ] Verificar que se abre modal de confirmación
- [ ] Verificar que aparece el nombre del cliente en el modal
- [ ] Click en "Cancelar"
- [ ] Verificar que el modal se cierra y el cliente sigue en la tabla
- [ ] Click nuevamente en eliminar
- [ ] Click en "Eliminar"
- [ ] Verificar toast de éxito: "Cliente eliminado correctamente"
- [ ] Verificar que el cliente desapareció de la tabla
- [ ] Verificar que el contador muestra "1 clientes registrados"

### 1.7 Validaciones

- [ ] Click en "Nuevo Cliente"
- [ ] Intentar guardar sin llenar campos obligatorios
- [ ] Verificar que HTML5 validation previene el submit
- [ ] Llenar solo Nombre e Identificador
- [ ] Intentar usar un identificador que ya existe (ej: B75985688055)
- [ ] Verificar toast de error: "Ya existe un cliente con ese identificador"

---

## 2. Testing en invoices/new.html

### 2.1 Autocompletado de Clientes

- [ ] Abrir `invoices/new.html`
- [ ] Ir a la sección "Cliente"
- [ ] Click en el campo "Razón social / Nombre"
- [ ] Escribir "TR" (menos de 3 caracteres)
- [ ] Verificar que NO aparece el dropdown
- [ ] Escribir "TRE" (3 caracteres)
- [ ] Esperar 300ms
- [ ] Verificar que aparece el dropdown con el cliente TRESIERRA Y ASOCIADOS
- [ ] Verificar que el botón "Crear cliente" aparece al final del dropdown

### 2.2 Selección de Cliente

- [ ] Click en TRESIERRA Y ASOCIADOS en el dropdown
- [ ] Verificar que el dropdown se cierra
- [ ] Verificar que se auto-rellenaron los campos:
  - Razón social / Nombre: TRESIERRA Y ASOCIADOS
  - NIF: B75985688055
  - Email: contacto@tresierra.com
  - Teléfono: +34 999 999 999
  - Dirección: C/ Libertad 1, 2B, 28001, Madrid, España

### 2.3 Crear Cliente desde Factura

- [ ] Click en el botón "Crear cliente" del dropdown
- [ ] Verificar que se abre el modal "Crear nuevo cliente"
- [ ] Llenar el formulario con un nuevo cliente:
  - Nombre: CLIENTE DESDE FACTURA SL
  - Identificador: B11111111
  - Email: cliente@factura.com
- [ ] Click en "Guardar cliente"
- [ ] Verificar toast de éxito: "Cliente creado correctamente"
- [ ] Verificar que el modal se cierra
- [ ] Verificar que los campos del formulario de factura se auto-rellenaron con el nuevo cliente

### 2.4 Cerrar Dropdown al Hacer Click Fuera

- [ ] Escribir en el campo de búsqueda para que aparezca el dropdown
- [ ] Click fuera del dropdown (en cualquier parte de la página)
- [ ] Verificar que el dropdown se cierra

---

## 3. Testing de Notificaciones Toast

- [ ] Verificar que todos los toasts aparecen en la esquina superior derecha
- [ ] Verificar que los toasts tienen animación de entrada (slide-in)
- [ ] Verificar que los toasts se auto-cierran después de 3 segundos
- [ ] Verificar que se puede cerrar manualmente con el botón X
- [ ] Verificar colores:
  - Success: Verde
  - Error: Rojo
  - Info: Azul

---

## 4. Testing de Errores y Edge Cases

### 4.1 Error de Conexión (simulado)

- [ ] Desactivar WiFi/Internet
- [ ] Intentar crear un cliente
- [ ] Verificar que aparece toast de error apropiado
- [ ] Reactivar conexión

### 4.2 Campos Opcionales Vacíos

- [ ] Crear un cliente solo con Nombre e Identificador (sin email, teléfono, etc.)
- [ ] Verificar que se guarda correctamente
- [ ] Verificar que en la tabla aparece "-" en los campos vacíos

### 4.3 Caracteres Especiales

- [ ] Crear un cliente con:
  - Nombre: O'NEILL & ASOCIADOS S.L.
  - Dirección: C/ José María, 5º-A
- [ ] Verificar que se guarda y muestra correctamente

---

## 5. Testing de UI/UX

### 5.1 Responsive Design

- [ ] Reducir el tamaño de la ventana (mobile)
- [ ] Verificar que la tabla de clientes es scrollable horizontalmente
- [ ] Verificar que el modal es responsive
- [ ] Verificar que los toasts son visibles en mobile

### 5.2 Dark Mode (si aplica)

- [ ] Activar dark mode
- [ ] Verificar que todos los elementos son legibles
- [ ] Verificar colores de badges, botones, modales

### 5.3 Estados de Carga

- [ ] Verificar que el botón "Guardar" cambia a "Guardando..." durante el submit
- [ ] Verificar que el botón está deshabilitado durante la operación

---

## Resultados Esperados Finales

Al finalizar todas las pruebas:

- ✅ Todos los checkbox deberían estar marcados
- ✅ No debería haber errores en la consola del navegador
- ✅ La tabla en `users.html` debería mostrar al menos 2 clientes
- ✅ El autocompletado en `invoices/new.html` debería funcionar perfectamente
- ✅ Todas las notificaciones toast deberían aparecer y desaparecer correctamente

---

## Problemas Encontrados

_Anota aquí cualquier problema o bug encontrado durante el testing:_

1. 
2. 
3. 

---

**Fecha de Testing**: ___________  
**Testeado por**: ___________  
**Navegador**: ___________  
**Estado**: [ ] Passed  [ ] Failed
