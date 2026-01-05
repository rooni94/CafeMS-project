import React, { useEffect, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import AccountingHomePage from "./AccountingHomePage";
import AccountingJournalPage from "./AccountingJournalPage";
import AccountingInvoicesPage from "./AccountingInvoicesPage";
import AccountingExpensesPage from "./AccountingExpensesPage";
import AccountingInventoryPage from "./AccountingInventoryPage";
import AccountingPaymentsPage from "./AccountingPaymentsPage";
import AccountingSuppliersPage from "./AccountingSuppliersPage";
import AccountingReportsPage from "./AccountingReportsPage";
import AccountingCashflowPage from "./AccountingCashflowPage";

const navClass = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-sm ${
    active ? "bg-amber-100 text-amber-700" : "text-gray-700 hover:bg-gray-50"
  }`;

const AccountingLayout: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    api
      .get("auth/my-permissions/")
      .then((res) => {
        const p = res.data?.permissions || {};
        const ok =
          res.data?.is_superuser ||
          !!p.can_view_accounting ||
          !!p.can_manage_accounting ||
          !!p.can_manage_financial_reports;
        if (mounted) {
          setAllowed(ok);
          setLoading(false);
          if (!ok) navigate("/login");
        }
      })
      .catch(() => {
        if (mounted) {
          setAllowed(false);
          setLoading(false);
          navigate("/login");
        }
      });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-600">
        جاري التحقق من صلاحيات المحاسبة...
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div className="w-full flex justify-center">
        <div className="w-full max-w-6xl bg-white rounded-xl shadow p-3 flex flex-wrap items-center justify-center gap-2">
          <NavLink to="/accounting" end className={({ isActive }) => navClass(isActive)}>
            نظرة عامة
          </NavLink>
          <NavLink
            to="/accounting/journal"
            className={({ isActive }) => navClass(isActive)}
          >
            القيود
          </NavLink>
          <NavLink
            to="/accounting/invoices"
            className={({ isActive }) => navClass(isActive)}
          >
            الفواتير
          </NavLink>
          <NavLink
            to="/accounting/expenses"
            className={({ isActive }) => navClass(isActive)}
          >
            المصروفات
          </NavLink>
          <NavLink
            to="/accounting/inventory"
            className={({ isActive }) => navClass(isActive)}
          >
            المخزون
          </NavLink>
          <NavLink
            to="/accounting/payments"
            className={({ isActive }) => navClass(isActive)}
          >
            المدفوعات
          </NavLink>
          <NavLink
            to="/accounting/suppliers"
            className={({ isActive }) => navClass(isActive)}
          >
            الموردون
          </NavLink>
          <NavLink
            to="/accounting/reports"
            className={({ isActive }) => navClass(isActive)}
          >
            التقارير
          </NavLink>
          <NavLink
            to="/accounting/cashflow"
            className={({ isActive }) => navClass(isActive)}
          >
            التدفقات النقدية
          </NavLink>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<AccountingHomePage />} />
        <Route path="journal" element={<AccountingJournalPage />} />
        <Route path="invoices" element={<AccountingInvoicesPage />} />
        <Route path="expenses" element={<AccountingExpensesPage />} />
        <Route path="inventory" element={<AccountingInventoryPage />} />
        <Route path="payments" element={<AccountingPaymentsPage />} />
        <Route path="suppliers" element={<AccountingSuppliersPage />} />
        <Route path="reports" element={<AccountingReportsPage />} />
        <Route path="cashflow" element={<AccountingCashflowPage />} />
      </Routes>
    </div>
  );
};

export default AccountingLayout;
