from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view

from core.exceptions import success_response
from .models import Testimonial
from .serializers import TestimonialSerializer, TestimonialPublicSerializer


@extend_schema_view(
    get=extend_schema(
        tags=['Testimonials'],
        operation_id='testimonial_list',
        summary='List active testimonials (public)',
        responses={200: TestimonialPublicSerializer},
    ),
    post=extend_schema(
        tags=['Testimonials'],
        operation_id='testimonial_create',
        summary='Create a testimonial (admin only)',
        request=TestimonialSerializer,
        responses={201: TestimonialSerializer},
    ),
)
class TestimonialListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]

    def get(self, request):
        qs = Testimonial.objects.filter(is_active=True)
        t_type = request.query_params.get('type')
        if t_type in ('physician', 'employer'):
            qs = qs.filter(testimonial_type=t_type)
        qs = qs.order_by('order', '-created_at')
        serializer = TestimonialPublicSerializer(qs, many=True)
        return success_response(data=serializer.data)

    def post(self, request):
        serializer = TestimonialSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        testimonial = serializer.save()
        return success_response(
            data=TestimonialSerializer(testimonial).data,
            message='Testimonial created.',
            status_code=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    put=extend_schema(
        tags=['Testimonials'],
        operation_id='testimonial_update',
        summary='Update a testimonial (admin only)',
        request=TestimonialSerializer,
        responses={200: TestimonialSerializer},
    ),
    delete=extend_schema(
        tags=['Testimonials'],
        operation_id='testimonial_delete',
        summary='Delete a testimonial (admin only)',
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class TestimonialDetailView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, pk):
        obj = get_object_or_404(Testimonial, pk=pk)
        serializer = TestimonialSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return success_response(data=TestimonialSerializer(updated).data, message='Testimonial updated.')

    def delete(self, request, pk):
        obj = get_object_or_404(Testimonial, pk=pk)
        obj.delete()
        return success_response(message='Testimonial deleted.')
