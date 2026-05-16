from django.contrib import admin
from .models import ContactSubmission


@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'subject', 'submitted_at', 'is_responded')
    list_filter = ('is_responded',)
    search_fields = ('full_name', 'email', 'subject')
    ordering = ('-submitted_at',)
    readonly_fields = ('submitted_at',)
