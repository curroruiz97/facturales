/**
 * Escapa caracteres HTML especiales para prevenir XSS
 * cuando se interpolan datos de usuario en innerHTML.
 *
 * @param {*} str - Valor a escapar (se convierte a string).
 * @returns {string} Cadena con entidades HTML escapadas.
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
