"""
Subscription & job-posting-limit business logic.
Extracted from jobs/views.py so it can be tested and reused independently.
"""
import datetime
import logging

logger = logging.getLogger(__name__)


def check_job_posting_limit(user, employer):
    """
    Returns (allowed: bool, error_message: str | None).

    Priority order:
    1. Active CustomSubscriptionPlan (enterprise) — checked first.
    2. Standard UserSubscription — fallback.
    3. No subscription — deny posting.

    MUST be called inside a transaction.atomic() block in the caller.
    The select_for_update() on the employer row prevents two concurrent
    requests from both passing the quota check before either commits.
    """
    from subscriptions.models import UserSubscription, CustomSubscriptionPlan
    from jobs.models import Job
    from accounts.models import EmployerProfile

    today = datetime.date.today()

    # Acquire a row-level lock on the employer so concurrent job-create
    # requests queue up here instead of both passing the quota check.
    EmployerProfile.objects.select_for_update().get(pk=employer.pk)

    # ── 1. Enterprise custom plan ────────────────────────────────────────────
    try:
        custom_plan = user.custom_plan
        if custom_plan.is_active and (
            custom_plan.valid_until is None or custom_plan.valid_until >= today
        ):
            if custom_plan.job_post_limit is not None:
                active_jobs = Job.objects.filter(employer=employer, is_active=True).count()
                if active_jobs >= custom_plan.job_post_limit:
                    return False, (
                        f'Job posting limit reached ({custom_plan.job_post_limit} active jobs). '
                        'Please contact your account manager to adjust your enterprise plan.'
                    )
            return True, None
    except CustomSubscriptionPlan.DoesNotExist:
        pass

    # ── 2. Standard subscription ─────────────────────────────────────────────
    try:
        sub = UserSubscription.objects.select_related('plan').get(user=user)
        if sub.status != 'active':
            return False, 'Your subscription is not active. Please subscribe to post jobs.'
        if sub.plan.job_post_limit is not None:
            active_jobs = Job.objects.filter(employer=employer, is_active=True).count()
            if active_jobs >= sub.plan.job_post_limit:
                return False, (
                    f'Job posting limit reached ({sub.plan.job_post_limit} active jobs). '
                    'Please upgrade your plan to post more.'
                )
        return True, None
    except UserSubscription.DoesNotExist:
        return False, 'No active subscription found. Please select a plan to post jobs.'


def get_employer_subscription_summary(user):
    """
    Returns a dict describing the employer's current plan state.
    Used by MySubscriptionView to build the frontend payload.
    """
    from subscriptions.models import UserSubscription, CustomSubscriptionPlan, SubscriptionPlan
    from jobs.models import Job

    today = datetime.date.today()

    # Active enterprise custom plan
    try:
        custom_plan = user.custom_plan
        if custom_plan.is_active and (
            custom_plan.valid_until is None or custom_plan.valid_until >= today
        ):
            return {'type': 'enterprise', 'custom_plan': custom_plan}
    except CustomSubscriptionPlan.DoesNotExist:
        pass

    # Pending custom plan (awaiting payment)
    try:
        pending = CustomSubscriptionPlan.objects.get(user=user, is_active=False)
        if pending.payment_status == 'pending_payment':
            return {'type': 'pending_custom', 'custom_plan': pending}
    except CustomSubscriptionPlan.DoesNotExist:
        pass

    # Standard subscription
    try:
        sub = UserSubscription.objects.select_related('plan').get(user=user)
        return {'type': 'standard', 'subscription': sub}
    except UserSubscription.DoesNotExist:
        pass

    # Free (no subscription row)
    free_plan = SubscriptionPlan.objects.filter(is_free=True, plan_type='employer').first()
    return {'type': 'free', 'free_plan': free_plan}
