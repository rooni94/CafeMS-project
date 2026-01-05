import { api } from "./api";
import {
  AccountingKPIs,
  AccountingInvoice,
  BankAccount,
  ExpenseRecord,
  FinancialReport,
  InventoryItem,
  JournalEntryInput,
  PaymentRecord,
  Supplier,
} from "../types/accounting";

export const accountingApi = {
  fetchDashboard: async (): Promise<AccountingKPIs> => {
    const res = await api.get("accounting/dashboard-stats/");
    return res.data;
  },
  fetchCashflow: async (params?: { start_date?: string; end_date?: string }) => {
    const res = await api.get("accounting/cashflow/preview/", { params });
    return res.data as { incoming: number; outgoing: number; net: number };
  },
  listInvoices: async () => {
    const res = await api.get<AccountingInvoice[]>("accounting/invoices/");
    return res.data;
  },
  listExpenses: async () => {
    const res = await api.get<ExpenseRecord[]>("accounting/expenses/");
    return res.data;
  },
  createExpense: async (payload: Partial<ExpenseRecord>) => {
    const res = await api.post("accounting/expenses/", payload);
    return res.data;
  },
  createJournalEntry: async (payload: JournalEntryInput) => {
    const res = await api.post("accounting/journal-entries/", payload);
    return res.data;
  },
  listSuppliers: async () => {
    const res = await api.get<Supplier[]>("accounting/suppliers/");
    return res.data;
  },
  createSupplier: async (payload: Partial<Supplier>) => {
    const res = await api.post("accounting/suppliers/", payload);
    return res.data;
  },
  listPayments: async () => {
    const res = await api.get<PaymentRecord[]>("accounting/payments/");
    return res.data;
  },
  listBankAccounts: async () => {
    const res = await api.get<BankAccount[]>("accounting/bank-accounts/");
    return res.data;
  },
  listInventory: async () => {
    const res = await api.get<InventoryItem[]>("accounting/inventory/items/");
    return res.data;
  },
  createInventoryTransaction: async (payload: Record<string, unknown>) => {
    const res = await api.post("accounting/inventory/transactions/", payload);
    return res.data;
  },
  listReports: async () => {
    const res = await api.get<FinancialReport[]>("accounting/reports/");
    return res.data;
  },
  runReport: async (payload: { report_type: string; period_start?: string; period_end?: string }) => {
    const res = await api.post<FinancialReport>("accounting/reports/run/", payload);
    return res.data;
  },
  exportReport: async (payload: { report_type: string; format: "pdf" | "excel" | "csv" }) => {
    const res = await api.post("accounting/reports/export/", payload);
    return res.data as { status: string; export_url: string };
  },
  receiptOcr: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("accounting/ocr/receipt/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data as { text: string; amount?: number | null; currency?: string };
  },
};
