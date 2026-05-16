import csv
from collections import defaultdict
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import EmployerProfile, PhysicianProfile
from assessments.models import CareerAssessment
from contact.models import ContactSubmission
from core.exceptions import success_response
from core.permissions import IsAdminUser
from faq.models import FAQ
from jobs.models import Job, JobApplication
from stats.models import PlatformStats
from testimonials.models import Testimonial

from .filters import AdminAssessmentFilter, AdminContactFilter, AdminJobFilter, AdminUserFilter
from .models import AdminNotification
from .serializers import (
    AdminAssessmentDetailSerializer,
    AdminAssessmentListSerializer,
    AdminContactDetailSerializer,
    AdminContactListSerializer,
    AdminFAQSerializer,
    AdminJobDetailSerializer,
    AdminJobListSerializer,
    AdminNotificationSerializer,
    AdminProfileSerializer,
    AdminStatsSerializer,
    AdminTestimonialSerializer,
    AdminUserDetailSerializer,
    AdminUserListSerializer,
)

User = get_user_model()

_JOB_ORDERING = {'created_at', '-created_at', 'title', '-title', 'is_approved', '-is_approved'}
_USER_ORDERING = {'date_joined', '-date_joined', 'email', '-email', 'first_name', '-first_name'}

_ADMIN_JOB_PARAMS = [
    OpenApiParameter('ordering', OpenApiTypes.STR, description='Sort field, e.g. -created_at'),
    OpenApiParameter('page', OpenApiTypes.INT),
    OpenApiParameter('page_size', OpenApiTypes.INT),
]
_ADMIN_USER_PARAMS = [
    OpenApiParameter('ordering', OpenApiTypes.STR, description='Sort field, e.g. -date_joined'),
    OpenApiParameter('page', OpenApiTypes.INT),
    OpenApiParameter('page_size', OpenApiTypes.INT),
]
_PAGE_PARAMS = [
    OpenApiParameter('page', OpenApiTypes.INT),
    OpenApiParameter('page_size', OpenApiTypes.INT),
]


class AdminResultsPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'data': data,
        })

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'success': {'type': 'boolean'},
                'count': {'type': 'integer'},
                'next': {'type': 'string', 'nullable': True},
                'previous': {'type': 'string', 'nullable': True},
                'data': schema,
            },
        }


def _paginate(request, queryset, serializer_class):
    paginator = AdminResultsPagination()
    page = paginator.paginate_queryset(queryset, request)
    if page is not None:
        return paginator.get_paginated_response(serializer_class(page, many=True).data)
    return success_response(data=serializer_class(queryset, many=True).data)


def _job_qs():
    return (
        Job.objects
        .select_related('employer')
        .annotate(total_applications=Count('applications'))
    )


# ── Dashboard ─────────────────────────────────────────────────────────────────

@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Dashboard'],
        operation_id='admin_dashboard',
        summary='Admin overview dashboard: stats, recent jobs/users, charts',
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        twelve_months_ago = timezone.now() - timedelta(days=365)

        growth_rows = (
            User.objects
            .filter(date_joined__gte=twelve_months_ago, user_type__in=['physician', 'employer'])
            .annotate(month=TruncMonth('date_joined'))
            .values('month', 'user_type')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        growth_map = defaultdict(lambda: {'physicians': 0, 'employers': 0})
        for row in growth_rows:
            key = row['month'].strftime('%b %Y')
            if row['user_type'] == 'physician':
                growth_map[key]['physicians'] += row['count']
            else:
                growth_map[key]['employers'] += row['count']
        user_growth_chart = [
            {'month': m, **counts} for m, counts in sorted(growth_map.items())
        ]

        monthly_revenue_chart = []
        for i in range(11, -1, -1):
            d = (timezone.now().replace(day=1) - timedelta(days=30 * i))
            monthly_revenue_chart.append({'month': d.strftime('%b %Y'), 'revenue': 0})

        recent_jobs = AdminJobListSerializer(
            _job_qs().order_by('-created_at')[:5], many=True
        ).data
        recent_users = AdminUserListSerializer(
            User.objects.filter(user_type__in=['physician', 'employer']).order_by('-date_joined')[:5],
            many=True,
        ).data

        return success_response(data={
            'stats': {
                'total_physicians': PhysicianProfile.objects.count(),
                'total_employers': EmployerProfile.objects.count(),
                'total_jobs': Job.objects.count(),
                'pending_jobs': Job.objects.filter(is_approved=False, rejected_at__isnull=True).count(),
                'active_jobs': Job.objects.filter(is_active=True, is_approved=True).count(),
                'total_applications': JobApplication.objects.count(),
                'total_assessments': CareerAssessment.objects.count(),
                'unreviewed_assessments': CareerAssessment.objects.filter(is_reviewed=False).count(),
                'unread_contacts': ContactSubmission.objects.filter(is_responded=False).count(),
                'total_revenue': '0.00',
                'monthly_revenue': '0.00',
                'active_subscriptions': 0,
            },
            'recent_jobs': recent_jobs,
            'recent_users': recent_users,
            'monthly_revenue_chart': monthly_revenue_chart,
            'user_growth_chart': user_growth_chart,
        })


# ── Job Management ────────────────────────────────────────────────────────────

@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Jobs'],
        operation_id='admin_job_list',
        summary='List all jobs with filters (admin)',
        responses={200: AdminJobListSerializer},
        parameters=_ADMIN_JOB_PARAMS,
    ),
)
class AdminJobListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = AdminJobFilter(request.GET, queryset=_job_qs()).qs
        ordering = request.GET.get('ordering', '-created_at')
        if ordering in _JOB_ORDERING:
            qs = qs.order_by(ordering)
        return _paginate(request, qs, AdminJobListSerializer)


@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Jobs'],
        operation_id='admin_pending_jobs',
        summary='List jobs pending approval (admin)',
        responses={200: AdminJobListSerializer},
        parameters=_PAGE_PARAMS,
    ),
)
class AdminPendingJobsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = (
            _job_qs()
            .filter(is_approved=False, rejected_at__isnull=True)
            .order_by('-created_at')
        )
        return _paginate(request, qs, AdminJobListSerializer)


@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Jobs'],
        operation_id='admin_job_detail',
        summary='Get full job detail (admin)',
        responses={200: AdminJobDetailSerializer},
    ),
    delete=extend_schema(
        tags=['Admin - Jobs'],
        operation_id='admin_job_delete',
        summary='Delete a job (admin)',
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class AdminJobDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        job = get_object_or_404(_job_qs(), pk=pk)
        return success_response(data=AdminJobDetailSerializer(job).data)

    def delete(self, request, pk):
        job = get_object_or_404(Job, pk=pk)
        job.delete()
        return success_response(message='Job deleted successfully.')


@extend_schema_view(
    patch=extend_schema(
        tags=['Admin - Jobs'],
        operation_id='admin_job_approve',
        summary='Approve a job posting (admin)',
        request=None,
        responses={200: AdminJobDetailSerializer},
    ),
)
class AdminJobApproveView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        job = get_object_or_404(Job, pk=pk)
        job.is_approved = True
        job.is_active = True
        job.approved_at = timezone.now()
        job.rejected_at = None
        job.rejection_reason = ''
        job.save(update_fields=['is_approved', 'is_active', 'approved_at', 'rejected_at', 'rejection_reason'])
        return success_response(
            data=AdminJobDetailSerializer(get_object_or_404(_job_qs(), pk=pk)).data,
            message='Job approved successfully.',
        )


@extend_schema_view(
    patch=extend_schema(
        tags=['Admin - Jobs'],
        operation_id='admin_job_reject',
        summary='Reject a job posting with a reason (admin)',
        request={
            'application/json': {
                'type': 'object',
                'properties': {'reason': {'type': 'string'}},
                'required': ['reason'],
            }
        },
        responses={200: AdminJobDetailSerializer},
    ),
)
class AdminJobRejectView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        reason = request.data.get('reason', '').strip()
        if not reason:
            return success_response(
                message='A rejection reason is required.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        job = get_object_or_404(Job, pk=pk)
        job.is_approved = False
        job.is_active = False
        job.rejection_reason = reason
        job.rejected_at = timezone.now()
        job.approved_at = None
        job.save(update_fields=['is_approved', 'is_active', 'rejection_reason', 'rejected_at', 'approved_at'])
        return success_response(
            data=AdminJobDetailSerializer(get_object_or_404(_job_qs(), pk=pk)).data,
            message='Job rejected.',
        )


# ── User Management ───────────────────────────────────────────────────────────

@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Users'],
        operation_id='admin_user_list',
        summary='List all physicians and employers (admin)',
        responses={200: AdminUserListSerializer},
        parameters=_ADMIN_USER_PARAMS,
    ),
)
class AdminUserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = AdminUserFilter(
            request.GET,
            queryset=User.objects.filter(user_type__in=['physician', 'employer']),
        ).qs
        ordering = request.GET.get('ordering', '-date_joined')
        if ordering in _USER_ORDERING:
            qs = qs.order_by(ordering)
        return _paginate(request, qs, AdminUserListSerializer)


@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Users'],
        operation_id='admin_physicians_list',
        summary='List all physician users (admin)',
        responses={200: AdminUserListSerializer},
        parameters=_PAGE_PARAMS,
    ),
)
class AdminPhysiciansView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = AdminUserFilter(
            request.GET,
            queryset=User.objects.filter(user_type='physician').order_by('-date_joined'),
        ).qs
        return _paginate(request, qs, AdminUserListSerializer)


@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Users'],
        operation_id='admin_employers_list',
        summary='List all employer users (admin)',
        responses={200: AdminUserListSerializer},
        parameters=_PAGE_PARAMS,
    ),
)
class AdminEmployersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = AdminUserFilter(
            request.GET,
            queryset=User.objects.filter(user_type='employer').order_by('-date_joined'),
        ).qs
        return _paginate(request, qs, AdminUserListSerializer)


@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Users'],
        operation_id='admin_user_detail',
        summary='Get full user detail (admin)',
        responses={200: AdminUserDetailSerializer},
    ),
    delete=extend_schema(
        tags=['Admin - Users'],
        operation_id='admin_user_delete',
        summary='Delete a user account (admin)',
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        return success_response(data=AdminUserDetailSerializer(user).data)

    def delete(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user == request.user:
            return success_response(
                message='You cannot delete your own account.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        user.delete()
        return success_response(message='User deleted successfully.')


@extend_schema_view(
    patch=extend_schema(
        tags=['Admin - Users'],
        operation_id='admin_user_activate',
        summary='Activate a user account (admin)',
        request=None,
        responses={200: AdminUserDetailSerializer},
    ),
)
class AdminUserActivateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        user.is_active = True
        user.save(update_fields=['is_active'])
        return success_response(data=AdminUserDetailSerializer(user).data, message='User activated.')


@extend_schema_view(
    patch=extend_schema(
        tags=['Admin - Users'],
        operation_id='admin_user_deactivate',
        summary='Deactivate a user account (admin)',
        request=None,
        responses={200: AdminUserDetailSerializer},
    ),
)
class AdminUserDeactivateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        if user == request.user:
            return success_response(
                message='You cannot deactivate your own account.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=['is_active'])
        return success_response(data=AdminUserDetailSerializer(user).data, message='User deactivated.')


# ── Assessment Management ──────────────────────────────────────────────────────

@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Assessments'],
        operation_id='admin_assessment_list',
        summary='List all career assessment submissions (admin)',
        responses={200: AdminAssessmentListSerializer},
        parameters=_PAGE_PARAMS,
    ),
)
class AdminAssessmentListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = AdminAssessmentFilter(
            request.GET,
            queryset=CareerAssessment.objects.all(),
        ).qs
        ordering = request.GET.get('ordering', '-submitted_at')
        if ordering in {'submitted_at', '-submitted_at', 'full_name', '-full_name'}:
            qs = qs.order_by(ordering)
        return _paginate(request, qs, AdminAssessmentListSerializer)


@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Assessments'],
        operation_id='admin_assessment_detail',
        summary='Get a career assessment detail (admin)',
        responses={200: AdminAssessmentDetailSerializer},
    ),
    delete=extend_schema(
        tags=['Admin - Assessments'],
        operation_id='admin_assessment_delete',
        summary='Delete a career assessment (admin)',
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class AdminAssessmentDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        obj = get_object_or_404(CareerAssessment, pk=pk)
        return success_response(data=AdminAssessmentDetailSerializer(obj).data)

    def delete(self, request, pk):
        obj = get_object_or_404(CareerAssessment, pk=pk)
        obj.delete()
        return success_response(message='Assessment deleted.')


@extend_schema_view(
    patch=extend_schema(
        tags=['Admin - Assessments'],
        operation_id='admin_assessment_mark_reviewed',
        summary='Mark a career assessment as reviewed (admin)',
        request=None,
        responses={200: AdminAssessmentDetailSerializer},
    ),
)
class AdminAssessmentReviewView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        obj = get_object_or_404(CareerAssessment, pk=pk)
        obj.is_reviewed = True
        obj.save(update_fields=['is_reviewed'])
        return success_response(
            data=AdminAssessmentDetailSerializer(obj).data,
            message='Assessment marked as reviewed.',
        )


# ── Contact Management ─────────────────────────────────────────────────────────

@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Contacts'],
        operation_id='admin_contact_list',
        summary='List all contact form submissions (admin)',
        responses={200: AdminContactListSerializer},
        parameters=_PAGE_PARAMS,
    ),
)
class AdminContactListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = AdminContactFilter(
            request.GET,
            queryset=ContactSubmission.objects.all(),
        ).qs
        ordering = request.GET.get('ordering', '-submitted_at')
        if ordering in {'submitted_at', '-submitted_at'}:
            qs = qs.order_by(ordering)
        return _paginate(request, qs, AdminContactListSerializer)


@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Contacts'],
        operation_id='admin_contact_detail',
        summary='Get a contact submission detail (admin)',
        responses={200: AdminContactDetailSerializer},
    ),
    delete=extend_schema(
        tags=['Admin - Contacts'],
        operation_id='admin_contact_delete',
        summary='Delete a contact submission (admin)',
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class AdminContactDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        obj = get_object_or_404(ContactSubmission, pk=pk)
        return success_response(data=AdminContactDetailSerializer(obj).data)

    def delete(self, request, pk):
        obj = get_object_or_404(ContactSubmission, pk=pk)
        obj.delete()
        return success_response(message='Contact submission deleted.')


@extend_schema_view(
    patch=extend_schema(
        tags=['Admin - Contacts'],
        operation_id='admin_contact_mark_responded',
        summary='Mark a contact submission as responded (admin)',
        request=None,
        responses={200: AdminContactDetailSerializer},
    ),
)
class AdminContactRespondView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        obj = get_object_or_404(ContactSubmission, pk=pk)
        obj.is_responded = True
        obj.save(update_fields=['is_responded'])
        return success_response(
            data=AdminContactDetailSerializer(obj).data,
            message='Contact marked as responded.',
        )


# ── Testimonial Management ─────────────────────────────────────────────────────

@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Testimonials'],
        operation_id='admin_testimonial_list',
        summary='List all testimonials (admin)',
        responses={200: AdminTestimonialSerializer},
        parameters=_PAGE_PARAMS,
    ),
    post=extend_schema(
        tags=['Admin - Testimonials'],
        operation_id='admin_testimonial_create',
        summary='Create a testimonial (admin)',
        request=AdminTestimonialSerializer,
        responses={201: AdminTestimonialSerializer},
    ),
)
class AdminTestimonialListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = Testimonial.objects.all().order_by('order', '-created_at')
        return _paginate(request, qs, AdminTestimonialSerializer)

    def post(self, request):
        serializer = AdminTestimonialSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return success_response(
            data=AdminTestimonialSerializer(obj).data,
            message='Testimonial created.',
            status_code=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    put=extend_schema(
        tags=['Admin - Testimonials'],
        operation_id='admin_testimonial_update',
        summary='Update a testimonial (admin)',
        request=AdminTestimonialSerializer,
        responses={200: AdminTestimonialSerializer},
    ),
    delete=extend_schema(
        tags=['Admin - Testimonials'],
        operation_id='admin_testimonial_delete',
        summary='Delete a testimonial (admin)',
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class AdminTestimonialDetailView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, pk):
        obj = get_object_or_404(Testimonial, pk=pk)
        serializer = AdminTestimonialSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return success_response(
            data=AdminTestimonialSerializer(serializer.save()).data,
            message='Testimonial updated.',
        )

    def delete(self, request, pk):
        get_object_or_404(Testimonial, pk=pk).delete()
        return success_response(message='Testimonial deleted.')


@extend_schema_view(
    patch=extend_schema(
        tags=['Admin - Testimonials'],
        operation_id='admin_testimonial_toggle',
        summary='Toggle testimonial active/inactive (admin)',
        request=None,
        responses={200: AdminTestimonialSerializer},
    ),
)
class AdminTestimonialToggleView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        obj = get_object_or_404(Testimonial, pk=pk)
        obj.is_active = not obj.is_active
        obj.save(update_fields=['is_active'])
        state = 'activated' if obj.is_active else 'deactivated'
        return success_response(
            data=AdminTestimonialSerializer(obj).data,
            message=f'Testimonial {state}.',
        )


# ── FAQ Management ─────────────────────────────────────────────────────────────

@extend_schema_view(
    get=extend_schema(
        tags=['Admin - FAQs'],
        operation_id='admin_faq_list',
        summary='List all FAQs (admin)',
        responses={200: AdminFAQSerializer},
        parameters=[
            OpenApiParameter('category', OpenApiTypes.STR),
            OpenApiParameter('is_active', OpenApiTypes.BOOL),
            *_PAGE_PARAMS,
        ],
    ),
    post=extend_schema(
        tags=['Admin - FAQs'],
        operation_id='admin_faq_create',
        summary='Create a FAQ (admin)',
        request=AdminFAQSerializer,
        responses={201: AdminFAQSerializer},
    ),
)
class AdminFAQListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = FAQ.objects.all().order_by('order', 'created_at')
        category = request.GET.get('category')
        is_active = request.GET.get('is_active')
        if category:
            qs = qs.filter(category__iexact=category)
        if is_active is not None:
            qs = qs.filter(is_active=(is_active.lower() == 'true'))
        return _paginate(request, qs, AdminFAQSerializer)

    def post(self, request):
        serializer = AdminFAQSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return success_response(
            data=AdminFAQSerializer(obj).data,
            message='FAQ created.',
            status_code=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    put=extend_schema(
        tags=['Admin - FAQs'],
        operation_id='admin_faq_update',
        summary='Update a FAQ (admin)',
        request=AdminFAQSerializer,
        responses={200: AdminFAQSerializer},
    ),
    delete=extend_schema(
        tags=['Admin - FAQs'],
        operation_id='admin_faq_delete',
        summary='Delete a FAQ (admin)',
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class AdminFAQDetailView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, pk):
        obj = get_object_or_404(FAQ, pk=pk)
        serializer = AdminFAQSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return success_response(
            data=AdminFAQSerializer(serializer.save()).data,
            message='FAQ updated.',
        )

    def delete(self, request, pk):
        get_object_or_404(FAQ, pk=pk).delete()
        return success_response(message='FAQ deleted.')


@extend_schema_view(
    patch=extend_schema(
        tags=['Admin - FAQs'],
        operation_id='admin_faq_toggle',
        summary='Toggle FAQ active/inactive (admin)',
        request=None,
        responses={200: AdminFAQSerializer},
    ),
)
class AdminFAQToggleView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        obj = get_object_or_404(FAQ, pk=pk)
        obj.is_active = not obj.is_active
        obj.save(update_fields=['is_active'])
        state = 'activated' if obj.is_active else 'deactivated'
        return success_response(data=AdminFAQSerializer(obj).data, message=f'FAQ {state}.')


# ── Stats Management ───────────────────────────────────────────────────────────

@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Stats'],
        operation_id='admin_stats_get',
        summary='Get platform stats (admin)',
        responses={200: AdminStatsSerializer},
    ),
    put=extend_schema(
        tags=['Admin - Stats'],
        operation_id='admin_stats_update',
        summary='Manually update platform stats (admin)',
        request=AdminStatsSerializer,
        responses={200: AdminStatsSerializer},
    ),
)
class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return success_response(data=AdminStatsSerializer(PlatformStats.get_stats()).data)

    def put(self, request):
        stats = PlatformStats.get_stats()
        serializer = AdminStatsSerializer(stats, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return success_response(
            data=AdminStatsSerializer(serializer.save()).data,
            message='Stats updated.',
        )


@extend_schema_view(
    post=extend_schema(
        tags=['Admin - Stats'],
        operation_id='admin_stats_recalculate',
        summary='Recalculate platform stats from database (admin)',
        request=None,
        responses={200: AdminStatsSerializer},
    ),
)
class AdminStatsRecalculateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        stats = PlatformStats.get_stats()
        stats.total_active_jobs = Job.objects.filter(is_active=True, is_approved=True).count()
        stats.total_active_candidates = PhysicianProfile.objects.count()
        stats.save(update_fields=['total_active_jobs', 'total_active_candidates'])
        return success_response(
            data=AdminStatsSerializer(stats).data,
            message='Stats recalculated from database.',
        )


# ── Notifications ──────────────────────────────────────────────────────────────

@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Notifications'],
        operation_id='admin_notification_list',
        summary='List admin notifications (admin)',
        responses={200: AdminNotificationSerializer},
        parameters=_PAGE_PARAMS,
    ),
)
class AdminNotificationListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = AdminNotification.objects.all()
        return _paginate(request, qs, AdminNotificationSerializer)


@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Notifications'],
        operation_id='admin_notification_unread_count',
        summary='Get count of unread admin notifications (admin)',
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class AdminUnreadCountView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return success_response(
            data={'unread_count': AdminNotification.objects.filter(is_read=False).count()}
        )


@extend_schema_view(
    patch=extend_schema(
        tags=['Admin - Notifications'],
        operation_id='admin_notification_mark_read',
        summary='Mark a notification as read (admin)',
        request=None,
        responses={200: AdminNotificationSerializer},
    ),
)
class AdminNotificationReadView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        notification = get_object_or_404(AdminNotification, pk=pk)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return success_response(
            data=AdminNotificationSerializer(notification).data,
            message='Notification marked as read.',
        )


@extend_schema_view(
    patch=extend_schema(
        tags=['Admin - Notifications'],
        operation_id='admin_notifications_mark_all_read',
        summary='Mark all notifications as read (admin)',
        request=None,
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class AdminNotificationReadAllView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request):
        AdminNotification.objects.filter(is_read=False).update(is_read=True)
        return success_response(message='All notifications marked as read.')


@extend_schema_view(
    delete=extend_schema(
        tags=['Admin - Notifications'],
        operation_id='admin_notification_delete',
        summary='Delete a notification (admin)',
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class AdminNotificationDeleteView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        get_object_or_404(AdminNotification, pk=pk).delete()
        return success_response(message='Notification deleted.')


# ── Global Search ──────────────────────────────────────────────────────────────

@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Search'],
        operation_id='admin_global_search',
        summary='Search across users, jobs, assessments and contacts (admin)',
        responses={200: OpenApiTypes.OBJECT},
        parameters=[OpenApiParameter('q', OpenApiTypes.STR, description='Search query')],
    ),
)
class AdminGlobalSearchView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        q = request.GET.get('q', '').strip()
        if not q:
            return success_response(
                data={'users': [], 'jobs': [], 'assessments': [], 'contacts': []}
            )

        users = User.objects.filter(
            Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(email__icontains=q)
        )[:10]

        jobs = (
            _job_qs()
            .filter(Q(title__icontains=q) | Q(specialty__icontains=q) | Q(employer__company_name__icontains=q))
        )[:10]

        assessments = CareerAssessment.objects.filter(
            Q(full_name__icontains=q) | Q(email__icontains=q)
        )[:10]

        contacts = ContactSubmission.objects.filter(
            Q(full_name__icontains=q) | Q(email__icontains=q) | Q(subject__icontains=q)
        )[:10]

        return success_response(data={
            'users': AdminUserListSerializer(users, many=True).data,
            'jobs': AdminJobListSerializer(jobs, many=True).data,
            'assessments': AdminAssessmentListSerializer(assessments, many=True).data,
            'contacts': AdminContactListSerializer(contacts, many=True).data,
        })


# ── CSV Export ─────────────────────────────────────────────────────────────────

@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Export'],
        operation_id='admin_export_users',
        summary='Export users as CSV (admin)',
        responses={200: OpenApiTypes.BINARY},
        parameters=[OpenApiParameter('user_type', OpenApiTypes.STR, description='physician or employer')],
    ),
)
class AdminExportUsersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        user_type = request.GET.get('user_type')
        qs = User.objects.filter(user_type__in=['physician', 'employer'])
        if user_type:
            qs = qs.filter(user_type=user_type)
        qs = qs.order_by('-date_joined')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users.csv"'
        writer = csv.writer(response)
        writer.writerow(['ID', 'Email', 'First Name', 'Last Name', 'User Type', 'Is Active', 'Phone', 'Date Joined'])
        for u in qs:
            writer.writerow([u.id, u.email, u.first_name, u.last_name, u.user_type, u.is_active, u.phone, u.date_joined])
        return response


@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Export'],
        operation_id='admin_export_jobs',
        summary='Export jobs as CSV (admin)',
        responses={200: OpenApiTypes.BINARY},
    ),
)
class AdminExportJobsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = Job.objects.select_related('employer').order_by('-created_at')
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="jobs.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Title', 'Specialty', 'Province', 'City', 'Employer',
            'Job Type', 'Is Active', 'Is Approved', 'Views', 'Created At',
        ])
        for j in qs:
            writer.writerow([
                j.id, j.title, j.specialty, j.province, j.city,
                j.employer.company_name, j.job_type, j.is_active,
                j.is_approved, j.views_count, j.created_at,
            ])
        return response


@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Export'],
        operation_id='admin_export_assessments',
        summary='Export career assessments as CSV (admin)',
        responses={200: OpenApiTypes.BINARY},
    ),
)
class AdminExportAssessmentsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = CareerAssessment.objects.order_by('-submitted_at')
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="assessments.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Full Name', 'Email', 'Phone', 'Specialty',
            'Current Location', 'Desired Province', 'Years Experience',
            'Licensure Status', 'Is Reviewed', 'Submitted At',
        ])
        for a in qs:
            writer.writerow([
                a.id, a.full_name, a.email, a.phone, a.specialty,
                a.current_location, a.desired_province_in_canada,
                a.years_of_experience, a.licensure_status, a.is_reviewed, a.submitted_at,
            ])
        return response


@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Export'],
        operation_id='admin_export_contacts',
        summary='Export contact submissions as CSV (admin)',
        responses={200: OpenApiTypes.BINARY},
    ),
)
class AdminExportContactsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = ContactSubmission.objects.order_by('-submitted_at')
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="contacts.csv"'
        writer = csv.writer(response)
        writer.writerow(['ID', 'Full Name', 'Email', 'Phone', 'Subject', 'Submitted At', 'Is Responded'])
        for c in qs:
            writer.writerow([c.id, c.full_name, c.email, c.phone, c.subject, c.submitted_at, c.is_responded])
        return response


# ── Admin Profile ──────────────────────────────────────────────────────────────

@extend_schema_view(
    get=extend_schema(
        tags=['Admin - Profile'],
        operation_id='admin_profile_get',
        summary='Get the admin account profile',
        responses={200: AdminProfileSerializer},
    ),
    put=extend_schema(
        tags=['Admin - Profile'],
        operation_id='admin_profile_update',
        summary='Update the admin account profile',
        request=AdminProfileSerializer,
        responses={200: AdminProfileSerializer},
    ),
)
class AdminProfileView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return success_response(data=AdminProfileSerializer(request.user).data)

    def put(self, request):
        serializer = AdminProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(
            data=AdminProfileSerializer(request.user).data,
            message='Profile updated.',
        )


@extend_schema_view(
    post=extend_schema(
        tags=['Admin - Profile'],
        operation_id='admin_change_password',
        summary='Change admin account password',
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'current_password': {'type': 'string'},
                    'new_password': {'type': 'string'},
                    'confirm_password': {'type': 'string'},
                },
                'required': ['current_password', 'new_password', 'confirm_password'],
            }
        },
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class AdminChangePasswordView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        current = request.data.get('current_password', '')
        new_pwd = request.data.get('new_password', '')
        confirm = request.data.get('confirm_password', '')

        if not request.user.check_password(current):
            return success_response(
                message='Current password is incorrect.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if new_pwd != confirm:
            return success_response(
                message='New passwords do not match.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(new_pwd, request.user)
        except DjangoValidationError as e:
            return success_response(message=e.messages[0], status_code=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_pwd)
        request.user.save()
        try:
            from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
            for token in OutstandingToken.objects.filter(user=request.user):
                BlacklistedToken.objects.get_or_create(token=token)
        except Exception:
            pass
        return success_response(message='Password changed successfully. Please log in again.')


# ── Revenue & Billing ─────────────────────────────────────────────────────────

class AdminRevenueOverviewView(APIView):
    """
    Overall revenue stats + monthly chart + per-employer breakdown.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from subscriptions.models import PaymentHistory, UserSubscription, CustomSubscriptionPlan
        from django.db.models import Sum, Count
        from django.db.models.functions import TruncMonth

        twelve_months_ago = timezone.now() - timedelta(days=365)

        # ── Total revenue (all time) ──────────────────────────────────────
        total_revenue = PaymentHistory.objects.filter(
            status='succeeded'
        ).aggregate(total=Sum('amount'))['total'] or 0

        # ── This month revenue ────────────────────────────────────────────
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        this_month_revenue = PaymentHistory.objects.filter(
            status='succeeded', created_at__gte=month_start
        ).aggregate(total=Sum('amount'))['total'] or 0

        # ── Last month revenue ────────────────────────────────────────────
        import calendar
        today = timezone.now()
        first_this_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_end = first_this_month
        last_month_start = (first_this_month - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_revenue = PaymentHistory.objects.filter(
            status='succeeded',
            created_at__gte=last_month_start,
            created_at__lt=last_month_end,
        ).aggregate(total=Sum('amount'))['total'] or 0

        # ── Active subscriptions breakdown ────────────────────────────────
        active_professional = UserSubscription.objects.filter(
            status='active', plan__is_free=False, plan__is_enterprise=False
        ).count()
        active_enterprise = UserSubscription.objects.filter(
            status='active', plan__is_enterprise=True
        ).count()
        active_free = UserSubscription.objects.filter(
            status='active', plan__is_free=True
        ).count()

        # MRR: professional subs + custom plans
        from decimal import Decimal
        professional_mrr = UserSubscription.objects.filter(
            status='active', plan__is_free=False, plan__is_enterprise=False
        ).aggregate(mrr=Sum('plan__price_monthly'))['mrr'] or Decimal('0')

        enterprise_mrr = CustomSubscriptionPlan.objects.filter(
            is_active=True, payment_status='paid'
        ).aggregate(mrr=Sum('price_monthly'))['mrr'] or Decimal('0')

        mrr = float(professional_mrr) + float(enterprise_mrr)

        # ── Monthly revenue chart (last 12 months) ────────────────────────
        monthly_rows = (
            PaymentHistory.objects
            .filter(status='succeeded', created_at__gte=twelve_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('month')
        )
        monthly_chart = [
            {
                'month': row['month'].strftime('%b %Y'),
                'revenue': float(row['total']),
                'transactions': row['count'],
            }
            for row in monthly_rows
        ]

        # ── Top paying employers ──────────────────────────────────────────
        top_employers = (
            PaymentHistory.objects
            .filter(status='succeeded')
            .values('user__email', 'user__first_name', 'user__last_name')
            .annotate(total_paid=Sum('amount'), payment_count=Count('id'))
            .order_by('-total_paid')[:10]
        )
        top_employers_list = [
            {
                'email': r['user__email'],
                'name': f"{r['user__first_name'] or ''} {r['user__last_name'] or ''}".strip() or r['user__email'],
                'total_paid': float(r['total_paid']),
                'payment_count': r['payment_count'],
            }
            for r in top_employers
        ]

        # ── Recent payments ───────────────────────────────────────────────
        recent_payments = PaymentHistory.objects.select_related('user').filter(
            status='succeeded'
        ).order_by('-created_at')[:20]

        recent_list = [
            {
                'id': p.id,
                'user_id': p.user.id,
                'email': p.user.email,
                'name': f"{p.user.first_name or ''} {p.user.last_name or ''}".strip() or p.user.email,
                'amount': float(p.amount),
                'currency': p.currency.upper(),
                'description': p.description,
                'created_at': p.created_at.isoformat(),
            }
            for p in recent_payments
        ]

        return success_response(data={
            'total_revenue': float(total_revenue),
            'this_month_revenue': float(this_month_revenue),
            'last_month_revenue': float(last_month_revenue),
            'mrr': mrr,
            'active_professional': active_professional,
            'active_enterprise': active_enterprise,
            'active_free': active_free,
            'monthly_chart': monthly_chart,
            'top_employers': top_employers_list,
            'recent_payments': recent_list,
        })


class AdminUserBillingView(APIView):
    """
    Billing history for a specific employer user.
    """
    permission_classes = [IsAdminUser]

    def get(self, request, user_id):
        from subscriptions.models import PaymentHistory, UserSubscription, CustomSubscriptionPlan

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return success_response(message='User not found.', status_code=status.HTTP_404_NOT_FOUND)

        payments = PaymentHistory.objects.filter(user=user).order_by('-created_at')
        payments_list = [
            {
                'id': p.id,
                'amount': float(p.amount),
                'currency': p.currency.upper(),
                'status': p.status,
                'description': p.description,
                'created_at': p.created_at.isoformat(),
            }
            for p in payments
        ]

        # Current subscription info
        sub_info = None
        try:
            sub = UserSubscription.objects.select_related('plan').get(user=user)
            sub_info = {
                'plan_name': sub.plan.name,
                'status': sub.status,
                'price_monthly': float(sub.plan.price_monthly),
                'is_enterprise': sub.plan.is_enterprise,
                'current_period_end': sub.current_period_end.isoformat() if sub.current_period_end else None,
                'cancel_at_period_end': sub.cancel_at_period_end,
            }
        except UserSubscription.DoesNotExist:
            pass

        custom_plan_info = None
        try:
            cp = user.custom_plan
            custom_plan_info = {
                'job_post_limit': cp.job_post_limit,
                'price_monthly': float(cp.price_monthly),
                'is_active': cp.is_active,
                'payment_status': cp.payment_status,
                'valid_until': str(cp.valid_until) if cp.valid_until else None,
                'features': cp.features,
            }
        except CustomSubscriptionPlan.DoesNotExist:
            pass

        total_paid = sum(p['amount'] for p in payments_list if p['status'] == 'succeeded')

        return success_response(data={
            'user': {
                'id': user.id,
                'email': user.email,
                'name': f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
            },
            'total_paid': total_paid,
            'subscription': sub_info,
            'custom_plan': custom_plan_info,
            'payments': payments_list,
        })
