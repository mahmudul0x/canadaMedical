from rest_framework import serializers
from .models import Testimonial

MAX_PHOTO_SIZE = 2 * 1024 * 1024
ALLOWED_PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png']


class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = [
            'id', 'physician_name', 'specialty', 'location',
            'testimonial_text', 'photo',
            'testimonial_type', 'rating', 'organization',
            'is_active', 'order', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_photo(self, value):
        if value:
            ext = value.name.rsplit('.', 1)[-1].lower()
            if ext not in ALLOWED_PHOTO_EXTENSIONS:
                raise serializers.ValidationError('Only JPG and PNG photos are allowed.')
            if value.size > MAX_PHOTO_SIZE:
                raise serializers.ValidationError('Photo must not exceed 2 MB.')
        return value


class TestimonialPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = [
            'id', 'physician_name', 'specialty', 'location',
            'testimonial_text', 'photo',
            'testimonial_type', 'rating', 'organization',
            'order',
        ]
