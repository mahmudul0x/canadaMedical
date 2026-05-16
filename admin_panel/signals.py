import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def _create_notification(notification_type, title, message, related_id=None):
    from .models import AdminNotification
    try:
        AdminNotification.objects.create(
            notification_type=notification_type,
            title=title,
            message=message,
            related_id=related_id,
        )
    except Exception:
        logger.exception('Failed to create admin notification: %s', title)


@receiver(post_save, sender='jobs.Job')
def notify_new_job(sender, instance, created, **kwargs):
    if created:
        _create_notification(
            'job',
            f'New job pending approval: {instance.title}',
            f'"{instance.title}" posted by {instance.employer.company_name} is pending approval.',
            related_id=instance.pk,
        )


@receiver(post_save, sender='accounts.PhysicianProfile')
def notify_new_physician(sender, instance, created, **kwargs):
    if created:
        _create_notification(
            'physician',
            f'New physician registered: {instance.user.full_name}',
            f'{instance.user.full_name} ({instance.user.email}) has created a physician account.',
            related_id=instance.pk,
        )


@receiver(post_save, sender='accounts.EmployerProfile')
def notify_new_employer(sender, instance, created, **kwargs):
    if created:
        _create_notification(
            'employer',
            f'New employer registered: {instance.company_name}',
            f'"{instance.company_name}" registered by {instance.user.email}.',
            related_id=instance.pk,
        )


@receiver(post_save, sender='assessments.CareerAssessment')
def notify_new_assessment(sender, instance, created, **kwargs):
    if created:
        _create_notification(
            'assessment',
            f'New assessment from: {instance.full_name}',
            f'{instance.full_name} ({instance.email}) submitted a career assessment.',
            related_id=instance.pk,
        )


@receiver(post_save, sender='contact.ContactSubmission')
def notify_new_contact(sender, instance, created, **kwargs):
    if created:
        _create_notification(
            'contact',
            f'New contact from: {instance.full_name}',
            f'{instance.full_name} ({instance.email}) sent a message: {instance.subject}',
            related_id=instance.pk,
        )
