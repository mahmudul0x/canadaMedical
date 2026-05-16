import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def _push_to_channel(group_name: str, notification_data: dict):
    try:
        layer = get_channel_layer()
        if layer is None:
            return
        async_to_sync(layer.group_send)(
            group_name,
            {'type': 'notify', 'notification': notification_data},
        )
    except Exception:
        logger.exception('Failed to push notification to channel %s', group_name)


def _create_notification(user, notification_type, title, message, link=''):
    from .models import Notification
    try:
        n = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            link=link,
        )
        return n
    except Exception:
        logger.exception('Failed to create notification: %s', title)
        return None


def _notify_user(user, notification_type, title, message, link=''):
    n = _create_notification(user, notification_type, title, message, link)
    if n:
        _push_to_channel(
            f'notifications_user_{user.pk}',
            {
                'id': n.pk,
                'notification_type': n.notification_type,
                'title': n.title,
                'message': n.message,
                'link': n.link,
                'is_read': n.is_read,
                'created_at': n.created_at.isoformat(),
            },
        )


def _notify_admins(notification_type, title, message, link=''):
    n = _create_notification(None, notification_type, title, message, link)
    if n:
        _push_to_channel(
            'notifications_admin',
            {
                'id': n.pk,
                'notification_type': n.notification_type,
                'title': n.title,
                'message': n.message,
                'link': n.link,
                'is_read': n.is_read,
                'created_at': n.created_at.isoformat(),
            },
        )


# ── Admin notifications ────────────────────────────────────────────────────────

@receiver(post_save, sender='jobs.Job')
def on_new_job(sender, instance, created, **kwargs):
    if created:
        _notify_admins(
            'admin_job',
            f'New job pending approval: {instance.title}',
            f'"{instance.title}" posted by {instance.employer.company_name} is pending review.',
            link='/admin/jobs',
        )


@receiver(post_save, sender='accounts.PhysicianProfile')
def on_new_physician(sender, instance, created, **kwargs):
    if created:
        _notify_admins(
            'admin_physician',
            f'New physician: {instance.user.full_name}',
            f'{instance.user.full_name} ({instance.user.email}) registered a physician account.',
            link='/admin/users',
        )


@receiver(post_save, sender='accounts.EmployerProfile')
def on_new_employer(sender, instance, created, **kwargs):
    if created:
        _notify_admins(
            'admin_employer',
            f'New employer: {instance.company_name}',
            f'"{instance.company_name}" registered by {instance.user.email}.',
            link='/admin/users',
        )


@receiver(post_save, sender='assessments.CareerAssessment')
def on_new_assessment(sender, instance, created, **kwargs):
    if created:
        _notify_admins(
            'admin_assessment',
            f'New assessment: {instance.full_name}',
            f'{instance.full_name} ({instance.email}) submitted a career assessment.',
            link='/admin/assessments',
        )


@receiver(post_save, sender='contact.ContactSubmission')
def on_new_contact(sender, instance, created, **kwargs):
    if created:
        _notify_admins(
            'admin_contact',
            f'New contact from {instance.full_name}',
            f'{instance.full_name} — "{instance.subject}"',
            link='/admin/contacts',
        )


# ── Employer notifications ─────────────────────────────────────────────────────

@receiver(post_save, sender='jobs.JobApplication')
def on_new_application(sender, instance, created, **kwargs):
    if created:
        employer_user = instance.job.employer.user
        physician_name = (
            instance.physician.user.full_name
            if hasattr(instance, 'physician') and instance.physician
            else 'A physician'
        )
        _notify_user(
            employer_user,
            'employer_application',
            f'New application for {instance.job.title}',
            f'{physician_name} applied for your "{instance.job.title}" position.',
            link='/dashboard/employer',
        )


@receiver(post_save, sender='jobs.Job')
def on_job_status_change(sender, instance, created, **kwargs):
    if created:
        return
    if instance.status in ('approved', 'rejected'):
        employer_user = instance.employer.user
        if instance.status == 'approved':
            _notify_user(
                employer_user,
                'employer_job_approved',
                f'Job approved: {instance.title}',
                f'Your job posting "{instance.title}" has been approved and is now live.',
                link='/dashboard/employer',
            )
        else:
            _notify_user(
                employer_user,
                'employer_job_rejected',
                f'Job rejected: {instance.title}',
                f'Your job posting "{instance.title}" was not approved. Please review and resubmit.',
                link='/dashboard/employer',
            )


# ── Physician notifications ────────────────────────────────────────────────────

@receiver(post_save, sender='jobs.JobApplication')
def on_application_status_change(sender, instance, created, **kwargs):
    if created:
        return
    physician_user = instance.physician.user if hasattr(instance, 'physician') and instance.physician else None
    if not physician_user:
        return
    status_labels = {
        'reviewed': 'Your application has been reviewed.',
        'shortlisted': 'You have been shortlisted for an interview!',
        'interview': 'You have been invited to an interview.',
        'offered': 'Congratulations — you have received a job offer!',
        'rejected': 'Your application was not selected at this time.',
    }
    label = status_labels.get(instance.status)
    if label:
        _notify_user(
            physician_user,
            'physician_app_status',
            f'Application update for {instance.job.title}',
            label,
            link='/dashboard/physician',
        )
