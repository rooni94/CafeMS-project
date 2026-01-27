// src/components/layout/Navbar.tsx
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { api } from "../../services/api";
import type { FC } from "react";
import CurrencyAmount from "../common/CurrencyAmount";

const isExternalLink = (url: string) => /^https?:\/\//i.test(url || "");

const CartIcon: FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className || "w-5 h-5"}
    aria-hidden="true"
  >
    <path d="M6 6h16l-1.4 7H8" />
    <circle cx="9" cy="20" r="1.2" />
    <circle cx="18" cy="20" r="1.2" />
    <path d="M6 6 4 2H2" />
  </svg>
);

const MenuIcon: FC<{ open: boolean }> = ({ open }) => {
  if (open) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      >
        <path d="M6 6 18 18M6 18 18 6" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
};

export const Navbar: React.FC = () => {
  const { items, totalQuantity, total, removeItem, clearCart } = useCart();
  const { user, logout } = useAuth();
  const { settings } = useStoreSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [cartOpen, setCartOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [canAccessHR, setCanAccessHR] = useState(false);
  const [canAccessAccounting, setCanAccessAccounting] = useState(false);
  const [canManageOrders, setCanManageOrders] = useState(false);
  const [canUseCashier, setCanUseCashier] = useState(false);
  const [canManageSupport, setCanManageSupport] = useState(false);

  const cartCount = totalQuantity;

  const isEmployeeRole =
    !!user &&
    (user.role === "manager" ||
      user.role === "staff" ||
      user.role === "supervisor");

  const canAccessDashboard = isEmployeeRole;

  const isDashboardActive =
    location.pathname === "/dashboard" ||
    (location.pathname.startsWith("/dashboard/") &&
      !location.pathname.startsWith("/dashboard/hr") &&
      !location.pathname.startsWith("/dashboard/orders") &&
      !location.pathname.startsWith("/dashboard/cashier") &&
      !location.pathname.startsWith("/dashboard/support-chat"));

  useEffect(() => {
    if (!user) {
      setCanAccessHR(false);
      setCanAccessAccounting(false);
      setCanManageOrders(false);
      setCanUseCashier(false);
      setCanManageSupport(false);
      return;
    }

    api
      .get("auth/my-permissions/")
      .then((res) => {
        const data = res.data || {};
        const p = data.permissions || {};
        const role = (user as any)?.role;
        const isManager = role === "manager";
        const isSupervisor = role === "supervisor";
        const isStaff = role === "staff";
        const hrAllowed =
          data.is_superuser ||
          data.is_staff ||
          isManager ||
          !!p.can_view_hr_dashboard ||
          !!p.can_manage_employees ||
          !!p.can_manage_attendance ||
          !!p.can_manage_hr_leaves ||
          !!p.can_manage_hr_payroll ||
          !!p.can_manage_hr_documents ||
          !!p.can_manage_hr_work_reports ||
          !!p.can_manage_hr_reports;
        setCanAccessHR(hrAllowed);

        const accAllowed =
          data.is_superuser ||
          isManager ||
          !!p.can_view_accounting ||
          !!p.can_manage_accounting ||
          !!p.can_manage_financial_reports;
        setCanAccessAccounting(accAllowed);

        const ordersAllowed = isManager || isSupervisor || isStaff || !!p.can_manage_orders;
        const cashierAllowed =
          isManager || isSupervisor || isStaff || !!p.can_access_cashier || !!p.can_manage_orders;
        const supportAllowed = isManager || !!p.can_manage_support;

        setCanManageOrders(ordersAllowed);
        setCanUseCashier(cashierAllowed);
        setCanManageSupport(supportAllowed);
      })
      .catch((err) => {
        console.error("Failed to load HR/accounting permissions in navbar", err);
        setCanAccessHR(false);
        setCanAccessAccounting(false);
        setCanManageOrders(false);
        setCanUseCashier(false);
        setCanManageSupport(false);
      });
  }, [user]);

  const storeName = settings?.store_name || "CafeMS Demo";
  const brandPrimary = settings?.primary_color || "#f59e0b";
  const brandSecondary = settings?.secondary_color || "#4c1d95";
  const headerLinks =
    settings?.header_links?.filter((link) => link?.label && link?.url) || [];

  const navLinkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
      active ? "bg-amber-500 text-white" : "text-gray-700 hover:bg-gray-100"
    }`;

  const showEmployeeNav = isEmployeeRole || canManageOrders || canUseCashier || canManageSupport;

  const CartToggle: FC<{ showLabel?: boolean; compact?: boolean }> = ({
    showLabel = false,
    compact = false,
  }) => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setCartOpen((prev) => !prev)}
        className={`relative inline-flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition ${
          compact ? "w-11 h-11" : "px-3 py-1 gap-2"
        }`}
        aria-label="عرض السلة"
      >
        <CartIcon className="w-5 h-5 text-amber-600" />
        {showLabel && (
          <span className="text-sm text-gray-700 hidden lg:inline">السلة</span>
        )}
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {cartCount}
          </span>
        )}
      </button>

      {cartOpen && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setCartOpen(false)}
          />
          <div
            className="
              bg-white rounded-2xl shadow-lg border border-amber-100 p-3 text-right
              fixed top-[72px] inset-x-3 z-50
              md:absolute md:top-auto md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:mt-2 md:w-80 md:z-50
            "
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">سلة الطلبات</h3>
              {cartCount > 0 && (
                <span className="text-[11px] text-gray-500">{cartCount} منتج</span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-xs text-gray-500">السلة فارغة حالياً.</div>
            ) : (
              <>
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {items.map((item) => {
                    const lineTotal = Number(item.price || 0) * item.quantity;
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-amber-50"
                      >
                        <div className="flex flex-col items-start flex-1">
                          <span className="text-xs font-medium line-clamp-1">
                            {item.name}
                          </span>
                          {item.addons && item.addons.length > 0 && (
                            <span className="text-[11px] text-gray-500 line-clamp-1">
                              + {item.addons.map((addon) => addon.name).join("، ")}
                            </span>
                          )}
                          <span className="text-[11px] text-gray-500">
                            الكمية: {item.quantity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-amber-700">
                            <CurrencyAmount value={lineTotal} />
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            className="text-[12px] text-red-500 hover:text-red-600"
                            title="حذف هذا المنتج"
                          >
                            إزالة
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t mt-3 pt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <button
                      type="button"
                      onClick={clearCart}
                      className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600"
                    >
                      تفريغ السلة
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold">الإجمالي</span>
                    <span className="font-bold text-amber-700">
                      <CurrencyAmount value={total} />
                    </span>
                  </div>
                  <button
                    onClick={handleGoToCheckout}
                    className="w-full py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600"
                  >
                    المتابعة إلى الدفع
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderExtraLink = (
    link: { label: string; url: string },
    isMobile: boolean = false
  ) => {
    if (!link?.label || !link?.url) return null;
    const className = navLinkClass(false);
    const commonProps = {
      className,
      style: undefined,
      onClick: isMobile ? () => setMobileOpen(false) : undefined,
    };

    if (isExternalLink(link.url)) {
      return (
        <a
          key={`${link.label}-${link.url}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          {...commonProps}
        >
          {link.label}
        </a>
      );
    }

    return (
      <Link key={`${link.label}-${link.url}`} to={link.url} {...commonProps}>
        {link.label}
      </Link>
    );
  };

  const handleGoToCheckout = () => {
    setCartOpen(false);
    setMobileOpen(false);
    navigate("/checkout");
  };

  return (
    <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-40">
      <nav className="max-w-6xl mx-auto w-full px-4 py-3">
        <div className="md:hidden flex items-center gap-3 justify-between">
          <button
            type="button"
            className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-gray-200 hover:bg-gray-50"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span className="sr-only">
              {mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
            </span>
            <MenuIcon open={mobileOpen} />
          </button>
          <Link
            to="/"
            className="flex-1 flex items-center justify-center gap-2"
          >
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={storeName}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <span className="text-xl font-bold">
                <span style={{ color: brandPrimary }}>كافيه </span>
                <span style={{ color: brandSecondary }}>الخليج</span>
              </span>
            )}
          </Link>
          <div className="inline-flex items-center justify-center">
            <CartToggle compact />
          </div>
        </div>

        <div className="hidden md:flex items-center justify-between gap-4 w-full">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={storeName}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <span className="text-2xl font-bold">
                <span style={{ color: brandPrimary }}>كافيه </span>
                <span style={{ color: brandSecondary }}>الخليج</span>
              </span>
            )}
          </Link>

          <div className="flex items-center gap-2 flex-1 justify-center flex-nowrap">
            <Link
              to="/"
              className={navLinkClass(location.pathname === "/")}
            >
              الرئيسية
            </Link>
            {!showEmployeeNav && (
              <Link
                to="/order-tracking"
                className={navLinkClass(location.pathname === "/order-tracking")}
              >
                طلباتي
              </Link>
            )}
            {showEmployeeNav ? (
              <>
                {canUseCashier && (
                  <Link
                    to="/dashboard/cashier"
                    state={{ fromHeader: true }}
                    className={navLinkClass(location.pathname.startsWith("/dashboard/cashier"))}
                  >
                    الكاشير
                  </Link>
                )}
                {canManageOrders && (
                  <Link
                    to="/dashboard/orders"
                    state={{ fromHeader: true }}
                    className={navLinkClass(location.pathname.startsWith("/dashboard/orders"))}
                  >
                    الطلبات
                  </Link>
                )}
                {canManageSupport && (
                  <Link
                    to="/dashboard/support-chat"
                    state={{ fromHeader: true }}
                    className={navLinkClass(location.pathname.startsWith("/dashboard/support-chat"))}
                  >
                    دعم فني
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/menu"
                  className={navLinkClass(location.pathname === "/menu")}
                >
                  القائمة
                </Link>
                <Link
                  to="/about"
                  className={navLinkClass(location.pathname === "/about")}
                >
                  من نحن
                </Link>
                <Link
                  to="/contact"
                  className={navLinkClass(location.pathname === "/contact")}
                >
                  تواصل معنا
                </Link>
              </>
            )}

            {canAccessDashboard && (
              <Link
                to="/dashboard"
                className={navLinkClass(isDashboardActive)}
              >
                لوحة التحكم
              </Link>
            )}

            {canAccessHR && (
              <Link
                to="/dashboard/hr"
                className={navLinkClass(
                  location.pathname.startsWith("/dashboard/hr")
                )}
              >
               الموارد البشرية
              </Link>
            )}

            {canAccessAccounting && (
              <Link
                to="/accounting"
                className={navLinkClass(location.pathname.startsWith("/accounting"))}
              >
                المحاسبة
              </Link>
            )}

            {headerLinks.length > 0 &&
              headerLinks.map((link) => renderExtraLink(link))}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <CartToggle showLabel />
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="text-sm text-gray-700 hover:text-amber-600"
                >
                  حسابي
                </Link>
                <button
                  onClick={logout}
                  className="text-sm text-gray-700 hover:text-red-500"
                >
                  تسجيل خروج
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-sm text-gray-700 hover:text-amber-600"
              >
                تسجيل دخول
              </Link>
            )}
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/25 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed inset-x-0 top-[72px] bg-white shadow-lg z-40 rounded-b-3xl border-t border-amber-100">
            <div className="max-w-6xl mx-auto px-4 py-4 space-y-3 text-sm max-h-[calc(100vh-80px)] overflow-y-auto">
              <div className="flex flex-col gap-2">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className={navLinkClass(location.pathname === "/")}
                >
                  الرئيسية
                </Link>
                {!showEmployeeNav && (
                  <Link
                    to="/order-tracking"
                    onClick={() => setMobileOpen(false)}
                    className={navLinkClass(
                      location.pathname === "/order-tracking"
                    )}
                  >
                    طلباتي
                  </Link>
                )}
                {showEmployeeNav ? (
                  <>
                    {canUseCashier && (
                      <Link
                        to="/dashboard/cashier"
                        state={{ fromHeader: true }}
                        onClick={() => setMobileOpen(false)}
                        className={navLinkClass(
                          location.pathname.startsWith("/dashboard/cashier")
                        )}
                      >
                        الكاشير
                      </Link>
                    )}
                    {canManageOrders && (
                      <Link
                        to="/dashboard/orders"
                        state={{ fromHeader: true }}
                        onClick={() => setMobileOpen(false)}
                        className={navLinkClass(
                          location.pathname.startsWith("/dashboard/orders")
                        )}
                      >
                        الطلبات
                      </Link>
                    )}
                    {canManageSupport && (
                      <Link
                        to="/dashboard/support-chat"
                        state={{ fromHeader: true }}
                        onClick={() => setMobileOpen(false)}
                        className={navLinkClass(
                          location.pathname.startsWith("/dashboard/support-chat")
                        )}
                      >
                        دعم فني
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      to="/menu"
                      onClick={() => setMobileOpen(false)}
                      className={navLinkClass(location.pathname === "/menu")}
                    >
                      القائمة
                    </Link>
                    <Link
                      to="/about"
                      onClick={() => setMobileOpen(false)}
                      className={navLinkClass(location.pathname === "/about")}
                    >
                      من نحن
                    </Link>
                    <Link
                      to="/contact"
                      onClick={() => setMobileOpen(false)}
                      className={navLinkClass(location.pathname === "/contact")}
                    >
                      تواصل معنا
                    </Link>
                  </>
                )}

                {canAccessDashboard && (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className={navLinkClass(isDashboardActive)}
                  >
                    لوحة التحكم
                  </Link>
                )}

                {canAccessHR && (
                  <Link
                    to="/dashboard/hr"
                    onClick={() => setMobileOpen(false)}
                    className={navLinkClass(
                      location.pathname.startsWith("/dashboard/hr")
                    )}
                  >
                    الموارد البشرية
                  </Link>
                )}

                {canAccessAccounting && (
                  <Link
                    to="/accounting"
                    onClick={() => setMobileOpen(false)}
                    className={navLinkClass(location.pathname.startsWith("/accounting"))}
                  >
                    المحاسبة
                  </Link>
                )}

                {headerLinks.length > 0 &&
                  headerLinks.map((link) => renderExtraLink(link, true))}
              </div>

              <div className="border-t pt-3 mt-2 flex items-center justify-between">
                {user ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="text-sm text-gray-700 hover:text-amber-600"
                    >
                      حسابي
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                      className="text-sm text-gray-700 hover:text-red-500"
                    >
                      تسجيل خروج
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="text-sm text-gray-700 hover:text-amber-600"
                  >
                    تسجيل دخول
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

