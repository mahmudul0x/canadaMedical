from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model

from accounts.models import EmployerProfile, PhysicianProfile
from jobs.models import Job, JobApplication
from notifications.models import Notification
from subscriptions.models import SubscriptionPlan

User = get_user_model()


def make_free_plan():
    plan, _ = SubscriptionPlan.objects.get_or_create(
        name='Free',
        defaults=dict(plan_type='employer', price_monthly=0, is_free=True),
    )
    return plan


def make_employer(email='employer@test.com'):
    make_free_plan()
    user = User.objects.create_user(
        email=email, password='pass',
        first_name='Test', last_name='Employer', user_type='employer',
    )
    profile = EmployerProfile.objects.create(
        user=user, company_name='Test Clinic', company_type='employer',
    )
    return user, profile


def make_physician(email='physician@test.com'):
    user = User.objects.create_user(
        email=email, password='pass',
        first_name='Test', last_name='Doctor', user_type='physician',
    )
    profile = PhysicianProfile.objects.create(user=user, specialty='family_medicine')
    return user, profile


def make_job(employer_profile, **kwargs):
    defaults = dict(
        title='Family Physician Needed in Ontario',
        specialty='family_medicine',
        province='ON',
        city='Toronto',
        description='A' * 60,
        qualifications='MD required',
        job_type='full_time',
        is_active=True,
        is_approved=True,
    )
    defaults.update(kwargs)
    return Job.objects.create(employer=employer_profile, **defaults)


# ─────────────────────────────────────────────────────────────────────────────
# Admin notifications — new job posted
# ─────────────────────────────────────────────────────────────────────────────

class NewJobNotificationTest(TestCase):
    def setUp(self):
        _, self.employer_profile = make_employer()

    def test_new_job_creates_admin_notification(self):
        with patch('notifications.signals._push_to_channel'):
            make_job(self.employer_profile)
        notif = Notification.objects.filter(notification_type='admin_job').first()
        self.assertIsNotNone(notif)
        self.assertIn('Family Physician', notif.title)

    def test_updating_job_does_not_create_new_admin_notification(self):
        with patch('notifications.signals._push_to_channel'):
            job = make_job(self.employer_profile)
            count_before = Notification.objects.filter(notification_type='admin_job').count()
            job.title = 'Updated Title That Is Long Enough'
            job.save()
        count_after = Notification.objects.filter(notification_type='admin_job').count()
        self.assertEqual(count_before, count_after)


# ─────────────────────────────────────────────────────────────────────────────
# Employer notifications — job approved / rejected
# ─────────────────────────────────────────────────────────────────────────────

class JobStatusNotificationTest(TestCase):
    def setUp(self):
        self.employer_user, self.employer_profile = make_employer()

    def test_job_approved_notifies_employer(self):
        with patch('notifications.signals._push_to_channel'):
            job = make_job(self.employer_profile, is_approved=False)
            job.is_approved = True
            job.save(update_fields=['is_approved', 'updated_at'])
        notif = Notification.objects.filter(
            user=self.employer_user, notification_type='employer_job_approved'
        ).first()
        self.assertIsNotNone(notif)

    def test_job_rejected_notifies_employer(self):
        with patch('notifications.signals._push_to_channel'):
            job = make_job(self.employer_profile, is_approved=False)
            job.rejection_reason = 'Does not meet guidelines.'
            job.is_active = False
            job.save(update_fields=['rejection_reason', 'is_active', 'updated_at'])
        notif = Notification.objects.filter(
            user=self.employer_user, notification_type='employer_job_rejected'
        ).first()
        self.assertIsNotNone(notif)


# ─────────────────────────────────────────────────────────────────────────────
# Employer notifications — new application received
# ─────────────────────────────────────────────────────────────────────────────

class NewApplicationNotificationTest(TestCase):
    def setUp(self):
        self.employer_user, self.employer_profile = make_employer()
        self.physician_user, self.physician_profile = make_physician()
        self.job = make_job(self.employer_profile)

    def test_new_application_notifies_employer(self):
        with patch('notifications.signals._push_to_channel'):
            JobApplication.objects.create(
                job=self.job, physician=self.physician_profile,
            )
        notif = Notification.objects.filter(
            user=self.employer_user, notification_type='employer_application'
        ).first()
        self.assertIsNotNone(notif)
        self.assertIn(self.job.title, notif.title)


# ─────────────────────────────────────────────────────────────────────────────
# Physician notifications — application status changes
# ─────────────────────────────────────────────────────────────────────────────

class ApplicationStatusNotificationTest(TestCase):
    def setUp(self):
        _, employer_profile = make_employer()
        self.physician_user, self.physician_profile = make_physician()
        self.job = make_job(employer_profile)
        with patch('notifications.signals._push_to_channel'):
            self.application = JobApplication.objects.create(
                job=self.job, physician=self.physician_profile,
            )

    def _update_status(self, new_status):
        with patch('notifications.signals._push_to_channel'):
            self.application.status = new_status
            self.application.save(update_fields=['status', 'updated_at'])

    def test_shortlisted_notifies_physician(self):
        self._update_status('shortlisted')
        notif = Notification.objects.filter(
            user=self.physician_user, notification_type='physician_app_status'
        ).first()
        self.assertIsNotNone(notif)
        self.assertIn('shortlisted', notif.message.lower())

    def test_offered_notifies_physician(self):
        self._update_status('offered')
        notif = Notification.objects.filter(
            user=self.physician_user, notification_type='physician_app_status'
        ).order_by('-id').first()
        self.assertIsNotNone(notif)
        self.assertIn('offer', notif.message.lower())

    def test_rejected_notifies_physician(self):
        self._update_status('rejected')
        notif = Notification.objects.filter(
            user=self.physician_user, notification_type='physician_app_status'
        ).order_by('-id').first()
        self.assertIsNotNone(notif)

    def test_pending_status_does_not_notify(self):
        count_before = Notification.objects.filter(
            user=self.physician_user, notification_type='physician_app_status'
        ).count()
        self._update_status('pending')
        count_after = Notification.objects.filter(
            user=self.physician_user, notification_type='physician_app_status'
        ).count()
        self.assertEqual(count_before, count_after)
