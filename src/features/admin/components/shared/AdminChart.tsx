import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AdminChartProps {
  title: string;
  icon: LucideIcon;
  data: Record<string, unknown>[];
  type: "area" | "bar" | "line";
  dataKey: string;
  xKey: string;
  color?: string;
}

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps): import("react").JSX.Element | null {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm dark:border-slate-600 dark:bg-slate-800/95">
      <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {typeof entry.value === "number"
              ? entry.value.toLocaleString()
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AdminChart({
  title,
  icon: Icon,
  data,
  type,
  dataKey,
  xKey,
  color = "#f97316",
}: AdminChartProps): import("react").JSX.Element {
  const isDark = useIsDark();

  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const axisColor = isDark ? "#64748b" : "#94a3b8";
  const gradientId = `chart-gradient-${dataKey}`;

  const commonMargin = { top: 8, right: 8, left: -16, bottom: 0 };

  const renderChart = () => {
    if (type === "area") {
      return (
        <AreaChart data={data} margin={commonMargin}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="50%" stopColor={color} stopOpacity={0.08} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridColor}
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: axisColor }}
            stroke={gridColor}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: axisColor }}
            stroke={gridColor}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={`url(#${gradientId})`}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: isDark ? "#1e293b" : "#ffffff",
              fill: color,
            }}
          />
        </AreaChart>
      );
    }

    if (type === "bar") {
      return (
        <BarChart data={data} margin={commonMargin}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={color} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridColor}
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: axisColor }}
            stroke={gridColor}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: axisColor }}
            stroke={gridColor}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: isDark ? "rgba(51,65,85,0.3)" : "rgba(241,245,249,0.8)" }} />
          <Bar
            dataKey={dataKey}
            fill={`url(#${gradientId})`}
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      );
    }

    return (
      <LineChart data={data} margin={commonMargin}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={gridColor}
          vertical={false}
        />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: axisColor }}
          stroke={gridColor}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: axisColor }}
          stroke={gridColor}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3, fill: color, strokeWidth: 2, stroke: isDark ? "#1e293b" : "#ffffff" }}
          activeDot={{
            r: 6,
            strokeWidth: 2,
            stroke: isDark ? "#1e293b" : "#ffffff",
            fill: color,
          }}
        />
      </LineChart>
    );
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800">
      {/* Chart header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 ring-1 ring-orange-100 dark:from-orange-500/15 dark:to-orange-600/10 dark:ring-orange-500/20">
          <Icon className="h-4 w-4 text-orange-500 dark:text-orange-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h3>
      </div>

      {/* Chart body */}
      <div className="h-64 px-3 pb-3 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
