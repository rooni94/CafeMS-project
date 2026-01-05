import React from "react";
import JournalEntryForm from "../../components/accounting/JournalEntryForm";

const AccountingJournalPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <JournalEntryForm />
    </div>
  );
};

export default AccountingJournalPage;
