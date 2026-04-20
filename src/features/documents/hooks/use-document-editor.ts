import { useMemo, useState } from "react";
import { calculateDocumentTotals } from "../core/document-calculations";
import type {
  DocumentEditorState,
  DocumentExpenseDraft,
  DocumentLineDraft,
  DocumentPaymentMethodDraft,
} from "../core/document-types";

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface UseDocumentEditorResult {
  editor: DocumentEditorState;
  setEditor: (next: DocumentEditorState) => void;
  totals: ReturnType<typeof calculateDocumentTotals>;
  setIssuerField: (field: keyof DocumentEditorState["issuer"], value: string) => void;
  setClientField: (field: keyof DocumentEditorState["client"], value: string | null) => void;
  setMetaField: (field: keyof DocumentEditorState["meta"], value: string) => void;
  setTaxField: (field: keyof DocumentEditorState["taxSettings"], value: string | number | boolean) => void;
  setObservations: (value: string) => void;
  setPaidAmount: (value: number) => void;
  addLine: () => void;
  updateLine: (lineId: string, patch: Partial<DocumentLineDraft>) => void;
  removeLine: (lineId: string) => void;
  addExpense: () => void;
  updateExpense: (expenseId: string, patch: Partial<DocumentExpenseDraft>) => void;
  removeExpense: (expenseId: string) => void;
  addPaymentMethod: (initial?: Partial<DocumentPaymentMethodDraft>) => void;
  updatePaymentMethod: (methodId: string, patch: Partial<DocumentPaymentMethodDraft>) => void;
  removePaymentMethod: (methodId: string) => void;
  reset: (next: DocumentEditorState) => void;
}

export function useDocumentEditor(initialState: DocumentEditorState): UseDocumentEditorResult {
  const [editor, setEditorState] = useState<DocumentEditorState>(initialState);

  const totals = useMemo(() => calculateDocumentTotals(editor), [editor]);

  const setEditor = (next: DocumentEditorState) => {
    setEditorState(next);
  };

  const setIssuerField = (field: keyof DocumentEditorState["issuer"], value: string) => {
    setEditorState((prev) => ({
      ...prev,
      issuer: {
        ...prev.issuer,
        [field]: value,
      },
    }));
  };

  const setClientField = (field: keyof DocumentEditorState["client"], value: string | null) => {
    setEditorState((prev) => ({
      ...prev,
      client: {
        ...prev.client,
        [field]: value,
      },
    }));
  };

  const setMetaField = (field: keyof DocumentEditorState["meta"], value: string) => {
    setEditorState((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        [field]: value,
      },
    }));
  };

  const setTaxField = (field: keyof DocumentEditorState["taxSettings"], value: string | number | boolean) => {
    setEditorState((prev) => ({
      ...prev,
      taxSettings: {
        ...prev.taxSettings,
        [field]: value,
      },
    }));
  };

  const setObservations = (value: string) => {
    setEditorState((prev) => ({ ...prev, observations: value }));
  };

  const setPaidAmount = (value: number) => {
    setEditorState((prev) => ({ ...prev, paidAmount: Number.isFinite(value) ? value : 0 }));
  };

  const addLine = () => {
    setEditorState((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          id: createId("line"),
          description: "",
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          taxCode: "IVA_21",
        },
      ],
    }));
  };

  const updateLine = (lineId: string, patch: Partial<DocumentLineDraft>) => {
    setEditorState((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    }));
  };

  const removeLine = (lineId: string) => {
    setEditorState((prev) => {
      const remaining = prev.lines.filter((line) => line.id !== lineId);
      return {
        ...prev,
        lines:
          remaining.length > 0
            ? remaining
            : [
                {
                  id: createId("line"),
                  description: "",
                  quantity: 1,
                  unitPrice: 0,
                  discount: 0,
                  taxCode: "IVA_21",
                },
              ],
      };
    });
  };

  const addExpense = () => {
    setEditorState((prev) => ({
      ...prev,
      expenses: [
        ...prev.expenses,
        {
          id: createId("expense"),
          description: "Gasto suplido",
          amount: 0,
        },
      ],
    }));
  };

  const updateExpense = (expenseId: string, patch: Partial<DocumentExpenseDraft>) => {
    setEditorState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((expense) => (expense.id === expenseId ? { ...expense, ...patch } : expense)),
    }));
  };

  const removeExpense = (expenseId: string) => {
    setEditorState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((expense) => expense.id !== expenseId),
    }));
  };

  const addPaymentMethod = (initial?: Partial<DocumentPaymentMethodDraft>) => {
    setEditorState((prev) => ({
      ...prev,
      paymentMethods: [
        ...prev.paymentMethods,
        {
          id: createId("pm"),
          type: "transferencia",
          iban: "",
          phone: "",
          label: "",
          ...initial,
        },
      ],
    }));
  };

  const updatePaymentMethod = (methodId: string, patch: Partial<DocumentPaymentMethodDraft>) => {
    setEditorState((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((method) => (method.id === methodId ? { ...method, ...patch } : method)),
    }));
  };

  const removePaymentMethod = (methodId: string) => {
    setEditorState((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter((method) => method.id !== methodId),
    }));
  };

  const reset = (next: DocumentEditorState) => {
    setEditorState(next);
  };

  return {
    editor,
    setEditor,
    totals,
    setIssuerField,
    setClientField,
    setMetaField,
    setTaxField,
    setObservations,
    setPaidAmount,
    addLine,
    updateLine,
    removeLine,
    addExpense,
    updateExpense,
    removeExpense,
    addPaymentMethod,
    updatePaymentMethod,
    removePaymentMethod,
    reset,
  };
}
