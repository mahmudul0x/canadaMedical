from rest_framework import serializers
from .models import PlatformStats


class PlatformStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformStats
        fields = [
            'total_active_jobs',
            'new_opportunities',
            'total_active_candidates',
            'new_candidates',
            'last_updated',
        ]
        read_only_fields = ['last_updated']
