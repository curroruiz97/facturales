/**
 * Genera la lista de páginas a mostrar en la paginación, con elipsis cuando hay
 * muchas páginas. Patrón compartido entre Transacciones, Facturas Emitidas,
 * Contactos y Productos.
 *
 * Ej. (current=5, total=12, siblings=1): [1, '…', 4, 5, 6, '…', 12]
 */
export function buildPageList(currentPage: number, totalPages: number, siblings = 1): Array<number | "..."> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const left = Math.max(2, currentPage - siblings);
  const right = Math.min(totalPages - 1, currentPage + siblings);
  const pages: Array<number | "..."> = [1];
  if (left > 2) pages.push("...");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push("...");
  pages.push(totalPages);
  return pages;
}
