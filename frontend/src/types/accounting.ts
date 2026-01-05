export interface AccountingKPIs {
  revenue_today: number;
  revenue_month: number;
  expenses_month: number;
  cash_balance: number;
  unpaid_invoices: number;
  low_stock_items: number;
}

export interface ChartOfAccount {
  id: number;
  code: string;
  name_ar: string;
  type: string;
}

export interface JournalLineInput {
  account: number;
  description?: string;
  debit?: number;
  credit?: number;
  currency?: string;
}

export interface JournalEntryInput {
  period?: number | null;
  date: string;
  reference?: string;
  memo?: string;
  lines: JournalLineInput[];
}

export interface AccountingInvoice {
  id: number;
  invoice: number;
  order?: number | null;
  customer?: number | null;
  issue_date: string;
  due_date?: string | null;
  status: string;
  currency: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  paid_amount: number;
  balance_due: number;
}

export interface ExpenseRecord {
  id: number;
  title: string;
  category: string;
  amount: number;
  tax_rate: number;
  total_amount: number;
  expense_date: string;
  status: string;
  supplier?: number | null;
}

export interface Supplier {
  id: number;
  name_ar: string;
  phone?: string;
  email?: string;
  payment_terms?: string;
}

export interface BankAccount {
  id: number;
  name: string;
  type: string;
  currency: string;
  current_balance: number;
}

export interface PaymentRecord {
  id: number;
  direction: string;
  method: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string;
  reference?: string;
}

export interface InventoryItem {
  id: number;
  sku: string;
  name_ar: string;
  quantity_on_hand: number;
  reorder_level: number;
  below_reorder?: boolean;
}

export interface InventoryTransactionInput {
  item: number;
  transaction_type: "in" | "out" | "adjustment" | "transfer";
  quantity: number;
  unit_cost?: number;
  note?: string;
}

export interface FinancialReport {
  id: number;
  name: string;
  report_type: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  payload: Record<string, unknown>;
}
