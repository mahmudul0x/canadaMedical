import logging
from datetime import timedelta

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

logger = logging.getLogger(__name__)


@receiver(post_save, sender='accounts.EmployerProfile')
def assign_free_plan_on_registration(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        from .models import SubscriptionPlan, UserSubscription
        free_plan = SubscriptionPlan.objects.get(plan_type='employer', is_free=True)
        UserSubscription.objects.get_or_create(
            user=instance.user,
            defaults={
                'plan': free_plan,
                'status': 'active',
                'current_period_start': timezone.now(),
                'current_period_end': timezone.now() + timedelta(days=36500),
            },
        )
    except Exception:
        logger.exception('Failed to assign free plan to employer %s', instance.user.email)
