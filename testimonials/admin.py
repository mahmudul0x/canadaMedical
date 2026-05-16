from django.contrib import admin
from .models import Testimonial


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('physician_name', 'specialty', 'location', 'testimonial_type', 'rating', 'is_active', 'order', 'created_at')
    list_filter = ('is_active', 'testimonial_type', 'specialty')
    list_editable = ('order', 'is_active')
    search_fields = ('physician_name', 'specialty', 'location', 'organization')
    ordering = ('order', '-created_at')
    readonly_fields = ('created_at',)
