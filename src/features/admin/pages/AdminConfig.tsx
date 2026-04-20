import { useEffect, useState } from "react";
import { Settings, Save, Check, Folder, Clock, Code } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfigService } from "../services/AdminConfigService";
import type { AdminConfigEntry } from "../types";

export function AdminConfig(): import("react").JSX.Element {
  const [entries, setEntries] = useState<AdminConfigEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    void AdminConfigService.getConfig().then((r) => {
      setEntries(r);
      if (r) {
        const values: Record<string, string> = {};
        for (const entry of r) { values[entry.key] = JSON.stringify(entry.value); }
        setEditValues(values);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const parsed = JSON.parse(editValues[key]);
      await AdminConfigService.updateConfig(key, parsed);
    } catch {
      await AdminConfigService.updateConfig(key, editValues[key]);
    }
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

  const categories = [...new Set((entries ?? []).map((e) => e.category))];

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page header */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Configuracion</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Parametros del sistema &middot; {entries?.length ?? 0} entradas en {categories.length} categorias
            </p>
          </div>
        </div>

        {/* Category sections */}
        {categories.map((cat) => (
          <div key={cat} className="space-y-3">
            {/* Category header */}
            <div className="flex items-center gap-2.5 pb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700">
                <Folder className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{cat}</h3>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                {(entries ?? []).filter((e) => e.category === cat).length} parametros
              </span>
            </div>

            {/* Config entries */}
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800">
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {(entries ?? []).filter((e) => e.category === cat).map((entry) => (
                  <div key={entry.key} className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                      {/* Key info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Code className="h-3.5 w-3.5 flex-shrink-0 text-orange-500 dark:text-orange-400" />
                          <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{entry.key}</p>
                        </div>
                        {entry.description ? (
                          <p className="pl-5.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{entry.description}</p>
                        ) : null}
                        <div className="flex items-center gap-1.5 pl-5.5">
                          <Clock className="h-3 w-3 text-slate-300 dark:text-slate-600" />
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            Actualizado {new Date(entry.updated_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      {/* Value input + save */}
                      <div className="flex items-center gap-2.5 sm:flex-shrink-0">
                        <input
                          type="text"
                          value={editValues[entry.key] ?? ""}
                          onChange={(e) => setEditValues({ ...editValues, [entry.key]: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 shadow-sm transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-orange-500 dark:focus:ring-orange-500/20 sm:w-48"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSave(entry.key)}
                          disabled={saving === entry.key}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-200 ${
                            saved === entry.key
                              ? "bg-emerald-500 text-white shadow-emerald-500/25"
                              : "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/25 hover:from-orange-600 hover:to-orange-700 hover:shadow-md hover:shadow-orange-500/30 active:scale-[0.98] disabled:opacity-50"
                          }`}
                        >
                          {saved === entry.key ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Listo
                            </>
                          ) : saving === entry.key ? (
                            <>
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Guardando
                            </>
                          ) : (
                            <>
                              <Save className="h-3.5 w-3.5" />
                              Guardar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
