from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.accounting.models import AccountingPeriod, ChartOfAccount, JournalEntry, JournalEntryLine


class JournalEntryTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="tester", password="pass12345", role="manager")
        self.period = AccountingPeriod.objects.create(
            name_ar="فترة اختبار",
            start_date="2025-01-01",
            end_date="2025-12-31",
            status="open",
            is_default=True,
        )
        self.cash = ChartOfAccount.objects.create(code="1000", name_ar="نقدية", type="asset")
        self.sales = ChartOfAccount.objects.create(code="4000", name_ar="مبيعات", type="revenue")

    def test_journal_entry_balances(self):
        entry = JournalEntry.objects.create(period=self.period, created_by=self.user, reference="TST-1")
        JournalEntryLine.objects.create(entry=entry, account=self.cash, debit=Decimal("100.00"))
        JournalEntryLine.objects.create(entry=entry, account=self.sales, credit=Decimal("100.00"))
        entry.refresh_from_db()
        self.assertEqual(entry.total_debit, Decimal("100.00"))
        self.assertEqual(entry.total_credit, Decimal("100.00"))
        self.assertTrue(entry.is_balanced)

    def test_journal_entry_detects_unbalanced(self):
        entry = JournalEntry.objects.create(period=self.period, created_by=self.user, reference="TST-2")
        JournalEntryLine.objects.create(entry=entry, account=self.cash, debit=Decimal("80.00"))
        JournalEntryLine.objects.create(entry=entry, account=self.sales, credit=Decimal("20.00"))
        entry.refresh_from_db()
        self.assertNotEqual(entry.total_debit, entry.total_credit)
        self.assertFalse(entry.is_balanced)
