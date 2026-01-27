from django.contrib import admin
from django.urls import path, include
from django.conf import settings         
from django.conf.urls.static import static  
from apps.core.views import health
from apps.loyalty.views import PassDownloadView
urlpatterns = [
    path('admin/', admin.site.urls),
    path("health/", health),
    path("api/health/", health),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/products/', include('apps.products.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/invoices/', include('apps.invoices.urls')),
    path('api/contact/', include('apps.contact.urls')),
    path('api/support/', include('apps.support.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path("api/hr/", include("apps.hr.urls")),
    path("api/store/", include("apps.store.urls")),
    path("api/loyalty/", include("apps.loyalty.urls")),
    path("api/accounting/", include("apps.accounting.urls")),
    path(
        "passes/<str:platform>/<str:serial_number>.pkpass",
        PassDownloadView.as_view(),
        name="pass-download",
    ),
    
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
