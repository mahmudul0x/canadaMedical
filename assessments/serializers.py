from rest_framework import serializers
from accounts.serializers import validate_resume_file
from .models import CareerAssessment


class CareerAssessmentCreateSerializer(serializers.ModelSerializer):
    resume = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = CareerAssessment
        fields = [
            'full_name', 'email', 'phone',
            'specialty', 'sub_specialty',
            'years_of_experience', 'current_location',
            'licensure_status', 'work_eligibility',
            'desired_province_in_canada', 'relocation_support_needed',
            'preferred_job_type', 'preferred_practice_setting',
            'salary_expectation', 'availability_date',
            'career_goals', 'additional_notes', 'resume',
        ]

    def validate_resume(self, value):
        if value:
            return validate_resume_file(value)
        return value

    def validate_years_of_experience(self, value):
        if value < 0 or value > 60:
            raise serializers.ValidationError('Years of experience must be between 0 and 60.')
        return value


class CareerAssessmentListSerializer(serializers.ModelSerializer):
    licensure_display = serializers.CharField(source='get_licensure_status_display', read_only=True)
    eligibility_display = serializers.CharField(source='get_work_eligibility_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CareerAssessment
        fields = [
            'id', 'full_name', 'email', 'phone',
            'specialty', 'sub_specialty', 'current_location',
            'desired_province_in_canada', 'years_of_experience',
            'licensure_status', 'licensure_display',
            'work_eligibility', 'eligibility_display',
            'preferred_job_type', 'preferred_practice_setting',
            'salary_expectation', 'availability_date',
            'relocation_support_needed',
            'status', 'status_display', 'is_reviewed',
            'submitted_at',
        ]


class CareerAssessmentDetailSerializer(serializers.ModelSerializer):
    licensure_display = serializers.CharField(source='get_licensure_status_display', read_only=True)
    eligibility_display = serializers.CharField(source='get_work_eligibility_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CareerAssessment
        fields = '__all__'


class CareerAssessmentReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareerAssessment
        fields = ['is_reviewed']


class CareerAssessmentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareerAssessment
        fields = ['status', 'admin_notes', 'is_reviewed']
