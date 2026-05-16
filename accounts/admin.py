from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, PhysicianProfile, EmployerProfile


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('email', 'full_name', 'user_type', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('user_type', 'is_active', 'is_staff')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone', 'user_type')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates', {'fields': ('date_joined', 'last_login')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'user_type', 'password1', 'password2'),
        }),
    )
    readonly_fields = ('date_joined', 'last_login')


@admin.register(PhysicianProfile)
class PhysicianProfileAdmin(admin.ModelAdmin):
    list_display = ('get_full_name', 'get_email', 'specialty', 'country', 'profile_complete', 'created_at')
    list_filter = ('specialty', 'sub_specialty', 'work_eligibility', 'profile_complete')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'cpso_number')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'profile_complete')

    @admin.display(description='Full Name')
    def get_full_name(self, obj):
        return obj.user.full_name

    @admin.display(description='Email')
    def get_email(self, obj):
        return obj.user.email


@admin.register(EmployerProfile)
class EmployerProfileAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'get_email', 'company_type', 'country', 'created_at')
    list_filter = ('company_type', 'country')
    search_fields = ('company_name', 'user__email', 'contact_person_first_name', 'contact_person_last_name')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

    @admin.display(description='Email')
    def get_email(self, obj):
        return obj.user.email
