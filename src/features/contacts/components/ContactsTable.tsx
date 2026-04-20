import type { ClientFinancialSnapshot } from "../adapters/contacts.adapter";

interface ContactsTableProps {
  contacts: ClientFinancialSnapshot[];
  selectedIds: Set<string>;
  onToggleSelection: (contactId: string, checked: boolean) => void;
  onTogglePageSelection: (checked: boolean) => void;
  onToggleRecurring: (contactId: string, currentStatus: "activo" | "inactivo" | "recurrente" | "puntual") => void;
  onEdit: (contact: ClientFinancialSnapshot) => void;
  onDelete: (contact: ClientFinancialSnapshot) => void;
}

function formatEUR(value: number): string {
  return `${new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} EUR`;
}

function getInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("") || "?";
}

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

export function ContactsTable(props: ContactsTableProps): import("react").JSX.Element {
  const { contacts, selectedIds, onToggleSelection, onTogglePageSelection, onToggleRecurring, onEdit, onDelete } = props;
  const allChecked = contacts.length > 0 && contacts.every((contact) => selectedIds.has(contact.id));

  return (
    <div className="overflow-auto">
      <table className="pilot-table ct-table">
        <thead>
          <tr>
            <th className="w-10">
              <input type="checkbox" checked={allChecked} onChange={(event) => onTogglePageSelection(event.target.checked)} />
            </th>
            <th>Contacto</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>Contacto</th>
            <th>Facturado / gastos</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => {
            const selected = selectedIds.has(contact.id);
            const isRecurring = contact.estado === "recurrente";

            return (
              <tr key={contact.id}>
                <td>
                  <input type="checkbox" checked={selected} onChange={(event) => onToggleSelection(contact.id, event.target.checked)} />
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700">
                      {getInitials(contact.nombreRazonSocial)}
                    </div>
                    <div>
                      <p className="font-semibold">{contact.nombreRazonSocial}</p>
                      <p className="text-xs opacity-70">{contact.identificador}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`pilot-status ${contact.tipoCliente === "empresa" ? "pilot-status--ok" : "pilot-status--warn"}`}>
                    {contact.tipoCliente === "empresa" ? "Empresa" : "Autónomo"}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="ct-toggle-status"
                    onClick={() => onToggleRecurring(contact.id, contact.estado)}
                    title={isRecurring ? "Cambiar a Puntual" : "Cambiar a Recurrente"}
                  >
                    <span className={`ct-toggle-status__track ${isRecurring ? "ct-toggle-status__track--on" : ""}`}>
                      <span className="ct-toggle-status__thumb" />
                    </span>
                    <span className={`ct-toggle-status__label ${isRecurring ? "ct-toggle-status__label--on" : ""}`}>
                      {isRecurring ? "Recurrente" : "Puntual"}
                    </span>
                  </button>
                </td>
                <td>
                  <p className="text-sm">{contact.email || "-"}</p>
                  <p className="text-xs opacity-70">{contact.telefono || "-"}</p>
                  <p className="text-xs opacity-70">
                    {[contact.direccion, contact.codigoPostal, contact.ciudad, contact.provincia, contact.pais].filter(Boolean).join(", ") || "-"}
                  </p>
                </td>
                <td>
                  <p className="pilot-text-ok">{formatEUR(contact.totalFacturado)}</p>
                  <p className="pilot-text-danger">{formatEUR(contact.totalGastos)}</p>
                  <p className="text-xs opacity-75">Balance: {formatEUR(contact.balance)}</p>
                </td>
                <td>
                  <div className="tx-actions-cell">
                    <button type="button" className="tx-action-icon tx-action-icon--edit" onClick={() => onEdit(contact)} title="Editar">
                      <IconEdit />
                    </button>
                    <button type="button" className="tx-action-icon tx-action-icon--delete" onClick={() => onDelete(contact)} title="Eliminar">
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
