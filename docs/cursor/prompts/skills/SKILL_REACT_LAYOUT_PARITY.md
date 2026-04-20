# SKILL: react-layout-parity

## Trigger de uso

Invocar cuando el CSS esta correcto pero el markup JSX produce un DOM distinto al layout legacy. Tipicamente el layout no coincide porque faltan wrappers, clases CSS o la estructura de nesting difiere.

## Inputs esperados

1. **Visual spec**: `VISUAL_SPEC_{pantalla}.md` como referencia del layout esperado.
2. **Componente TSX actual**: archivo a corregir.
3. **CSS legacy**: reglas que aplican al layout de ese componente.
4. **Token map**: para verificar que las clases CSS usadas son las correctas.

## Procedimiento paso a paso

### 1. Analizar DOM esperado
A partir del visual spec y CSS legacy, determinar:
- Estructura de contenedores (divs, sections, articles, asides).
- Clases CSS que DEBEN estar presentes.
- Orden de elementos.
- Atributos relevantes (aria-hidden, role, etc).

### 2. Inspeccionar DOM actual
Leer el TSX del componente y determinar:
- Que estructura DOM produce el JSX.
- Que clases CSS aplica.
- Que wrappers o contenedores faltan o sobran.

### 3. Identificar diferencias
Lista de diferencias tipicas:
- Wrapper div faltante (CSS legacy espera `.container > .item` pero React produce `.item` sin wrapper).
- Clase CSS incorrecta o faltante.
- Orden de elementos invertido.
- Elemento semantico incorrecto (div vs section vs article).
- Atributo faltante (aria-hidden en elementos decorativos).

### 4. Aplicar correcciones al JSX
Para cada diferencia:
- Ajustar JSX para que el DOM producido coincida con la referencia.
- Anadir wrappers si es necesario.
- Corregir clases CSS.
- Corregir orden de elementos.
- **NO cambiar logica de negocio ni estado.**
- **NO cambiar handlers de eventos.**
- **NO cambiar props pasadas a componentes hijos.**

### 5. Preservar TypeScript strict
- Asegurar que TODOS los tipos siguen siendo correctos.
- No usar `any`, `@ts-ignore` ni `as unknown as`.
- Verificar que los refs siguen apuntando correctamente.

### 6. Validar typecheck
```bash
npm run typecheck
```
Debe pasar con 0 errores.

### 7. Validar build
```bash
npm run build
```
Debe pasar con exit code 0.

### 8. Verificar rendering
- El DOM producido ahora debe generar el layout identico al legacy.
- Los estilos CSS existentes deben aplicar correctamente.

## Criterios de aceptacion

- [ ] DOM producido genera layout identico al legacy.
- [ ] Clases CSS correctas en todos los elementos.
- [ ] Logica de negocio NO alterada.
- [ ] TypeScript strict respetado.
- [ ] `npm run typecheck` PASS.
- [ ] `npm run build` PASS.

## Output estandar

- Archivo TSX corregido (modificado in-place).
- Lista de cambios:
```
| Componente | Cambio | Razon |
|------------|--------|-------|
| AuthLayout | Anadido wrapper div.auth-form-wrap | CSS espera .auth-form-wrap como contenedor |
```
