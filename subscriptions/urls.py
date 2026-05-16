from django.urls import path
from .views import (
    EmployerPlanListView,
    CreateCheckoutSessionView,
    StripeWebhookView,
    MySubscriptionView,
    CancelSubscriptionView,
    PaymentHistoryView,
    EnterpriseRequestCreateView,
    MyEnterpriseRequestView,
    AdminEnterpriseRequestListView,
    AdminEnterpriseRequestDetailView,
    AdminEnterpriseRequestApproveView,
    AdminEnterpriseRequestRejectView,
    AdminEnterpriseRequestReviewView,
    AdminCustomPlanListView,
    AdminCustomPlanUpdateView,
)

urlpatterns = [
    path('plans/employer/', EmployerPlanListView.as_view(), name='subscription-plans-employer'),
    path('create-checkout/', CreateCheckoutSessionView.as_view(), name='subscription-checkout'),
    path('webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('my-subscription/', MySubscriptionView.as_view(), name='my-subscription'),
    path('cancel/', CancelSubscriptionView.as_view(), name='subscription-cancel'),
    path('payments/', PaymentHistoryView.as_view(), name='payment-history'),
    # Enterprise
    path('enterprise/request/', EnterpriseRequestCreateView.as_view(), name='enterprise-request-create'),
    path('enterprise/my-request/', MyEnterpriseRequestView.as_view(), name='enterprise-my-request'),
    path('admin/enterprise/requests/', AdminEnterpriseRequestListView.as_view(), name='admin-enterprise-request-list'),
    path('admin/enterprise/requests/<int:pk>/', AdminEnterpriseRequestDetailView.as_view(), name='admin-enterprise-request-detail'),
    path('admin/enterprise/requests/<int:pk>/approve/', AdminEnterpriseRequestApproveView.as_view(), name='admin-enterprise-request-approve'),
    path('admin/enterprise/requests/<int:pk>/reject/', AdminEnterpriseRequestRejectView.as_view(), name='admin-enterprise-request-reject'),
    path('admin/enterprise/requests/<int:pk>/review/', AdminEnterpriseRequestReviewView.as_view(), name='admin-enterprise-request-review'),
    path('admin/enterprise/custom-plans/', AdminCustomPlanListView.as_view(), name='admin-enterprise-custom-plan-list'),
    path('admin/enterprise/custom-plans/<int:pk>/', AdminCustomPlanUpdateView.as_view(), name='admin-enterprise-custom-plan-update'),
]
