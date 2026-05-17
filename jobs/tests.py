import datetime
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework import status

from accounts.models import EmployerProfile, PhysicianProfile
from core.permissions import IsPhysician, IsEmployer, IsOwnerOrAdmin
from jobs.models import Job, JobApplication, SavedJob
from jobs.serializers import JobCreateUpdateSerializer, JobApplicationCreateSerializer
from subscriptions.models import SubscriptionPlan

User = get_user_model()


class BaseTestCase(TestCase):
    """
    Creates the free employer plan before each test so the post_save signal
    on EmployerProfile can auto-assign it without failing.
    """
    def setUp(self):
        SubscriptionPlan.objects.get_or_create(
            name='Free',
            defaults=dict(plan_type='employer', price_monthly=0, is_free=True),
        )


def make_employer(email='employer@test.com', password='pass'):
    user = User.objects.create_user(
        email=email, password=password,
        first_name='Test', last_name='Employer', user_type='employer',
    )
    profile = EmployerProfile.objects.create(
        user=user, company_name='Test Clinic', company_type='employer',
    )
    return user, profile


def make_physician(email='physician@test.com', password='pass'):
    user = User.objects.create_user(
        email=email, password=password,
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
# Permission tests
# ─────────────────────────────────────────────────────────────────────────────

class IsPhysicianPermissionTest(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()
        self.perm = IsPhysician()
        self.physician_user, _ = make_physician()
        self.employer_user, _ = make_employer()

    def _request(self, user):
        req = self.factory.get('/')
        req.user = user
        return req

    def test_physician_allowed(self):
        req = self._request(self.physician_user)
        self.assertTrue(self.perm.has_permission(req, None))

    def test_employer_denied(self):
        req = self._request(self.employer_user)
        self.assertFalse(self.perm.has_permission(req, None))

    def test_anonymous_denied(self):
        from django.contrib.auth.models import AnonymousUser
        req = self._request(AnonymousUser())
        self.assertFalse(self.perm.has_permission(req, None))


class IsEmployerPermissionTest(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()
        self.perm = IsEmployer()
        self.physician_user, _ = make_physician()
        self.employer_user, _ = make_employer()

    def _request(self, user):
        req = self.factory.get('/')
        req.user = user
        return req

    def test_employer_allowed(self):
        req = self._request(self.employer_user)
        self.assertTrue(self.perm.has_permission(req, None))

    def test_physician_denied(self):
        req = self._request(self.physician_user)
        self.assertFalse(self.perm.has_permission(req, None))

    def test_anonymous_denied(self):
        from django.contrib.auth.models import AnonymousUser
        req = self._request(AnonymousUser())
        self.assertFalse(self.perm.has_permission(req, None))


class IsOwnerOrAdminPermissionTest(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()
        self.perm = IsOwnerOrAdmin()
        self.employer_user, self.employer_profile = make_employer('emp@test.com')
        self.other_user, self.other_profile = make_employer('other@test.com')
        self.admin_user = User.objects.create_user(
            email='admin@test.com', password='pass',
            first_name='Admin', last_name='User', user_type='admin',
            is_staff=True,
        )
        self.job = make_job(self.employer_profile)

    def _request(self, user):
        req = self.factory.get('/')
        req.user = user
        return req

    def test_owner_allowed(self):
        req = self._request(self.employer_user)
        self.assertTrue(self.perm.has_object_permission(req, None, self.job))

    def test_admin_allowed(self):
        req = self._request(self.admin_user)
        self.assertTrue(self.perm.has_object_permission(req, None, self.job))

    def test_other_employer_denied(self):
        req = self._request(self.other_user)
        self.assertFalse(self.perm.has_object_permission(req, None, self.job))

    def test_anonymous_denied(self):
        from django.contrib.auth.models import AnonymousUser
        req = self._request(AnonymousUser())
        self.assertFalse(self.perm.has_object_permission(req, None, self.job))


# ─────────────────────────────────────────────────────────────────────────────
# Subscription quota tests
# ─────────────────────────────────────────────────────────────────────────────

class CheckJobPostingLimitTest(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.employer_user, self.employer_profile = make_employer()

    def test_no_subscription_denied(self):
        from services.subscription_service import check_job_posting_limit
        from subscriptions.models import UserSubscription
        UserSubscription.objects.filter(user=self.employer_user).delete()
        allowed, msg = check_job_posting_limit(self.employer_user, self.employer_profile)
        self.assertFalse(allowed)
        self.assertIn('No active subscription', msg)

    def test_inactive_subscription_denied(self):
        from services.subscription_service import check_job_posting_limit
        from subscriptions.models import SubscriptionPlan, UserSubscription
        plan = SubscriptionPlan.objects.create(name='Basic', price_monthly=50, job_post_limit=5)
        UserSubscription.objects.filter(user=self.employer_user).update(plan=plan, status='inactive')
        allowed, msg = check_job_posting_limit(self.employer_user, self.employer_profile)
        self.assertFalse(allowed)
        self.assertIn('not active', msg)

    def test_active_subscription_within_limit_allowed(self):
        from services.subscription_service import check_job_posting_limit
        from subscriptions.models import SubscriptionPlan, UserSubscription
        plan = SubscriptionPlan.objects.create(name='Pro', price_monthly=99, job_post_limit=5)
        UserSubscription.objects.filter(user=self.employer_user).update(plan=plan, status='active')
        allowed, msg = check_job_posting_limit(self.employer_user, self.employer_profile)
        self.assertTrue(allowed)
        self.assertIsNone(msg)

    def test_active_subscription_at_limit_denied(self):
        from services.subscription_service import check_job_posting_limit
        from subscriptions.models import SubscriptionPlan, UserSubscription
        plan = SubscriptionPlan.objects.create(name='Starter', price_monthly=49, job_post_limit=2)
        UserSubscription.objects.filter(user=self.employer_user).update(plan=plan, status='active')
        make_job(self.employer_profile, title='Job One is here for testing')
        make_job(self.employer_profile, title='Job Two is here for testing')
        allowed, msg = check_job_posting_limit(self.employer_user, self.employer_profile)
        self.assertFalse(allowed)
        self.assertIn('limit reached', msg)

    def test_unlimited_plan_always_allowed(self):
        from services.subscription_service import check_job_posting_limit
        from subscriptions.models import SubscriptionPlan, UserSubscription
        plan = SubscriptionPlan.objects.create(name='Enterprise', price_monthly=500, job_post_limit=None)
        UserSubscription.objects.filter(user=self.employer_user).update(plan=plan, status='active')
        for i in range(20):
            make_job(self.employer_profile, title=f'Job {i} for test purposes only here')
        allowed, msg = check_job_posting_limit(self.employer_user, self.employer_profile)
        self.assertTrue(allowed)
        self.assertIsNone(msg)


# ─────────────────────────────────────────────────────────────────────────────
# Serializer validation tests
# ─────────────────────────────────────────────────────────────────────────────

class JobCreateUpdateSerializerTest(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.employer_user, self.employer_profile = make_employer()
        self.factory = APIRequestFactory()

    def _req(self):
        req = self.factory.post('/')
        req.user = self.employer_user
        return req

    def _valid_data(self, **overrides):
        data = {
            'title': 'Family Physician Position in BC',
            'specialty': 'family_medicine',
            'province': 'BC',
            'city': 'Vancouver',
            'description': 'A' * 60,
            'qualifications': 'Fellowship required',
            'job_type': 'full_time',
            'is_active': True,
        }
        data.update(overrides)
        return data

    def test_valid_data_passes(self):
        s = JobCreateUpdateSerializer(data=self._valid_data(), context={'request': self._req()})
        self.assertTrue(s.is_valid(), s.errors)

    def test_short_title_rejected(self):
        s = JobCreateUpdateSerializer(data=self._valid_data(title='Doc'), context={'request': self._req()})
        self.assertFalse(s.is_valid())
        self.assertIn('title', s.errors)

    def test_short_description_rejected(self):
        s = JobCreateUpdateSerializer(
            data=self._valid_data(description='Too short'),
            context={'request': self._req()},
        )
        self.assertFalse(s.is_valid())
        self.assertIn('description', s.errors)

    def test_create_sets_employer(self):
        s = JobCreateUpdateSerializer(data=self._valid_data(), context={'request': self._req()})
        self.assertTrue(s.is_valid())
        job = s.save()
        self.assertEqual(job.employer, self.employer_profile)


class JobApplicationCreateSerializerTest(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.employer_user, self.employer_profile = make_employer()
        self.physician_user, self.physician_profile = make_physician()
        self.job = make_job(self.employer_profile)
        self.factory = APIRequestFactory()

    def _req(self):
        req = self.factory.post('/')
        req.user = self.physician_user
        return req

    def test_duplicate_application_rejected(self):
        JobApplication.objects.create(job=self.job, physician=self.physician_profile)
        s = JobApplicationCreateSerializer(
            data={'cover_letter': 'I am interested.'},
            context={'request': self._req(), 'job': self.job},
        )
        self.assertFalse(s.is_valid())

    def test_inactive_job_rejected(self):
        self.job.is_active = False
        self.job.save()
        s = JobApplicationCreateSerializer(
            data={'cover_letter': 'I am interested.'},
            context={'request': self._req(), 'job': self.job},
        )
        self.assertFalse(s.is_valid())

    def test_unapproved_job_rejected(self):
        self.job.is_approved = False
        self.job.save()
        s = JobApplicationCreateSerializer(
            data={'cover_letter': 'I am interested.'},
            context={'request': self._req(), 'job': self.job},
        )
        self.assertFalse(s.is_valid())


# ─────────────────────────────────────────────────────────────────────────────
# API endpoint integration tests
# ─────────────────────────────────────────────────────────────────────────────

class JobListAPITest(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        _, self.employer_profile = make_employer()
        self.job = make_job(self.employer_profile)

    def test_public_can_list_approved_jobs(self):
        resp = self.client.get('/api/jobs/')
        self.assertEqual(resp.status_code, 200)

    def test_unapproved_job_hidden_from_public(self):
        self.job.is_approved = False
        self.job.save()
        resp = self.client.get('/api/jobs/')
        data = resp.data.get('data', resp.data)
        ids = [j['id'] for j in (data.get('results', data) if isinstance(data, dict) else data)]
        self.assertNotIn(self.job.id, ids)

    def test_applications_count_in_list_response(self):
        resp = self.client.get('/api/jobs/')
        data = resp.data.get('data', resp.data)
        results = data.get('results', data) if isinstance(data, dict) else data
        if results:
            self.assertIn('applications_count', results[0])


class JobCreateAPITest(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.employer_user, self.employer_profile = make_employer()

    def _payload(self):
        return {
            'title': 'Psychiatrist Wanted in Alberta',
            'specialty': 'psychiatry',
            'province': 'AB',
            'city': 'Calgary',
            'description': 'B' * 60,
            'qualifications': 'Board certified',
            'job_type': 'full_time',
            'is_active': True,
        }

    def test_unauthenticated_cannot_post(self):
        resp = self.client.post('/api/jobs/', self._payload(), format='json')
        self.assertIn(resp.status_code, [401, 403])

    def test_employer_without_subscription_cannot_post(self):
        from subscriptions.models import UserSubscription
        UserSubscription.objects.filter(user=self.employer_user).delete()
        self.client.force_authenticate(user=self.employer_user)
        resp = self.client.post('/api/jobs/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 403)

    def test_employer_with_active_subscription_can_post(self):
        from subscriptions.models import UserSubscription
        UserSubscription.objects.filter(user=self.employer_user).update(status='active')
        self.client.force_authenticate(user=self.employer_user)
        resp = self.client.post('/api/jobs/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 201)
