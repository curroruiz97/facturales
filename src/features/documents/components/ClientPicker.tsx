import { useEffect, useState } from "react";
import { clientsRepository } from "../../../services/repositories";

export interface ClientPickerOption {
  id: string;
  nombreRazonSocial: string;
  identificador: string;
  email: string | null;
  direccion: string | null;
  codigoPostal: string | null;
}

interface ClientPickerProps {
  value: string | null;
  onSelect: (client: ClientPickerOption | null) => void;
  disabled?: boolean;
}

export function ClientPicker({ value, onSelect, disabled = false }: ClientPickerProps): import("react").JSX.Element {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ClientPickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (disabled) return;

    const handle = window.setTimeout(async () => {
      setLoading(true);
      const result = await clientsRepository.list(query);
      if (!result.success) {
        setOptions([]);
        setError(result.error.message);
        setLoading(false);
        return;
      }

      const nextOptions = result.data.slice(0, 10).map((client) => ({
        id: client.id,
        nombreRazonSocial: client.nombreRazonSocial,
        identificador: client.identificador,
        email: client.email,
        direccion: client.direccion,
        codigoPostal: client.codigoPostal,
      }));

      setOptions(nextOptions);
      setError(null);
      setLoading(false);
    }, 260);

    return () => window.clearTimeout(handle);
  }, [disabled, query]);

  const selected = value ? options.find((option) => option.id === value) : null;

  return (
    <div className="pilot-field">
      <label htmlFor="document-client-picker">Buscar cliente existente</label>
      <input
        id="document-client-picker"
        className="pilot-input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre o NIF/CIF"
        disabled={disabled}
      />
      {loading ? <span className="text-xs opacity-70">Buscando clientes...</span> : null}
      {error ? <span className="pilot-error-text">{error}</span> : null}
      {selected ? (
        <span className="text-xs opacity-70">
          Seleccion actual: {selected.nombreRazonSocial} ({selected.identificador})
        </span>
      ) : null}
      {options.length > 0 ? (
        <div className="pilot-grid gap-2 rounded-lg border border-bgray-200 p-2 dark:border-darkblack-500">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`pilot-btn ${value === option.id ? "pilot-btn--primary" : ""}`}
              onClick={() => onSelect(option)}
              disabled={disabled}
            >
              {option.nombreRazonSocial} ({option.identificador})
            </button>
          ))}
          <button type="button" className="pilot-btn" onClick={() => onSelect(null)} disabled={disabled}>
            Limpiar seleccion
          </button>
        </div>
      ) : null}
    </div>
  );
}
