from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import PhysicianProfile, EmployerProfile
from subscriptions.models import SubscriptionPlan

User = get_user_model()


def make_free_plan():
    plan, _ = SubscriptionPlan.objects.get_or_create(
        name='Free',
        defaults=dict(plan_type='employer', price_monthly=0, is_free=True),
    )
    return plan


# ─────────────────────────────────────────────────────────────────────────────
# Registration
# ─────────────────────────────────────────────────────────────────────────────

class PhysicianRegistrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _payload(self, **overrides):
        data = {
            'email': 'doc@test.com',
            'confirm_email': 'doc@test.com',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'password': 'StrongPass1',
            'confirm_password': 'StrongPass1',
            'terms_accepted': True,
        }
        data.update(overrides)
        return data

    def test_valid_registration_creates_user_and_profile(self):
        resp = self.client.post('/api/auth/register/physician/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(User.objects.filter(email='doc@test.com').exists())
        user = User.objects.get(email='doc@test.com')
        self.assertEqual(user.user_type, 'physician')
        self.assertTrue(hasattr(user, 'physician_profile'))

    def test_returns_jwt_tokens(self):
        resp = self.client.post('/api/auth/register/physician/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 201)
        data = resp.data.get('data', {})
        self.assertIn('access', data)
        self.assertIn('refresh', data)

    def test_duplicate_email_rejected(self):
        self.client.post('/api/auth/register/physician/', self._payload(), format='json')
        resp = self.client.post('/api/auth/register/physician/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 400)

    def test_mismatched_passwords_rejected(self):
        resp = self.client.post(
            '/api/auth/register/physician/',
            self._payload(confirm_password='DifferentPass1'),
            format='json',
        )
        self.assertEqual(resp.status_code, 400)

    def test_mismatched_emails_rejected(self):
        resp = self.client.post(
            '/api/auth/register/physician/',
            self._payload(confirm_email='other@test.com'),
            format='json',
        )
        self.assertEqual(resp.status_code, 400)

    def test_terms_not_accepted_rejected(self):
        resp = self.client.post(
            '/api/auth/register/physician/',
            self._payload(terms_accepted=False),
            format='json',
        )
        self.assertEqual(resp.status_code, 400)

    def test_weak_password_rejected(self):
        self.client = APIClient()  # fresh client to avoid throttle state
        resp = self.client.post(
            '/api/auth/register/physician/',
            self._payload(email='weakpass@test.com', confirm_email='weakpass@test.com',
                          password='weak', confirm_password='weak'),
            format='json',
        )
        self.assertIn(resp.status_code, [400, 429])


class EmployerRegistrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        make_free_plan()

    def _payload(self, **overrides):
        data = {
            'email': 'emp@test.com',
            'confirm_email': 'emp@test.com',
            'first_name': 'John',
            'last_name': 'Doe',
            'password': 'StrongPass1',
            'confirm_password': 'StrongPass1',
            'terms_accepted': True,
            'company_name': 'Test Hospital',
            'company_type': 'employer',
        }
        data.update(overrides)
        return data

    def test_valid_registration_creates_employer_and_profile(self):
        resp = self.client.post('/api/auth/register/employer/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 201)
        user = User.objects.get(email='emp@test.com')
        self.assertEqual(user.user_type, 'employer')
        self.assertTrue(hasattr(user, 'employer_profile'))
        self.assertEqual(user.employer_profile.company_name, 'Test Hospital')

    def test_duplicate_email_rejected(self):
        self.client.post('/api/auth/register/employer/', self._payload(), format='json')
        resp = self.client.post('/api/auth/register/employer/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 400)


# ─────────────────────────────────────────────────────────────────────────────
# Login
# ─────────────────────────────────────────────────────────────────────────────

class LoginTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        make_free_plan()
        self.user = User.objects.create_user(
            email='user@test.com', password='StrongPass1',
            first_name='Test', last_name='User', user_type='physician',
        )

    def test_valid_login_returns_tokens(self):
        resp = self.client.post('/api/auth/login/', {
            'email': 'user@test.com', 'password': 'StrongPass1',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get('data', {})
        self.assertIn('access', data)
        self.assertIn('refresh', data)

    def test_wrong_password_rejected(self):
        resp = self.client.post('/api/auth/login/', {
            'email': 'user@test.com', 'password': 'wrongpass',
        }, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_unknown_email_rejected(self):
        resp = self.client.post('/api/auth/login/', {
            'email': 'nobody@test.com', 'password': 'pass',
        }, format='json')
        self.assertEqual(resp.status_code, 401)


# ─────────────────────────────────────────────────────────────────────────────
# Password reset
# ─────────────────────────────────────────────────────────────────────────────

class PasswordResetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        make_free_plan()
        self.user = User.objects.create_user(
            email='reset@test.com', password='OldPass1',
            first_name='Reset', last_name='User', user_type='physician',
        )

    def test_reset_request_with_known_email_returns_200(self):
        resp = self.client.post('/api/auth/password/reset/', {
            'email': 'reset@test.com',
        }, format='json')
        self.assertEqual(resp.status_code, 200)

    def test_reset_request_with_unknown_email_still_200(self):
        resp = self.client.post('/api/auth/password/reset/', {
            'email': 'nobody@test.com',
        }, format='json')
        self.assertEqual(resp.status_code, 200)

    def test_invalid_reset_token_rejected(self):
        resp = self.client.post('/api/auth/password/reset/confirm/', {
            'uid': 'invalid-uid',
            'token': 'invalid-token',
            'new_password': 'NewPass123',
            'confirm_password': 'NewPass123',
        }, format='json')
        self.assertEqual(resp.status_code, 400)


# ─────────────────────────────────────────────────────────────────────────────
# Current user / profile
# ─────────────────────────────────────────────────────────────────────────────

class CurrentUserTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        make_free_plan()
        self.user = User.objects.create_user(
            email='me@test.com', password='StrongPass1',
            first_name='Me', last_name='User', user_type='physician',
        )

    def test_unauthenticated_denied(self):
        resp = self.client.get('/api/auth/me/')
        self.assertIn(resp.status_code, [401, 403])

    def test_authenticated_returns_user_data(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get('/api/auth/me/')
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get('data', resp.data)
        self.assertEqual(data['email'], 'me@test.com')
        self.assertEqual(data['user_type'], 'physician')
