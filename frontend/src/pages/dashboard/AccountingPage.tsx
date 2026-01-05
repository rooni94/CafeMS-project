import React from "react";
import AccountingOverview from "../../components/accounting/dashboard/AccountingOverview";
import FinancialWidgets from "../../components/accounting/dashboard/FinancialWidgets";
import CustomerLedger from "../../components/accounting/CustomerLedger";

const AccountingPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <AccountingOverview />
      <FinancialWidgets />
      <CustomerLedger />
    </div>
  );
};

export default AccountingPage;
