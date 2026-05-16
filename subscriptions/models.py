from django.conf import settings
from django.db import models


class SubscriptionPlan(models.Model):
    PLAN_TYPE_CHOICES = [('employer', 'Employer')]

    name = models.CharField(max_length=100, unique=True)
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPE_CHOICES, default='employer')
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_free = models.BooleanField(default=False)
    is_enterprise = models.BooleanField(default=False)
    is_popular = models.BooleanField(default=False)
    job_post_limit = models.PositiveIntegerField(null=True, blank=True, help_text='Null = unlimited')
    features = models.JSONField(default=list)
    stripe_price_id = models.CharField(max_length=255, blank=True)
    stripe_product_id = models.CharField(max_length=255, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name


class UserSubscription(models.Model):
    STATUS_CHOICES = [
        ('active',    'Active'),
        ('cancelled', 'Cancelled'),
        ('past_due',  'Past Due'),
        ('trialing',  'Trialing'),
        ('inactive',  'Inactive'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='usersubscription',
    )
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inactive')
    stripe_customer_id = models.CharField(max_length=255, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.email} → {self.plan.name} ({self.status})'


class EnterpriseRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('reviewing', 'Reviewing'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    VOLUME_CHOICES = [
        ('1_5', '1-5 physicians/month'),
        ('6_10', '6-10 physicians/month'),
        ('11_20', '11-20 physicians/month'),
        ('20_plus', '20+ physicians/month'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enterprise_requests')
    employer_profile = models.ForeignKey('accounts.EmployerProfile', on_delete=models.CASCADE, related_name='enterprise_requests')
    organization_name = models.CharField(max_length=200)
    contact_name = models.CharField(max_length=100)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True)
    monthly_hiring_volume = models.CharField(max_length=50, choices=VOLUME_CHOICES)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    custom_job_limit = models.IntegerField(null=True, blank=True)
    custom_price_monthly = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    custom_features = models.JSONField(default=list, blank=True)
    admin_notes = models.TextField(blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_enterprise_requests')
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.organization_name} - {self.status}"


class CustomSubscriptionPlan(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending_payment', 'Pending Payment'),
        ('paid',            'Paid'),
        ('free',            'Free (No Charge)'),
    ]

    enterprise_request = models.OneToOneField(EnterpriseRequest, on_delete=models.CASCADE, related_name='custom_plan')
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='custom_plan')
    job_post_limit = models.IntegerField(null=True, blank=True)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    features = models.JSONField(default=list)
    is_active = models.BooleanField(default=False)  # only True after payment confirmed
    valid_until = models.DateField(null=True, blank=True)
    # Stripe payment link fields
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending_payment')
    stripe_payment_link_id = models.CharField(max_length=255, blank=True)
    stripe_payment_link_url = models.TextField(blank=True)
    stripe_price_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Custom Plan - {self.user.email} ({self.job_post_limit} jobs)"


class PaymentHistory(models.Model):
    STATUS_CHOICES = [
        ('succeeded', 'Succeeded'),
        ('failed',    'Failed'),
        ('pending',   'Pending'),
        ('refunded',  'Refunded'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments',
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='usd')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    description = models.CharField(max_length=255, blank=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    stripe_invoice_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} — ${self.amount} ({self.status})'
