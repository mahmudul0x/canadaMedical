from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),

    # API docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # App APIs
    path('api/', include('accounts.urls')),
    path('api/jobs/', include('jobs.urls')),
    path('api/assessments/', include('assessments.urls')),
    path('api/testimonials/', include('testimonials.urls')),
    path('api/contact/', include('contact.urls')),
    path('api/faq/', include('faq.urls')),
    path('api/stats/', include('stats.urls')),
    path('api/admin/', include('admin_panel.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/subscriptions/', include('subscriptions.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
