from django.contrib import admin
from .models import Job, JobApplication, SavedJob


@admin.action(description='Approve selected jobs')
def approve_jobs(modeladmin, request, queryset):
    queryset.update(is_approved=True)
    from stats.models import PlatformStats
    from .models import Job as _Job
    PlatformStats.get_stats()
    total = _Job.objects.filter(is_approved=True, is_active=True).count()
    PlatformStats.objects.filter(pk=1).update(total_active_jobs=total)


@admin.action(description='Deactivate selected jobs')
def deactivate_jobs(modeladmin, request, queryset):
    queryset.update(is_active=False)
    from stats.models import PlatformStats
    from .models import Job as _Job
    PlatformStats.get_stats()
    total = _Job.objects.filter(is_approved=True, is_active=True).count()
    PlatformStats.objects.filter(pk=1).update(total_active_jobs=total)


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ('title', 'specialty', 'province', 'city', 'get_employer', 'job_type', 'practice_setting', 'is_active', 'is_approved', 'views_count', 'created_at')
    list_filter = ('specialty', 'province', 'job_type', 'practice_setting', 'is_active', 'is_approved')
    search_fields = ('title', 'description', 'employer__company_name', 'city')
    ordering = ('-created_at',)
    readonly_fields = ('views_count', 'created_at', 'updated_at', 'location_display')
    actions = [approve_jobs, deactivate_jobs]
    list_per_page = 25
    fieldsets = (
        (None, {'fields': ('title', 'specialty', 'sub_specialty', 'province', 'city', 'job_type', 'practice_setting')}),
        ('Compensation', {'fields': ('salary_min', 'salary_max', 'salary_display', 'compensation_model', 'compensation')}),
        ('Details', {'fields': ('description', 'qualifications', 'benefits', 'application_deadline', 'contact_person', 'contact_email')}),
        ('Status', {'fields': ('is_active', 'is_approved', 'rejection_reason')}),
        ('Meta', {'fields': ('views_count', 'location_display', 'created_at', 'updated_at')}),
    )

    @admin.display(description='Employer')
    def get_employer(self, obj):
        return obj.employer.company_name


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ('get_physician', 'get_job', 'status', 'applied_at')
    list_filter = ('status',)
    search_fields = ('physician__user__email', 'job__title', 'physician__user__first_name')
    ordering = ('-applied_at',)
    readonly_fields = ('applied_at', 'updated_at')

    @admin.display(description='Physician')
    def get_physician(self, obj):
        return obj.physician.user.full_name

    @admin.display(description='Job')
    def get_job(self, obj):
        return obj.job.title


@admin.register(SavedJob)
class SavedJobAdmin(admin.ModelAdmin):
    list_display = ('get_physician', 'get_job', 'saved_at')
    readonly_fields = ('saved_at',)

    @admin.display(description='Physician')
    def get_physician(self, obj):
        return obj.physician.user.full_name

    @admin.display(description='Job')
    def get_job(self, obj):
        return obj.job.title
