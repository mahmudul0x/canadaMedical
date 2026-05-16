from django.contrib import admin
from .models import CareerAssessment


@admin.action(description='Mark selected assessments as reviewed')
def mark_as_reviewed(modeladmin, request, queryset):
    queryset.update(is_reviewed=True)


@admin.register(CareerAssessment)
class CareerAssessmentAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'specialty', 'desired_province_in_canada', 'licensure_status', 'submitted_at', 'is_reviewed')
    list_filter = ('is_reviewed', 'specialty', 'licensure_status', 'work_eligibility', 'relocation_support_needed')
    search_fields = ('full_name', 'email', 'specialty')
    ordering = ('-submitted_at',)
    readonly_fields = ('submitted_at',)
    actions = [mark_as_reviewed]
    list_per_page = 25
