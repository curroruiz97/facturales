const INTEGRATION_CARDS = [
  {
    id: "excel",
    title: "Microsoft Excel",
    category: "Datos y hojas de cálculo",
    description: "Excel está integrado automáticamente en la importación y exportación de contactos desde la sección de Clientes.",
    icon: "excel",
  },
  {
    id: "slack",
    title: "Slack",
    category: "Comunicación y notificaciones",
    description: "Recibe notificaciones en tu canal de Slack cuando se emita una factura, se registre un pago o venza una fecha de cobro.",
    icon: "slack",
  },
  {
    id: "gmail",
    title: "Gmail",
    category: "Correo electrónico",
    description: "Envia facturas y presupuestos directamente desde tu cuenta de Gmail. Sincroniza los correos enviados con el historial de cada cliente.",
    icon: "gmail",
  },
  {
    id: "outlook",
    title: "Outlook",
    category: "Correo y calendario",
    description: "Conecta tu cuenta de Outlook para enviar documentos y sincronizar vencimientos de facturas con tu calendario.",
    icon: "outlook",
  },
  {
    id: "hubspot",
    title: "HubSpot",
    category: "CRM y ventas",
    description: "Sincroniza tus contactos y facturas con HubSpot CRM. Crea automáticamente deals cuando emitas presupuestos o facturas.",
    icon: "hubspot",
  },
] as const;

const INTEGRATION_ICONS: Record<string, string> = {
  excel: "/images/integrations/excel.svg",
  slack: "/images/integrations/slack.svg",
  gmail: "/images/integrations/gmail.svg",
  outlook: "/images/integrations/outlook.svg",
  hubspot: "/images/integrations/hubspot.svg",
};

function IntegrationIcon({ type }: { type: string }): import("react").JSX.Element {
  const src = INTEGRATION_ICONS[type];
  if (src) {
    return <img src={src} alt={type} width={48} height={48} style={{ objectFit: "contain" }} />;
  }
  return <div style={{ width: 48, height: 48 }} />;
}

export function IntegrationsPage(): import("react").JSX.Element {
  return (
    <div className="integrations-page">
      <div className="integrations-header">
        <h2>Integraciones</h2>
        <p>Servicios conectados con Facturales</p>
      </div>

      <div className="integrations-grid">
        {INTEGRATION_CARDS.map((card) => (
          <article key={card.id} className="integration-card">
            <div className="integration-card__header">
              <div className="integration-card__icon">
                <IntegrationIcon type={card.icon} />
              </div>
              <div>
                <h3 className="integration-card__title">{card.title}</h3>
                <span className="integration-card__category">{card.category}</span>
              </div>
            </div>
            <p className="integration-card__desc">{card.description}</p>
            <button type="button" className="integration-card__btn" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Próximamente
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
