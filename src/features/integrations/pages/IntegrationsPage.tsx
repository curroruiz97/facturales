import type { JSX } from "react";

type IntegrationStatus = "active" | "partial" | "soon";

interface IntegrationCard {
  id: string;
  title: string;
  category: string;
  description: string;
  /** Clave del icono: brand (imagen) o feature (SVG en línea). */
  icon: string;
  /** Si es true, el icono se carga desde /images/integrations/{icon}.svg. */
  brand?: boolean;
  status: IntegrationStatus;
  /** Dónde se usa en la app (solo activas/parciales). */
  where?: string;
}

// Integraciones REALES y verificadas (funciones edge / servicios en producción).
const ACTIVE_CARDS: IntegrationCard[] = [
  {
    id: "excel",
    title: "Microsoft Excel / CSV",
    category: "Datos y hojas de cálculo",
    description: "Importa y exporta tu cartera de clientes en Excel o CSV. Migra tus datos desde otra herramienta en segundos.",
    icon: "excel",
    brand: true,
    status: "active",
    where: "Clientes › Importar / Exportar",
  },
  {
    id: "pdf",
    title: "Exportación PDF",
    category: "Documentos",
    description: "Genera y descarga tus facturas y presupuestos en PDF con tu logotipo y color de marca, listos para enviar o archivar.",
    icon: "pdf",
    status: "active",
    where: "Vista previa › Descargar PDF",
  },
  {
    id: "facturae",
    title: "Factura electrónica (Facturae 3.2.2)",
    category: "Factura electrónica",
    description: "Descarga la factura en formato estructurado Facturae 3.2.2 (fe:Facturae), el estándar de factura electrónica admitido por la Administración (FACe).",
    icon: "facturae",
    status: "active",
    where: "Factura emitida › Factura electrónica",
  },
  {
    id: "email",
    title: "Envío por correo electrónico",
    category: "Correo electrónico",
    description: "Envía facturas y presupuestos a tus clientes por email directamente desde la app, con el PDF adjunto y registro del envío.",
    icon: "email",
    status: "active",
    where: "Documento › Enviar por email",
  },
  {
    id: "ocr",
    title: "Escaneo de gastos (OCR)",
    category: "Digitalización",
    description: "Digitaliza tickets y facturas de gasto con reconocimiento automático de texto (OCR) y crea el registro contable al instante.",
    icon: "ocr",
    status: "active",
    where: "Gastos › Escanear documento",
  },
  {
    id: "stripe",
    title: "Suscripción y pagos (Stripe)",
    category: "Pagos",
    description: "Gestiona tu suscripción y tu método de pago de forma segura a través de Stripe, líder mundial en pagos online.",
    icon: "stripe",
    status: "active",
    where: "Configuración › Plan y facturación",
  },
  {
    id: "verifactu",
    title: "VERI*FACTU (AEAT)",
    category: "Cumplimiento fiscal",
    description: "Genera el registro de facturación con huella encadenada SHA-256 y el QR de cotejo en cada factura. El envío automático a la AEAT se habilita al completar el alta como colaborador (Tipo 017).",
    icon: "verifactu",
    status: "partial",
    where: "Configuración › VERI*FACTU",
  },
];

// Integraciones planificadas (aún no disponibles).
const SOON_CARDS: IntegrationCard[] = [
  {
    id: "gmail",
    title: "Gmail",
    category: "Correo electrónico",
    description: "Conecta tu cuenta de Gmail para enviar documentos desde tu propia dirección y sincronizar los correos con el historial de cada cliente.",
    icon: "gmail",
    brand: true,
    status: "soon",
  },
  {
    id: "outlook",
    title: "Outlook",
    category: "Correo y calendario",
    description: "Envía documentos desde tu cuenta de Outlook y sincroniza los vencimientos de facturas con tu calendario.",
    icon: "outlook",
    brand: true,
    status: "soon",
  },
  {
    id: "slack",
    title: "Slack",
    category: "Notificaciones",
    description: "Recibe avisos en tu canal de Slack cuando se emita una factura, se registre un pago o venza un cobro.",
    icon: "slack",
    brand: true,
    status: "soon",
  },
  {
    id: "hubspot",
    title: "HubSpot",
    category: "CRM y ventas",
    description: "Sincroniza tus contactos y facturas con HubSpot CRM y crea deals automáticamente al emitir presupuestos o facturas.",
    icon: "hubspot",
    brand: true,
    status: "soon",
  },
];

const BRAND_ICONS: Record<string, string> = {
  excel: "/images/integrations/excel.svg",
  slack: "/images/integrations/slack.svg",
  gmail: "/images/integrations/gmail.svg",
  outlook: "/images/integrations/outlook.svg",
  hubspot: "/images/integrations/hubspot.svg",
};

function FeatureIcon({ id }: { id: string }): JSX.Element {
  const common = { width: 30, height: 30, viewBox: "0 0 24 24", fill: "none" } as const;
  switch (id) {
    case "pdf":
      return (
        <svg {...common} stroke="#DC2626"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M14 2v6h6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M8.5 13h1.2a1.3 1.3 0 010 2.6H8.5V13zm0 2.6V18M13.6 13v5m0-5h1.6m-1.6 2.4h1.2M17.8 13v5" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "facturae":
      return (
        <svg {...common} stroke="#16A34A"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M14 2v6h6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 13l2 4M13 13l-2 4M15.5 13v4h1.8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "email":
      return (
        <svg {...common} stroke="#2563EB"><rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.7" /><path d="M4 7l8 6 8-6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case "ocr":
      return (
        <svg {...common} stroke="#7C3AED"><path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 12h10" strokeWidth="1.7" strokeLinecap="round" /></svg>
      );
    case "stripe":
      return (
        <svg {...common} stroke="#635BFF"><rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="1.7" /><path d="M2 10h20" strokeWidth="1.7" /><path d="M6 15h4" strokeWidth="1.7" strokeLinecap="round" /></svg>
      );
    case "verifactu":
      return (
        <svg {...common} stroke="#16A34A"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    default:
      return <div style={{ width: "100%", height: "100%" }} />;
  }
}

function IntegrationIcon({ card }: { card: IntegrationCard }): JSX.Element {
  if (card.brand) {
    const src = BRAND_ICONS[card.icon];
    if (src) return <img src={src} alt={card.title} />;
    return <div style={{ width: "100%", height: "100%" }} />;
  }
  return <FeatureIcon id={card.icon} />;
}

function StatusBadge({ status }: { status: IntegrationStatus }): JSX.Element | null {
  if (status === "active") return <span className="integration-card__badge integration-card__badge--active">Activa</span>;
  if (status === "partial") return <span className="integration-card__badge integration-card__badge--partial">En curso</span>;
  return null;
}

function IntegrationCardView({ card }: { card: IntegrationCard }): JSX.Element {
  return (
    <article className="integration-card">
      <StatusBadge status={card.status} />
      <div className="integration-card__header">
        <div className="integration-card__icon">
          <IntegrationIcon card={card} />
        </div>
        <div>
          <h3 className="integration-card__title">{card.title}</h3>
          <span className="integration-card__category">{card.category}</span>
        </div>
      </div>
      <p className="integration-card__desc">{card.description}</p>
      {card.status === "soon" ? (
        <button type="button" className="integration-card__btn" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Próximamente
        </button>
      ) : (
        <div className="integration-card__where">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>{card.where}</span>
        </div>
      )}
    </article>
  );
}

export function IntegrationsPage(): JSX.Element {
  return (
    <div className="integrations-page">
      <div className="integrations-header">
        <h2>Integraciones</h2>
        <p>Servicios y formatos conectados con Facturales</p>
      </div>

      <h3 className="integrations-section-title">Activas</h3>
      <div className="integrations-grid">
        {ACTIVE_CARDS.map((card) => (
          <IntegrationCardView key={card.id} card={card} />
        ))}
      </div>

      <h3 className="integrations-section-title">Próximamente</h3>
      <div className="integrations-grid">
        {SOON_CARDS.map((card) => (
          <IntegrationCardView key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
