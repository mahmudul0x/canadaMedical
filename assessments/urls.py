from django.urls import path
from .views import (
    CareerAssessmentListCreateView,
    CareerAssessmentDetailView,
    CareerAssessmentStatusView,
)

urlpatterns = [
    path('', CareerAssessmentListCreateView.as_view(), name='assessment-list-create'),
    path('<int:pk>/', CareerAssessmentDetailView.as_view(), name='assessment-detail'),
    path('<int:pk>/status/', CareerAssessmentStatusView.as_view(), name='assessment-status'),
]
