import json
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from accounts.models import EmployerProfile
from subscriptions.models import SubscriptionPlan, UserSubscription, PaymentHistory

User = get_user_model()


def make_free_plan():
    plan, _ = SubscriptionPlan.objects.get_or_create(
        name='Free',
        defaults=dict(plan_type='employer', price_monthly=0, is_free=True),
    )
    return plan


def make_employer(email='emp@test.com'):
    make_free_plan()
    user = User.objects.create_user(
        email=email, password='StrongPass1',
        first_name='Test', last_name='Employer', user_type='employer',
    )
    EmployerProfile.objects.create(user=user, company_name='Test Co', company_type='employer')
    return user


# ─────────────────────────────────────────────────────────────────────────────
# Plan list
# ─────────────────────────────────────────────────────────────────────────────

class EmployerPlanListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        make_free_plan()
        SubscriptionPlan.objects.create(name='Pro', plan_type='employer', price_monthly=99)

    def test_plans_returned_publicly(self):
        resp = self.client.get('/api/subscriptions/plans/employer/')
        self.assertEqual(resp.status_code, 200)

    def test_only_employer_plans_returned(self):
        resp = self.client.get('/api/subscriptions/plans/employer/')
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get('data', resp.data)
        plans = data if isinstance(data, list) else data.get('results', [])
        self.assertTrue(len(plans) > 0)
        for plan in plans:
            self.assertIn('name', plan)
            self.assertIn('price_monthly', plan)


# ─────────────────────────────────────────────────────────────────────────────
# My subscription view
# ─────────────────────────────────────────────────────────────────────────────

class MySubscriptionViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_employer()

    def test_unauthenticated_denied(self):
        resp = self.client.get('/api/subscriptions/my-subscription/')
        self.assertIn(resp.status_code, [401, 403])

    def test_authenticated_returns_subscription_data(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get('/api/subscriptions/my-subscription/')
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get('data', resp.data)
        self.assertIn('plan_name', data)
        self.assertIn('status', data)

    def test_no_subscription_row_returns_free_plan(self):
        UserSubscription.objects.filter(user=self.user).delete()
        self.client.force_authenticate(user=self.user)
        resp = self.client.get('/api/subscriptions/my-subscription/')
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get('data', resp.data)
        self.assertEqual(data.get('plan_name'), 'Free')


# ─────────────────────────────────────────────────────────────────────────────
# Stripe webhook — security
# ─────────────────────────────────────────────────────────────────────────────

class StripeWebhookSecurityTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/subscriptions/webhook/'

    def test_missing_webhook_secret_returns_403(self):
        with self.settings(STRIPE_WEBHOOK_SECRET=''):
            resp = self.client.post(
                self.url, data=b'{}',
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='t=1,v1=abc',
            )
        self.assertEqual(resp.status_code, 403)

    def test_invalid_signature_returns_400(self):
        with self.settings(STRIPE_WEBHOOK_SECRET='whsec_test'):
            resp = self.client.post(
                self.url, data=b'{}',
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='t=1,v1=badsignature',
            )
        self.assertEqual(resp.status_code, 400)

    def test_missing_signature_header_returns_400(self):
        with self.settings(STRIPE_WEBHOOK_SECRET='whsec_test'):
            resp = self.client.post(
                self.url, data=b'{}',
                content_type='application/json',
            )
        self.assertEqual(resp.status_code, 400)


# ─────────────────────────────────────────────────────────────────────────────
# Stripe webhook — subscription.deleted event (mocked construct_event)
# ─────────────────────────────────────────────────────────────────────────────

class StripeWebhookEventTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/subscriptions/webhook/'
        self.user = make_employer('webhook@test.com')

    def test_subscription_deleted_sets_cancelled(self):
        sub = UserSubscription.objects.filter(user=self.user).first()
        self.assertIsNotNone(sub)
        sub.stripe_subscription_id = 'sub_test123'
        sub.save()

        inner_obj = MagicMock()
        inner_obj.id = 'sub_test123'

        mock_event = MagicMock()
        mock_event.__getitem__ = lambda s, k: {
            'type': 'customer.subscription.deleted',
            'data': {'object': inner_obj},
        }[k]

        with patch('stripe.Webhook.construct_event', return_value=mock_event):
            with self.settings(STRIPE_WEBHOOK_SECRET='whsec_test'):
                resp = self.client.post(
                    self.url, data=b'{}',
                    content_type='application/json',
                    HTTP_STRIPE_SIGNATURE='t=1,v1=mocked',
                )
        self.assertEqual(resp.status_code, 200)
        sub.refresh_from_db()
        self.assertEqual(sub.status, 'cancelled')

    def test_invoice_payment_failed_sets_past_due(self):
        sub = UserSubscription.objects.filter(user=self.user).first()
        self.assertIsNotNone(sub)
        sub.stripe_subscription_id = 'sub_fail456'
        sub.save()

        inner_obj = MagicMock()
        inner_obj.subscription = 'sub_fail456'

        mock_event = MagicMock()
        mock_event.__getitem__ = lambda s, k: {
            'type': 'invoice.payment_failed',
            'data': {'object': inner_obj},
        }[k]

        with patch('stripe.Webhook.construct_event', return_value=mock_event):
            with self.settings(STRIPE_WEBHOOK_SECRET='whsec_test'):
                resp = self.client.post(
                    self.url, data=b'{}',
                    content_type='application/json',
                    HTTP_STRIPE_SIGNATURE='t=1,v1=mocked',
                )
        self.assertEqual(resp.status_code, 200)
        sub.refresh_from_db()
        self.assertEqual(sub.status, 'past_due')


# ─────────────────────────────────────────────────────────────────────────────
# Payment history
# ─────────────────────────────────────────────────────────────────────────────

class PaymentHistoryTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_employer()
        PaymentHistory.objects.create(
            user=self.user, amount=99, currency='cad',
            status='succeeded', description='Pro Plan — Monthly',
        )

    def test_unauthenticated_denied(self):
        resp = self.client.get('/api/subscriptions/payments/')
        self.assertIn(resp.status_code, [401, 403])

    def test_authenticated_returns_history(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get('/api/subscriptions/payments/')
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get('data', resp.data)
        results = data.get('results', data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['currency'], 'cad')

    def test_user_only_sees_own_payments(self):
        other = make_employer('other@test.com')
        PaymentHistory.objects.create(
            user=other, amount=50, currency='cad',
            status='succeeded', description='Other Plan',
        )
        self.client.force_authenticate(user=self.user)
        resp = self.client.get('/api/subscriptions/payments/')
        data = resp.data.get('data', resp.data)
        results = data.get('results', data)
        self.assertEqual(len(results), 1)
