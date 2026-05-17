from django.utils import timezone
from rest_framework import serializers
from .models import SubscriptionPlan, UserSubscription, PaymentHistory, EnterpriseRequest, CustomSubscriptionPlan


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'price_monthly', 'is_free', 'is_enterprise',
            'is_popular', 'job_post_limit', 'features', 'stripe_price_id',
        ]


class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    price_monthly = serializers.DecimalField(
        source='plan.price_monthly', max_digits=10, decimal_places=2, read_only=True,
    )
    job_post_limit = serializers.IntegerField(source='plan.job_post_limit', read_only=True, allow_null=True)
    days_remaining = serializers.SerializerMethodField()
    jobs_posted = serializers.SerializerMethodField()
    jobs_remaining = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = [
            'plan_name', 'status', 'price_monthly',
            'current_period_end', 'days_remaining',
            'job_post_limit', 'jobs_posted', 'jobs_remaining',
            'cancel_at_period_end',
        ]

    def get_days_remaining(self, obj):
        if obj.current_period_end:
            delta = obj.current_period_end - timezone.now()
            return max(0, delta.days)
        return None

    def get_jobs_posted(self, obj):
        try:
            from jobs.models import Job
            return Job.objects.filter(employer=obj.user.employer_profile, is_active=True).count()
        except Exception:
            return 0

    def get_jobs_remaining(self, obj):
        limit = obj.plan.job_post_limit
        if limit is None:
            return None
        posted = self.get_jobs_posted(obj)
        return max(0, limit - posted)


class PaymentHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentHistory
        fields = ['id', 'amount', 'currency', 'status', 'description', 'created_at']


class EnterpriseRequestSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    company_name = serializers.CharField(source='employer_profile.company_name', read_only=True)

    class Meta:
        model = EnterpriseRequest
        fields = [
            'id', 'user_email', 'company_name',
            'organization_name', 'contact_name', 'contact_email', 'contact_phone',
            'monthly_hiring_volume', 'message', 'status',
            'custom_job_limit', 'custom_price_monthly', 'custom_features',
            'admin_notes', 'approved_at', 'rejected_reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user_email', 'company_name', 'status',
            'custom_job_limit', 'custom_price_monthly', 'custom_features',
            'admin_notes', 'approved_at', 'rejected_reason',
            'created_at', 'updated_at',
        ]


class EnterpriseRequestAdminSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    company_name = serializers.CharField(source='employer_profile.company_name', read_only=True)
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True, allow_null=True)
    revoked_by_email = serializers.EmailField(source='revoked_by.email', read_only=True, allow_null=True)
    monthly_hiring_volume_display = serializers.CharField(source='get_monthly_hiring_volume_display', read_only=True)
    custom_payment_status = serializers.SerializerMethodField()
    custom_payment_link = serializers.SerializerMethodField()

    class Meta:
        model = EnterpriseRequest
        fields = [
            'id', 'user_email', 'company_name',
            'organization_name', 'contact_name', 'contact_email', 'contact_phone',
            'monthly_hiring_volume', 'monthly_hiring_volume_display', 'message', 'status',
            'custom_job_limit', 'custom_price_monthly', 'custom_features',
            'admin_notes', 'approved_by_email', 'approved_at', 'rejected_reason',
            'revoked_by_email', 'revoked_at',
            'custom_payment_status', 'custom_payment_link',
            'created_at', 'updated_at',
        ]

    def get_custom_payment_status(self, obj):
        try:
            return obj.custom_plan.payment_status
        except Exception:
            return None

    def get_custom_payment_link(self, obj):
        try:
            return obj.custom_plan.stripe_payment_link_url or None
        except Exception:
            return None


class CustomSubscriptionPlanSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = CustomSubscriptionPlan
        fields = [
            'id', 'user_email', 'job_post_limit', 'price_monthly',
            'features', 'is_active', 'valid_until',
            'payment_status', 'stripe_payment_link_url',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user_email', 'payment_status',
            'stripe_payment_link_url', 'created_at', 'updated_at',
        ]
