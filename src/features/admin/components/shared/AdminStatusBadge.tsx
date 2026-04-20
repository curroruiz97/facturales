type BadgeVariant = "active" | "healthy" | "suspended" | "error" | "warning" | "draft" | "sent" | "default";

interface AdminStatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  active:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  healthy:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  suspended:
    "bg-red-50 text-red-700 ring-1 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
  error:
    "bg-red-50 text-red-700 ring-1 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
  warning:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-600/10 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  draft:
    "bg-slate-100 text-slate-600 ring-1 ring-slate-300/40 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-600/30",
  sent:
    "bg-blue-50 text-blue-700 ring-1 ring-blue-600/10 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  default:
    "bg-slate-100 text-slate-600 ring-1 ring-slate-300/40 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-600/30",
};

const DOT_STYLES: Record<BadgeVariant, string> = {
  active: "bg-emerald-500 dark:bg-emerald-400",
  healthy: "bg-emerald-500 dark:bg-emerald-400",
  suspended: "bg-red-500 dark:bg-red-400",
  error: "bg-red-500 dark:bg-red-400",
  warning: "bg-amber-500 dark:bg-amber-400",
  draft: "bg-slate-400 dark:bg-slate-500",
  sent: "bg-blue-500 dark:bg-blue-400",
  default: "bg-slate-400 dark:bg-slate-500",
};

const PULSE_VARIANTS: Set<BadgeVariant> = new Set(["active", "healthy"]);

export function AdminStatusBadge({ variant, children, dot = false }: AdminStatusBadgeProps): import("react").JSX.Element {
  const shouldPulse = dot && PULSE_VARIANTS.has(variant);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANT_STYLES[variant]}`}
    >
      {dot ? (
        <span className="relative flex h-2 w-2">
          {shouldPulse ? (
            <span
              className={`absolute inset-0 animate-ping rounded-full opacity-40 ${DOT_STYLES[variant]}`}
            />
          ) : null}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${DOT_STYLES[variant]}`}
          />
        </span>
      ) : null}
      {children}
    </span>
  );
}
