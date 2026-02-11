// src/App.tsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import OrderTracking from "./pages/OrderTracking";
import ProductDetails from "./pages/ProductDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import Profile from "./pages/Profile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import AboutFull from "./pages/AboutFull";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Contact from "./pages/Contact";
import VerifyEmail from "./pages/VerifyEmail";
import SupportChatWidget from "./components/support/SupportChatWidget";
import HRRouteGuard from "./components/hr/HRRouteGuard";
import HRDashboardPage from "./pages/hr/HRDashboardPage";
import EmployeesPage from "./pages/hr/EmployeesPage";
import AttendancePage from "./pages/hr/AttendancePage";
import LeaveRequestsPage from "./pages/hr/LeaveRequestsPage";
import PayrollPage from "./pages/hr/PayrollPage";
import VisaPage from "./pages/hr/VisaPage";
import DocumentsPage from "./pages/hr/DocumentsPage";
import HRReportsPage from "./pages/hr/HRReportsPage";
import HRLayout from "./components/hr/HRLayout";
import HRWorkReportsPage from "./pages/hr/HRWorkReportsPage";
import HRAlertsDashboard from "./pages/hr/HRAlertsDashboard";
import HRPerformancePage from "./pages/hr/HRPerformancePage";
import { useStoreSettings } from "./context/StoreSettingsContext";
import AccountingLayout from "./pages/accounting/AccountingLayout";

const App: React.FC = () => {
  const { settings } = useStoreSettings();
  const footerText =
    settings?.footer_text && settings.footer_text.trim().length > 0
      ? settings.footer_text
      : "نكهة أصيلة... بلمسة من الامتنان.";
  const storeName = settings?.store_name || "CafeMS Demo";
  const year = new Date().getFullYear();

  return (
    <div className="max-w-full min-h-screen bg-slate-50 flex flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1 max-w-full mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/about" element={<About />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/cancel" element={<CheckoutCancel />} />
          <Route path="/order-tracking" element={<OrderTracking />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/aboutf" element={<AboutFull />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/SupportChatWidget" element={<SupportChatWidget />} />

          <Route
            path="/dashboard/hr"
            element={
              <HRRouteGuard>
                <HRLayout />
              </HRRouteGuard>
            }
          >
            <Route index element={<HRDashboardPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="leaves" element={<LeaveRequestsPage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="visa" element={<VisaPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="reports" element={<HRReportsPage />} />
            <Route path="work-reports" element={<HRWorkReportsPage />} />
            <Route path="alerts" element={<HRAlertsDashboard />} />
            <Route path="performance" element={<HRPerformancePage />} />
          </Route>

          <Route
            path="/dashboard/hr/employees"
            element={
              <HRRouteGuard>
                <EmployeesPage />
              </HRRouteGuard>
            }
          />

          <Route
            path="/dashboard/hr/attendance"
            element={
              <HRRouteGuard>
                <AttendancePage />
              </HRRouteGuard>
            }
          />

          <Route
            path="/dashboard/hr/leaves"
            element={
              <HRRouteGuard>
                <LeaveRequestsPage />
              </HRRouteGuard>
            }
          />

          <Route
            path="/dashboard/hr/payroll"
            element={
              <HRRouteGuard>
                <PayrollPage />
              </HRRouteGuard>
            }
          />

          <Route
            path="/dashboard/hr/visa"
            element={
              <HRRouteGuard>
                <VisaPage />
              </HRRouteGuard>
            }
          />

          <Route
            path="/dashboard/hr/documents"
            element={
              <HRRouteGuard>
                <DocumentsPage />
              </HRRouteGuard>
            }
          />

          <Route
            path="/dashboard/hr/reports"
            element={
              <HRRouteGuard>
                <HRReportsPage />
              </HRRouteGuard>
            }
          />

          <Route
          path="/dashboard/hr/performance"
          element={
            <HRRouteGuard>
              <HRPerformancePage />
            </HRRouteGuard>
          }
        />

        <Route path="/accounting/*" element={<AccountingLayout />} />
      </Routes>
    </main>

      <footer className="border-t border-amber-100 bg-white py-4 mt-4">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>© {year} {storeName} صح</span>
          <span>{footerText}</span>
        </div>
      </footer>
      <footer className="border-t text-center text-xs text-gray-500 py-3">
        <SupportChatWidget />
        © {year} RonniDev.com. جميع الحقوق محفوظة.
      </footer>
    </div>
  );
};

export default App;

