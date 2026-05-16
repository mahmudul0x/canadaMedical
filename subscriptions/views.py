import stripe
import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView

from core.exceptions import success_response
from core.permissions import IsEmployer, IsAdminUser
from .models import SubscriptionPlan, UserSubscription, PaymentHistory, EnterpriseRequest, CustomSubscriptionPlan
from .serializers import (
    SubscriptionPlanSerializer, UserSubscriptionSerializer, PaymentHistorySerializer,
    EnterpriseRequestSerializer, EnterpriseRequestAdminSerializer, CustomSubscriptionPlanSerializer,
)

logger = logging.getLogger(__name__)


def _stripe():
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


class EmployerPlanListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        plans = SubscriptionPlan.objects.filter(plan_type='employer')
        return success_response(data=SubscriptionPlanSerializer(plans, many=True).data)


class CreateCheckoutSessionView(APIView):
    permission_classes = [IsEmployer]

    def post(self, request):
        plan_id = request.data.get('plan_id')
        if not plan_id:
            return success_response(
                message='plan_id is required.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            plan = SubscriptionPlan.objects.get(pk=plan_id, plan_type='employer')
        except SubscriptionPlan.DoesNotExist:
            return success_response(message='Plan not found.', status_code=status.HTTP_404_NOT_FOUND)

        if not plan.stripe_price_id:
            return success_response(
                message='This plan does not support online checkout. Please contact sales.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        s = _stripe()
        try:
            session = s.checkout.Session.create(
                payment_method_types=['card'],
                mode='subscription',
                line_items=[{'price': plan.stripe_price_id, 'quantity': 1}],
                success_url=f"{settings.FRONTEND_URL}/dashboard/employer?subscription=success",
                cancel_url=f"{settings.FRONTEND_URL}/employers?subscription=cancelled",
                customer_email=request.user.email,
                metadata={
                    'user_id': str(request.user.id),
                    'plan_id': str(plan.id),
                },
            )
        except stripe.StripeError as e:
            logger.error('Stripe checkout error: %s', e)
            return success_response(
                message='Payment provider error. Please try again.',
                status_code=status.HTTP_502_BAD_GATEWAY,
            )

        return success_response(data={'checkout_url': session.url})


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')

        s = _stripe()
        try:
            event = s.Webhook.construct_event(payload, sig_header, webhook_secret)
        except (ValueError, stripe.SignatureVerificationError):
            return HttpResponse(status=400)

        event_type = event['type']
        data = event['data']['object']

        try:
            if event_type == 'checkout.session.completed':
                self._handle_checkout_completed(data)
            elif event_type == 'customer.subscription.updated':
                self._handle_subscription_updated(data)
            elif event_type == 'customer.subscription.deleted':
                sub_id = getattr(data, 'id', '') or ''
                UserSubscription.objects.filter(stripe_subscription_id=sub_id).update(status='cancelled')
            elif event_type == 'invoice.payment_succeeded':
                self._handle_invoice_paid(data)
            elif event_type == 'invoice.payment_failed':
                sub_id = getattr(data, 'subscription', '') or ''
                UserSubscription.objects.filter(stripe_subscription_id=sub_id).update(status='past_due')
        except Exception as e:
            logger.exception('Webhook handler error for event %s: %s', event_type, e)
            return HttpResponse(status=500)

        return HttpResponse(status=200)

    def _handle_checkout_completed(self, session):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        metadata = getattr(session, 'metadata', None) or {}
        user_id = metadata.get('user_id') if hasattr(metadata, 'get') else getattr(metadata, 'user_id', None)
        plan_id = metadata.get('plan_id') if hasattr(metadata, 'get') else getattr(metadata, 'plan_id', None)
        is_custom_plan = (metadata.get('custom_plan') if hasattr(metadata, 'get') else getattr(metadata, 'custom_plan', None)) == 'true'
        enterprise_request_id = metadata.get('enterprise_request_id') if hasattr(metadata, 'get') else getattr(metadata, 'enterprise_request_id', None)
        customer_id = getattr(session, 'customer', '') or ''
        subscription_id = getattr(session, 'subscription', '') or ''

        if not user_id:
            return

        try:
            user = User.objects.get(pk=user_id)
        except Exception:
            return

        amount_total = getattr(session, 'amount_total', None) or 0
        currency = getattr(session, 'currency', 'cad') or 'cad'

        # ── Custom / Enterprise payment link ──────────────────────────────
        if is_custom_plan and enterprise_request_id:
            try:
                custom_plan = CustomSubscriptionPlan.objects.select_related('enterprise_request').get(
                    enterprise_request_id=enterprise_request_id
                )
                now = timezone.now()
                custom_plan.is_active = True
                custom_plan.payment_status = 'paid'
                custom_plan.save(update_fields=['is_active', 'payment_status', 'updated_at'])

                # Move UserSubscription to enterprise plan
                try:
                    enterprise_plan = SubscriptionPlan.objects.get(plan_type='employer', is_enterprise=True)
                    UserSubscription.objects.update_or_create(
                        user=user,
                        defaults={
                            'plan': enterprise_plan,
                            'stripe_customer_id': customer_id,
                            'stripe_subscription_id': subscription_id,
                            'status': 'active',
                            'cancel_at_period_end': False,
                            'current_period_start': now,
                            'current_period_end': now + timedelta(days=30),
                        },
                    )
                except SubscriptionPlan.DoesNotExist:
                    pass

                PaymentHistory.objects.create(
                    user=user,
                    amount=amount_total / 100,
                    currency=currency,
                    status='succeeded',
                    description=f'Enterprise Custom Plan — {custom_plan.enterprise_request.organization_name}',
                    stripe_payment_intent_id=getattr(session, 'payment_intent', '') or '',
                )
            except CustomSubscriptionPlan.DoesNotExist:
                logger.error('CustomSubscriptionPlan not found for enterprise_request_id=%s', enterprise_request_id)
            return

        # ── Standard plan checkout ─────────────────────────────────────────
        if not plan_id:
            return

        try:
            plan = SubscriptionPlan.objects.get(pk=plan_id)
        except Exception:
            return

        now = timezone.now()
        UserSubscription.objects.update_or_create(
            user=user,
            defaults={
                'plan': plan,
                'stripe_customer_id': customer_id,
                'stripe_subscription_id': subscription_id,
                'status': 'active',
                'cancel_at_period_end': False,
                'current_period_start': now,
                'current_period_end': now + timedelta(days=30),
            },
        )

        PaymentHistory.objects.create(
            user=user,
            amount=amount_total / 100,
            currency=currency,
            status='succeeded',
            description=f'{plan.name} Plan — Monthly',
            stripe_payment_intent_id=getattr(session, 'payment_intent', '') or '',
        )

    def _handle_subscription_updated(self, sub):
        sub_id = getattr(sub, 'id', '') or ''
        if not sub_id:
            return

        period_end = getattr(sub, 'current_period_end', None)
        period_start = getattr(sub, 'current_period_start', None)
        cancel_at = getattr(sub, 'cancel_at_period_end', False)
        stripe_status = getattr(sub, 'status', 'active') or 'active'

        status_map = {
            'active':   'active',
            'past_due': 'past_due',
            'canceled': 'cancelled',
            'trialing': 'trialing',
            'unpaid':   'past_due',
        }

        updates = {
            'status': status_map.get(stripe_status, 'inactive'),
            'cancel_at_period_end': cancel_at,
        }
        if period_start:
            updates['current_period_start'] = datetime.fromtimestamp(
                period_start, tz=dt_timezone.utc
            )
        if period_end:
            updates['current_period_end'] = datetime.fromtimestamp(
                period_end, tz=dt_timezone.utc
            )

        UserSubscription.objects.filter(stripe_subscription_id=sub_id).update(**updates)

    def _handle_invoice_paid(self, invoice):
        sub_id = getattr(invoice, 'subscription', '') or ''
        if not sub_id:
            return
        try:
            user_sub = UserSubscription.objects.select_related('user', 'plan').get(
                stripe_subscription_id=sub_id
            )
        except UserSubscription.DoesNotExist:
            return

        period_end = getattr(invoice, 'period_end', None)
        if period_end:
            user_sub.current_period_end = datetime.fromtimestamp(
                period_end, tz=dt_timezone.utc
            )
            user_sub.status = 'active'
            user_sub.save(update_fields=['current_period_end', 'status'])

        amount_paid = getattr(invoice, 'amount_paid', 0) or 0
        PaymentHistory.objects.create(
            user=user_sub.user,
            amount=amount_paid / 100,
            currency=getattr(invoice, 'currency', 'usd') or 'usd',
            status='succeeded',
            description=f'{user_sub.plan.name} Plan — Renewal',
            stripe_payment_intent_id=getattr(invoice, 'payment_intent', '') or '',
            stripe_invoice_id=getattr(invoice, 'id', '') or '',
        )


class MySubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sub = UserSubscription.objects.select_related('plan').get(user=request.user)
        except UserSubscription.DoesNotExist:
            # No subscription row — return a synthetic free-plan object so the
            # frontend always has something to render (plan info + upgrade CTA).
            free_plan = SubscriptionPlan.objects.filter(is_free=True, plan_type='employer').first()
            import jobs.models as jobs_models
            try:
                jobs_posted = jobs_models.Job.objects.filter(
                    employer=request.user.employer_profile, is_active=True
                ).count()
            except Exception:
                jobs_posted = 0
            limit = free_plan.job_post_limit if free_plan else 1
            return success_response(data={
                'plan_name': free_plan.name if free_plan else 'Free',
                'plan_type': 'standard',
                'is_custom': False,
                'status': 'active',
                'price_monthly': str(free_plan.price_monthly) if free_plan else '0.00',
                'current_period_end': None,
                'days_remaining': None,
                'job_post_limit': limit,
                'jobs_posted': jobs_posted,
                'jobs_remaining': max(0, limit - jobs_posted) if limit is not None else None,
                'cancel_at_period_end': False,
            })

        data = UserSubscriptionSerializer(sub).data

        # Enrich with custom plan info if one exists (active OR pending payment)
        import datetime
        today = datetime.date.today()
        active_custom = None
        pending_custom = None
        try:
            cp = request.user.custom_plan
            if cp.is_active and (cp.valid_until is None or cp.valid_until >= today):
                active_custom = cp
            elif cp.payment_status == 'pending_payment':
                pending_custom = cp
        except CustomSubscriptionPlan.DoesNotExist:
            pass

        if active_custom:
            data['is_custom'] = True
            data['plan_type'] = 'enterprise_custom'
            data['custom_job_limit'] = active_custom.job_post_limit
            data['custom_price_monthly'] = str(active_custom.price_monthly)
            data['custom_features'] = active_custom.features
            data['custom_valid_until'] = str(active_custom.valid_until) if active_custom.valid_until else None
            data['custom_payment_status'] = 'paid'
            data['custom_payment_link'] = None
        elif pending_custom:
            # Plan approved but not yet paid — surface the payment link
            data['is_custom'] = True
            data['plan_type'] = 'enterprise_custom'
            data['custom_job_limit'] = pending_custom.job_post_limit
            data['custom_price_monthly'] = str(pending_custom.price_monthly)
            data['custom_features'] = pending_custom.features
            data['custom_valid_until'] = str(pending_custom.valid_until) if pending_custom.valid_until else None
            data['custom_payment_status'] = 'pending_payment'
            data['custom_payment_link'] = pending_custom.stripe_payment_link_url or None
        else:
            data['is_custom'] = False
            data['plan_type'] = 'enterprise' if sub.plan.is_enterprise else 'standard'
            data['custom_payment_status'] = None
            data['custom_payment_link'] = None

        return success_response(data=data)


class CancelSubscriptionView(APIView):
    permission_classes = [IsEmployer]

    def post(self, request):
        try:
            sub = UserSubscription.objects.get(user=request.user)
        except UserSubscription.DoesNotExist:
            return success_response(
                message='No active subscription found.', status_code=status.HTTP_404_NOT_FOUND
            )

        if not sub.stripe_subscription_id:
            return success_response(
                message='No Stripe subscription to cancel.', status_code=status.HTTP_400_BAD_REQUEST
            )

        s = _stripe()
        try:
            s.Subscription.modify(sub.stripe_subscription_id, cancel_at_period_end=True)
            sub.cancel_at_period_end = True
            sub.save(update_fields=['cancel_at_period_end'])
        except stripe.StripeError as e:
            logger.error('Stripe cancel error: %s', e)
            return success_response(
                message='Payment provider error.', status_code=status.HTTP_502_BAD_GATEWAY
            )

        return success_response(
            message='Subscription will cancel at the end of the current billing period.'
        )


class PaymentHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = PaymentHistory.objects.filter(user=request.user)
        return success_response(data=PaymentHistorySerializer(payments, many=True).data)


# ---------------------------------------------------------------------------
# Enterprise Plan views
# ---------------------------------------------------------------------------

class EnterpriseRequestCreateView(APIView):
    permission_classes = [IsEmployer]

    def post(self, request):
        from admin_panel.models import AdminNotification

        try:
            employer_profile = request.user.employer_profile
        except Exception:
            return success_response(
                message='Employer profile not found.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        serializer = EnterpriseRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return success_response(
                message='Invalid data.',
                data=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        enterprise_request = serializer.save(
            user=request.user,
            employer_profile=employer_profile,
        )

        AdminNotification.objects.create(
            notification_type='enterprise',
            title=f'New Enterprise Request: {enterprise_request.organization_name}',
            message=(
                f'{enterprise_request.contact_name} ({enterprise_request.contact_email}) '
                f'from {enterprise_request.organization_name} has submitted an enterprise plan request. '
                f'Hiring volume: {enterprise_request.get_monthly_hiring_volume_display()}.'
            ),
            related_id=enterprise_request.id,
        )

        return success_response(
            data=EnterpriseRequestSerializer(enterprise_request).data,
            message='Enterprise request submitted successfully. Our team will be in touch soon.',
            status_code=status.HTTP_201_CREATED,
        )


class MyEnterpriseRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        enterprise_request = EnterpriseRequest.objects.filter(user=request.user).first()
        if not enterprise_request:
            return success_response(data=None)
        return success_response(data=EnterpriseRequestSerializer(enterprise_request).data)


class AdminEnterpriseRequestListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        status_filter = request.query_params.get('status', '').strip()
        qs = EnterpriseRequest.objects.select_related('user', 'employer_profile', 'approved_by').all()
        if status_filter:
            qs = qs.filter(status=status_filter)
        return success_response(data=EnterpriseRequestAdminSerializer(qs, many=True).data)


class AdminEnterpriseRequestDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            enterprise_request = EnterpriseRequest.objects.select_related(
                'user', 'employer_profile', 'approved_by'
            ).get(pk=pk)
        except EnterpriseRequest.DoesNotExist:
            return success_response(message='Enterprise request not found.', status_code=status.HTTP_404_NOT_FOUND)
        return success_response(data=EnterpriseRequestAdminSerializer(enterprise_request).data)


class AdminEnterpriseRequestApproveView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            enterprise_request = EnterpriseRequest.objects.select_related('user', 'employer_profile').get(pk=pk)
        except EnterpriseRequest.DoesNotExist:
            return success_response(message='Enterprise request not found.', status_code=status.HTTP_404_NOT_FOUND)

        if enterprise_request.status == 'approved':
            return success_response(
                message='This request has already been approved.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        custom_job_limit = request.data.get('custom_job_limit', enterprise_request.custom_job_limit)
        custom_price_monthly = request.data.get('custom_price_monthly', enterprise_request.custom_price_monthly)
        custom_features = request.data.get('custom_features', enterprise_request.custom_features or [])
        admin_notes = request.data.get('admin_notes', enterprise_request.admin_notes)
        valid_until = request.data.get('valid_until')

        enterprise_request.custom_job_limit = custom_job_limit
        enterprise_request.custom_price_monthly = custom_price_monthly
        enterprise_request.custom_features = custom_features
        enterprise_request.admin_notes = admin_notes
        enterprise_request.status = 'approved'
        enterprise_request.approved_by = request.user
        enterprise_request.approved_at = timezone.now()
        enterprise_request.save()

        price_amount = float(custom_price_monthly or 0)
        is_free = price_amount == 0

        # Build Stripe payment link if there's a charge
        payment_link_id = ''
        payment_link_url = ''
        stripe_price_id = ''

        if not is_free:
            s = _stripe()
            try:
                # Create a one-time Stripe Price for this custom amount
                stripe_price = s.Price.create(
                    unit_amount=int(price_amount * 100),  # cents
                    currency='cad',
                    recurring={'interval': 'month'},
                    product_data={
                        'name': f"MedConnect Enterprise — {enterprise_request.organization_name}",
                    },
                    metadata={
                        'enterprise_request_id': str(enterprise_request.id),
                        'user_id': str(enterprise_request.user.id),
                    },
                )
                stripe_price_id = stripe_price.id

                # Create Stripe Payment Link
                pl = s.PaymentLink.create(
                    line_items=[{'price': stripe_price.id, 'quantity': 1}],
                    metadata={
                        'enterprise_request_id': str(enterprise_request.id),
                        'user_id': str(enterprise_request.user.id),
                        'custom_plan': 'true',
                    },
                    after_completion={
                        'type': 'redirect',
                        'redirect': {'url': f"{settings.FRONTEND_URL}/dashboard/employer?enterprise=paid"},
                    },
                )
                payment_link_id = pl.id
                payment_link_url = pl.url
            except Exception as e:
                logger.error('Stripe payment link creation failed: %s', e)
                return success_response(
                    message=f'Approval saved but Stripe error: {e}',
                    status_code=status.HTTP_502_BAD_GATEWAY,
                )

        # Create or update CustomSubscriptionPlan
        CustomSubscriptionPlan.objects.update_or_create(
            enterprise_request=enterprise_request,
            defaults={
                'user': enterprise_request.user,
                'job_post_limit': custom_job_limit,
                'price_monthly': price_amount,
                'features': custom_features,
                'is_active': is_free,          # free plans activate immediately
                'valid_until': valid_until,
                'payment_status': 'free' if is_free else 'pending_payment',
                'stripe_payment_link_id': payment_link_id,
                'stripe_payment_link_url': payment_link_url,
                'stripe_price_id': stripe_price_id,
            },
        )

        # For free custom plans activate UserSubscription to enterprise tier immediately
        if is_free:
            try:
                enterprise_plan = SubscriptionPlan.objects.get(plan_type='employer', is_enterprise=True)
                UserSubscription.objects.update_or_create(
                    user=enterprise_request.user,
                    defaults={
                        'plan': enterprise_plan,
                        'status': 'active',
                        'current_period_start': timezone.now(),
                    },
                )
            except SubscriptionPlan.DoesNotExist:
                pass

        return success_response(
            data=EnterpriseRequestAdminSerializer(enterprise_request).data,
            message='Enterprise request approved. Payment link sent to employer.' if not is_free else 'Enterprise request approved and plan activated.',
        )


class AdminEnterpriseRequestRejectView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            enterprise_request = EnterpriseRequest.objects.get(pk=pk)
        except EnterpriseRequest.DoesNotExist:
            return success_response(message='Enterprise request not found.', status_code=status.HTTP_404_NOT_FOUND)

        rejected_reason = request.data.get('rejected_reason', '')
        admin_notes = request.data.get('admin_notes', enterprise_request.admin_notes)

        enterprise_request.status = 'rejected'
        enterprise_request.rejected_reason = rejected_reason
        enterprise_request.admin_notes = admin_notes
        enterprise_request.save(update_fields=['status', 'rejected_reason', 'admin_notes', 'updated_at'])

        return success_response(
            data=EnterpriseRequestAdminSerializer(enterprise_request).data,
            message='Enterprise request rejected.',
        )


class AdminEnterpriseRequestReviewView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            enterprise_request = EnterpriseRequest.objects.get(pk=pk)
        except EnterpriseRequest.DoesNotExist:
            return success_response(message='Enterprise request not found.', status_code=status.HTTP_404_NOT_FOUND)

        admin_notes = request.data.get('admin_notes', enterprise_request.admin_notes)
        enterprise_request.status = 'reviewing'
        enterprise_request.admin_notes = admin_notes
        enterprise_request.save(update_fields=['status', 'admin_notes', 'updated_at'])

        return success_response(
            data=EnterpriseRequestAdminSerializer(enterprise_request).data,
            message='Enterprise request marked as reviewing.',
        )


class AdminCustomPlanListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        plans = CustomSubscriptionPlan.objects.select_related('user', 'enterprise_request').all()
        return success_response(data=CustomSubscriptionPlanSerializer(plans, many=True).data)


class AdminCustomPlanUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            plan = CustomSubscriptionPlan.objects.select_related('user').get(pk=pk)
        except CustomSubscriptionPlan.DoesNotExist:
            return success_response(message='Custom plan not found.', status_code=status.HTTP_404_NOT_FOUND)

        serializer = CustomSubscriptionPlanSerializer(plan, data=request.data, partial=True)
        if not serializer.is_valid():
            return success_response(
                message='Invalid data.',
                data=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save()
        return success_response(data=serializer.data, message='Custom plan updated.')
