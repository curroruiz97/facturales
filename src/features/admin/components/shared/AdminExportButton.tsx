import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileJson, ChevronDown } from "lucide-react";

interface AdminExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
}

export function AdminExportButton({ data, filename }: AdminExportButtonProps): import("react").JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const downloadFile = (content: string, name: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [
      keys.join(","),
      ...data.map((row) =>
        keys.map((k) => JSON.stringify(row[k] ?? "")).join(","),
      ),
    ].join("\n");
    downloadFile(csv, `${filename}.csv`, "text/csv");
    setOpen(false);
  };

  const exportJSON = () => {
    downloadFile(
      JSON.stringify(data, null, 2),
      `${filename}.json`,
      "application/json",
    );
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all duration-150 hover:bg-slate-50 hover:shadow active:scale-[0.98] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <Download className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        Exportar
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      <div
        className={`absolute right-0 top-full z-20 mt-1.5 w-48 origin-top-right rounded-xl border border-slate-200 bg-white p-1 shadow-xl transition-all duration-200 dark:border-slate-700 dark:bg-slate-800 ${
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={exportCSV}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 transition-colors duration-100 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
          <div>
            <p className="font-medium">Exportar CSV</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Hoja de calculo
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={exportJSON}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 transition-colors duration-100 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60"
        >
          <FileJson className="h-4 w-4 text-orange-500" />
          <div>
            <p className="font-medium">Exportar JSON</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Datos estructurados
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
