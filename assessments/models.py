import uuid
from django.db import models


def assessment_resume_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'bin'
    return f'assessment_resumes/{uuid.uuid4().hex}.{ext}'


class CareerAssessment(models.Model):
    LICENSURE_CHOICES = [
        ('licensed_canada', 'Licensed in Canada'),
        ('licensed_other', 'Licensed in Another Country'),
        ('in_process', 'In Process'),
        ('not_yet', 'Not Yet Licensed'),
    ]

    ELIGIBILITY_CHOICES = [
        ('citizen', 'Canadian Citizen'),
        ('pr', 'Permanent Resident'),
        ('work_permit', 'Work Permit Holder'),
        ('need_sponsorship', 'Need Sponsorship'),
    ]

    STATUS_CHOICES = [
        ('new', 'New'),
        ('under_review', 'Under Review'),
        ('contacted', 'Contacted'),
        ('in_progress', 'In Progress'),
        ('placed', 'Placed'),
        ('closed', 'Closed'),
    ]

    # Personal info
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20)

    # Professional info
    specialty = models.CharField(max_length=100)
    sub_specialty = models.CharField(max_length=100, blank=True)
    years_of_experience = models.PositiveIntegerField()
    current_location = models.CharField(max_length=255)
    licensure_status = models.CharField(max_length=20, choices=LICENSURE_CHOICES)
    work_eligibility = models.CharField(max_length=20, choices=ELIGIBILITY_CHOICES)

    # Preferences
    desired_province_in_canada = models.CharField(max_length=100)
    relocation_support_needed = models.BooleanField(default=False)
    preferred_job_type = models.CharField(max_length=50, blank=True)
    preferred_practice_setting = models.CharField(max_length=50, blank=True)
    salary_expectation = models.CharField(max_length=100, blank=True)
    availability_date = models.DateField(null=True, blank=True)

    # Goals & documents
    career_goals = models.TextField()
    additional_notes = models.TextField(blank=True)
    resume = models.FileField(upload_to=assessment_resume_path, blank=True, null=True)

    # Admin workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    is_reviewed = models.BooleanField(default=False)
    admin_notes = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f'{self.full_name} — {self.specialty}'
