import logging

from django.db.models import F
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def _update_stats(**kwargs):
    from .models import PlatformStats
    try:
        PlatformStats.get_stats()
        PlatformStats.objects.filter(pk=1).update(**kwargs)
    except Exception:
        logger.exception('Failed to update PlatformStats with %s', kwargs)


@receiver(post_save, sender='jobs.Job')
def update_stats_on_job_saved(sender, instance, created, **kwargs):
    total = sender.objects.filter(is_approved=True, is_active=True).count()
    if created and instance.is_approved and instance.is_active:
        _update_stats(total_active_jobs=total, new_opportunities=F('new_opportunities') + 1)
    else:
        _update_stats(total_active_jobs=total)


@receiver(post_delete, sender='jobs.Job')
def update_stats_on_job_deleted(sender, instance, **kwargs):
    total = sender.objects.filter(is_approved=True, is_active=True).count()
    _update_stats(total_active_jobs=total)


@receiver(post_save, sender='accounts.PhysicianProfile')
def update_stats_on_physician_created(sender, instance, created, **kwargs):
    if created:
        total = sender.objects.count()
        _update_stats(total_active_candidates=total, new_candidates=F('new_candidates') + 1)


@receiver(post_delete, sender='accounts.PhysicianProfile')
def update_stats_on_physician_deleted(sender, instance, **kwargs):
    total = sender.objects.count()
    _update_stats(total_active_candidates=total)
