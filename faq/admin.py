from django.contrib import admin
from .models import FAQ


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ('question_short', 'category', 'order', 'is_active', 'created_at')
    list_filter = ('category', 'is_active')
    list_editable = ('order', 'is_active')
    search_fields = ('question', 'answer')
    ordering = ('order', 'created_at')
    readonly_fields = ('created_at',)

    @admin.display(description='Question')
    def question_short(self, obj):
        return obj.question[:80]
