import React from "react";
import AccountingOverview from "../../components/accounting/dashboard/AccountingOverview";
import FinancialWidgets from "../../components/accounting/dashboard/FinancialWidgets";
import CustomerLedger from "../../components/accounting/CustomerLedger";
import InventoryManager from "../../components/accounting/InventoryManager";

const AccountingHomePage: React.FC = () => {
  return (
    <div className="space-y-4">
      <AccountingOverview />
      <FinancialWidgets />
      <CustomerLedger />
      <InventoryManager />
    </div>
  );
};

export default AccountingHomePage;
