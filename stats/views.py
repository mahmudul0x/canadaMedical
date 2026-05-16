from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser

from drf_spectacular.utils import extend_schema, extend_schema_view

from core.exceptions import success_response
from .models import PlatformStats
from .serializers import PlatformStatsSerializer


@extend_schema_view(
    get=extend_schema(
        tags=['Stats'],
        operation_id='platform_stats_get',
        summary='Get public platform statistics',
        responses={200: PlatformStatsSerializer},
    ),
    put=extend_schema(
        tags=['Stats'],
        operation_id='platform_stats_update',
        summary='Update platform statistics (admin only)',
        request=PlatformStatsSerializer,
        responses={200: PlatformStatsSerializer},
    ),
)
class PlatformStatsView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]

    def get(self, request):
        stats = PlatformStats.get_stats()
        serializer = PlatformStatsSerializer(stats)
        return success_response(data=serializer.data)

    def put(self, request):
        stats = PlatformStats.get_stats()
        serializer = PlatformStatsSerializer(stats, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return success_response(data=PlatformStatsSerializer(updated).data, message='Stats updated.')
