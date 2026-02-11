# backend/cafe_backend/settings.py
import os
from pathlib import Path
from datetime import timedelta
import environ
import logging

logging.getLogger("django.security.DisallowedHost").setLevel(logging.WARNING)

try:
    import django_user_agents  # noqa: F401

    HAS_DJANGO_USER_AGENTS = True
except Exception:
    HAS_DJANGO_USER_AGENTS = False

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, False))

# تحميل ملف البيئة (local vs production)
env_file = env.str("ENV_FILE", default="").strip()
env_name = env.str("DJANGO_ENV", default="local").strip().lower()

if env_file:
    candidate_paths = [env_file]
elif env_name in ("prod", "production"):
    candidate_paths = [
        os.path.join(BASE_DIR, ".env.prod"),
        os.path.join(BASE_DIR, ".env.production"),
    ]
else:
    candidate_paths = [os.path.join(BASE_DIR, ".env")]

for path in candidate_paths:
    if path and os.path.exists(path):
        environ.Env.read_env(path)
        break

# ================== الإعدادات الأساسية ==================
SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)

# الدومينات المسموح بها
ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=["127.0.0.1", "localhost"],
)
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "channels",
    "apps.products",
    "apps.orders",
    "apps.invoices",
    "apps.contact",
    "apps.support",
    "apps.payments",
    "apps.accounts.apps.AccountsConfig",
    "apps.accounting.apps.AccountingConfig",
    "django_filters",
    "apps.hr.apps.HrConfig",
    "apps.store.apps.StoreConfig",
    "apps.loyalty.apps.LoyaltyConfig",
]
if HAS_DJANGO_USER_AGENTS:
    INSTALLED_APPS.append("django_user_agents")

from corsheaders.defaults import default_headers



AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.accounts.middleware.UserActivityMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]
if HAS_DJANGO_USER_AGENTS:
    MIDDLEWARE.append("django_user_agents.middleware.UserAgentMiddleware")

ROOT_URLCONF = "cafe_backend.urls"

# إذا كان Django خلف Reverse Proxy (مثل Nginx) مع HTTPS termination
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

WSGI_APPLICATION = "cafe_backend.wsgi.application"
ASGI_APPLICATION = "cafe_backend.asgi.application"

# ================== قاعدة البيانات ==================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# ================== Stripe (لاحقاً) ==================
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")
STRIPE_CURRENCY = env("STRIPE_CURRENCY", default="SAR").strip() or "SAR"

# ================== Expo Push Notifications ==================
EXPO_ACCESS_TOKEN = env("EXPO_ACCESS_TOKEN", default="").strip()
EXPO_PUSH_URL = env(
    "EXPO_PUSH_URL",
    default="https://exp.host/--/api/v2/push/send",
).strip()

# ================== Apple Wallet / PassKit ==================
APPLE_WWDR_PEM = env("APPLE_WWDR_PEM", default="").strip()
APPLE_PASS_P12 = env("APPLE_PASS_P12", default="").strip()
APPLE_PASS_P12_PASSWORD = env("APPLE_PASS_P12_PASSWORD", default="").strip()
APPLE_WALLET_WEB_SERVICE_URL = env("APPLE_WALLET_WEB_SERVICE_URL", default="").strip()
APPLE_WALLET_APNS_SANDBOX = env.bool("APPLE_WALLET_APNS_SANDBOX", default=False)
APPLE_WALLET_APNS_HOST = env("APPLE_WALLET_APNS_HOST", default="").strip()

# ================== Authentica OTP (Phone Verification) ==================
# IMPORTANT: Do not hardcode API keys in source control. Configure via environment variables.
AUTHENTICA_API_KEY = env("AUTHENTICA_API_KEY", default="").strip()
AUTHENTICA_BASE_URL = env(
    "AUTHENTICA_BASE_URL",
    default="https://api.authentica.sa/api/v2",
).rstrip("/")
AUTHENTICA_OTP_METHOD = env("AUTHENTICA_OTP_METHOD", default="sms").strip().lower()
AUTHENTICA_OTP_TEMPLATE_ID = env.int("AUTHENTICA_OTP_TEMPLATE_ID", default=1)
AUTHENTICA_OTP_RESEND_SECONDS = env.int("AUTHENTICA_OTP_RESEND_SECONDS", default=60)

# ================== DRF & Auth ==================
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.FlexibleJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "user": env("REST_THROTTLE_USER", default="120/min"),
        "anon": env("REST_THROTTLE_ANON", default="30/min"),
    },
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
}

# ================== CORS & CSRF ==================
# في التطوير نسمح لكل الأورجنز بشكل افتراضي، وفي الإنتاج نتحكم من env
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=DEBUG)

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
)

# Allow custom headers used by the support guest flow.
CORS_ALLOW_HEADERS = list(default_headers) + [
    "x-guest-token",
    "x-access-token",
    "x-authorization",
]

# للسماح بإرسال الكوكيز / Authorization من الفرونت
CORS_ALLOW_CREDENTIALS = True

# لو حاب، نضيف CSRF trusted origins (مهم لو استخدمت كوكيز في الإنتاج)
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
)

# ================== قنوات (WebSockets) ==================
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

# ================== Voice (STT/TTS) ==================
# Configure via environment variables; do not hardcode secrets.
OPENAI_API_KEY = env("OPENAI_API_KEY", default="").strip()
ELEVENLABS_API_KEY = env("ELEVENLABS_API_KEY", default="").strip()
ELEVENLABS_VOICE_ID = env("ELEVENLABS_VOICE_ID", default="").strip()
VOICE_MAX_DURATION_SECONDS = env.int("VOICE_MAX_DURATION_SECONDS", default=90)
VOICE_MAX_FILE_MB = env.int("VOICE_MAX_FILE_MB", default=15)
WHISPER_MODEL_NAME = env("WHISPER_MODEL_NAME", default="large-v3").strip()
WHISPER_MODEL_DIR = env("WHISPER_MODEL_DIR", default="").strip()
WHISPER_COMPUTE_TYPE = env("WHISPER_COMPUTE_TYPE", default="int8_float16").strip()

# ================== التحقق من كلمة المرور ==================
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
    {
        "NAME": "apps.accounts.validators.StrongPasswordValidator",
    },
]

# ================== روابط الفرونت (إيميل / Reset) ==================
FRONTEND_URL = env(
    "FRONTEND_URL",
    default="http://localhost:5173",
)
CHECKOUT_REDIRECT_HOSTS = env.list("CHECKOUT_REDIRECT_HOSTS", default=[])

FRONTEND_RESET_PASSWORD_URL = env(
    "FRONTEND_RESET_PASSWORD_URL",
    default=FRONTEND_URL.rstrip("/") + "/reset-password",
)

# ================== إعدادات البريد ==================
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

EMAIL_HOST = env("EMAIL_HOST", default="smtp.example.invalid")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)

EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")

DEFAULT_FROM_EMAIL = env(
    "DEFAULT_FROM_EMAIL",
    default="CafeMS Demo <noreply@example.invalid>",
)

EMAIL_TIMEOUT = env.int("EMAIL_TIMEOUT", default=10)

# ================== Static & Media ==================
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ================== Security Headers (للإنتاج) ==================
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True

    SECURE_HSTS_SECONDS = 31536000  # سنة
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
