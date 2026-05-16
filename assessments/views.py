from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view

from core.exceptions import success_response
from core.pagination import StandardResultsPagination
from core.permissions import AssessmentFormThrottle
from .models import CareerAssessment
from .serializers import (
    CareerAssessmentCreateSerializer,
    CareerAssessmentListSerializer,
    CareerAssessmentDetailSerializer,
    CareerAssessmentReviewSerializer,
    CareerAssessmentStatusSerializer,
)


@extend_schema_view(
    get=extend_schema(
        tags=['Assessments'],
        operation_id='assessment_list',
        summary='List all career assessment submissions (admin only)',
        responses={200: CareerAssessmentListSerializer},
    ),
    post=extend_schema(
        tags=['Assessments'],
        operation_id='assessment_submit',
        summary='Submit a career assessment (public)',
        request=CareerAssessmentCreateSerializer,
        responses={201: OpenApiTypes.OBJECT},
    ),
)
class CareerAssessmentListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAdminUser()]
        return [AllowAny()]

    def get_throttles(self):
        if self.request.method == 'POST':
            return [AssessmentFormThrottle()]
        return super().get_throttles()

    def get(self, request):
        assessments = CareerAssessment.objects.all().order_by('-submitted_at')
        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(assessments, request)
        if page is not None:
            serializer = CareerAssessmentListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        serializer = CareerAssessmentListSerializer(assessments, many=True)
        return success_response(data=serializer.data)

    def post(self, request):
        serializer = CareerAssessmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assessment = serializer.save()
        return success_response(
            data={'id': assessment.id, 'full_name': assessment.full_name},
            message='Career assessment submitted successfully. We will be in touch shortly.',
            status_code=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(
        tags=['Assessments'],
        operation_id='assessment_detail',
        summary='Get a career assessment detail (admin only)',
        responses={200: CareerAssessmentDetailSerializer},
    ),
    patch=extend_schema(
        tags=['Assessments'],
        operation_id='assessment_review',
        summary='Mark a career assessment as reviewed (admin only)',
        request=CareerAssessmentReviewSerializer,
        responses={200: CareerAssessmentDetailSerializer},
    ),
    delete=extend_schema(
        tags=['Assessments'],
        operation_id='assessment_delete',
        summary='Delete a career assessment (admin only)',
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class CareerAssessmentDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        obj = get_object_or_404(CareerAssessment, pk=pk)
        return success_response(data=CareerAssessmentDetailSerializer(obj).data)

    def patch(self, request, pk):
        obj = get_object_or_404(CareerAssessment, pk=pk)
        serializer = CareerAssessmentReviewSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return success_response(
            data=CareerAssessmentDetailSerializer(updated).data,
            message='Assessment updated.',
        )

    def delete(self, request, pk):
        obj = get_object_or_404(CareerAssessment, pk=pk)
        obj.delete()
        return success_response(message='Assessment deleted.')


@extend_schema_view(
    patch=extend_schema(
        tags=['Assessments'],
        operation_id='assessment_update_status',
        summary='Update assessment status and admin notes (admin only)',
        request=CareerAssessmentStatusSerializer,
        responses={200: CareerAssessmentDetailSerializer},
    ),
)
class CareerAssessmentStatusView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        obj = get_object_or_404(CareerAssessment, pk=pk)
        serializer = CareerAssessmentStatusSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        # Auto-mark as reviewed when admin changes status
        if not updated.is_reviewed:
            updated.is_reviewed = True
            updated.save(update_fields=['is_reviewed'])
        return success_response(
            data=CareerAssessmentDetailSerializer(updated).data,
            message='Assessment status updated.',
        )
