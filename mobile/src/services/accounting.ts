import { api } from "./api";

export const accountingApi = {
  dashboard: async () => {
    const res = await api.get("accounting/dashboard-stats/");
    return res.data;
  },
  inventorySummary: async () => {
    const res = await api.get("accounting/inventory/");
    return res.data;
  },
  listInventory: async () => {
    const res = await api.get("accounting/inventory/items/");
    return res.data;
  },
  quickInvoice: async (payload: any) => {
    const res = await api.post("accounting/invoices/", payload);
    return res.data;
  },
  recordExpense: async (payload: any) => {
    const res = await api.post("accounting/expenses/", payload);
    return res.data;
  },
  recordPayment: async (payload: any) => {
    const res = await api.post("accounting/payments/", payload);
    return res.data;
  },
  cashflow: async () => {
    const res = await api.get("accounting/cashflow/preview/");
    return res.data;
  },
  receiptOcr: async (file: any) => {
    const formData = new FormData();
    formData.append("file", file as any);
    const res = await api.post("accounting/ocr/receipt/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};
