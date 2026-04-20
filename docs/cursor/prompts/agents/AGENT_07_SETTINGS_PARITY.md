# AGENT 07 - Settings Parity Agent

## Rol

Actua como **Settings Parity Agent** para Facturales. Tu mision es lograr paridad visual 1:1 exacta de la pagina de ajustes: 7 tabs laterales, paneles, formularios, progreso, brand/color/logo.

## Contrato

Lee `docs/cursor/CURSOR_PARIDAD_1A1_CONTEXT.md`. La pagina de settings DEBE ser visualmente identica al legacy.

## Archivos objetivo

| Archivo | Contenido |
|---------|-----------|
| `src/features/settings/pages/SettingsPage.tsx` | Settings completo con 7 tabs (1870 lineas) |
| `src/app/styles/pilot-shell.css` | Secciones `.settings-legacy`, `.settings-*` |

## Entradas requeridas

- `VISUAL_SPEC_ajustes.md` del Visual Forensics Agent.
- `TOKEN_MAP_ajustes.json` del Design Token Lock Agent.
- Capturas legacy de la pagina de ajustes (cada tab).

## Layout general

- 2 columnas: aside izquierdo (tabs) + content derecho (panel activo).
- Aside: lista de tabs con icono SVG + titulo + subtitulo + panel progreso inferior.
- Content: contenido del tab activo.

## Tabs a verificar (7)

### Tab 1: Datos de negocio (`business`)
- Grid 2 secciones: formulario izquierda + aside derecha.
- Formulario: tipo entidad badge, nombre fiscal, NIF/CIF, nombre comercial, email, telefono.
- Seccion direccion: calle, numero, CP, poblacion, provincia, pais.
- Seccion negocio: sector (select).
- Acordeon "Configuracion de impuestos": tipo impuesto (IVA/IGIC/IPSI), tasa por defecto, IRPF.
- Aside: card "Actualizar perfil" con preview imagen, "Color de marca" con color picker + hex input, "Logo factura" con dropzone.
- Footer: boton "Guardar perfil".

### Tab 2: Series y numeracion (`series`)
- Header con titulo + boton "+ Nueva serie".
- Tabla: codigo (pill), nombre, formato, ultima factura, total, acciones (editar/eliminar).
- Formulario de serie: nombre, codigo, formato (select), reinicio, numero inicial, formato personalizado.
- Preview de numeracion.
- Card informativa "Como funciona la numeracion".

### Tab 3: Preguntas frecuentes (`faq`)
- Titulo.
- Acordeon: 6 preguntas con trigger expandible (+ / -).
- Contenido expandible con respuesta.

### Tab 4: Seguridad (`security`)
- Grid 2 columnas: formulario izquierda + ilustracion derecha.
- Formulario password: contrasena anterior + nueva con toggles mostrar/ocultar.
- Aviso para cuentas Google.
- Separador.
- Seccion backup: card proteccion, card almacenamiento (barra progreso), card copias de seguridad (lista con descarga).

### Tab 5: Registro (`logs`)
- Tabla: fecha, usuario, IP, ubicacion.
- Paginacion: total + botones anterior/siguiente.

### Tab 6: Usuarios (`users`)
- Card datos del negocio.
- Header "Miembros del equipo" con contador y boton "+ Anadir usuario".
- Formulario inline: nombre, email, permisos (select), boton guardar.
- Tabla: usuario, email, permisos, acciones (eliminar).

### Tab 7: Suscripcion (`subscription`)
- Toggle mensual/anual.
- 3 plan cards: Starter, Pro, Ilimitado con precio, features, boton.
- Plan actual badge.
- Resumen suscripcion: plan, estado, renovacion, botones (metodo pago, cancelar/reactivar).
- Card metodo de pago.
- Card uso del plan: clientes, productos, facturas, escaneos.

### Panel progreso (aside inferior)
- Ring 100%.
- Titulo "Completa el perfil".
- Descripcion.
- Boton "Verificar identidad".

## Reglas no negociables

1. 7 tabs exactas: business, series, faq, security, logs, users, subscription.
2. Cada tab con icono SVG, titulo y subtitulo exactos.
3. Panel progreso: ring 100%, CTA verificar identidad.
4. NO anadir tabs nuevas.
5. NO cambiar orden de tabs.
6. NO modificar campos de negocio.
7. Formularios funcionales con la misma logica actual.

## Checklist de cierre

- [ ] Tabs laterales pixel-match (icono + titulo + subtitulo + estado activo).
- [ ] Tab business pixel-match (formulario + aside).
- [ ] Tab series pixel-match (tabla + formulario).
- [ ] Tab faq pixel-match (acordeon).
- [ ] Tab security pixel-match (password + backup + storage).
- [ ] Tab logs pixel-match (tabla + paginacion).
- [ ] Tab users pixel-match (tabla + formulario inline).
- [ ] Tab subscription pixel-match (pricing + resumen + uso).
- [ ] Panel progreso pixel-match.
- [ ] Dark mode correcto en todos los tabs.
- [ ] `npm run typecheck` PASS.
- [ ] `npm run build` PASS.

## Que NO debe hacer

- Anadir tabs nuevas.
- Cambiar orden de tabs.
- Modificar campos de negocio.
- Cambiar logica de formularios.
- Redisenar layout de settings.
