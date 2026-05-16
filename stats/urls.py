from django.urls import path
from .views import PlatformStatsView

urlpatterns = [
    path('', PlatformStatsView.as_view(), name='platform-stats'),
]
