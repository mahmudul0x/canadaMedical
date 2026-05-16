from rest_framework import serializers
from .models import ContactSubmission


class ContactSubmissionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = ['full_name', 'email', 'phone', 'subject', 'message']

    def validate_message(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError('Message must be at least 10 characters.')
        return value.strip()


class ContactSubmissionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = ['id', 'full_name', 'email', 'phone', 'subject', 'submitted_at', 'is_responded']


class ContactSubmissionRespondSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = ['is_responded']
