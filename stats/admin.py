from django.contrib import admin
from .models import PlatformStats


@admin.register(PlatformStats)
class PlatformStatsAdmin(admin.ModelAdmin):
    list_display = ('total_active_jobs', 'new_opportunities', 'total_active_candidates', 'new_candidates', 'last_updated')
    readonly_fields = ('last_updated',)

    def has_add_permission(self, request):
        return not PlatformStats.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
