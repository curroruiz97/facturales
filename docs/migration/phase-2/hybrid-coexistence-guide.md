# Fase 2 - Guia de convivencia hibrida por rutas

## Objetivo

Permitir que rutas React y legacy convivan sin mezclar responsabilidades en la misma pantalla.

## Principio de aislamiento

1. Una ruta pertenece a un solo shell (`legacy` o `react-pilot`).
2. Las reglas de negocio se ejecutan desde servicios/repositorios compartidos.
3. La navegacion entre shells se realiza por URL, nunca por incrustacion de componentes.

## Matriz de rutas (estado actual)

| Ruta | Shell | Estado |
|---|---|---|
| `/productos.html` | legacy | Produccion actual |
| `/pilot-products.html` | react-pilot | Piloto F2 |

## Adaptador de navegacion

- Legacy a React: `assets/js/react-shell-adapter.js`
  - API transitoria: `window.facturalesServices.navigation.openProductsPilot(...)`
  - CTA visible en `productos.html`: boton `Piloto React`.
- React a Legacy:
  - Boton "Volver a legacy" en `TopActions`.

## Dependencias permitidas en shell React

- `src/services/*` para auth, repositorios y limites.
- `src/domain/rules/*` para reglas de negocio compartidas.

## Dependencias no permitidas en shell React

- `load-components.js`, `main.js`, `componentsLoaded`.
- handlers inline y render via `innerHTML`.
- contratos nuevos fuera de `window.facturalesServices`.

## Rollback

- Si el piloto falla, redirigir usuarios al flujo estable `/productos.html`.
- El legacy no fue eliminado ni alterado como ruta principal.
