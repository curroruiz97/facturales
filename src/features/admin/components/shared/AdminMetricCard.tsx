import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AdminMetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
}

export function AdminMetricCard({ label, value, subtitle, icon: Icon, trend }: AdminMetricCardProps): import("react").JSX.Element {
  const isPositive = trend ? trend.value >= 0 : true;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800 dark:hover:shadow-slate-900/40">
      {/* Left accent gradient bar */}
      <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 opacity-80 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex items-start justify-between p-5 pl-5">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[13px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>

          {subtitle ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
          ) : null}

          {trend ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span
                className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                  isPositive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {isPositive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {trend.label}
              </span>
            </div>
          ) : null}
        </div>

        {/* Icon container with gradient background */}
        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/80 p-3 shadow-sm ring-1 ring-orange-100 transition-transform duration-300 group-hover:scale-105 dark:from-orange-500/15 dark:to-orange-600/10 dark:ring-orange-500/20">
          <Icon className="h-6 w-6 text-orange-500 dark:text-orange-400" />
        </div>
      </div>
    </div>
  );
}
