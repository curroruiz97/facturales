import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";
import { accessLogService, type AccessLogEntry } from "../../../services/access-log/access-log.service";
import { authService } from "../../../services/auth/auth.service";
import { billingLimitsService } from "../../../services/billing-limits/billing-limits.service";
import { businessInfoService, type BusinessInfoInput, type BusinessTaxType } from "../../../services/business/business-info.service";
import {
  invoiceSeriesService,
  type InvoiceSeriesCounterReset,
  type InvoiceSeriesFormat,
  type InvoiceSeriesInput,
  type InvoiceSeriesRecord,
} from "../../../services/invoice-series/invoice-series.service";
import {
  subscriptionManagementService,
  type BillingPaymentMethod,
  type SubscriptionSnapshot,
} from "../../../services/subscription/subscription-management.service";
import { getSupabaseClient } from "../../../services/supabase/client";
import type { BillingInterval, BillingPlan } from "../../../shared/types/domain";
import { BrandColorPicker } from "../components/BrandColorPicker";
import { exportAllDataAsZip } from "../../../services/data-export/data-export.service";

type TabId = "business" | "series" | "faq" | "security" | "logs" | "users" | "subscription";
type TeamRole = "propietario" | "gestor" | "lector";
type NoticeKind = "error" | "success";
type SelectablePlan = Exclude<BillingPlan, "none">;

interface NoticeState {
  kind: NoticeKind;
  message: string;
}

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
}

interface TabDefinition {
  id: TabId;
  title: string;
  subtitle: string;
}

interface PlanCardDefinition {
  id: SelectablePlan;
  label: string;
  monthlyPrice: number;
  yearlyPrice: number;
  tagline: string;
  badge?: string;
  features: string[];
}

const TABS: TabDefinition[] = [
  { id: "business", title: "Datos de negocio", subtitle: "Información fiscal y de facturación" },
  { id: "series", title: "Series y numeración", subtitle: "Gestiona series de facturación" },
  { id: "faq", title: "Preguntas frecuentes", subtitle: "Resuelve tus dudas rápidamente" },
  { id: "security", title: "Seguridad", subtitle: "Protege tu cuenta y datos" },
  { id: "logs", title: "Registro", subtitle: "Logs de acceso a la aplicación" },
  { id: "users", title: "Usuarios", subtitle: "Controla los usuarios de tu empresa" },
  { id: "subscription", title: "Suscripción", subtitle: "Gestiona tu plan y facturación" },
];

const EMPTY_FORM: BusinessInfoInput = {
  nombreFiscal: "",
  nifCif: "",
  nombreComercial: "",
  telefono: "",
  direccionFacturacion: "",
  ciudad: "",
  codigoPostal: "",
  provincia: "",
  pais: "España",
  sector: "comercio",
  businessType: "autonomo",
  brandColor: "#000000",
  formaJuridica: "",
  defaultTaxType: "iva",
  defaultIva: 21,
  defaultIrpf: 15,
  irpfRegime: "estimacion_directa_simplificada",
  applyDifficultJustification: true,
  profileImageUrl: null,
  invoiceImageUrl: null,
};

const IRPF_REGIME_OPTIONS: Array<{ value: NonNullable<BusinessInfoInput["irpfRegime"]>; label: string; help: string }> = [
  {
    value: "estimacion_directa_simplificada",
    label: "Estimación directa simplificada",
    help: "El régimen más común. Permite deducir el 7% en gastos de difícil justificación (tope 2.000€/año).",
  },
  {
    value: "estimacion_directa_normal",
    label: "Estimación directa normal",
    help: "Para autónomos con facturación superior a 600.000€/año. No aplica el 7% de difícil justificación.",
  },
  {
    value: "estimacion_objetiva",
    label: "Estimación objetiva (módulos)",
    help: "Régimen por módulos según actividad. El Modelo 130 no se calcula con base en ingresos/gastos reales.",
  },
];

const TAX_RATE_OPTIONS: Record<BusinessTaxType, Array<{ value: number; label: string }>> = {
  iva: [
    { value: 4, label: "Superreducido" },
    { value: 10, label: "Reducido" },
    { value: 21, label: "General" },
  ],
  igic: [
    { value: 0, label: "Exento" },
    { value: 3, label: "Reducido" },
    { value: 7, label: "General" },
    { value: 9.5, label: "Incrementado" },
    { value: 15, label: "Especial" },
  ],
  ipsi: [
    { value: 0.5, label: "Mínimo" },
    { value: 1, label: "Reducido" },
    { value: 4, label: "General" },
    { value: 10, label: "Servicios" },
  ],
};

const IRPF_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: "Exento" },
  { value: 2, label: "Módulos" },
  { value: 7, label: "Nuevo autónomo" },
  { value: 15, label: "General" },
  { value: 19, label: "Específicas" },
  { value: 24, label: "No residentes" },
];

const SECTOR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "actividades lúdicas y viajes", label: "Actividades Lúdicas y Viajes" },
  { value: "agricultura y ganadería", label: "Agricultura y Ganadería" },
  { value: "asociaciones", label: "Asociaciones" },
  { value: "comercio", label: "Comercio" },
  { value: "formación", label: "Formación" },
  { value: "hostelería", label: "Hostelería" },
  { value: "inmobiliario", label: "Inmobiliario" },
  { value: "reformas y reparaciones", label: "Reformas y Reparaciones" },
  { value: "salud y bienestar", label: "Salud y Bienestar" },
  { value: "servicios artísticos y marketing", label: "Servicios Artísticos y Marketing" },
  { value: "servicios profesionales", label: "Servicios Profesionales" },
  { value: "servicios tecnológicos it", label: "Servicios Tecnológicos IT" },
  { value: "transporte", label: "Transporte" },
];

const FAQ_ENTRIES: Array<{ question: string; answer: string }> = [
  {
    question: "¿Cómo emito mi primera factura?",
    answer:
      "Ve a Facturas → Emitir factura. Selecciona (o crea al vuelo) un cliente, añade productos desde tu catálogo o introdúcelos manualmente, revisa impuestos, descuentos y retenciones, y pulsa \"Emitir factura\". Desde el paso final podrás descargar el PDF, enviarlo por email al cliente o programar su envío para una fecha futura. Mientras estés editando, puedes guardar el documento como borrador y retomarlo desde Facturas → Borradores en cualquier momento.",
  },
  {
    question: "¿Cuál es la diferencia entre borrador y factura emitida?",
    answer:
      "Un borrador es un documento en edición: no tiene número oficial de factura, no cuenta en tu resumen fiscal y lo puedes modificar o eliminar libremente. Una factura emitida es el documento legal y definitivo: recibe el siguiente número de serie, queda registrada en Facturas emitidas, aparece en el Resumen Fiscal y solo puede rectificarse mediante una factura rectificativa (no se borra sin más). Usa presupuestos si aún estás negociando y factura cuando el trabajo esté cerrado.",
  },
  {
    question: "¿Puedo programar el envío de facturas y presupuestos por email?",
    answer:
      "Sí. En el paso final de \"Emitir factura\" o \"Emitir presupuesto\" elige \"Programar envío\", indica destinatario, asunto, cuerpo del email, fecha y hora. El PDF se adjuntará automáticamente con los datos fiscales de tu empresa y tu logo, y nuestro sistema lo enviará en la fecha marcada sin que tengas que hacer nada más. Puedes consultar el estado del envío (programado, enviado, fallido) desde el detalle del documento.",
  },
  {
    question: "¿Cómo configuro mis series de numeración?",
    answer:
      "Desde Configuración → Series de facturación puedes crear series independientes para facturas, presupuestos y rectificativas (por ejemplo, una serie por ejercicio fiscal o por línea de negocio). Cada serie tiene un prefijo, un formato de numeración (común, por año, reiniciable) y un contador automático. El sistema garantiza que los números son correlativos y únicos — no podrás saltarte números ni duplicarlos, cumpliendo con los requisitos de la Agencia Tributaria.",
  },
  {
    question: "¿Qué tipos de impuesto soporta el programa?",
    answer:
      "Facturales soporta los tres regímenes fiscales del territorio español: IVA peninsular y Baleares (21%, 10%, 4%, 0%), IGIC canario (20%, 13,5%, 9,5%, 7%, 3%, 0%) e IPSI de Ceuta y Melilla (10%, 8%, 4%, 2%, 1%, 0,5%, 0%), además de operaciones exentas. También puedes aplicar retenciones de IRPF por línea o sobre el total, y la app calcula automáticamente la base imponible, cuotas y totales.",
  },
  {
    question: "¿Cómo funciona el Resumen Fiscal (IVA e IRPF)?",
    answer:
      "En Resumen Fiscal tienes una vista trimestral y anual con el IVA repercutido (de tus facturas emitidas), el IVA soportado (de tus gastos con ticket o factura registrada) y las retenciones de IRPF practicadas y soportadas. Cada trimestre ves el saldo a ingresar o compensar, listo para volcarlo al modelo 303 (IVA) y a tu estimación del modelo 130/131. Puedes filtrar por ejercicio, exportar a CSV y marcar un trimestre como presentado.",
  },
  {
    question: "¿Cómo importo o exporto mis contactos y productos?",
    answer:
      "Desde Contactos o Productos pulsa \"Importar\" y sube un archivo CSV o XLSX. El sistema reconoce automáticamente cabeceras habituales (nombre, NIF/CIF, email, dirección, precio, IVA…) y te muestra una previsualización con filas válidas y filas con error antes de confirmar. Duplica por NIF/CIF (contactos) o por referencia (productos) se omiten automáticamente. Con \"Exportar\" descargas un CSV con todos tus registros, ideal para copias de seguridad o para migrar de otra herramienta.",
  },
  {
    question: "¿Cómo registro un gasto con OCR desde un ticket o factura?",
    answer:
      "En Gastos → Nuevo gasto puedes subir una foto o PDF del ticket/factura y el sistema extrae automáticamente fecha, proveedor, base imponible, IVA y total gracias al OCR integrado. Revisa que los datos sean correctos, ajusta la categoría (suministros, transporte, material, etc.) y guarda. El gasto se añade al Resumen Fiscal y al panel de control. Para gastos recurrentes puedes duplicar uno existente y solo cambiar la fecha.",
  },
  {
    question: "¿Cómo personalizo mis facturas con mi logo y colores?",
    answer:
      "En Configuración → Datos fiscales puedes subir dos imágenes: la foto de perfil (que aparece en el panel) y el logo de factura (que se incrusta en el PDF). El color de marca se aplica a los encabezados, totales y detalles de la factura PDF. Soportamos PNG, JPG y WebP hasta 500 KB en el logo. Para un mejor resultado usa un logo con fondo transparente y proporciones horizontales.",
  },
  {
    question: "¿Qué pasa si supero los límites de mi plan?",
    answer:
      "Cada plan tiene un tope de clientes, productos y facturas. Cuando te acercas al límite verás un aviso en la propia sección (por ejemplo, 9/10 contactos). Al superarlo, las operaciones que creen nuevos registros quedan bloqueadas hasta que elimines datos antiguos o mejores tu plan desde Configuración → Plan y facturación. Los datos existentes no se pierden nunca, solo se pausan las altas.",
  },
  {
    question: "¿Cómo corrijo una factura ya emitida?",
    answer:
      "Una factura emitida no se puede borrar ni editar para preservar la integridad fiscal. Si detectas un error debes emitir una factura rectificativa: desde el detalle de la factura original pulsa \"Rectificar\". El sistema creará un nuevo documento negativo que anula la anterior y te permitirá emitir seguidamente la factura correcta. Ambas quedan vinculadas en el Resumen Fiscal y cumplen con la normativa.",
  },
  {
    question: "¿Los datos están seguros y hago copias de seguridad?",
    answer:
      "Todos tus datos se almacenan cifrados en servidores de Supabase dentro del Espacio Económico Europeo, con copias automáticas diarias. Solo tú (y las cuentas que invites a tu organización) tenéis acceso. Puedes exportar en cualquier momento tus contactos, productos, facturas y gastos a CSV. Si borras una cuenta, eliminamos tus datos en un máximo de 30 días cumpliendo con el RGPD.",
  },
];

const SERIES_DEFAULT: InvoiceSeriesInput = {
  code: "",
  description: "",
  invoiceNumberFormat: "common",
  counterReset: "yearly",
  startNumber: 1,
  customFormat: "",
};

const PLAN_CARDS: PlanCardDefinition[] = [
  {
    id: "starter",
    label: "Starter",
    monthlyPrice: 6.45,
    yearlyPrice: 4.95,
    tagline: "Probar y empezar a facturar.",
    features: [
      "Hasta 10 clientes",
      "1 usuario",
      "Hasta 30 productos/servicios",
      "10 facturas / mes",
      "Escaneado: 10 docs/mes",
      "Soporte: Email",
    ],
  },
  {
    id: "pro",
    label: "Pro",
    monthlyPrice: 11.95,
    yearlyPrice: 8.95,
    tagline: "Automatizar cobros y recurrentes.",
    badge: "Más popular",
    features: [
      "Hasta 150 clientes",
      "Hasta 3 usuarios",
      "Hasta 150 productos/servicios",
      "Facturas ilimitadas",
      "Escaneado: 75 docs/mes",
      "Soporte: Chat + email",
    ],
  },
  {
    id: "business",
    label: "Ilimitado",
    monthlyPrice: 23.95,
    yearlyPrice: 17.95,
    tagline: "Equipos, asesorías y alto volumen.",
    badge: "Ilimitado",
    features: [
      "Clientes ilimitados",
      "Usuarios ilimitados*",
      "Productos/servicios ilimitados",
      "Facturas ilimitadas",
      "Escaneado: 300 docs/mes",
      "Soporte prioritario (chat, email y teléfono)",
    ],
  },
];

const STORAGE_LIMITS: Record<BillingPlan, number> = {
  none: 0,
  starter: 1024 ** 3,
  pro: 5 * 1024 ** 3,
  business: Number.POSITIVE_INFINITY,
};

const TEAM_LIMIT_BY_PLAN: Record<BillingPlan, number> = {
  none: 5,
  starter: 1,
  pro: 3,
  business: Number.POSITIVE_INFINITY,
};

const TEAM_STORAGE_KEY = "facturales_team_users";

function IconBusiness(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <ellipse cx="12" cy="17.5" rx="7" ry="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconSeries(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M9 7h6M9 11h3M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="m7 15 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFaq(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 21.25a9.25 9.25 0 1 0 0-18.5 9.25 9.25 0 0 0 0 18.5ZM9.25 9a2.75 2.75 0 1 1 4.77 1.87c-.97.98-1.27 1.36-1.27 2.13v.5M12 16.9v.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSecurity(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        d="M6 11V9a6 6 0 1 1 12 0v2m-9 10h6a3 3 0 0 0 3-3v-4a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLogs(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 8v4l2 2M6.5 3.5A9 9 0 1 0 12 3m0 0V1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconUsers(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M15.5 20c0-3-2.5-5-5.5-5s-5.5 2-5.5 5M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M18.5 8.5v7M22 12h-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSubscription(): import("react").JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        d="M3.5 7.5A2.5 2.5 0 0 1 6 5h12a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5zM3.5 10h17M8 14.5h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TabIcon({ tab }: { tab: TabId }): import("react").JSX.Element {
  if (tab === "business") return <IconBusiness />;
  if (tab === "series") return <IconSeries />;
  if (tab === "faq") return <IconFaq />;
  if (tab === "security") return <IconSecurity />;
  if (tab === "logs") return <IconLogs />;
  if (tab === "users") return <IconUsers />;
  return <IconSubscription />;
}

function isTab(value: string | null): value is TabId {
  return value !== null && TABS.some((tab) => tab.id === value);
}

function normalizeHex(value: string): string {
  const normalized = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : "#000000";
}

function splitAddress(value: string): { street: string; number: string } {
  const input = value.trim();
  if (!input) return { street: "", number: "" };
  const commaIndex = input.indexOf(",");
  if (commaIndex === -1) return { street: input, number: "" };
  return {
    street: input.slice(0, commaIndex).trim(),
    number: input.slice(commaIndex + 1).trim(),
  };
}

function joinAddress(street: string, number: string): string {
  const cleanStreet = street.trim();
  const cleanNumber = number.trim();
  if (!cleanStreet && !cleanNumber) return "";
  if (!cleanNumber) return cleanStreet;
  if (!cleanStreet) return cleanNumber;
  return `${cleanStreet}, ${cleanNumber}`;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${formatDate(value)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + "€";
}

function formatStorage(bytes: number): string {
  if (!Number.isFinite(bytes)) return "Ilimitado";
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let value = bytes;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex >= 2 ? 2 : 0)} ${units[unitIndex]}`;
}

function formatSeriesFormat(value: InvoiceSeriesFormat): string {
  if (value === "common") return "Común";
  if (value === "monthly") return "Mensual";
  if (value === "simple") return "Simple";
  if (value === "slash") return "Barra";
  if (value === "compact") return "Compacto";
  return "Personalizado";
}

function buildSeriesPreview(input: InvoiceSeriesInput): string {
  const code = (input.code || "A").toUpperCase();
  const start = String(input.startNumber ?? 1).padStart(4, "0");
  const year = "2026";
  if (input.invoiceNumberFormat === "monthly") return `${year}-03-${start.slice(-3)}`;
  if (input.invoiceNumberFormat === "simple") return `${year}${start}`;
  if (input.invoiceNumberFormat === "slash") return `${code}/${year}/${start}`;
  if (input.invoiceNumberFormat === "compact") return `${code}-26-${start.slice(-3)}`;
  if (input.invoiceNumberFormat === "custom") return input.customFormat?.trim() || `${code}-{YYYY}-{####}`;
  return `${code}-${year}-${start}`;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo seleccionado."));
    reader.readAsDataURL(file);
  });
}

function readTeamUsers(): TeamUser[] {
  try {
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TeamUser[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item.name === "string" && typeof item.email === "string");
  } catch {
    return [];
  }
}

function writeTeamUsers(users: TeamUser[]): void {
  localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(users));
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getTeamRoleLabel(role: TeamRole): string {
  if (role === "propietario") return "Propietario";
  if (role === "gestor") return "Gestor";
  return "Lector";
}

function formatPaymentMethod(method: BillingPaymentMethod | null): { title: string; subtitle: string } {
  if (!method) {
    return { title: "Sin método de pago", subtitle: "Añade un método para gestionar la suscripción." };
  }
  const brand = method.brand ? method.brand.toUpperCase() : "TARJETA";
  const ending = method.last4 ? `**** ${method.last4}` : "";
  const expires = method.expMonth && method.expYear ? `Caduca ${String(method.expMonth).padStart(2, "0")}/${method.expYear}` : "Caducidad no disponible";
  return { title: `${brand} ${ending}`.trim(), subtitle: expires };
}

function getSubscriptionStatusLabel(snapshot: SubscriptionSnapshot | null): string {
  if (!snapshot?.status) return "Sin suscripción activa";
  if (snapshot.cancelAtPeriodEnd) return "Cancelación programada";
  if (snapshot.status === "active") return "Activa";
  if (snapshot.status === "trialing") return "En prueba";
  return snapshot.status;
}

export function SettingsPage(): import("react").JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const VALID_TABS: TabId[] = ["business", "series", "faq", "security", "logs", "users", "subscription"];
  const paramTab = searchParams.get("tab") as TabId | null;
  const initialTab: TabId = paramTab && VALID_TABS.includes(paramTab) ? paramTab : "business";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const [form, setForm] = useState<BusinessInfoInput>(EMPTY_FORM);
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [taxPanelOpen, setTaxPanelOpen] = useState(false);

  const [seriesItems, setSeriesItems] = useState<InvoiceSeriesRecord[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesForm, setSeriesForm] = useState<InvoiceSeriesInput>(SERIES_DEFAULT);
  const [seriesEditingId, setSeriesEditingId] = useState<string | null>(null);
  const [seriesFormOpen, setSeriesFormOpen] = useState(false);

  const [faqOpenIndex, setFaqOpenIndex] = useState(0);

  const [provider, setProvider] = useState<"google" | "email" | "unknown">("unknown");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [storagePlanLabel, setStoragePlanLabel] = useState("Sin plan");
  const [storageLimit, setStorageLimit] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  const [accountCreatedAt, setAccountCreatedAt] = useState<string | null>(null);
  const [accountLastSignInAt, setAccountLastSignInAt] = useState<string | null>(null);
  const [accountEmailConfirmed, setAccountEmailConfirmed] = useState<boolean>(false);
  const [accountUserId, setAccountUserId] = useState<string | null>(null);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  const [logsItems, setLogsItems] = useState<AccessLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(0);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsHasPrevious, setLogsHasPrevious] = useState(false);
  const [logsHasNext, setLogsHasNext] = useState(false);

  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [teamLimit, setTeamLimit] = useState<number>(5);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamEmail, setTeamEmail] = useState("");
  const [teamRole, setTeamRole] = useState<TeamRole>("gestor");

  const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [realUsage, setRealUsage] = useState<{
    clients: number;
    products: number;
    invoicesIssued: number;
    quotesIssued: number;
  } | null>(null);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("yearly");

  const taxType: BusinessTaxType = (form.defaultTaxType ?? "iva") as BusinessTaxType;
  const selectedTaxRate = Number(form.defaultIva ?? 21);
  const selectedIrpfRate = Number(form.defaultIrpf ?? 15);
  const seriesPreview = useMemo(() => buildSeriesPreview(seriesForm), [seriesForm]);
  const hasBusinessIdentityLocked = Boolean(form.nombreFiscal?.trim()) && Boolean(form.nifCif?.trim());
  const storagePercent = useMemo(() => {
    if (!Number.isFinite(storageLimit) || storageLimit <= 0) return 0;
    return Math.min(100, Math.round((storageUsed / storageLimit) * 100));
  }, [storageLimit, storageUsed]);
  const teamLimitLabel = Number.isFinite(teamLimit) ? String(teamLimit) : "Ilimitado";
  const paymentMethod = formatPaymentMethod(subscription?.paymentMethod ?? null);

  const setError = (message: string): void => {
    setNotice({ kind: "error", message });
  };

  const setSuccess = (message: string): void => {
    setNotice({ kind: "success", message });
  };

  const loadBusiness = async (): Promise<void> => {
    setBusinessLoading(true);
    setNotice(null);
    const result = await businessInfoService.getMine();
    if (!result.success) {
      setBusinessLoading(false);
      setError(result.error.message);
      return;
    }

    const merged = result.data ? { ...EMPTY_FORM, ...result.data } : { ...EMPTY_FORM };
    merged.brandColor = normalizeHex(merged.brandColor ?? "#000000");
    setForm(merged);
    const address = splitAddress(merged.direccionFacturacion ?? "");
    setStreet(address.street);
    setStreetNumber(address.number);
    setTeamUsers(readTeamUsers());
    setBusinessLoading(false);
  };

  const loadSeries = async (): Promise<void> => {
    setSeriesLoading(true);
    const result = await invoiceSeriesService.listMine();
    setSeriesLoading(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setSeriesItems(result.data);
  };

  const loadSecurity = async (): Promise<void> => {
    const providerResult = await authService.getUserProvider();
    if (providerResult.success) {
      setProvider(providerResult.data);
    }

    const userResult = await authService.getCurrentUser();
    if (userResult.success && userResult.data) {
      setAccountUserId(userResult.data.id ?? null);
      setAccountCreatedAt(userResult.data.created_at ?? null);
      setAccountLastSignInAt(userResult.data.last_sign_in_at ?? null);
      setAccountEmailConfirmed(Boolean(userResult.data.email_confirmed_at));
    }

    const usageResult = await billingLimitsService.getUsage();
    if (usageResult.success && usageResult.data) {
      setStoragePlanLabel(usageResult.data.planName);
      setStorageLimit(STORAGE_LIMITS[usageResult.data.plan] ?? 0);
    }

    const rpcResult = await getSupabaseClient().rpc("get_user_storage_bytes");
    if (!rpcResult.error) {
      setStorageUsed(Number(rpcResult.data ?? 0));
    }
  };

  const onDownloadAllData = async (): Promise<void> => {
    setExportingData(true);
    setNotice(null);
    const result = await exportAllDataAsZip();
    setExportingData(false);
    if (!result.success) {
      setError(`No se pudo generar el ZIP: ${result.error.message}`);
      return;
    }
    const url = URL.createObjectURL(result.data.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccess("Export descargado correctamente.");
  };

  const onSignOutAllDevices = async (): Promise<void> => {
    setSigningOutAll(true);
    setNotice(null);
    const { error } = await getSupabaseClient().auth.signOut({ scope: "global" });
    setSigningOutAll(false);
    if (error) {
      setError(`No se pudo cerrar sesión en todos los dispositivos: ${error.message}`);
      return;
    }
    navigate("/login", { replace: true });
  };

  const loadLogs = async (page: number): Promise<void> => {
    setLogsLoading(true);
    const result = await accessLogService.listMine({ page, pageSize: 20 });
    setLogsLoading(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setLogsItems(result.data.items);
    setLogsPage(result.data.page);
    setLogsTotal(result.data.total);
    setLogsHasPrevious(result.data.hasPreviousPage);
    setLogsHasNext(result.data.hasNextPage);
  };

  const loadUsersMeta = async (): Promise<void> => {
    const usageResult = await billingLimitsService.getUsage();
    if (usageResult.success && usageResult.data) {
      setTeamLimit(TEAM_LIMIT_BY_PLAN[usageResult.data.plan]);
    } else {
      setTeamLimit(5);
    }
  };

  const loadSubscription = async (): Promise<void> => {
    setSubscriptionLoading(true);
    const result = await subscriptionManagementService.getSnapshot();
    setSubscriptionLoading(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setSubscription(result.data);
    setBillingInterval(result.data.interval);
    // Contadores reales desde las tablas (evita desync con billing_usage)
    void loadRealUsage();
  };

  const loadRealUsage = async (): Promise<void> => {
    const supabase = getSupabaseClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const [clientsResult, productsResult, invoicesResult, quotesResult] = await Promise.all([
      supabase.from("clientes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("productos").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "issued"),
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "issued"),
    ]);
    setRealUsage({
      clients: clientsResult.count ?? 0,
      products: productsResult.count ?? 0,
      invoicesIssued: invoicesResult.count ?? 0,
      quotesIssued: quotesResult.count ?? 0,
    });
  };

  useEffect(() => {
    void loadBusiness();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (isTab(tab)) {
      setActiveTab(tab);
    }
    if (params.get("payment_updated") === "true") {
      setActiveTab("subscription");
      setSuccess("Método de pago actualizado.");
    }
  }, [location.search]);

  useEffect(() => {
    if (activeTab === "series") void loadSeries();
    if (activeTab === "security") void loadSecurity();
    if (activeTab === "logs") void loadLogs(0);
    if (activeTab === "users") void loadUsersMeta();
    if (activeTab === "subscription") void loadSubscription();
  }, [activeTab]);

  const onBusinessSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setBusinessSaving(true);
    setNotice(null);

    const payload: BusinessInfoInput = {
      ...form,
      direccionFacturacion: joinAddress(street, streetNumber),
      brandColor: normalizeHex(form.brandColor ?? "#000000"),
      defaultTaxType: taxType,
      defaultIva: selectedTaxRate,
      defaultIrpf: selectedIrpfRate,
    };

    const result = await businessInfoService.saveMine(payload);
    setBusinessSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setForm((previous) => ({ ...previous, ...result.data }));
    setSuccess("Perfil guardado correctamente.");
  };

  const onUploadImage = async (
    event: ChangeEvent<HTMLInputElement>,
    target: "profileImageUrl" | "invoiceImageUrl",
    maxBytes: number,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > maxBytes) {
      setError(`Archivo demasiado grande. Máximo: ${Math.round(maxBytes / 1024)} KB.`);
      event.target.value = "";
      return;
    }

    try {
      const encoded = await fileToBase64(file);
      setForm((previous) => ({ ...previous, [target]: encoded }));
      setSuccess("Archivo cargado. Guarda para aplicar los cambios.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo leer el archivo.";
      setError(message);
    } finally {
      event.target.value = "";
    }
  };

  const onStartCreateSeries = (): void => {
    setSeriesEditingId(null);
    setSeriesForm({ ...SERIES_DEFAULT });
    setSeriesFormOpen(true);
  };

  const onStartEditSeries = (record: InvoiceSeriesRecord): void => {
    setSeriesEditingId(record.id);
    setSeriesForm({
      code: record.code,
      description: record.description,
      invoiceNumberFormat: record.invoiceNumberFormat,
      counterReset: record.counterReset,
      startNumber: record.startNumber,
      customFormat: record.customFormat ?? "",
    });
    setSeriesFormOpen(true);
  };

  const onSaveSeries = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setNotice(null);

    const result = seriesEditingId
      ? await invoiceSeriesService.update(seriesEditingId, seriesForm)
      : await invoiceSeriesService.create(seriesForm);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    await loadSeries();
    setSeriesForm({ ...SERIES_DEFAULT });
    setSeriesEditingId(null);
    setSeriesFormOpen(false);
    setSuccess(seriesEditingId ? "Serie actualizada." : "Serie creada.");
  };

  const onDeleteSeries = async (id: string): Promise<void> => {
    const accepted = window.confirm("Esta acción eliminará la serie. ¿Quieres continuar?");
    if (!accepted) return;
    const result = await invoiceSeriesService.remove(id);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    await loadSeries();
    setSuccess("Serie eliminada.");
  };

  const onChangePassword = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (provider !== "email") {
      setError("Tu cuenta usa Google. Gestiona la contraseña desde Google.");
      return;
    }

    if (!user?.email) {
      setError("No se pudo resolver el email de la sesión.");
      return;
    }

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setPasswordSaving(true);
    setNotice(null);
    const login = await getSupabaseClient().auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (login.error) {
      setPasswordSaving(false);
      setError("Contraseña actual incorrecta.");
      return;
    }

    const update = await getSupabaseClient().auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (update.error) {
      setError(update.error.message);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setSuccess("Contraseña actualizada.");
  };

  const onAddTeamUser = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const normalizedName = teamName.trim();
    const normalizedMail = normalizeEmail(teamEmail);
    if (!normalizedName || !normalizedMail) {
      setError("Nombre y email son obligatorios.");
      return;
    }
    if (teamUsers.some((member) => member.email === normalizedMail)) {
      setError("Ya existe un usuario con ese email.");
      return;
    }
    if (Number.isFinite(teamLimit) && teamUsers.length >= teamLimit) {
      setError(`Has alcanzado el límite de ${teamLimit} usuarios para tu plan.`);
      return;
    }

    const nextUsers: TeamUser[] = [
      ...teamUsers,
      {
        id: String(Date.now()),
        name: normalizedName,
        email: normalizedMail,
        role: teamRole,
      },
    ];
    setTeamUsers(nextUsers);
    writeTeamUsers(nextUsers);
    setTeamName("");
    setTeamEmail("");
    setTeamRole("gestor");
    setTeamFormOpen(false);
    setSuccess("Usuario añadido.");
  };

  const onRemoveTeamUser = (id: string): void => {
    const accepted = window.confirm("Eliminar este usuario del equipo?");
    if (!accepted) return;
    const nextUsers = teamUsers.filter((row) => row.id !== id);
    setTeamUsers(nextUsers);
    writeTeamUsers(nextUsers);
    setSuccess("Usuario eliminado.");
  };

  const onSelectPlan = async (plan: SelectablePlan): Promise<void> => {
    if (subscription?.plan === plan && !subscription.pendingDowngradePlan) {
      setSuccess("Ese plan ya está activo.");
      return;
    }

    setSubscriptionBusy(true);
    setNotice(null);
    const hasActive = Boolean(subscription?.status) && subscription?.plan !== "none";
    const result = hasActive
      ? await subscriptionManagementService.changePlan(plan, billingInterval)
      : await subscriptionManagementService.createCheckoutSession(plan, billingInterval);
    setSubscriptionBusy(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    if ("url" in result.data && result.data.url) {
      window.location.href = result.data.url;
      return;
    }

    await loadSubscription();
    setSuccess("Plan actualizado.");
  };

  const onCancelSubscription = async (): Promise<void> => {
    setSubscriptionBusy(true);
    const result = await subscriptionManagementService.cancel();
    setSubscriptionBusy(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    await loadSubscription();
    setSuccess(`Cancelación programada para ${formatDate(result.data.current_period_end ?? null)}.`);
  };

  const onReactivateSubscription = async (): Promise<void> => {
    setSubscriptionBusy(true);
    const result = await subscriptionManagementService.reactivate();
    setSubscriptionBusy(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    await loadSubscription();
    setSuccess("Suscripción reactivada.");
  };

  const onOpenPaymentMethod = async (): Promise<void> => {
    setSubscriptionBusy(true);
    const result = await subscriptionManagementService.openPaymentMethodSession();
    setSubscriptionBusy(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    window.location.href = result.data.url;
  };

  return (
    <div className="settings-legacy">
      <aside className="settings-legacy__tabs">
        <div className="settings-tabs-list">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`settings-tab ${activeTab === tab.id ? "settings-tab--active" : ""}`}
              onClick={() => {
                setNotice(null);
                setActiveTab(tab.id);
              }}
            >
              <span className="settings-tab__icon">
                <TabIcon tab={tab.id} />
              </span>
              <span className="settings-tab__text">
                <strong>{tab.title}</strong>
                <small>{tab.subtitle}</small>
              </span>
            </button>
          ))}
        </div>

      </aside>

      <section className="settings-legacy__content">
        {notice ? (
          <p className={`settings-alert ${notice.kind === "error" ? "settings-alert--error" : "settings-alert--success"}`}>
            {notice.message}
          </p>
        ) : null}

        {activeTab === "business" ? (
          <form className="settings-business" onSubmit={(event) => void onBusinessSubmit(event)}>
            {businessLoading ? (
              <p className="settings-muted">Cargando configuración...</p>
            ) : (
              <>
                <div className="settings-business__grid">
                  <div>
                    <h2>Datos de negocio</h2>
                    <div className="settings-divider" />

                    <div className="settings-entity-row">
                      <span className="settings-muted">Tipo de entidad:</span>
                      <span className="settings-entity-badge">
                        {form.businessType === "empresa" ? "Empresa" : "Autónomo"}
                      </span>
                    </div>

                    <div className="settings-form-grid">
                      <label className="settings-field">
                        Nombre fiscal
                        <input
                          className={`settings-input ${hasBusinessIdentityLocked ? "settings-input--disabled" : ""}`}
                          value={form.nombreFiscal}
                          disabled={hasBusinessIdentityLocked}
                          onChange={(event) => setForm((previous) => ({ ...previous, nombreFiscal: event.target.value }))}
                        />
                      </label>
                      <label className="settings-field">
                        NIF / CIF
                        <input
                          className={`settings-input ${hasBusinessIdentityLocked ? "settings-input--disabled" : ""}`}
                          value={form.nifCif}
                          disabled={hasBusinessIdentityLocked}
                          onChange={(event) => setForm((previous) => ({ ...previous, nifCif: event.target.value.toUpperCase() }))}
                        />
                      </label>
                      {form.businessType === "empresa" ? (
                        <label className="settings-field">
                          Forma jurídica
                          <input className="settings-input settings-input--disabled" value={form.formaJuridica ?? ""} disabled />
                        </label>
                      ) : null}
                      <label className="settings-field">
                        Nombre comercial (opcional)
                        <input
                          className="settings-input"
                          value={form.nombreComercial ?? ""}
                          onChange={(event) => setForm((previous) => ({ ...previous, nombreComercial: event.target.value }))}
                        />
                      </label>
                      <label className="settings-field">
                        Correo electrónico
                        <input className="settings-input settings-input--disabled" value={user?.email ?? ""} disabled />
                      </label>
                      <label className="settings-field">
                        Teléfono
                        <input
                          className="settings-input"
                          value={form.telefono}
                          onChange={(event) => setForm((previous) => ({ ...previous, telefono: event.target.value }))}
                        />
                      </label>
                    </div>

                    <h3 className="settings-section-title">Dirección de facturación</h3>
                    <div className="settings-form-grid">
                      <label className="settings-field">
                        Calle
                        <input className="settings-input" value={street} onChange={(event) => setStreet(event.target.value)} />
                      </label>
                      <label className="settings-field">
                        Número
                        <input className="settings-input" value={streetNumber} onChange={(event) => setStreetNumber(event.target.value)} />
                      </label>
                      <label className="settings-field">
                        Código postal
                        <input
                          className="settings-input"
                          value={form.codigoPostal}
                          onChange={(event) => setForm((previous) => ({ ...previous, codigoPostal: event.target.value }))}
                        />
                      </label>
                      <label className="settings-field">
                        Población
                        <input
                          className="settings-input"
                          value={form.ciudad}
                          onChange={(event) => setForm((previous) => ({ ...previous, ciudad: event.target.value }))}
                        />
                      </label>
                      <label className="settings-field">
                        Provincia
                        <input
                          className="settings-input"
                          value={form.provincia}
                          onChange={(event) => setForm((previous) => ({ ...previous, provincia: event.target.value }))}
                        />
                      </label>
                      <label className="settings-field">
                        País
                        <input
                          className="settings-input"
                          value={form.pais}
                          onChange={(event) => setForm((previous) => ({ ...previous, pais: event.target.value }))}
                        />
                      </label>
                    </div>

                    <h3 className="settings-section-title">Información del negocio</h3>
                    <div className="settings-form-grid">
                      <label className="settings-field">
                        Sector
                        <select
                          className="settings-input"
                          value={form.sector ?? ""}
                          onChange={(event) => setForm((previous) => ({ ...previous, sector: event.target.value }))}
                        >
                          {SECTOR_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <button
                      type="button"
                      className="settings-accordion-trigger"
                      onClick={() => setTaxPanelOpen((previous) => !previous)}
                    >
                      <span>Configuración de impuestos</span>
                      <span className={`settings-chevron ${taxPanelOpen ? "settings-chevron--open" : ""}`}>⌄</span>
                    </button>

                    {taxPanelOpen ? (
                      <div className="settings-tax-panel">
                        <p className="settings-muted">Tipo de impuesto</p>
                        <div className="settings-tax-choices">
                          {(["iva", "igic", "ipsi"] as BusinessTaxType[]).map((option) => (
                            <button
                              key={option}
                              type="button"
                              className={`settings-choice-card ${taxType === option ? "settings-choice-card--active" : ""}`}
                              onClick={() => setForm((previous) => ({ ...previous, defaultTaxType: option }))}
                            >
                              {option.toUpperCase()}
                            </button>
                          ))}
                        </div>

                        <p className="settings-muted">{taxType.toUpperCase()} por defecto</p>
                        <div className="settings-tax-choices">
                          {TAX_RATE_OPTIONS[taxType].map((rate) => (
                            <button
                              key={rate.value}
                              type="button"
                              className={`settings-choice-card ${selectedTaxRate === rate.value ? "settings-choice-card--active" : ""}`}
                              onClick={() => setForm((previous) => ({ ...previous, defaultIva: rate.value }))}
                            >
                              {rate.value}% <small>{rate.label}</small>
                            </button>
                          ))}
                        </div>

                        <p className="settings-muted">Retención IRPF por defecto</p>
                        <div className="settings-tax-choices">
                          {IRPF_OPTIONS.map((rate) => (
                            <button
                              key={rate.value}
                              type="button"
                              className={`settings-choice-card ${selectedIrpfRate === rate.value ? "settings-choice-card--active" : ""}`}
                              onClick={() => setForm((previous) => ({ ...previous, defaultIrpf: rate.value }))}
                            >
                              {rate.value}% <small>{rate.label}</small>
                            </button>
                          ))}
                        </div>

                        <hr className="settings-fiscal-divider" />

                        <p className="settings-muted">Régimen IRPF (afecta al cálculo del Modelo 130)</p>
                        <div className="settings-fiscal-regime">
                          {IRPF_REGIME_OPTIONS.map((regime) => (
                            <button
                              key={regime.value}
                              type="button"
                              className={`settings-regime-card ${(form.irpfRegime ?? "estimacion_directa_simplificada") === regime.value ? "settings-regime-card--active" : ""}`}
                              onClick={() => setForm((previous) => ({ ...previous, irpfRegime: regime.value }))}
                            >
                              <strong>{regime.label}</strong>
                              <small>{regime.help}</small>
                            </button>
                          ))}
                        </div>

                        {(form.irpfRegime ?? "estimacion_directa_simplificada") === "estimacion_directa_simplificada" ? (
                          <label className="settings-fiscal-toggle">
                            <input
                              type="checkbox"
                              checked={form.applyDifficultJustification ?? true}
                              onChange={(event) =>
                                setForm((previous) => ({ ...previous, applyDifficultJustification: event.target.checked }))
                              }
                            />
                            <span>
                              <strong>Aplicar deducción del 7% por gastos de difícil justificación</strong>
                              <small>
                                Solo válido en estimación directa simplificada. Tope 2.000 €/año (Ley 28/2022).
                                Reduce el rendimiento neto en el Modelo 130.
                              </small>
                            </span>
                          </label>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <aside className="settings-business__aside">
                    <div className="settings-card settings-card--centered">
                      <h3>Actualizar perfil</h3>
                      <p className="settings-muted">Perfil mínimo 300x300. Máximo 1 MB.</p>
                      <div className="settings-image-preview">
                        {form.profileImageUrl ? (
                          <img src={form.profileImageUrl} alt="Perfil" />
                        ) : (
                          <span>{(form.nombreFiscal?.trim() || "FA").slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="settings-card__actions">
                        <label className="settings-btn settings-btn--ghost" htmlFor="profile-image-input">
                          Cambiar imagen
                        </label>
                      </div>
                      <input
                        id="profile-image-input"
                        type="file"
                        hidden
                        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                        onChange={(event) => void onUploadImage(event, "profileImageUrl", 1024 * 1024)}
                      />
                    </div>

                    <div className="settings-card settings-card--centered">
                      <h3>Color de marca</h3>
                      <p className="settings-muted">Se usa como color principal en facturas PDF.</p>
                      <BrandColorPicker
                        value={normalizeHex(form.brandColor ?? "#000000")}
                        onChange={(hex) =>
                          setForm((previous) => ({ ...previous, brandColor: normalizeHex(hex) }))
                        }
                      />
                      <p className="settings-muted settings-color-hint">
                        Elige uno de los colores, haz clic en el cuadrado para abrir el selector o escribe un hexadecimal.
                      </p>
                    </div>

                    <div className="settings-card settings-card--centered">
                      <h3>Logo factura</h3>
                      <p className="settings-muted">PNG, JPG o WebP. Máximo 500 KB.</p>
                      <label className="settings-logo-dropzone" htmlFor="invoice-logo-input">
                        {form.invoiceImageUrl ? (
                          <img src={form.invoiceImageUrl} alt="Logo factura" />
                        ) : (
                          <span>Arrastra tu logo o haz clic para subir</span>
                        )}
                      </label>
                      <input
                        id="invoice-logo-input"
                        type="file"
                        hidden
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={(event) => void onUploadImage(event, "invoiceImageUrl", 500 * 1024)}
                      />
                      {form.invoiceImageUrl ? (
                        <div className="settings-card__actions">
                          <button
                            type="button"
                            className="settings-btn settings-btn--danger-sm"
                            onClick={() => setForm((previous) => ({ ...previous, invoiceImageUrl: null }))}
                          >
                            Eliminar logo
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </aside>
                </div>

                <div className="settings-business__footer">
                  <button type="submit" className="settings-btn settings-btn--primary" disabled={businessSaving}>
                    {businessSaving ? "Guardando..." : "Guardar perfil"}
                  </button>
                </div>
              </>
            )}
          </form>
        ) : null}

        {activeTab === "series" ? (
          <section className="settings-panel">
            <header className="settings-panel__header">
              <div>
                <h2>Series y numeración</h2>
                <p>Gestiona las series de facturación y su numeración automática.</p>
              </div>
              <button type="button" className="settings-btn settings-btn--primary" onClick={onStartCreateSeries}>
                + Nueva serie
              </button>
            </header>

            <div className="settings-table-wrap">
              <table className="settings-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Formato</th>
                    <th>Última factura</th>
                    <th>Total</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {seriesLoading ? (
                    <tr>
                      <td colSpan={6} className="settings-table__empty">
                        Cargando series...
                      </td>
                    </tr>
                  ) : null}

                  {!seriesLoading && seriesItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="settings-table__empty">
                        No hay series creadas todavía.
                      </td>
                    </tr>
                  ) : null}

                  {!seriesLoading
                    ? seriesItems.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <span className="settings-code-pill">{row.code}</span>
                          </td>
                          <td>{row.description}</td>
                          <td>{formatSeriesFormat(row.invoiceNumberFormat)}</td>
                          <td>{row.lastInvoiceNumber ?? "-"}</td>
                          <td>{row.totalIssued}</td>
                          <td>
                            <div className="settings-inline-actions">
                              <button type="button" className="settings-btn settings-btn--ghost" onClick={() => onStartEditSeries(row)}>
                                Editar
                              </button>
                              <button
                                type="button"
                                className="settings-btn settings-btn--danger-ghost"
                                onClick={() => void onDeleteSeries(row.id)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>

            {seriesFormOpen ? (
              <div className="settings-modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) { setSeriesFormOpen(false); setSeriesEditingId(null); setSeriesForm({ ...SERIES_DEFAULT }); } }}>
              <form className="settings-modal" onSubmit={(event) => void onSaveSeries(event)}>
                <div className="settings-modal__header">
                  <h3>{seriesEditingId ? "Editar serie" : "Nueva serie"}</h3>
                  <button type="button" className="settings-modal__close" onClick={() => { setSeriesFormOpen(false); setSeriesEditingId(null); setSeriesForm({ ...SERIES_DEFAULT }); }} aria-label="Cerrar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>
                <div className="settings-form-grid">
                  <label className="settings-field">
                    Nombre de la serie
                    <input
                      className="settings-input"
                      value={seriesForm.description}
                      onChange={(event) => setSeriesForm((previous) => ({ ...previous, description: event.target.value }))}
                    />
                  </label>
                  <label className="settings-field">
                    Código
                    <input
                      className="settings-input"
                      maxLength={10}
                      value={seriesForm.code}
                      onChange={(event) =>
                        setSeriesForm((previous) => ({ ...previous, code: event.target.value.toUpperCase() }))
                      }
                    />
                  </label>
                  <label className="settings-field">
                    Formato
                    <select
                      className="settings-input"
                      value={seriesForm.invoiceNumberFormat}
                      onChange={(event) =>
                        setSeriesForm((previous) => ({
                          ...previous,
                          invoiceNumberFormat: event.target.value as InvoiceSeriesFormat,
                        }))
                      }
                    >
                      <option value="common">Común</option>
                      <option value="monthly">Mensual</option>
                      <option value="simple">Simple</option>
                      <option value="slash">Barra</option>
                      <option value="compact">Compacto</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </label>
                  <label className="settings-field">
                    Reinicio
                    <select
                      className="settings-input"
                      value={seriesForm.counterReset}
                      onChange={(event) =>
                        setSeriesForm((previous) => ({
                          ...previous,
                          counterReset: event.target.value as InvoiceSeriesCounterReset,
                        }))
                      }
                    >
                      <option value="never">Nunca</option>
                      <option value="yearly">Anual</option>
                      <option value="monthly">Mensual</option>
                    </select>
                  </label>
                  <label className="settings-field">
                    Número inicial
                    <input
                      className="settings-input"
                      type="number"
                      min={1}
                      value={seriesForm.startNumber ?? 1}
                      onChange={(event) =>
                        setSeriesForm((previous) => ({ ...previous, startNumber: Number(event.target.value) || 1 }))
                      }
                    />
                  </label>
                  {seriesForm.invoiceNumberFormat === "custom" ? (
                    <label className="settings-field">
                      Formato personalizado
                      <input
                        className="settings-input"
                        placeholder="{SERIE}-{YYYY}-{####}"
                        value={seriesForm.customFormat ?? ""}
                        onChange={(event) =>
                          setSeriesForm((previous) => ({ ...previous, customFormat: event.target.value }))
                        }
                      />
                    </label>
                  ) : null}
                </div>

                <p className="settings-muted">Vista previa: {seriesPreview}</p>
                <div className="settings-inline-actions">
                  <button type="submit" className="settings-btn settings-btn--primary">
                    {seriesEditingId ? "Guardar cambios" : "Crear serie"}
                  </button>
                  <button
                    type="button"
                    className="settings-btn settings-btn--ghost"
                    onClick={() => {
                      setSeriesFormOpen(false);
                      setSeriesEditingId(null);
                      setSeriesForm({ ...SERIES_DEFAULT });
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
              </div>
            ) : null}

            <div className="settings-card">
              <h3>Cómo funciona la numeración</h3>
              <ul className="settings-numbering-list">
                <li><span className="settings-numbering-dot settings-numbering-dot--orange" />Cada serie tiene su propio formato de numeración configurable (Común, Mensual, Simple, etc.)</li>
                <li><span className="settings-numbering-dot settings-numbering-dot--blue" />La numeración se asigna automáticamente al emitir la factura</li>
                <li><span className="settings-numbering-dot settings-numbering-dot--green" />Cada serie tiene su propia secuencia numérica independiente</li>
                <li><span className="settings-numbering-dot settings-numbering-dot--red" />El contador puede resetearse anualmente, mensualmente, o nunca</li>
                <li><span className="settings-numbering-dot settings-numbering-dot--purple" />También puedes asignar un número manual al crear la factura</li>
              </ul>
            </div>
          </section>
        ) : null}

        {activeTab === "faq" ? (
          <section className="settings-panel">
            <h2>Preguntas frecuentes</h2>
            <div className="settings-faq">
              {FAQ_ENTRIES.map((faq, index) => (
                <article key={faq.question} className={`settings-faq__item ${faqOpenIndex === index ? "settings-faq__item--open" : ""}`}>
                  <button
                    type="button"
                    className="settings-faq__trigger"
                    onClick={() => setFaqOpenIndex((previous) => (previous === index ? -1 : index))}
                  >
                    <span className="settings-faq__icon">{faqOpenIndex === index ? "−" : "+"}</span>
                    <span className="settings-faq__question-text">{faq.question}</span>
                  </button>
                  {faqOpenIndex === index ? (
                    <div className="settings-faq__content">
                      <div className="settings-faq__answer-bar" />
                      <p className="settings-faq__answer-text">{faq.answer}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "security" ? (
          <section className="settings-panel settings-security">
            <div className="settings-security__grid">
              <div className="settings-card">
                <div className="settings-card__head">
                  <div className="settings-card__head-icon" aria-hidden>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </div>
                  <div>
                    <h3>Contraseña</h3>
                    <p className="settings-muted">Actualiza tu contraseña cuando lo necesites.</p>
                  </div>
                </div>

                {provider === "google" ? (
                  <div className="settings-notice">
                    Tu cuenta está vinculada a Google. Gestiona la contraseña desde tu cuenta de Google.
                  </div>
                ) : (
                  <form className="settings-password-form" onSubmit={(event) => void onChangePassword(event)}>
                    <label className="settings-field settings-password-form__field">
                      <span className="settings-password-form__label">Contraseña actual</span>
                      <div className="settings-password">
                        <input
                          className="settings-input"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                          autoComplete="current-password"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="settings-password__toggle"
                          onClick={() => setShowCurrentPassword((previous) => !previous)}
                          aria-label={showCurrentPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showCurrentPassword ? "Ocultar" : "Mostrar"}
                        </button>
                      </div>
                    </label>

                    <label className="settings-field settings-password-form__field">
                      <span className="settings-password-form__label">Nueva contraseña</span>
                      <div className="settings-password">
                        <input
                          className="settings-input"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          autoComplete="new-password"
                          minLength={8}
                          placeholder="Mínimo 8 caracteres"
                        />
                        <button
                          type="button"
                          className="settings-password__toggle"
                          onClick={() => setShowNewPassword((previous) => !previous)}
                          aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showNewPassword ? "Ocultar" : "Mostrar"}
                        </button>
                      </div>
                      <small className="settings-muted settings-password-form__hint">Combina letras, números y símbolos para una contraseña más fuerte.</small>
                    </label>

                    <div className="settings-password-form__actions">
                      <button type="submit" className="settings-btn settings-btn--primary settings-password-form__submit" disabled={passwordSaving}>
                        {passwordSaving ? "Guardando..." : "Actualizar contraseña"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="settings-card">
                <div className="settings-card__head">
                  <div className="settings-card__head-icon" aria-hidden>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21a8 8 0 0116 0" />
                    </svg>
                  </div>
                  <div>
                    <h3>Información de la cuenta</h3>
                    <p className="settings-muted">Datos asociados a tu sesión en Facturales.</p>
                  </div>
                </div>

                <dl className="settings-info-list">
                  <div className="settings-info-list__row">
                    <dt>Email</dt>
                    <dd>
                      {user?.email ?? "—"}
                      {accountEmailConfirmed ? (
                        <span className="settings-badge settings-badge--ok">Verificado</span>
                      ) : (
                        <span className="settings-badge settings-badge--warn">Sin verificar</span>
                      )}
                    </dd>
                  </div>
                  <div className="settings-info-list__row">
                    <dt>Método de acceso</dt>
                    <dd>
                      {provider === "google" ? "Google" : provider === "email" ? "Email y contraseña" : "Desconocido"}
                    </dd>
                  </div>
                  <div className="settings-info-list__row">
                    <dt>Alta de la cuenta</dt>
                    <dd>{formatDateTime(accountCreatedAt)}</dd>
                  </div>
                  <div className="settings-info-list__row">
                    <dt>Último acceso</dt>
                    <dd>{formatDateTime(accountLastSignInAt)}</dd>
                  </div>
                  <div className="settings-info-list__row">
                    <dt>Identificador</dt>
                    <dd>
                      <code className="settings-code">{accountUserId ? `${accountUserId.slice(0, 8)}…${accountUserId.slice(-4)}` : "—"}</code>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="settings-card">
                <div className="settings-card__head">
                  <div className="settings-card__head-icon" aria-hidden>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h3>Sesiones activas</h3>
                    <p className="settings-muted">Cierra la sesión en todos los dispositivos si perdiste uno o compartiste el acceso.</p>
                  </div>
                </div>

                <p className="settings-muted settings-info-hint">
                  Tu sesión actual se renueva automáticamente. Si has iniciado sesión en otro navegador o móvil, puedes forzar el cierre en todos los dispositivos.
                </p>
                <div className="settings-card__actions settings-card__actions--end">
                  <button
                    type="button"
                    className="settings-btn settings-btn--ghost"
                    onClick={() => navigate("/configuracion?tab=logs")}
                  >
                    Ver historial de accesos
                  </button>
                  <button
                    type="button"
                    className="settings-btn settings-btn--primary"
                    onClick={() => void onSignOutAllDevices()}
                    disabled={signingOutAll}
                  >
                    {signingOutAll ? "Cerrando..." : "Cerrar sesión en todos los dispositivos"}
                  </button>
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card__head">
                  <div className="settings-card__head-icon" aria-hidden>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h3>Protección de datos</h3>
                    <p className="settings-muted">Cómo guardamos y respaldamos tu información.</p>
                  </div>
                </div>

                <ul className="settings-check-list">
                  <li>Almacenamiento cifrado en servidores de <strong>Supabase</strong> dentro del Espacio Económico Europeo.</li>
                  <li>Copias de seguridad automáticas <strong>diarias</strong> con retención de 7 días (planes Pro) o 30 días (Business).</li>
                  <li>Replicación en varias zonas de disponibilidad para minimizar pérdida de datos.</li>
                  <li>Acceso a tus datos limitado a tu usuario mediante políticas de seguridad a nivel de fila (RLS).</li>
                  <li>Cumplimiento con <strong>RGPD</strong>: puedes exportar o solicitar la eliminación de tu información en cualquier momento.</li>
                </ul>

                <div className="settings-storage-card">
                  <div className="settings-storage-card__head">
                    <strong>Almacenamiento de ficheros</strong>
                    <span className="settings-chip">{storagePlanLabel}</span>
                  </div>
                  <p>
                    {formatStorage(storageUsed)} de {formatStorage(storageLimit)}
                  </p>
                  <div className="settings-progress-bar">
                    <span style={{ width: `${storagePercent}%` }} />
                  </div>
                  <small className="settings-muted">
                    Incluye logos de factura, imagen de perfil y PDFs adjuntos de gastos.
                  </small>
                </div>

                <div className="settings-card__actions settings-card__actions--end">
                  <button
                    type="button"
                    className="settings-btn settings-btn--primary"
                    onClick={() => void onDownloadAllData()}
                    disabled={exportingData}
                  >
                    {exportingData ? "Generando..." : "Descargar mis datos (.zip)"}
                  </button>
                </div>
              </div>

            </div>
          </section>
        ) : null}

        {activeTab === "logs" ? (
          <section className="settings-panel">
            <div className="settings-panel__header">
              <div>
                <h2>Registro de accesos</h2>
                <p>Historial de todos los inicios de sesión en tu cuenta.</p>
              </div>
            </div>

            <div className="settings-table-wrap">
              <table className="settings-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>IP</th>
                    <th>Ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr>
                      <td colSpan={4} className="settings-table__empty">
                        Cargando registros...
                      </td>
                    </tr>
                  ) : null}

                  {!logsLoading && logsItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="settings-table__empty">
                        No hay registros de acceso.
                      </td>
                    </tr>
                  ) : null}

                  {!logsLoading
                    ? logsItems.map((row) => (
                        <tr key={row.id}>
                          <td>{formatDateTime(row.createdAt)}</td>
                          <td>{row.email ?? "-"}</td>
                          <td>{row.ipAddress ?? "-"}</td>
                          <td>{[row.city, row.country].filter(Boolean).join(", ") || "-"}</td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>

            <div className="settings-pagination">
              <p className="settings-muted">{logsTotal} registros</p>
              <div className="settings-inline-actions">
                <button
                  type="button"
                  className="settings-btn settings-btn--ghost"
                  disabled={!logsHasPrevious}
                  onClick={() => void loadLogs(logsPage - 1)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="settings-btn settings-btn--ghost"
                  disabled={!logsHasNext}
                  onClick={() => void loadLogs(logsPage + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "users" ? (
          <section className="settings-panel">
            <div className="settings-panel__header">
              <div>
                <h2>Usuarios de tu empresa</h2>
                <p>Gestiona qué personas de tu equipo pueden acceder a la plataforma.</p>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-stack">
                <small>DATOS DEL NEGOCIO</small>
                <strong>{form.nombreFiscal || "-"}</strong>
                <span>{form.nifCif || "-"}</span>
                <span>{joinAddress(street, streetNumber) || "-"}</span>
              </div>
            </div>

            <div className="settings-users-top">
              <div>
                <h3>Miembros del equipo</h3>
                <p className="settings-muted">
                  {teamUsers.length} / {teamLimitLabel} usuarios
                </p>
              </div>
              <button type="button" className="settings-btn settings-btn--primary" onClick={() => setTeamFormOpen((previous) => !previous)}>
                + Añadir usuario
              </button>
            </div>

            {teamFormOpen ? (
              <form className="settings-users-inline-form" onSubmit={onAddTeamUser}>
                <label className="settings-field">
                  Nombre
                  <input className="settings-input" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
                </label>
                <label className="settings-field">
                  Email
                  <input
                    className="settings-input"
                    type="email"
                    value={teamEmail}
                    onChange={(event) => setTeamEmail(event.target.value)}
                  />
                </label>
                <label className="settings-field">
                  Permisos
                  <select
                    className="settings-input"
                    value={teamRole}
                    onChange={(event) => setTeamRole(event.target.value as TeamRole)}
                  >
                    <option value="propietario">Propietario</option>
                    <option value="gestor">Gestor</option>
                    <option value="lector">Lector</option>
                  </select>
                </label>
                <button type="submit" className="settings-btn settings-btn--primary">
                  Guardar
                </button>
              </form>
            ) : null}

            <div className="settings-table-wrap">
              <table className="settings-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Permisos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {teamUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="settings-table__empty">
                        No hay usuarios añadidos. Haz clic en "Añadir usuario" para empezar.
                      </td>
                    </tr>
                  ) : null}
                  {teamUsers.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.email}</td>
                      <td>{getTeamRoleLabel(row.role)}</td>
                      <td>
                        <button type="button" className="settings-btn settings-btn--danger-ghost" onClick={() => onRemoveTeamUser(row.id)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="settings-muted">Los cambios del equipo se guardan localmente en este navegador.</p>
          </section>
        ) : null}

        {activeTab === "subscription" ? (
          <section className="settings-panel">
            <div className="settings-panel__header">
              <div>
                <h2>Tu suscripción</h2>
                <p>Elige el plan que mejor se adapte a tu negocio. Puedes cambiar o cancelar en cualquier momento.</p>
              </div>
            </div>

            {subscriptionLoading ? <p className="settings-muted">Cargando suscripción...</p> : null}

            {(() => {
              const currentPlanDef = PLAN_CARDS.find((p) => p.id === subscription?.plan);
              const hasActive = Boolean(subscription?.plan && subscription.plan !== "none");
              const pendingDowngradeId = subscription?.pendingDowngradePlan && subscription.pendingDowngradePlan !== "none"
                ? subscription.pendingDowngradePlan
                : null;
              const pendingDowngradeLabel = pendingDowngradeId
                ? (PLAN_CARDS.find((p) => p.id === pendingDowngradeId)?.label ?? pendingDowngradeId)
                : null;
              return (
                <div className={`settings-current-plan${hasActive ? " settings-current-plan--active" : " settings-current-plan--empty"}`}>
                  <div className="settings-current-plan__left">
                    <span className="settings-current-plan__label">Tu plan actual</span>
                    <div className="settings-current-plan__name-row">
                      <strong className="settings-current-plan__name">
                        {currentPlanDef?.label ?? (hasActive ? (subscription?.plan ?? "").toUpperCase() : "Sin plan activo")}
                      </strong>
                      <span className={`settings-current-plan__status settings-current-plan__status--${subscription?.status ?? "none"}`}>
                        {getSubscriptionStatusLabel(subscription)}
                      </span>
                    </div>
                    <small className="settings-current-plan__meta">
                      {hasActive && subscription?.currentPeriodEnd
                        ? `Renovación el ${formatDate(subscription.currentPeriodEnd)}`
                        : hasActive
                          ? "Sin fecha de renovación"
                          : "Elige un plan para empezar a facturar."}
                      {pendingDowngradeLabel
                        ? ` · Cambiará a ${pendingDowngradeLabel} al finalizar el periodo`
                        : ""}
                    </small>
                  </div>
                  <div className="settings-current-plan__actions">
                    <button
                      type="button"
                      className="settings-btn settings-btn--ghost"
                      onClick={() => void onOpenPaymentMethod()}
                      disabled={subscriptionBusy}
                    >
                      Método de pago
                    </button>
                    {subscription?.cancelAtPeriodEnd ? (
                      <button
                        type="button"
                        className="settings-btn settings-btn--ghost"
                        onClick={() => void onReactivateSubscription()}
                        disabled={subscriptionBusy}
                      >
                        Reactivar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="settings-btn settings-btn--danger-ghost"
                        onClick={() => void onCancelSubscription()}
                        disabled={subscriptionBusy || !subscription?.status}
                      >
                        Cancelar suscripción
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="settings-pricing-toggle-wrap">
              <div className="settings-pricing-toggle">
                <button
                  type="button"
                  className={`settings-pricing-toggle__btn ${billingInterval === "monthly" ? "settings-pricing-toggle__btn--active" : ""}`}
                  onClick={() => setBillingInterval("monthly")}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  className={`settings-pricing-toggle__btn ${billingInterval === "yearly" ? "settings-pricing-toggle__btn--active" : ""}`}
                  onClick={() => setBillingInterval("yearly")}
                >
                  Anual <span className="settings-pricing-toggle__discount">-30% dto.</span>
                </button>
              </div>
            </div>

            <div className="settings-plan-grid">
              {PLAN_CARDS.map((plan) => {
                const isCurrent = subscription?.plan === plan.id;
                const shownPrice = billingInterval === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
                const cardClass = [
                  "settings-plan-card",
                  isCurrent ? "settings-plan-card--current" : "",
                  plan.id === "business" ? "settings-plan-card--business" : "",
                  plan.id === "pro" ? "settings-plan-card--popular" : "",
                ].filter(Boolean).join(" ");
                return (
                  <article key={plan.id} className={cardClass}>
                    {isCurrent ? <span className="settings-plan-current-pill">Tu plan actual</span> : null}
                    <div className="settings-plan-header">
                      {plan.badge ? (
                        <>
                          {plan.id !== "business" ? (
                            <span className={`settings-plan-badge settings-plan-badge--${plan.id}`}>
                              {plan.label.toUpperCase()}
                            </span>
                          ) : null}
                          <span className={`settings-chip settings-chip--${plan.id}`}>{plan.badge.toUpperCase()}</span>
                        </>
                      ) : (
                        <span className={`settings-plan-badge settings-plan-badge--${plan.id}`}>
                          {plan.label.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="settings-plan-price">
                      {formatCurrency(shownPrice)} <small>/mes + IVA</small>
                    </p>
                    {billingInterval === "yearly" ? (
                      <p className="settings-plan-yearly-note">{formatCurrency(shownPrice * 12)} facturados anualmente</p>
                    ) : null}
                    <p className="settings-plan-tagline">{plan.tagline}</p>
                    <button
                      type="button"
                      className={`settings-plan-btn ${isCurrent ? "settings-plan-btn--current" : ""}`}
                      onClick={() => void onSelectPlan(plan.id)}
                      disabled={subscriptionBusy}
                    >
                      {isCurrent ? "Plan actual" : `Cambiar a ${plan.label}`}
                    </button>
                    <ul className="settings-plan-features">
                      {plan.features.map((feature) => (
                        <li key={feature}>
                          <svg className="settings-plan-check" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>

            <div className="settings-card">
              <h3>Método de pago</h3>
              <div className="settings-stack">
                <strong>{paymentMethod.title}</strong>
                <small>{paymentMethod.subtitle}</small>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-panel__header">
                <h3>Uso de tu plan</h3>
                <small className="settings-muted">
                  {subscription?.currentPeriodStart ? `Período iniciado ${formatDate(subscription.currentPeriodStart)}` : ""}
                </small>
              </div>
              <div className="settings-usage-grid">
                {[
                  { label: "Clientes", used: realUsage?.clients ?? subscription?.usage?.usage.clients ?? 0, limit: subscription?.usage?.limits.clients ?? 0 },
                  { label: "Productos", used: realUsage?.products ?? subscription?.usage?.usage.products ?? 0, limit: subscription?.usage?.limits.products ?? 0 },
                  { label: "Facturas emitidas", used: realUsage?.invoicesIssued ?? 0, limit: subscription?.usage?.limits.invoicesMonth ?? 0 },
                  { label: "Presupuestos emitidos", used: realUsage?.quotesIssued ?? 0, limit: subscription?.usage?.limits.invoicesMonth ?? 0 },
                  { label: "Escaneos OCR", used: subscription?.usage?.usage.ocrMonth ?? 0, limit: subscription?.usage?.limits.ocrMonth ?? 0 },
                ].map((item) => {
                  const pct = item.limit === Infinity || item.limit === 0 ? 0 : Math.min((item.used / item.limit) * 100, 100);
                  return (
                    <div className="settings-usage-row" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.used} / {subscription?.usage ? billingLimitsService.formatLimit(item.limit) : "0"}</strong>
                      <div className="settings-usage-bar">
                        <div
                          className={`settings-usage-bar__fill${pct >= 90 ? " settings-usage-bar__fill--warn" : ""}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}
