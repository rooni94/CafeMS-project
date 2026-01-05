import React from "react";
import CashFlowStatement from "../../components/accounting/CashFlowStatement";
import CustomerLedger from "../../components/accounting/CustomerLedger";

const AccountingCashflowPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <CashFlowStatement />
      <CustomerLedger />
    </div>
  );
};

export default AccountingCashflowPage;
