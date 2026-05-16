from rest_framework import serializers
from .models import FAQ


class FAQSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = FAQ
        fields = ['id', 'question', 'answer', 'category', 'category_display', 'order', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class FAQPublicSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = FAQ
        fields = ['id', 'question', 'answer', 'category', 'category_display', 'order']
