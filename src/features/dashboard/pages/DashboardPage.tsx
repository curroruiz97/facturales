import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import totalEarnIcon from "../../../../assets/images/icons/total-earn.svg";
import totalExpensesIcon from "../../../../assets/images/icons/total-expenses.svg";
import totalBalanceIcon from "../../../../assets/images/icons/total-balance.svg";
import type { OnboardingProgress } from "../../../shared/types/domain";
import { onboardingService } from "../../../services/onboarding/onboarding.service";
import { businessInfoService, type GoalPeriod, type IncomeGoals } from "../../../services/business/business-info.service";
import { EmptyState } from "../../../app/components/states/EmptyState";
import { ErrorState } from "../../../app/components/states/ErrorState";
import { LoadingSkeleton } from "../../../app/components/states/LoadingSkeleton";
import type { ClientFinancialSnapshot } from "../../contacts/adapters/contacts.adapter";
import type { DashboardPeriod, DashboardSeriesPoint } from "../domain/dashboard-metrics";
import { useDashboardOverview } from "../hooks/use-dashboard-overview";

type ContactTypeFilter = "all" | "recurrente" | "puntual" | "activo" | "inactivo";
type ContactBalanceFilter = "all" | "positive" | "negative" | "zero";
type ContactSortOption = "recent" | "name-asc" | "name-desc" | "balance-desc" | "balance-asc";

const KPI_PERIOD_OPTIONS: Array<{ id: DashboardPeriod; label: string }> = [
  { id: "Q1", label: "T1 (Ene-Mar)" },
  { id: "Q2", label: "T2 (Abr-Jun)" },
  { id: "Q3", label: "T3 (Jul-Sep)" },
  { id: "Q4", label: "T4 (Oct-Dic)" },
  { id: "year", label: "Año natural" },
];
const EVOLUTION_PERIOD_OPTIONS: Array<{ id: DashboardPeriod; label: string }> = [
  { id: "Q1", label: "1er Trimestre" },
  { id: "Q2", label: "2º Trimestre" },
  { id: "Q3", label: "3er Trimestre" },
  { id: "Q4", label: "4º Trimestre" },
  { id: "year", label: "Año Natural" },
];

const CONTACT_PAGE_SIZE_OPTIONS = [10, 20, 30];
const OBJECTIVE_TARGET = 1_000_000;


interface OnboardingStepItem {
  number: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  completed: boolean;
  actionText: string;
  actionTo: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCompactEuro(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toLocaleString("es-ES", { maximumFractionDigits: 1 })}M€`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toLocaleString("es-ES", { maximumFractionDigits: 1 })}k€`;
  return `${sign}${Math.round(abs)}€`;
}

function formatDelta(value: number, invert = false): string {
  const normalized = invert ? value * -1 : value;
  const sign = normalized > 0 ? "+" : "";
  return `${sign}${normalized.toFixed(1)}%`;
}

function resolveDeltaClass(value: number, invert = false): "ok" | "danger" {
  const normalized = invert ? value * -1 : value;
  return normalized >= 0 ? "ok" : "danger";
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function buildInitials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "CT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function humanStatus(value: string): string {
  if (!value) return "Sin definir";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toGoalPeriod(period: DashboardPeriod): GoalPeriod {
  if (period === "Q1") return "q1";
  if (period === "Q2") return "q2";
  if (period === "Q3") return "q3";
  if (period === "Q4") return "q4";
  return "year";
}


function formatGoalInputValue(value: number): string {
  return String(Math.round(value));
}

function parseGoalInputValue(value: string): number {
  const numeric = Number(value.replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return numeric;
}

function resolveGoalTitle(period: GoalPeriod): string {
  if (period === "q1") return "Objetivo Trimestral - T1";
  if (period === "q2") return "Objetivo Trimestral - T2";
  if (period === "q3") return "Objetivo Trimestral - T3";
  if (period === "q4") return "Objetivo Trimestral - T4";
  return "Objetivo Anual";
}

function resolveGoalLabel(period: GoalPeriod): string {
  if (period === "year") return "Objetivo de ingresos anuales (€)";
  return "Objetivo de ingresos trimestrales (€)";
}

function resolveOnboardingSteps(progress: OnboardingProgress | null): OnboardingStepItem[] {
  return [
    {
      number: 1,
      title: "Añade los datos de tu negocio",
      description: "Rellena los datos de tu negocio que aparecerán en tus facturas",
      completed: Boolean(progress?.step1BusinessInfo),
      actionText: "Ir a configuración",
      actionTo: "/ajustes?tab=business",
    },
    {
      number: 2,
      title: "Añade tu primer contacto",
      description: "Crea tu listado de clientes y proveedores a los que facturas habitualmente",
      completed: Boolean(progress?.step2FirstClient),
      actionText: "Crear contacto",
      actionTo: "/contactos?action=create",
    },
    {
      number: 3,
      title: "Personaliza tu factura",
      description: "Sube tu logo o elige un color de marca para tus facturas",
      completed: Boolean(progress?.step3CustomizeInvoice),
      actionText: "Personalizar",
      actionTo: "/ajustes?tab=business",
    },
    {
      number: 4,
      title: "Crea tu primera factura",
      description: "Crea tu primera factura digital en menos de un minuto",
      completed: Boolean(progress?.step4FirstInvoice),
      actionText: "Crear factura",
      actionTo: "/facturas/emision",
    },
  ];
}

const LEGACY_KPI_SERIES_INCOME = [5, 15, 10, 25, 18, 30, 22, 45, 35, 55, 40, 65, 50, 80, 70];
const LEGACY_KPI_SERIES_EXPENSES = [10, 5, 20, 8, 35, 12, 50, 15, 45, 20, 60, 25, 55, 30, 40];
const LEGACY_KPI_SERIES_BALANCE = [10, 12, 8, 18, 15, 22, 20, 30, 25, 40, 35, 55, 45, 70, 60];

function buildLegacySparklinePath(series: number[], width = 120, height = 44, padding = 4): string {
  const max = Math.max(...series);
  const stepX = (width - padding * 2) / (series.length - 1);
  const points = series.map((value, index) => {
    const x = padding + stepX * index;
    const y = height - padding - (value / max) * (height - padding * 2);
    return { x, y };
  });

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const controlX = ((previous.x + current.x) / 2).toFixed(2);
    path += ` C ${controlX} ${previous.y.toFixed(2)}, ${controlX} ${current.y.toFixed(2)}, ${current.x.toFixed(2)} ${current.y.toFixed(2)}`;
  }
  return path;
}

function buildLegacySparklineAreaPath(series: number[], width = 120, height = 44, padding = 4): string {
  const linePath = buildLegacySparklinePath(series, width, height, padding);
  const stepX = (width - padding * 2) / (series.length - 1);
  const firstX = padding;
  const lastX = padding + stepX * (series.length - 1);
  const baselineY = height - padding;
  return `${linePath} L ${lastX.toFixed(2)} ${baselineY.toFixed(2)} L ${firstX.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}
function KpiIcon({ variant }: { variant: "income" | "expenses" | "balance" }): JSX.Element {
  const iconSrc = variant === "income" ? totalEarnIcon : variant === "expenses" ? totalExpensesIcon : totalBalanceIcon;
  return <img src={iconSrc} alt="" aria-hidden />;
}

function TrendArrowIcon({ direction }: { direction: "up" | "down" }): JSX.Element {
  return direction === "up" ? (
    <svg viewBox="0 0 16 14" aria-hidden>
      <path d="M8 1.5 14 12.5H2L8 1.5Z" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 14" aria-hidden>
      <path d="M8 12.5 2 1.5h12L8 12.5Z" fill="currentColor" />
    </svg>
  );
}

function GoalMetricIcon({ type }: { type: "income" | "expenses" | "balance" }): JSX.Element {
  if (type === "income") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 19V6M12 6l-4 4M12 6l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "expenses") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 5v13M12 18l-4-4M12 18l4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M6 8h12M8.5 12h7M10 16h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function QuickActionIcon({ type }: { type: "contact" | "expense" | "quote" | "invoice" }): JSX.Element {
  if (type === "contact") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M15.5 20c0-3-2.5-5-5.5-5s-5.5 2-5.5 5M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M18.5 8.5v7M22 12h-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "expense") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2 10h20M7 14h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="19" cy="17" r="3.5" fill="currentColor" opacity="0.16" />
        <path d="M19 15v4M17 17h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "invoice") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 18v-6M9 15h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M6 3h9l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 13h6M10 17h6M10 9h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function SearchIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden>
      <circle cx="9" cy="9" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13.2 13.2 17 17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden>
      <path d="M4 5h12M4 10h12M4 15h12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="7" cy="5" r="1.4" fill="currentColor" />
      <circle cx="13" cy="10" r="1.4" fill="currentColor" />
      <circle cx="9" cy="15" r="1.4" fill="currentColor" />
    </svg>
  );
}

function ChevronArrowIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden>
      <path d="M8 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ManageLinkIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 3h6v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14 21 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function useWindowWidth(): number {
  const [width, setWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  const handleResize = useCallback(() => setWidth(window.innerWidth), []);
  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);
  return width;
}

function EvolutionBarsChart({
  series,
  maxValue,
  periodKey,
}: {
  series: DashboardSeriesPoint[];
  maxValue: number;
  periodKey: DashboardPeriod;
}): JSX.Element {
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;
  const isTablet = windowWidth < 1024;

  const chartData = useMemo(
    () =>
      series.map((point) => ({
        label: point.label,
        income: point.income,
        expenses: point.expenses,
      })),
    [series],
  );

  const barSize = isMobile
    ? (series.length <= 3 ? 20 : series.length <= 6 ? 14 : 10)
    : isTablet
      ? (series.length <= 3 ? 36 : series.length <= 6 ? 26 : 18)
      : (series.length <= 3 ? 56 : series.length <= 6 ? 40 : 28);
  const categoryGap = series.length <= 3 ? "30%" : "18%";
  const yAxisWidth = isMobile ? 48 : isTablet ? 56 : 62;
  const tickFontSize = isMobile ? 10 : isTablet ? 12 : 13.5;
  const yTickFontSize = isMobile ? 10 : 14;
  const barRadius: [number, number, number, number] = isMobile ? [4, 4, 0, 0] : [8, 8, 0, 0];
  const chartHeight = isMobile ? Math.max(180, Math.round(windowWidth * 0.5)) : isTablet ? Math.max(220, Math.round(windowWidth * 0.28)) : Math.min(400, Math.max(280, Math.round(windowWidth * 0.22)));

  const hasData = chartData.length > 0 && chartData.some((d) => d.income > 0 || d.expenses > 0);

  if (!hasData) {
    return (
      <div className="dashboard-v2__recharts-wrap dashboard-v2__chart-empty" style={{ height: chartHeight }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect x="6" y="28" width="8" height="14" rx="2" fill="#e2e8f0" />
          <rect x="20" y="18" width="8" height="24" rx="2" fill="#e2e8f0" />
          <rect x="34" y="8" width="8" height="34" rx="2" fill="#e2e8f0" />
        </svg>
        <p>Aún no hay datos para este periodo</p>
        <small>Los datos aparecerán cuando registres facturas o gastos</small>
      </div>
    );
  }

  return (
    <div className="dashboard-v2__recharts-wrap" key={`evolution-${periodKey}`}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={chartData} barSize={barSize} barGap={isMobile ? 2 : 6} barCategoryGap={categoryGap} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#edf2ff" vertical={!isMobile} horizontal />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={isMobile ? 6 : 12}
            tick={{ fill: "#64748b", fontSize: tickFontSize, fontWeight: 500 }}
            interval={isMobile && series.length > 6 ? 1 : 0}
          />
          <YAxis
            domain={[0, Math.max(maxValue, 1)]}
            tickCount={isMobile ? 4 : isTablet ? 6 : 8}
            axisLine={false}
            tickLine={false}
            width={yAxisWidth}
            tickMargin={isMobile ? 4 : 8}
            tickFormatter={formatCompactEuro}
            tick={{ fill: "#6b7280", fontSize: yTickFontSize, fontWeight: 500 }}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const fullLabel = (payload[0]?.payload as Record<string, unknown>)?.label as string ?? "";
              return (
                <div className="dashboard-v2__recharts-tooltip">
                  <p className="dashboard-v2__recharts-tooltip-title">{fullLabel}</p>
                  {payload.map((entry, i) => {
                    const value = typeof entry.value === "number" ? entry.value : 0;
                    const isIncome = entry.dataKey === "income";
                    return (
                      <p key={i} className="dashboard-v2__recharts-tooltip-line">
                        <span
                          className={`dashboard-v2__recharts-tooltip-dot ${
                            isIncome ? "dashboard-v2__recharts-tooltip-dot--income" : "dashboard-v2__recharts-tooltip-dot--expenses"
                          }`}
                        />
                        {isIncome ? "Ingresos" : "Gastos"}: {formatCurrency(value)}
                      </p>
                    );
                  })}
                </div>
              );
            }}
          />
          <Bar dataKey="income" fill="#22C55E" name="Ingresos" radius={barRadius} />
          <Bar dataKey="expenses" fill="#EF4444" name="Gastos" radius={barRadius} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function matchesContactFilters(
  contact: ClientFinancialSnapshot,
  searchTerm: string,
  typeFilter: ContactTypeFilter,
  balanceFilter: ContactBalanceFilter,
): boolean {
  const normalizedSearch = normalizeText(searchTerm);
  const searchable = normalizeText(
    `${contact.nombreRazonSocial} ${contact.identificador} ${contact.email ?? ""} ${contact.telefono ?? ""} ${contact.direccion ?? ""}`,
  );

  if (normalizedSearch && !searchable.includes(normalizedSearch)) return false;
  if (typeFilter !== "all" && contact.estado !== typeFilter) return false;
  if (balanceFilter === "positive" && contact.balance <= 0) return false;
  if (balanceFilter === "negative" && contact.balance >= 0) return false;
  if (balanceFilter === "zero" && contact.balance !== 0) return false;

  return true;
}
export function DashboardPage(): JSX.Element {
  const kpiOverview = useDashboardOverview("year");

  const [contactSearch, setContactSearch] = useState("");
  const [contactTypeFilter, setContactTypeFilter] = useState<ContactTypeFilter>("all");
  const [contactBalanceFilter, setContactBalanceFilter] = useState<ContactBalanceFilter>("all");
  const [contactSort, setContactSort] = useState<ContactSortOption>("recent");
  const [showAdvancedContactFilters, setShowAdvancedContactFilters] = useState(false);
  const [contactsPageSize, setContactsPageSize] = useState(10);
  const [contactsPage, setContactsPage] = useState(1);
  const [onboardingExpanded, setOnboardingExpanded] = useState(false);
  const [onboardingProgressData, setOnboardingProgressData] = useState<OnboardingProgress | null>(null);
  const [objectiveGoals, setIncomeGoals] = useState<IncomeGoals>({
    year: OBJECTIVE_TARGET,
    q1: null,
    q2: null,
    q3: null,
    q4: null,
  });
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalModalPeriod, setGoalModalPeriod] = useState<GoalPeriod>("year");
  const [goalInput, setGoalInput] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  const snapshot = kpiOverview.snapshot;
  const errorMessage = kpiOverview.error;
  const isLoading = kpiOverview.loading && !snapshot;

  const sparkIncomePath = useMemo(() => buildLegacySparklinePath(LEGACY_KPI_SERIES_INCOME), []);
  const sparkExpensesPath = useMemo(() => buildLegacySparklinePath(LEGACY_KPI_SERIES_EXPENSES), []);
  const sparkBalancePath = useMemo(() => buildLegacySparklinePath(LEGACY_KPI_SERIES_BALANCE), []);
  const sparkIncomeAreaPath = useMemo(() => buildLegacySparklineAreaPath(LEGACY_KPI_SERIES_INCOME), []);
  const sparkExpensesAreaPath = useMemo(() => buildLegacySparklineAreaPath(LEGACY_KPI_SERIES_EXPENSES), []);
  const sparkBalanceAreaPath = useMemo(() => buildLegacySparklineAreaPath(LEGACY_KPI_SERIES_BALANCE), []);

  const evolutionSeries: DashboardSeriesPoint[] = snapshot?.series ?? [];
  const evolutionMax = useMemo(() => {
    const raw = Math.max(0, ...evolutionSeries.flatMap((point) => [point.income, point.expenses]));
    if (raw <= 0) return 900;
    return Math.max(900, Math.ceil(raw / 100) * 100);
  }, [evolutionSeries]);

  const selectedGoalPeriod = toGoalPeriod(kpiOverview.period);
  const objectiveTarget = useMemo(() => {
    if (selectedGoalPeriod === "year") {
      return objectiveGoals.year;
    }
    const quarterlyValue = objectiveGoals[selectedGoalPeriod];
    if (quarterlyValue !== null && quarterlyValue !== undefined) {
      return quarterlyValue;
    }
    return Math.round((objectiveGoals.year || 0) / 4);
  }, [objectiveGoals, selectedGoalPeriod]);

  const objectiveCurrent = snapshot?.kpis.income ?? 0;
  const objectiveRemaining = Math.max(0, objectiveTarget - objectiveCurrent);
  const objectiveProgress = objectiveTarget > 0 ? Math.min(100, Math.round((objectiveCurrent / objectiveTarget) * 100)) : 0;

  const allContacts = snapshot?.contacts ?? [];
  const filteredContacts = useMemo(
    () => allContacts.filter((contact) => matchesContactFilters(contact, contactSearch, contactTypeFilter, contactBalanceFilter)),
    [allContacts, contactSearch, contactTypeFilter, contactBalanceFilter],
  );

  const orderedContacts = useMemo(() => {
    const copy = [...filteredContacts];
    if (contactSort === "name-asc") {
      return copy.sort((a, b) => a.nombreRazonSocial.localeCompare(b.nombreRazonSocial, "es"));
    }
    if (contactSort === "name-desc") {
      return copy.sort((a, b) => b.nombreRazonSocial.localeCompare(a.nombreRazonSocial, "es"));
    }
    if (contactSort === "balance-desc") {
      return copy.sort((a, b) => b.balance - a.balance);
    }
    if (contactSort === "balance-asc") {
      return copy.sort((a, b) => a.balance - b.balance);
    }
    return copy;
  }, [filteredContacts, contactSort]);

  const totalContactPages = Math.max(1, Math.ceil(orderedContacts.length / contactsPageSize));

  useEffect(() => {
    setContactsPage(1);
  }, [contactSearch, contactTypeFilter, contactBalanceFilter, contactSort, contactsPageSize]);

  useEffect(() => {
    if (contactsPage > totalContactPages) setContactsPage(totalContactPages);
  }, [contactsPage, totalContactPages]);

  useEffect(() => {
    const loadGoals = async () => {
      const result = await businessInfoService.getIncomeGoals();
      if (!result.success || !result.data) return;
      setIncomeGoals(result.data);
    };

    void loadGoals();
  }, []);

  useEffect(() => {
    const loadOnboarding = async () => {
      const result = await onboardingService.getUserProgress();
      if (!result.success) return;
      if (result.data) {
        setOnboardingProgressData(result.data);
        return;
      }
      const created = await onboardingService.createUserProgress();
      if (created.success) {
        setOnboardingProgressData(created.data);
      }
    };

    void loadOnboarding();
  }, []);

  useEffect(() => {
    if (!goalModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGoalModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goalModalOpen]);

  const paginatedContacts = useMemo(() => {
    const offset = (contactsPage - 1) * contactsPageSize;
    return orderedContacts.slice(offset, offset + contactsPageSize);
  }, [contactsPage, contactsPageSize, orderedContacts]);

  const onboardingSummary = useMemo(() => onboardingService.calculateProgress(onboardingProgressData), [onboardingProgressData]);
  const onboardingSteps = useMemo(() => resolveOnboardingSteps(onboardingProgressData), [onboardingProgressData]);
  const onboardingStrokeOffset = useMemo(() => 201 - (201 * onboardingSummary.percentage) / 100, [onboardingSummary.percentage]);
  const isOnboardingCompleted = onboardingSummary.percentage >= 100;
  const completionExpanded = onboardingExpanded;

  const openGoalModal = (period: GoalPeriod) => {
    const goalValue = period === "year" ? objectiveGoals.year : (objectiveGoals[period] ?? Math.round((objectiveGoals.year || 0) / 4));
    setGoalModalPeriod(period);
    setGoalInput(formatGoalInputValue(goalValue));
    setGoalError(null);
    setGoalModalOpen(true);
  };

  const saveGoal = async () => {
    const value = parseGoalInputValue(goalInput);
    setGoalSaving(true);
    setGoalError(null);
    try {
      const result = await businessInfoService.saveIncomeGoal(goalModalPeriod, value);
      if (!result.success) {
        setGoalError("No se pudo guardar el objetivo. Intentalo de nuevo.");
        setGoalSaving(false);
        return;
      }

      setIncomeGoals((previous) => ({ ...previous, [goalModalPeriod]: value }));
      setGoalModalOpen(false);
    } catch {
      setGoalError("No se pudo guardar el objetivo. Intentalo de nuevo.");
    } finally {
      setGoalSaving(false);
    }
  };

  return (
    <div className="pilot-grid dashboard-v2">
      <section className="pilot-panel dashboard-v2__period-panel dashboard-v2__animate dashboard-v2__animate--panel">
        <div className="pilot-actions">
          {KPI_PERIOD_OPTIONS.map((periodOption) => (
            <button
              key={periodOption.id}
              type="button"
              className={`pilot-btn ${kpiOverview.period === periodOption.id ? "pilot-btn--primary" : ""}`}
              onClick={() => kpiOverview.setPeriod(periodOption.id)}
            >
              {periodOption.label}
            </button>
          ))}
        </div>
      </section>

      {errorMessage ? (
        <ErrorState
          title="No se pudo cargar el dashboard"
          description={errorMessage}
          onRetry={() => {
            void kpiOverview.refresh();
          }}
        />
      ) : null}

      {isLoading ? <LoadingSkeleton message="Cargando dashboard..." /> : null}

      {!isLoading && !errorMessage && snapshot ? (
        <div className="dashboard-v2__layout">
          <section className="dashboard-v2__main">
            <div className="dashboard-v2__kpis">
              <article className="pilot-panel dashboard-v2__kpi dashboard-v2__kpi--income dashboard-v2__animate dashboard-v2__animate--1">
                <header className="dashboard-v2__kpi-header">
                  <div className="dashboard-v2__kpi-title">
                    <span className="dashboard-v2__kpi-icon">
                      <KpiIcon variant="income" />
                    </span>
                    <h3>Ingresos Totales</h3>
                  </div>
                </header>
                <div className="dashboard-v2__kpi-body">
                  <div>
                    <p className="dashboard-v2__kpi-value">{formatCurrency(snapshot.kpis.income)}</p>
                    <p className={`dashboard-v2__kpi-delta dashboard-v2__kpi-delta--${resolveDeltaClass(snapshot.kpis.incomeDelta)}`}>
                      <span className="dashboard-v2__kpi-delta-icon" aria-hidden>
                        <TrendArrowIcon direction={resolveDeltaClass(snapshot.kpis.incomeDelta) === "ok" ? "up" : "down"} />
                      </span>
                      {formatDelta(snapshot.kpis.incomeDelta)} / {snapshot.comparisonLabel}
                    </p>
                  </div>
                  <svg className="dashboard-v2__sparkline" viewBox="0 0 120 44" aria-hidden>
                    <path className="dashboard-v2__sparkline-area" d={sparkIncomeAreaPath} />
                    <path d={sparkIncomePath} />
                  </svg>
                </div>
              </article>

              <article className="pilot-panel dashboard-v2__kpi dashboard-v2__kpi--expenses dashboard-v2__animate dashboard-v2__animate--2">
                <header className="dashboard-v2__kpi-header">
                  <div className="dashboard-v2__kpi-title">
                    <span className="dashboard-v2__kpi-icon">
                      <KpiIcon variant="expenses" />
                    </span>
                    <h3>Gastos Totales</h3>
                  </div>
                </header>
                <div className="dashboard-v2__kpi-body">
                  <div>
                    <p className="dashboard-v2__kpi-value">{formatCurrency(snapshot.kpis.expenses)}</p>
                    <p
                      className={`dashboard-v2__kpi-delta dashboard-v2__kpi-delta--${resolveDeltaClass(snapshot.kpis.expensesDelta, true)}`}
                    >
                      <span className="dashboard-v2__kpi-delta-icon" aria-hidden>
                        <TrendArrowIcon direction={resolveDeltaClass(snapshot.kpis.expensesDelta, true) === "ok" ? "up" : "down"} />
                      </span>
                      {formatDelta(snapshot.kpis.expensesDelta, true)} / {snapshot.comparisonLabel}
                    </p>
                  </div>
                  <svg className="dashboard-v2__sparkline" viewBox="0 0 120 44" aria-hidden>
                    <path className="dashboard-v2__sparkline-area" d={sparkExpensesAreaPath} />
                    <path d={sparkExpensesPath} />
                  </svg>
                </div>
              </article>

              <article className="pilot-panel dashboard-v2__kpi dashboard-v2__kpi--balance dashboard-v2__animate dashboard-v2__animate--3">
                <header className="dashboard-v2__kpi-header">
                  <div className="dashboard-v2__kpi-title">
                    <span className="dashboard-v2__kpi-icon">
                      <KpiIcon variant="balance" />
                    </span>
                    <h3>Balance</h3>
                  </div>
                </header>
                <div className="dashboard-v2__kpi-body">
                  <div>
                    <p className="dashboard-v2__kpi-value">{formatCurrency(snapshot.kpis.balance)}</p>
                    <p className={`dashboard-v2__kpi-delta dashboard-v2__kpi-delta--${resolveDeltaClass(snapshot.kpis.balanceDelta)}`}>
                      <span className="dashboard-v2__kpi-delta-icon" aria-hidden>
                        <TrendArrowIcon direction={resolveDeltaClass(snapshot.kpis.balanceDelta) === "ok" ? "up" : "down"} />
                      </span>
                      {formatDelta(snapshot.kpis.balanceDelta)} / {snapshot.comparisonLabel}
                    </p>
                  </div>
                  <svg className="dashboard-v2__sparkline" viewBox="0 0 120 44" aria-hidden>
                    <path className="dashboard-v2__sparkline-area" d={sparkBalanceAreaPath} />
                    <path d={sparkBalancePath} />
                  </svg>
                </div>
              </article>
            </div>

            <div className="dashboard-v2__analytics-grid">
              <article className="pilot-panel dashboard-v2__evolution dashboard-v2__animate dashboard-v2__animate--4">
                <header className="dashboard-v2__card-header">
                  <h2>Mi Evolución</h2>
                  <div className="dashboard-v2__card-tools">
                    <div className="dashboard-v2__legend">
                      <span className="dashboard-v2__legend-item dashboard-v2__legend-item--income">Ingresos</span>
                      <span className="dashboard-v2__legend-item dashboard-v2__legend-item--expenses">Gastos</span>
                    </div>
                    <select
                      className="dashboard-v2__period-select"
                      value={kpiOverview.period}
                      onChange={(event) => kpiOverview.setPeriod(event.target.value as DashboardPeriod)}
                    >
                      {EVOLUTION_PERIOD_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </header>

                <div className="dashboard-v2__chart-shell dashboard-v2__chart-shell--recharts">
                  <div className="dashboard-v2__plot-area">
                    <EvolutionBarsChart
                      series={evolutionSeries}
                      maxValue={evolutionMax}
                      periodKey={kpiOverview.period}
                    />
                  </div>
                </div>
              </article>
              <article className="pilot-panel dashboard-v2__goals dashboard-v2__animate dashboard-v2__animate--5">
                <header className="dashboard-v2__card-header">
                  <h2>Objetivos</h2>
                  <div className="dashboard-v2__card-tools">
                    <select
                      className="dashboard-v2__period-select"
                      value={kpiOverview.period}
                      onChange={(event) => kpiOverview.setPeriod(event.target.value as DashboardPeriod)}
                    >
                      {KPI_PERIOD_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </header>

                <div className="dashboard-v2__goals-body">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span className="dashboard-v2__goal-subtitle">Objetivo de ingresos</span>
                      <button type="button" className="dashboard-v2__ghost-link" onClick={() => openGoalModal(selectedGoalPeriod)}>
                        Editar
                      </button>
                    </div>
                    <div className="dashboard-v2__goal-value">
                      <span className="dashboard-v2__goal-value-amount">{formatCurrency(objectiveCurrent)}</span>
                      <span className="dashboard-v2__goal-value-of">de <strong>{formatCurrency(objectiveTarget)}</strong></span>
                    </div>
                    <div className="dashboard-v2__goal-track">
                      <span style={{ width: `${objectiveProgress}%` }} />
                    </div>
                    <div className="dashboard-v2__goal-meta">
                      <span>{objectiveProgress}%</span>
                      <span>Faltan {formatCurrency(objectiveRemaining)}</span>
                    </div>
                  </div>

                  <hr className="dashboard-v2__goal-divider" />

                  <div className="dashboard-v2__goal-metrics">
                    <div className="dashboard-v2__goal-metric dashboard-v2__goal-metric--income">
                      <span className="dashboard-v2__goal-metric-icon">
                        <GoalMetricIcon type="income" />
                      </span>
                      <strong>{formatCurrency(snapshot.kpis.income)}</strong>
                      <small>Ingresos</small>
                    </div>
                    <div className="dashboard-v2__goal-metric dashboard-v2__goal-metric--expenses">
                      <span className="dashboard-v2__goal-metric-icon">
                        <GoalMetricIcon type="expenses" />
                      </span>
                      <strong>{formatCurrency(snapshot.kpis.expenses)}</strong>
                      <small>Gastos</small>
                    </div>
                    <div className="dashboard-v2__goal-metric dashboard-v2__goal-metric--balance">
                      <span className="dashboard-v2__goal-metric-icon">
                        <GoalMetricIcon type="balance" />
                      </span>
                      <strong>{formatCurrency(snapshot.kpis.balance)}</strong>
                      <small>Beneficio</small>
                    </div>
                  </div>

                  <hr className="dashboard-v2__goal-divider" />

                  <div className="dashboard-v2__goal-stats">
                    <div>
                      <span>Facturas emitidas</span>
                      <strong>{snapshot.documents.issuedInvoices}</strong>
                    </div>
                    <div>
                      <span>Pendientes de cobro</span>
                      <strong>{snapshot.documents.unpaidInvoices}</strong>
                    </div>
                    <div>
                      <span>Presupuestos activos</span>
                      <strong>{snapshot.documents.issuedQuotes}</strong>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <article className="pilot-panel dashboard-v2__contacts dashboard-v2__animate dashboard-v2__animate--6">
              <header className="dashboard-v2__contacts-header">
                <h2>Contactos</h2>
                <p>{orderedContacts.length} clientes registrados</p>
              </header>

              <div className="dashboard-v2__contacts-toolbar">
                <label className="dashboard-v2__search">
                  <span aria-hidden>
                    <SearchIcon />
                  </span>
                  <input
                    type="search"
                    value={contactSearch}
                    onChange={(event) => setContactSearch(event.target.value)}
                    placeholder="Buscar por nombre, correo u otros..."
                  />
                </label>
                <button
                  type="button"
                  className={`dashboard-v2__filters-btn ${showAdvancedContactFilters ? "dashboard-v2__filters-btn--active" : ""}`}
                  onClick={() => setShowAdvancedContactFilters((current) => !current)}
                >
                  <span aria-hidden>
                    <FilterIcon />
                  </span>
                  Filtros
                </button>
              </div>

              {showAdvancedContactFilters ? (
                <div className="dashboard-v2__contacts-filters">
                  <select
                    value={contactTypeFilter}
                    onChange={(event) => setContactTypeFilter(event.target.value as ContactTypeFilter)}
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="recurrente">Recurrente</option>
                    <option value="puntual">Puntual</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                  <select
                    value={contactBalanceFilter}
                    onChange={(event) => setContactBalanceFilter(event.target.value as ContactBalanceFilter)}
                  >
                    <option value="all">Todos los saldos</option>
                    <option value="positive">Balance positivo</option>
                    <option value="negative">Balance negativo</option>
                    <option value="zero">Balance cero</option>
                  </select>
                  <select value={contactSort} onChange={(event) => setContactSort(event.target.value as ContactSortOption)}>
                    <option value="recent">Más recientes</option>
                    <option value="name-asc">Nombre A-Z</option>
                    <option value="name-desc">Nombre Z-A</option>
                    <option value="balance-desc">Mayor balance</option>
                    <option value="balance-asc">Menor balance</option>
                  </select>
                </div>
              ) : null}
              {paginatedContacts.length === 0 ? (
                <EmptyState
                  title="Sin resultados de contactos"
                  description="No hay contactos que cumplan con los filtros aplicados."
                />
              ) : (
                <div className="dashboard-v2__contacts-table-wrap">
                  <table className="dashboard-v2__contacts-table">
                    <thead>
                      <tr>
                        <th>Contacto</th>
                        <th>Info. contacto</th>
                        <th>Tipo</th>
                        <th>Facturado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedContacts.map((contact) => (
                        <tr key={contact.id}>
                          <td>
                            <div className="dashboard-v2__contact-main">
                              <span className="dashboard-v2__contact-avatar">{buildInitials(contact.nombreRazonSocial)}</span>
                              <div>
                                <strong>{contact.nombreRazonSocial}</strong>
                                <small>{contact.identificador}</small>
                                <span className="dashboard-v2__contact-kind">
                                  {contact.tipoCliente === "empresa" ? "Empresa" : "Autónomo"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="dashboard-v2__stack">
                              <strong>{contact.email ?? "Sin email"}</strong>
                              <span>{contact.telefono ?? "Sin teléfono"}</span>
                              <small>{contact.direccion ?? "Sin dirección"}</small>
                            </div>
                          </td>
                          <td>
                            <div className="dashboard-v2__stack">
                              <span className={`dashboard-v2__status dashboard-v2__status--${contact.estado}`}>
                                {humanStatus(contact.estado)}
                              </span>
                              <small>{contact.diaFacturacion ? `Día ${contact.diaFacturacion} de cada mes` : "Sin día fijo"}</small>
                            </div>
                          </td>
                          <td>
                            <div className="dashboard-v2__stack">
                              <strong className="dashboard-v2__money dashboard-v2__money--income">
                                {formatCurrency(contact.totalFacturado)}
                              </strong>
                              <strong className="dashboard-v2__money dashboard-v2__money--expenses">
                                {formatCurrency(contact.totalGastos)}
                              </strong>
                            </div>
                          </td>
                          <td>
                            <Link to="/contactos" className="dashboard-v2__manage-link">
                              <span aria-hidden>
                                <ManageLinkIcon />
                              </span>
                              Gestionar
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <footer className="dashboard-v2__contacts-pagination">
                <label>
                  Mostrar resultados:
                  <select
                    value={contactsPageSize}
                    onChange={(event) => setContactsPageSize(Number(event.target.value))}
                  >
                    {CONTACT_PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="dashboard-v2__pager">
                  <button
                    type="button"
                    className="dashboard-v2__pager-btn"
                    disabled={contactsPage <= 1}
                    onClick={() => setContactsPage((current) => Math.max(1, current - 1))}
                  >
                    ‹
                  </button>
                  <span>{contactsPage}</span>
                  <button
                    type="button"
                    className="dashboard-v2__pager-btn"
                    disabled={contactsPage >= totalContactPages}
                    onClick={() => setContactsPage((current) => Math.min(totalContactPages, current + 1))}
                  >
                    ›
                  </button>
                </div>
              </footer>
            </article>
          </section>

          <aside className="dashboard-v2__aside">
            <section className="pilot-panel dashboard-v2__actions-card dashboard-v2__animate dashboard-v2__animate--7">
              <h3>¿QUÉ DESEAS HACER?</h3>
              <Link className="dashboard-v2__primary-action" to="/facturas/emision">
                <span className="dashboard-v2__primary-action-icon">
                  <QuickActionIcon type="invoice" />
                </span>
                <span className="dashboard-v2__primary-action-text">
                  <strong>Crear factura</strong>
                  <small>Nueva factura profesional</small>
                </span>
                <span className="dashboard-v2__primary-action-arrow" aria-hidden>
                  <ChevronArrowIcon />
                </span>
              </Link>

              <div className="dashboard-v2__quick-actions">
                <Link to="/contactos?action=create" className="dashboard-v2__quick-action dashboard-v2__quick-action--contact">
                  <span className="dashboard-v2__quick-icon dashboard-v2__quick-icon--contact">
                    <QuickActionIcon type="contact" />
                  </span>
                  Añadir contacto
                </Link>
                <Link to="/transacciones?action=create" className="dashboard-v2__quick-action dashboard-v2__quick-action--expense">
                  <span className="dashboard-v2__quick-icon dashboard-v2__quick-icon--expense">
                    <QuickActionIcon type="expense" />
                  </span>
                  Añadir gasto
                </Link>
                <Link to="/presupuestos/emision" className="dashboard-v2__quick-action dashboard-v2__quick-action--quote">
                  <span className="dashboard-v2__quick-icon dashboard-v2__quick-icon--quote">
                    <QuickActionIcon type="quote" />
                  </span>
                  Crear presupuesto
                </Link>
              </div>
            </section>
            <div
              className="pilot-panel dashboard-v2__completion-link dashboard-v2__completion-link--compact dashboard-v2__animate dashboard-v2__animate--8"
              role="button"
              tabIndex={0}
              onClick={() => setOnboardingExpanded((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setOnboardingExpanded((current) => !current);
                }
              }}
            >
              <div className="dashboard-v2__completion">
                <div className="dashboard-v2__completion-header">
                  <div className="dashboard-v2__completion-header-left">
                    <div className="dashboard-v2__completion-ring">
                      <svg className="dashboard-v2__completion-ring-svg" viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="36" cy="36" r="32" stroke="#E5E7EB" strokeWidth="7" fill="white" />
                        <circle cx="36" cy="36" r="32" stroke="#ec8228" strokeWidth="7" fill="none"
                          strokeDasharray="201" strokeDashoffset={onboardingStrokeOffset} strokeLinecap="round"
                          style={{ transition: "all 1s" }} />
                      </svg>
                      <div className="dashboard-v2__completion-ring-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M20 6L9 17L4 12" stroke="#ec8228" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                    <div className="dashboard-v2__completion-text">
                      <div className="dashboard-v2__completion-score">
                        <strong>{onboardingSummary.percentage}</strong>
                        <span>/{onboardingSummary.total * 25}</span>
                      </div>
                      <p className="dashboard-v2__completion-state">
                        {onboardingSummary.percentage === 100 ? "COMPLETADO" : "EN PROGRESO"}
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`dashboard-v2__completion-arrow ${completionExpanded ? "dashboard-v2__completion-arrow--expanded" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className={`dashboard-v2__steps-wrap ${completionExpanded ? "dashboard-v2__steps-wrap--expanded" : ""}`}>
                  {onboardingSteps.map((step, index) => {
                    const isLast = index === onboardingSteps.length - 1;
                    return (
                      <div key={step.number} className="dashboard-v2__step">
                        <div className="dashboard-v2__step-rail">
                          <span className={`dashboard-v2__step-circle ${step.completed ? "dashboard-v2__step-circle--completed" : ""}`}>
                            {step.completed ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M9 5L16 12L9 19" stroke="#ec8228" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          {!isLast ? <span className="dashboard-v2__step-line" /> : null}
                        </div>
                        <div className="dashboard-v2__step-content">
                          <p className="dashboard-v2__step-label">PASO {step.number}</p>
                          <h4>{step.title}</h4>
                          <p>{step.description}</p>
                          {step.completed ? (
                            <span className="dashboard-v2__step-pill">Completado</span>
                          ) : (
                            <Link to={step.actionTo} className="dashboard-v2__step-action">
                              {step.actionText}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {goalModalOpen ? (
        <div className="dashboard-v2__goal-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-goal-modal-title">
          <button type="button" className="dashboard-v2__goal-modal-overlay" aria-label="Cerrar" onClick={() => setGoalModalOpen(false)} />
          <div className="dashboard-v2__goal-modal-content">
            <header className="dashboard-v2__goal-modal-header">
              <h3 id="dashboard-goal-modal-title">{resolveGoalTitle(goalModalPeriod)}</h3>
              <button type="button" aria-label="Cerrar" className="dashboard-v2__goal-modal-close" onClick={() => setGoalModalOpen(false)}>
                ×
              </button>
            </header>
            <div className="dashboard-v2__goal-modal-body">
              <label htmlFor="dashboard-goal-input">{resolveGoalLabel(goalModalPeriod)}</label>
              <input
                id="dashboard-goal-input"
                type="text"
                inputMode="decimal"
                value={goalInput}
                onChange={(event) => setGoalInput(event.target.value.replace(/[^0-9.,]/g, ""))}
              />
              {goalError ? <p className="dashboard-v2__goal-modal-error">{goalError}</p> : null}
            </div>
            <footer className="dashboard-v2__goal-modal-footer">
              <button type="button" className="dashboard-v2__goal-modal-btn dashboard-v2__goal-modal-btn--secondary" onClick={() => setGoalModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="dashboard-v2__goal-modal-btn dashboard-v2__goal-modal-btn--primary" onClick={saveGoal} disabled={goalSaving}>
                {goalSaving ? "Guardando..." : "Guardar"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
