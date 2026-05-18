"""
Async Celery wrappers for every email in service.py.

Usage (anywhere in Django code):
    from emails.tasks import send_welcome_email_task
    send_welcome_email_task.delay(user_id)

.delay() returns immediately — the email is sent in the background.
"""
from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_user(user_id: int):
    from django.contrib.auth import get_user_model
    return get_user_model().objects.get(pk=user_id)


# ── 1. Welcome ────────────────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='emails.welcome')
def send_welcome_email_task(self, user_id: int):
    try:
        from emails import service
        service.send_welcome_email(_get_user(user_id))
    except Exception as exc:
        logger.warning('send_welcome_email failed (attempt %s): %s', self.request.retries, exc)
        raise self.retry(exc=exc)


# ── 2. Application confirmation (physician) ───────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='emails.application_confirmation')
def send_application_confirmation_task(self, physician_user_id: int, job_title: str, employer_name: str):
    try:
        from emails import service
        service.send_application_confirmation(_get_user(physician_user_id), job_title, employer_name)
    except Exception as exc:
        logger.warning('send_application_confirmation failed: %s', exc)
        raise self.retry(exc=exc)


# ── 3. Job approved (employer) ────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='emails.job_approved')
def send_job_approved_email_task(self, employer_user_id: int, job_title: str):
    try:
        from emails import service
        service.send_job_approved_email(_get_user(employer_user_id), job_title)
    except Exception as exc:
        logger.warning('send_job_approved_email failed: %s', exc)
        raise self.retry(exc=exc)


# ── 4. Job rejected (employer) ────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='emails.job_rejected')
def send_job_rejected_email_task(self, employer_user_id: int, job_title: str, reason: str = ''):
    try:
        from emails import service
        service.send_job_rejected_email(_get_user(employer_user_id), job_title, reason)
    except Exception as exc:
        logger.warning('send_job_rejected_email failed: %s', exc)
        raise self.retry(exc=exc)


# ── 5. New application (employer) ─────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='emails.new_application')
def send_new_application_email_task(self, employer_user_id: int, physician_name: str, job_title: str):
    try:
        from emails import service
        service.send_new_application_email(_get_user(employer_user_id), physician_name, job_title)
    except Exception as exc:
        logger.warning('send_new_application_email failed: %s', exc)
        raise self.retry(exc=exc)


# ── 6. Password reset ─────────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=30, name='emails.password_reset')
def send_password_reset_email_task(self, user_id: int, reset_url: str):
    try:
        from emails import service
        service.send_password_reset_email(_get_user(user_id), reset_url)
    except Exception as exc:
        logger.warning('send_password_reset_email failed: %s', exc)
        raise self.retry(exc=exc)


# ── 7. Payment confirmation ───────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='emails.payment_confirmation')
def send_payment_confirmation_email_task(self, user_id: int, plan_name: str, amount: str, period_end: str = ''):
    try:
        from emails import service
        service.send_payment_confirmation_email(_get_user(user_id), plan_name, amount, period_end)
    except Exception as exc:
        logger.warning('send_payment_confirmation_email failed: %s', exc)
        raise self.retry(exc=exc)


# ── 8. Application status change (physician) ──────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='emails.application_status')
def send_application_status_email_task(self, physician_user_id: int, job_title: str, employer_name: str, new_status: str):
    try:
        from emails import service
        service.send_application_status_email(_get_user(physician_user_id), job_title, employer_name, new_status)
    except Exception as exc:
        logger.warning('send_application_status_email failed: %s', exc)
        raise self.retry(exc=exc)


# ── 9. Offer accepted — to employer ──────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='emails.offer_accepted_employer')
def send_offer_accepted_email_task(self, employer_user_id: int, physician_name: str, job_title: str):
    try:
        from emails import service
        service.send_offer_accepted_email(_get_user(employer_user_id), physician_name, job_title)
    except Exception as exc:
        logger.warning('send_offer_accepted_email failed: %s', exc)
        raise self.retry(exc=exc)


# ── 10. Offer declined — to employer ─────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='emails.offer_declined_employer')
def send_offer_declined_email_task(self, employer_user_id: int, physician_name: str, job_title: str):
    try:
        from emails import service
        service.send_offer_declined_email(_get_user(employer_user_id), physician_name, job_title)
    except Exception as exc:
        logger.warning('send_offer_declined_email failed: %s', exc)
        raise self.retry(exc=exc)


# ── 11. Offer accepted confirmation — to physician ────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='emails.offer_accepted_physician')
def send_offer_accepted_confirmation_task(self, physician_user_id: int, job_title: str, employer_name: str):
    try:
        from emails import service
        service.send_offer_accepted_confirmation(_get_user(physician_user_id), job_title, employer_name)
    except Exception as exc:
        logger.warning('send_offer_accepted_confirmation failed: %s', exc)
        raise self.retry(exc=exc)


# ── 13. Enterprise request submitted — notify admin ──────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='emails.enterprise_request_admin')
def send_enterprise_request_admin_email_task(self, admin_email: str, employer_user_id: int, enterprise_request_id: int):
    try:
        from emails import service
        from django.contrib.auth import get_user_model
        from subscriptions.models import EnterpriseRequest
        employer = get_user_model().objects.get(pk=employer_user_id)
        er = EnterpriseRequest.objects.get(pk=enterprise_request_id)
        employer_name = getattr(employer, 'full_name', None) or employer.email
        service.send_enterprise_request_admin_email(admin_email, employer_name, er.organization_name, er)
    except Exception as exc:
        logger.warning('send_enterprise_request_admin_email failed: %s', exc)
        raise self.retry(exc=exc)


# ── 14. Custom plan payment link ready — notify employer ─────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='emails.custom_plan_payment_link')
def send_custom_plan_payment_link_email_task(self, employer_user_id: int, payment_link: str, price: str, job_limit, features: list):
    try:
        from emails import service
        service.send_custom_plan_payment_link_email(_get_user(employer_user_id), payment_link, price, job_limit, features)
    except Exception as exc:
        logger.warning('send_custom_plan_payment_link_email failed: %s', exc)
        raise self.retry(exc=exc)


# ── 12. Custom employer → physician email ─────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='emails.employer_custom')
def send_employer_custom_email_task(self, physician_user_id: int, employer_name: str, job_title: str, subject: str, message: str):
    try:
        from emails import service
        service.send_employer_custom_email(_get_user(physician_user_id), employer_name, job_title, subject, message)
    except Exception as exc:
        logger.warning('send_employer_custom_email failed: %s', exc)
        raise self.retry(exc=exc)
