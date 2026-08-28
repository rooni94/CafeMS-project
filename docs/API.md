# CafeMS API map

The project exposes its API below `/api/` and serves health checks at `/health/` and `/api/health/`. The exact serializers and permissions remain in the application source; this page is a navigation map rather than a generated OpenAPI contract.

## Endpoint groups

| Prefix | Responsibility |
| --- | --- |
| `/api/auth/` | Registration, JWT token/refresh, current user, password reset, email/phone verification, addresses, push tokens, permissions, and activity. |
| `/api/products/` | Product/category resources and product add-ons. |
| `/api/orders/` | Orders, public order tracking, order activity, dashboard statistics, POS tables, inventory adjustments, and Stripe checkout/webhooks. |
| `/api/invoices/` | Invoice resources and invoice generation. |
| `/api/contact/` | Contact message submission and message resources. |
| `/api/support/` | Authenticated/guest conversations, messages, close/delete/read actions, and voice messages. |
| `/api/payments/` | Payment method and transaction resources. |
| `/api/hr/` | HR resources, attendance, leave, payroll, documents, work reports, alerts, and HR dashboard views. |
| `/api/store/` | Store branding and contact settings. |
| `/api/loyalty/` | Loyalty profile, transactions, settings, scan, and wallet-pass operations. |
| `/api/accounting/` | Accounting resources, dashboard stats, inventory, cash-flow preview, reports, exports, and receipt OCR. |

## WebSockets

- `ws/support/<conversation_id>/` — support conversation consumer.
- `ws/orders/<user_id>/` — order update consumer.

WebSocket authentication and consumer behavior should be reviewed in `apps/support/consumers.py`, `apps/orders/consumers.py`, and the ASGI/routing modules. The default channel layer is in-memory, so this checkout is intended for local evaluation unless a production channel layer is configured separately.

## Authentication

Most DRF endpoints require the custom JWT authentication class configured in `cafe_backend/settings.py`. Public or guest flows are explicitly implemented by their views and should not be inferred solely from the URL prefix.

## External services

Stripe, OTP, push notifications, wallet passes, voice transcription, and voice synthesis are environment-driven integrations. Empty credentials keep these flows unavailable or in their safe failure path during local evaluation.
