from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view

from core.exceptions import success_response
from core.pagination import StandardResultsPagination
from core.permissions import ContactFormThrottle
from .models import ContactSubmission
from .serializers import (
    ContactSubmissionCreateSerializer,
    ContactSubmissionListSerializer,
    ContactSubmissionRespondSerializer,
)


@extend_schema_view(
    get=extend_schema(
        tags=['Contact'],
        operation_id='contact_list',
        summary='List all contact submissions (admin only)',
        responses={200: ContactSubmissionListSerializer},
    ),
    post=extend_schema(
        tags=['Contact'],
        operation_id='contact_submit',
        summary='Submit a contact form (public)',
        request=ContactSubmissionCreateSerializer,
        responses={201: OpenApiTypes.OBJECT},
    ),
)
class ContactSubmissionListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAdminUser()]
        return [AllowAny()]

    def get_throttles(self):
        if self.request.method == 'POST':
            return [ContactFormThrottle()]
        return super().get_throttles()

    def get(self, request):
        submissions = ContactSubmission.objects.all().order_by('-submitted_at')
        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(submissions, request)
        if page is not None:
            serializer = ContactSubmissionListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        serializer = ContactSubmissionListSerializer(submissions, many=True)
        return success_response(data=serializer.data)

    def post(self, request):
        serializer = ContactSubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()
        return success_response(
            data={'id': submission.id},
            message='Thank you for reaching out. We will respond shortly.',
            status_code=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(
        tags=['Contact'],
        operation_id='contact_detail',
        summary='Get a contact submission detail (admin only)',
        responses={200: ContactSubmissionListSerializer},
    ),
    patch=extend_schema(
        tags=['Contact'],
        operation_id='contact_respond',
        summary='Mark a contact submission as responded (admin only)',
        request=ContactSubmissionRespondSerializer,
        responses={200: ContactSubmissionListSerializer},
    ),
)
class ContactSubmissionDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        obj = get_object_or_404(ContactSubmission, pk=pk)
        return success_response(data=ContactSubmissionListSerializer(obj).data)

    def patch(self, request, pk):
        obj = get_object_or_404(ContactSubmission, pk=pk)
        serializer = ContactSubmissionRespondSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return success_response(
            data=ContactSubmissionListSerializer(updated).data,
            message='Submission updated.',
        )
