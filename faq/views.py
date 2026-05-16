from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view

from core.exceptions import success_response
from .models import FAQ
from .serializers import FAQSerializer, FAQPublicSerializer


@extend_schema_view(
    get=extend_schema(
        tags=['FAQ'],
        operation_id='faq_list',
        summary='List active FAQs (public)',
        responses={200: FAQPublicSerializer},
        parameters=[
            OpenApiParameter('category', OpenApiTypes.STR, description='Filter by category'),
        ],
    ),
    post=extend_schema(
        tags=['FAQ'],
        operation_id='faq_create',
        summary='Create a new FAQ (admin only)',
        request=FAQSerializer,
        responses={201: FAQSerializer},
    ),
)
class FAQListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]

    def get(self, request):
        category = request.query_params.get('category')
        faqs = FAQ.objects.filter(is_active=True)
        if category:
            faqs = faqs.filter(category=category)
        faqs = faqs.order_by('order', 'created_at')
        serializer = FAQPublicSerializer(faqs, many=True)
        return success_response(data=serializer.data)

    def post(self, request):
        serializer = FAQSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        faq = serializer.save()
        return success_response(
            data=FAQSerializer(faq).data,
            message='FAQ created.',
            status_code=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    put=extend_schema(
        tags=['FAQ'],
        operation_id='faq_update',
        summary='Update a FAQ (admin only)',
        request=FAQSerializer,
        responses={200: FAQSerializer},
    ),
    delete=extend_schema(
        tags=['FAQ'],
        operation_id='faq_delete',
        summary='Delete a FAQ (admin only)',
        responses={200: OpenApiTypes.OBJECT},
    ),
)
class FAQDetailView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, pk):
        obj = get_object_or_404(FAQ, pk=pk)
        serializer = FAQSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return success_response(data=FAQSerializer(updated).data, message='FAQ updated.')

    def delete(self, request, pk):
        obj = get_object_or_404(FAQ, pk=pk)
        obj.delete()
        return success_response(message='FAQ deleted.')
