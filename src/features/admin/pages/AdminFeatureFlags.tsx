import { useEffect, useState } from "react";
import { Flag, Plus, Trash2, Edit, ToggleLeft, ToggleRight, Percent, Tag, X } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmDialog } from "../components/shared/AdminConfirmDialog";
import { AdminFeatureFlagsService } from "../services/AdminFeatureFlagsService";
import type { AdminFeatureFlag } from "../types";

export function AdminFeatureFlags(): import("react").JSX.Element {
  const [flags, setFlags] = useState<AdminFeatureFlag[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editFlag, setEditFlag] = useState<{ key: string; name: string; description: string; enabled: boolean; rollout_percentage: number } | null>(null);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  const load = async () => {
    const r = await AdminFeatureFlagsService.getFeatureFlags();
    setFlags(r);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const handleSave = async () => {
    if (!editFlag) return;
    const ok = await AdminFeatureFlagsService.upsertFeatureFlag(
      editFlag.key, editFlag.name, editFlag.description,
      editFlag.enabled, editFlag.rollout_percentage,
    );
    if (ok) { setEditFlag(null); void load(); }
  };

  const handleDelete = async () => {
    if (!deleteKey) return;
    const ok = await AdminFeatureFlagsService.deleteFeatureFlag(deleteKey);
    if (ok) { setDeleteKey(null); void load(); }
  };

  const openNew = () => setEditFlag({ key: "", name: "", description: "", enabled: false, rollout_percentage: 0 });

  const enabledCount = (flags ?? []).filter((f) => f.enabled).length;
  const totalCount = (flags ?? []).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
              <Flag className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Feature Flags</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {enabledCount}/{totalCount} activos
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Controla funcionalidades de la plataforma</p>
            </div>
          </div>
          <button type="button" onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all duration-200 hover:from-orange-600 hover:to-orange-700 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Nuevo flag
          </button>
        </div>

        {/* Flags list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {(flags ?? []).map((flag) => (
              <div key={flag.id} className={`group overflow-hidden rounded-xl border transition-all duration-200 ${
                flag.enabled
                  ? "border-emerald-200/80 bg-white shadow-sm dark:border-emerald-800/30 dark:bg-slate-800"
                  : "border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800"
              }`}>
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    {/* Toggle visual */}
                    <button
                      type="button"
                      onClick={async () => {
                        await AdminFeatureFlagsService.upsertFeatureFlag(
                          flag.key, flag.name, flag.description ?? "",
                          !flag.enabled, flag.rollout_percentage,
                        );
                        void load();
                      }}
                      className="mt-0.5 flex-shrink-0 transition-transform duration-200 hover:scale-110"
                      title={flag.enabled ? "Desactivar" : "Activar"}
                    >
                      {flag.enabled ? (
                        <ToggleRight className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <p className="font-semibold text-slate-900 dark:text-white">{flag.name}</p>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          flag.enabled
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
                            : "bg-slate-100 text-slate-500 ring-1 ring-slate-300/40 dark:bg-slate-700 dark:text-slate-400 dark:ring-slate-600/30"
                        }`}>
                          {flag.enabled ? "ON" : "OFF"}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Tag className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{flag.key}</span>
                      </div>
                      {flag.description ? (
                        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{flag.description}</p>
                      ) : null}
                      {/* Rollout percentage bar */}
                      <div className="mt-3 flex items-center gap-3">
                        <Percent className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                        <div className="h-2 flex-1 max-w-xs overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              flag.enabled
                                ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                : "bg-slate-300 dark:bg-slate-600"
                            }`}
                            style={{ width: `${flag.rollout_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                          {flag.rollout_percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button type="button" onClick={() => setEditFlag({
                      key: flag.key, name: flag.name, description: flag.description ?? "",
                      enabled: flag.enabled, rollout_percentage: flag.rollout_percentage,
                    })}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                      title="Editar">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setDeleteKey(flag.key)}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {(flags ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 dark:border-slate-600 dark:bg-slate-800/50">
                <Flag className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No hay feature flags configurados</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Crea el primero con el boton de arriba</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Edit/Create modal */}
      {editFlag !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setEditFlag(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-500/10">
                  <Flag className="h-4.5 w-4.5 text-orange-500 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {editFlag.key ? "Editar flag" : "Nuevo flag"}
                </h3>
              </div>
              <button type="button" onClick={() => setEditFlag(null)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Modal body */}
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Key</label>
                <input type="text" placeholder="ej: new_feature" value={editFlag.key}
                  onChange={(e) => setEditFlag({ ...editFlag, key: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:border-orange-500 dark:focus:ring-orange-500/20"
                  disabled={flags?.some((f) => f.key === editFlag.key)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nombre</label>
                <input type="text" placeholder="Nombre descriptivo" value={editFlag.name}
                  onChange={(e) => setEditFlag({ ...editFlag, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:border-orange-500 dark:focus:ring-orange-500/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Descripcion</label>
                <textarea placeholder="Describe la funcionalidad..." value={editFlag.description}
                  onChange={(e) => setEditFlag({ ...editFlag, description: e.target.value })}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:border-orange-500 dark:focus:ring-orange-500/20" />
              </div>
              {/* Toggle enabled */}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-700/50">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Estado</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{editFlag.enabled ? "El flag esta activo" : "El flag esta desactivado"}</p>
                </div>
                <button type="button" onClick={() => setEditFlag({ ...editFlag, enabled: !editFlag.enabled })}>
                  {editFlag.enabled ? (
                    <ToggleRight className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  )}
                </button>
              </div>
              {/* Rollout slider */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rollout</label>
                  <span className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">{editFlag.rollout_percentage}%</span>
                </div>
                <input type="range" min={0} max={100} value={editFlag.rollout_percentage}
                  onChange={(e) => setEditFlag({ ...editFlag, rollout_percentage: Number(e.target.value) })}
                  className="w-full cursor-pointer accent-orange-500" />
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-200"
                    style={{ width: `${editFlag.rollout_percentage}%` }}
                  />
                </div>
              </div>
            </div>
            {/* Modal footer */}
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
              <button type="button" onClick={() => setEditFlag(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
                Cancelar
              </button>
              <button type="button" onClick={() => void handleSave()}
                className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all duration-200 hover:from-orange-600 hover:to-orange-700 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.98]">
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AdminConfirmDialog
        open={deleteKey !== null}
        onClose={() => setDeleteKey(null)}
        onConfirm={handleDelete}
        title="Eliminar feature flag"
        description={`Se eliminara el flag "${deleteKey}". Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        requireConfirmation={deleteKey ?? ""}
      />
    </AdminLayout>
  );
}
