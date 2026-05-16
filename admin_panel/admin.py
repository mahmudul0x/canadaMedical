from django.contrib import admin

from .models import AdminNotification


@admin.register(AdminNotification)
class AdminNotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'notification_type', 'is_read', 'related_id', 'created_at')
    list_filter = ('notification_type', 'is_read')
    search_fields = ('title', 'message')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
    actions = ['mark_as_read']

    @admin.action(description='Mark selected notifications as read')
    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)
