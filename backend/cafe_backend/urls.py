from django.contrib import admin
from django.urls import path, include
from django.conf import settings         
from django.conf.urls.static import static  
urlpatterns = [
    path('admin/', admin.site.urls),
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
    
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
