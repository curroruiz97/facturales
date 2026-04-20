import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { clientsRepository, invoicesRepository, productsRepository, quotesRepository } from "../../services/repositories";
import { transactionsAdapter } from "../../features/transactions/adapters/transactions.adapter";

interface SearchResultItem {
  id: string;
  label: string;
  subtitle: string;
  href: string;
  category: string;
}

function toSearchHref(basePath: string, term: string, highlightId?: string): string {
  const params = new URLSearchParams();
  const normalizedTerm = term.trim();
  if (normalizedTerm) params.set("search", normalizedTerm);
  if (highlightId) params.set("highlight", highlightId);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function GlobalSearch(): import("react").JSX.Element {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const openPalette = useCallback(() => {
    setOpen(true);
    setTerm("");
    setResults([]);
    setActiveIndex(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setTerm("");
    setResults([]);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openPalette]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    const normalized = term.trim().toLowerCase();
    if (normalized.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      const [products, clients, transactions, invoices, quotes] = await Promise.all([
        productsRepository.list(normalized),
        clientsRepository.list(normalized),
        transactionsAdapter.loadTransactions({ search: normalized, tipo: "all", categoria: "all" }),
        invoicesRepository.list({}),
        quotesRepository.list({}),
      ]);

      if (cancelled) return;

      const merged: SearchResultItem[] = [];

      if (clients.success) {
        merged.push(
          ...clients.data.slice(0, 4).map((c) => ({
            id: `client-${c.id}`,
            label: c.nombreRazonSocial,
            subtitle: c.identificador || c.email || "",
            href: toSearchHref("/contactos", normalized, c.id),
            category: "Clientes",
          })),
        );
      }

      if (invoices.success) {
        merged.push(
          ...invoices.data
            .filter((inv) => {
              const num = (inv.invoiceNumber ?? "").toLowerCase();
              return num.includes(normalized) || inv.clientName.toLowerCase().includes(normalized);
            })
            .slice(0, 4)
            .map((inv) => ({
              id: `invoice-${inv.id}`,
              label: inv.invoiceNumber ?? "Sin número",
              subtitle: `${inv.clientName} - ${inv.status === "issued" ? "Emitida" : inv.status === "draft" ? "Borrador" : "Anulada"}`,
              href: toSearchHref("/facturas/vista-previa", normalized, inv.id),
              category: "Facturas",
            })),
        );
      }

      if (quotes.success) {
        merged.push(
          ...quotes.data
            .filter((q) => {
              const num = (q.quoteNumber ?? "").toLowerCase();
              return num.includes(normalized) || q.clientName.toLowerCase().includes(normalized);
            })
            .slice(0, 3)
            .map((q) => ({
              id: `quote-${q.id}`,
              label: q.quoteNumber ?? "Sin número",
              subtitle: `${q.clientName} - ${q.status === "issued" ? "Emitido" : q.status === "draft" ? "Borrador" : "Anulado"}`,
              href: toSearchHref("/presupuestos/vista-previa", normalized, q.id),
              category: "Presupuestos",
            })),
        );
      }

      if (products.success) {
        merged.push(
          ...products.data.slice(0, 3).map((p) => ({
            id: `product-${p.id}`,
            label: p.nombre,
            subtitle: p.referencia ? `Ref: ${p.referencia}` : "Producto",
            href: toSearchHref("/productos", normalized, p.id),
            category: "Productos",
          })),
        );
      }

      if (transactions.success) {
        merged.push(
          ...transactions.data.slice(0, 3).map((t) => ({
            id: `tx-${t.id}`,
            label: t.concepto,
            subtitle: `${t.tipo === "ingreso" ? "Ingreso" : "Gasto"} - ${new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(t.importe)}`,
            href: toSearchHref("/transacciones", normalized, t.id),
            category: "Transacciones",
          })),
        );
      }

      setResults(merged.slice(0, 12));
      setActiveIndex(0);
      setLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [term]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      closePalette();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      return;
    }
    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      const link = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`) as HTMLAnchorElement | null;
      link?.click();
    }
  };

  useEffect(() => {
    const active = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const helperText = useMemo(() => {
    if (loading) return "Buscando...";
    if (term.trim().length < 2) return "Escribe al menos 2 caracteres...";
    if (!results.length) return "Sin resultados para tu búsqueda";
    return null;
  }, [loading, results.length, term]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResultItem[]> = {};
    for (const r of results) {
      (groups[r.category] ??= []).push(r);
    }
    return groups;
  }, [results]);

  if (!open) {
    return (
      <div className="pilot-search">
        <label className="pilot-search__field" onClick={openPalette}>
          <span className="pilot-search__icon" aria-hidden>
            <svg viewBox="0 0 20 20">
              <circle cx="9" cy="9" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path d="M13.2 13.2 17 17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            className="pilot-input"
            placeholder="Buscar..."
            readOnly
            onFocus={openPalette}
            style={{ cursor: "pointer" }}
          />
          <kbd className="pilot-search__kbd">Ctrl+K</kbd>
        </label>
      </div>
    );
  }

  let flatIdx = 0;

  return createPortal(
    <div className="gs-overlay" onClick={closePalette}>
      <div className="gs-modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="gs-header">
          <span className="gs-header__icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.7" />
              <path d="M13.2 13.2 17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            className="gs-header__input"
            placeholder="Buscar clientes, facturas, productos..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <button type="button" className="gs-header__esc" onClick={closePalette}>ESC</button>
        </div>

        <div className="gs-body" ref={listRef}>
          {helperText ? (
            <p className="gs-helper">{helperText}</p>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="gs-group">
                <p className="gs-group__label">{category}</p>
                {items.map((item) => {
                  const idx = flatIdx++;
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      data-idx={idx}
                      className={`gs-result ${idx === activeIndex ? "gs-result--active" : ""}`}
                      onClick={closePalette}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <div className="gs-result__text">
                        <strong>{item.label}</strong>
                        <span>{item.subtitle}</span>
                      </div>
                      <svg className="gs-result__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="gs-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>↵</kbd> abrir</span>
          <span><kbd>esc</kbd> cerrar</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
