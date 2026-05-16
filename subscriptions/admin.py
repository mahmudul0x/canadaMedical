from django.contrib import admin
from .models import SubscriptionPlan, UserSubscription, PaymentHistory, EnterpriseRequest, CustomSubscriptionPlan


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'plan_type', 'price_monthly', 'is_free', 'is_enterprise', 'is_popular', 'job_post_limit', 'order']
    list_editable = ['order', 'is_popular', 'is_enterprise']
    ordering = ['order']


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'status', 'current_period_end', 'cancel_at_period_end']
    list_filter = ['status', 'plan']
    search_fields = ['user__email']
    raw_id_fields = ['user', 'plan']


@admin.register(PaymentHistory)
class PaymentHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'currency', 'status', 'description', 'created_at']
    list_filter = ['status', 'currency']
    search_fields = ['user__email']
    raw_id_fields = ['user']


@admin.register(EnterpriseRequest)
class EnterpriseRequestAdmin(admin.ModelAdmin):
    list_display = ['organization_name', 'contact_name', 'contact_email', 'status', 'monthly_hiring_volume', 'created_at']
    list_filter = ['status', 'monthly_hiring_volume']
    search_fields = ['organization_name', 'contact_name', 'contact_email', 'user__email']
    raw_id_fields = ['user', 'employer_profile', 'approved_by']
    readonly_fields = ['created_at', 'updated_at', 'approved_at']


@admin.register(CustomSubscriptionPlan)
class CustomSubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['user', 'job_post_limit', 'price_monthly', 'is_active', 'valid_until', 'created_at']
    list_filter = ['is_active']
    search_fields = ['user__email']
    raw_id_fields = ['user', 'enterprise_request']
    readonly_fields = ['created_at', 'updated_at']
