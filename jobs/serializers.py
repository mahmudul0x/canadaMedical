from django.db import IntegrityError
from rest_framework import serializers
from accounts.serializers import validate_resume_file
from .models import Job, JobApplication, SavedJob, SPECIALTY_CHOICES, SUB_SPECIALTY_CHOICES, PROVINCE_CHOICES


class JobListSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source='employer.company_name', read_only=True)
    employer_type = serializers.CharField(source='employer.company_type', read_only=True)
    specialty_display = serializers.CharField(source='get_specialty_display', read_only=True)
    province_display = serializers.CharField(source='get_province_display', read_only=True)
    job_type_display = serializers.CharField(source='get_job_type_display', read_only=True)
    practice_setting_display = serializers.CharField(source='get_practice_setting_display', read_only=True)
    salary_min = serializers.FloatField(read_only=True)
    salary_max = serializers.FloatField(read_only=True)
    applications_count = serializers.IntegerField(source='applications.count', read_only=True)

    class Meta:
        model = Job
        fields = [
            'id', 'title', 'specialty', 'specialty_display',
            'sub_specialty', 'province', 'province_display',
            'city', 'location_display',
            'job_type', 'job_type_display',
            'practice_setting', 'practice_setting_display',
            'salary_min', 'salary_max', 'salary_display', 'compensation_model',
            'employer_name', 'employer_type',
            'application_deadline', 'is_active', 'is_approved', 'is_featured',
            'remote_option', 'relocation_assistance',
            'required_experience',
            'views_count', 'applications_count', 'created_at',
        ]


class JobDetailSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source='employer.company_name', read_only=True)
    employer_type = serializers.CharField(source='employer.company_type', read_only=True)
    employer_website = serializers.CharField(source='employer.website', read_only=True)
    specialty_display = serializers.CharField(source='get_specialty_display', read_only=True)
    province_display = serializers.CharField(source='get_province_display', read_only=True)
    job_type_display = serializers.CharField(source='get_job_type_display', read_only=True)
    practice_setting_display = serializers.CharField(source='get_practice_setting_display', read_only=True)
    compensation_model_display = serializers.CharField(source='get_compensation_model_display', read_only=True)
    required_experience_display = serializers.CharField(source='get_required_experience_display', read_only=True)
    salary_min = serializers.FloatField(read_only=True)
    salary_max = serializers.FloatField(read_only=True)
    total_applications = serializers.IntegerField(source='applications.count', read_only=True)

    class Meta:
        model = Job
        fields = [
            'id', 'title',
            'specialty', 'specialty_display',
            'sub_specialty', 'province', 'province_display',
            'city', 'location_display',
            'description', 'qualifications', 'requirements', 'responsibilities',
            'compensation', 'benefits',
            'application_deadline', 'contact_person', 'contact_email',
            'job_type', 'job_type_display',
            'practice_setting', 'practice_setting_display',
            'required_experience', 'required_experience_display',
            'salary_min', 'salary_max', 'salary_display',
            'compensation_model', 'compensation_model_display',
            'employer_name', 'employer_type', 'employer_website',
            'remote_option', 'relocation_assistance', 'is_featured',
            'is_active', 'is_approved', 'views_count', 'total_applications',
            'created_at', 'updated_at',
        ]


class JobCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = [
            'title', 'specialty', 'sub_specialty',
            'province', 'city',
            'description', 'qualifications', 'requirements', 'responsibilities',
            'compensation', 'benefits',
            'application_deadline', 'contact_person', 'contact_email',
            'job_type', 'practice_setting', 'required_experience',
            'salary_min', 'salary_max', 'salary_display', 'compensation_model',
            'remote_option', 'relocation_assistance',
            'is_active',
        ]

    def validate_title(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError('Job title must be at least 5 characters.')
        return value.strip()

    def validate_description(self, value):
        if len(value.strip()) < 50:
            raise serializers.ValidationError('Job description must be at least 50 characters.')
        return value.strip()

    def create(self, validated_data):
        employer = self.context['request'].user.employer_profile
        return Job.objects.create(employer=employer, **validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ApplicationPhysicianSerializer(serializers.Serializer):
    id = serializers.IntegerField(source='physician.id')
    full_name = serializers.CharField(source='physician.user.full_name')
    email = serializers.CharField(source='physician.user.email')
    specialty = serializers.CharField(source='physician.specialty')
    specialty_display = serializers.SerializerMethodField()
    cpso_number = serializers.CharField(source='physician.cpso_number')
    board_certifications = serializers.CharField(source='physician.board_certifications')
    profile_resume_url = serializers.SerializerMethodField()

    def get_specialty_display(self, obj):
        return dict(SPECIALTY_CHOICES).get(obj.physician.specialty, obj.physician.specialty)

    def get_profile_resume_url(self, obj):
        request = self.context.get('request')
        if obj.physician.resume:
            try:
                return request.build_absolute_uri(obj.physician.resume.url) if request else obj.physician.resume.url
            except Exception:
                return None
        return None


class JobApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job.title', read_only=True)
    job_location = serializers.CharField(source='job.location_display', read_only=True)
    employer_name = serializers.CharField(source='job.employer.company_name', read_only=True)
    job_id = serializers.IntegerField(source='job.id', read_only=True)
    physician_name = serializers.CharField(source='physician.user.full_name', read_only=True)
    physician_email = serializers.CharField(source='physician.user.email', read_only=True)
    physician_specialty = serializers.CharField(source='physician.specialty', read_only=True)
    physician_specialty_display = serializers.SerializerMethodField()
    physician_cpso = serializers.CharField(source='physician.cpso_number', read_only=True)
    physician_certifications = serializers.CharField(source='physician.board_certifications', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    resume_url = serializers.SerializerMethodField()
    profile_resume_url = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = [
            'id', 'job_id', 'job_title', 'job_location', 'employer_name',
            'physician_name', 'physician_email',
            'physician_specialty', 'physician_specialty_display',
            'physician_cpso', 'physician_certifications',
            'cover_letter', 'resume_url', 'profile_resume_url',
            'phone', 'years_experience', 'linkedin_url',
            'availability_date', 'willing_to_relocate',
            'status', 'status_display', 'employer_notes',
            'applied_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'applied_at', 'updated_at']

    def get_physician_specialty_display(self, obj):
        return dict(SPECIALTY_CHOICES).get(obj.physician.specialty, obj.physician.specialty)

    def get_resume_url(self, obj):
        request = self.context.get('request')
        if obj.resume:
            try:
                return request.build_absolute_uri(obj.resume.url) if request else obj.resume.url
            except Exception:
                return None
        return None

    def get_profile_resume_url(self, obj):
        request = self.context.get('request')
        if obj.physician.resume:
            try:
                return request.build_absolute_uri(obj.physician.resume.url) if request else obj.physician.resume.url
            except Exception:
                return None
        return None


class JobApplicationCreateSerializer(serializers.ModelSerializer):
    resume = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = JobApplication
        fields = [
            'cover_letter', 'resume',
            'phone', 'years_experience', 'linkedin_url',
            'availability_date', 'willing_to_relocate',
        ]

    def validate_resume(self, value):
        if value:
            return validate_resume_file(value)
        return value

    def validate(self, data):
        job = self.context['job']
        physician = self.context['request'].user.physician_profile

        if not job.is_active or not job.is_approved:
            raise serializers.ValidationError('This job is not currently accepting applications.')

        if JobApplication.objects.filter(job=job, physician=physician).exists():
            raise serializers.ValidationError('You have already applied to this job.')

        return data

    def create(self, validated_data):
        try:
            return JobApplication.objects.create(
                job=self.context['job'],
                physician=self.context['request'].user.physician_profile,
                **validated_data,
            )
        except IntegrityError:
            raise serializers.ValidationError('You have already applied to this job.')


class SavedJobSerializer(serializers.ModelSerializer):
    job_detail = JobListSerializer(source='job', read_only=True)

    class Meta:
        model = SavedJob
        fields = ['id', 'job', 'job_detail', 'saved_at']
        read_only_fields = ['id', 'saved_at']
