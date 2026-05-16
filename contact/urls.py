from django.urls import path
from .views import ContactSubmissionListCreateView, ContactSubmissionDetailView

urlpatterns = [
    path('', ContactSubmissionListCreateView.as_view(), name='contact-list-create'),
    path('<int:pk>/', ContactSubmissionDetailView.as_view(), name='contact-detail'),
]
