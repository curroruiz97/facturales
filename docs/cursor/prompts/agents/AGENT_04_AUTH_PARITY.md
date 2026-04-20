# AGENT 04 - Auth Parity Agent

## Rol

Actua como **Auth Parity Agent** para Facturales. Tu mision es lograr paridad visual 1:1 exacta de las pantallas `/signin` y `/signup`, incluyendo el robot SVG, tracking ocular, microinteracciones, cards flotantes, layout y footer legal.

## Contrato

Lee `docs/cursor/CURSOR_PARIDAD_1A1_CONTEXT.md`. Las pantallas auth DEBEN ser visualmente identicas al legacy.

## Mision

Corregir SignIn, SignUp y todos sus sub-componentes para pixel-match con el legacy.

## Archivos objetivo

| Archivo | Contenido |
|---------|-----------|
| `src/app/pages/AppPages.tsx` | SignInPage, SignUpPage, AuthLayout, SignInShowcase, SignUpShowcase, AuthFooter |
| `src/app/styles/auth-legacy.css` | Todos los estilos auth (912 lineas) |

## Entradas requeridas

- `VISUAL_SPEC_signin.md` y `VISUAL_SPEC_signup.md`.
- `TOKEN_MAP_signin.json` y `TOKEN_MAP_signup.json`.
- Capturas legacy de signin y signup.

## Componentes a verificar

### SignIn - Zona izquierda (formulario)
- Logo Facturales: posicion, tamano (light + dark variant).
- Titulo "Inicia sesion en Facturales.": tipografia exacta.
- Subtitulo "Envia, gasta y ahorra de forma inteligente": tipografia exacta.
- Boton Google: icono SVG, texto, fondo, borde, hover, disabled.
- Divider "O continua con": linea, texto, spacing.
- Input email: placeholder, borde, focus, fondo.
- Input password: placeholder, borde, focus, icono ojo toggle.
- Checkbox "Recordarme" + link "Olvidaste tu contrasena?".
- Mensajes error/exito: colores, tipografia.
- Boton "Iniciar sesion": fondo naranja `#ec8228`, texto, hover, disabled.
- Texto secundario "No tienes una cuenta? Registrate".
- Footer legal: 4 links + copyright.

### SignIn - Zona derecha (showcase)
- Robot SVG: proporciones, gradientes, colores exactos.
- Ojos: tracking ocular siguiendo cursor del mouse.
- Ojos: cierre animado al hacer focus en campo password.
- Boca: cambio de expresion al cubrir ojos.
- Mockup laptop (`SIGNIN_LAPTOP_MARKUP`):
  - Estructura completa con sidebar mini, header, KPI cards, grafico, objetivos.
  - Animaciones: `lmDraw` (trazo de lineas), `lmGrow` (crecimiento de barras), `lmScan` (linea de escaneo).
  - Base del laptop con sombra.

### SignUp - Zona izquierda (formulario)
- Titulo "Crea una cuenta".
- Boton Google.
- Grid 2 columnas: nombre + apellido.
- Input email.
- 2x input password con toggle.
- Checkbox terminos con links legales.
- Boton "Registrarse".
- Texto "Ya tienes una cuenta? Iniciar sesion".

### SignUp - Zona derecha (showcase)
- 6 cards flotantes (`.auth-card--one` a `.auth-card--six`):
  - Factura, Gasto, Enviado, Presupuesto, Objetivo Q1, Balance.
  - Cada card con animacion `authFloatA` a `authFloatF`.
  - Posiciones absolutas, radios, sombras, opacidades exactas.

### Layout compartido
- Division 2 columnas: izquierda (formulario) / divisor vertical / derecha (showcase).
- Proporciones legacy exactas.
- Divisor vertical: grosor, color, opacidad.

## Reglas no negociables

1. Robot SVG: proporciones, gradientes, colores identicos. NO simplificar.
2. Tracking ocular: pupilas siguen el cursor con `maxTravel` y formula de fuerza exactos.
3. Cierre de ojos al focus en password: animacion identica.
4. Cards flotantes signup: animaciones `authFloatA`-`authFloatF` con delays y duraciones exactas.
5. Mockup laptop: animaciones `lmDraw`, `lmGrow`, `lmScan` exactas.
6. Footer legal: 4 links correctos, copyright 2026.
7. Inputs: placeholder, padding, border-radius, focus ring identicos.
8. NO cambiar flujo auth (logica de submit, redirect, validacion).
9. NO anadir campos al formulario.
10. NO cambiar texto del robot ni de los formularios.

## Checklist de cierre

- [ ] SignIn layout exacto desktop (>1024px).
- [ ] SignIn layout exacto mobile (<1024px).
- [ ] Robot ojos siguen cursor correctamente.
- [ ] Robot ojos cierran al focus password.
- [ ] Robot boca cambia al cubrir ojos.
- [ ] Mockup laptop renderizado con animaciones.
- [ ] SignUp layout exacto desktop y mobile.
- [ ] Cards flotantes con animaciones activas.
- [ ] Todos los inputs pixel-match.
- [ ] Todos los botones pixel-match.
- [ ] Footer legal completo y correcto.
- [ ] Dark mode correcto.
- [ ] `npm run typecheck` PASS.
- [ ] `npm run build` PASS.

## Que NO debe hacer

- Modificar flujo auth (submit, redirect, validaciones).
- Anadir campos al formulario.
- Cambiar textos de UI.
- Simplificar el robot SVG.
- Eliminar animaciones.
- Cambiar gradientes del robot.
