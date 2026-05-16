import uuid
import os
from django.db import models
from accounts.models import PhysicianProfile, EmployerProfile

SPECIALTY_CHOICES = [
    ('anatomical_pathology', 'Anatomical Pathology'),
    ('anesthesiology', 'Anesthesiology'),
    ('cardiac_surgery', 'Cardiac Surgery'),
    ('dermatology', 'Dermatology'),
    ('diagnostic_radiology', 'Diagnostic Radiology'),
    ('emergency_medicine', 'Emergency Medicine'),
    ('family_medicine', 'Family Medicine'),
    ('internal_medicine', 'Internal Medicine'),
    ('general_surgery', 'General Surgery'),
    ('neurology', 'Neurology'),
    ('obstetrics_gynecology', 'Obstetrics and Gynecology'),
    ('pediatrics', 'Pediatrics'),
    ('psychiatry', 'Psychiatry'),
    ('urology', 'Urology'),
    ('vascular_surgery', 'Vascular Surgery'),
    ('other', 'Other'),
]

SUB_SPECIALTY_CHOICES = [
    ('cardiology', 'Cardiology'),
    ('critical_care', 'Critical Care Medicine'),
    ('gastroenterology', 'Gastroenterology'),
    ('geriatric_medicine', 'Geriatric Medicine'),
    ('hematology', 'Hematology'),
    ('infectious_diseases', 'Infectious Diseases'),
    ('medical_oncology', 'Medical Oncology'),
    ('nephrology', 'Nephrology'),
    ('pain_medicine', 'Pain Medicine'),
    ('palliative_medicine', 'Palliative Medicine'),
    ('respirology', 'Respirology'),
    ('rheumatology', 'Rheumatology'),
    ('thoracic_surgery', 'Thoracic Surgery'),
    ('other', 'Other'),
]

PROVINCE_CHOICES = [
    ('AB', 'Alberta'),
    ('BC', 'British Columbia'),
    ('MB', 'Manitoba'),
    ('NB', 'New Brunswick'),
    ('NL', 'Newfoundland and Labrador'),
    ('NT', 'Northwest Territories'),
    ('NS', 'Nova Scotia'),
    ('NU', 'Nunavut'),
    ('ON', 'Ontario'),
    ('PE', 'Prince Edward Island'),
    ('QC', 'Quebec'),
    ('SK', 'Saskatchewan'),
    ('YT', 'Yukon'),
]

JOB_TYPE_CHOICES = [
    ('full_time', 'Full Time'),
    ('part_time', 'Part Time'),
    ('locum', 'Locum'),
    ('contract', 'Contract'),
    ('fellowship', 'Fellowship'),
]

PRACTICE_SETTING_CHOICES = [
    ('urban', 'Urban'),
    ('suburban', 'Suburban'),
    ('rural', 'Rural'),
    ('northern_remote', 'Northern / Remote'),
    ('academic_teaching', 'Academic / Teaching'),
    ('community_hospital', 'Community Hospital'),
    ('private_clinic', 'Private Clinic'),
]

COMPENSATION_MODEL_CHOICES = [
    ('salary', 'Salary'),
    ('fee_for_service', 'Fee for Service'),
    ('alternative_payment', 'Alternative Payment Plan'),
    ('blended', 'Blended Model'),
    ('contract_rate', 'Contract Rate'),
]

EXPERIENCE_LEVEL_CHOICES = [
    ('new_grad', 'New Graduate'),
    ('1_3_years', '1–3 Years'),
    ('3_5_years', '3–5 Years'),
    ('5_10_years', '5–10 Years'),
    ('10_plus', '10+ Years'),
]


def application_resume_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower()
    return f'applications/resumes/{instance.job_id}/{uuid.uuid4().hex}.{ext}'


class Job(models.Model):
    employer = models.ForeignKey(EmployerProfile, on_delete=models.CASCADE, related_name='jobs')
    title = models.CharField(max_length=255)
    specialty = models.CharField(max_length=50, choices=SPECIALTY_CHOICES)
    sub_specialty = models.CharField(max_length=50, choices=SUB_SPECIALTY_CHOICES, blank=True)
    province = models.CharField(max_length=2, choices=PROVINCE_CHOICES)
    city = models.CharField(max_length=100)
    location_display = models.CharField(max_length=255, blank=True)
    description = models.TextField()
    qualifications = models.TextField()
    requirements = models.TextField(blank=True, help_text='Required licences, certifications, years of experience etc.')
    responsibilities = models.TextField(blank=True, help_text='Day-to-day duties and responsibilities')
    compensation = models.TextField(blank=True)
    benefits = models.TextField(blank=True)
    application_deadline = models.DateField(null=True, blank=True)
    contact_person = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)
    job_type = models.CharField(max_length=20, choices=JOB_TYPE_CHOICES, default='full_time')
    practice_setting = models.CharField(max_length=50, choices=PRACTICE_SETTING_CHOICES, blank=True, null=True)
    required_experience = models.CharField(max_length=20, choices=EXPERIENCE_LEVEL_CHOICES, blank=True, null=True)
    salary_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    compensation_model = models.CharField(max_length=50, choices=COMPENSATION_MODEL_CHOICES, blank=True, null=True)
    salary_display = models.CharField(max_length=100, blank=True, null=True)
    remote_option = models.BooleanField(default=False, help_text='Position allows remote/telemedicine work')
    relocation_assistance = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=False)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active', 'is_approved'], name='job_active_approved_idx'),
            models.Index(fields=['specialty'], name='job_specialty_idx'),
            models.Index(fields=['province'], name='job_province_idx'),
        ]

    def __str__(self):
        return f'{self.title} — {self.location_display or self.city}'

    def save(self, *args, **kwargs):
        if self.city and self.province:
            province_name = dict(PROVINCE_CHOICES).get(self.province, self.province)
            self.location_display = f'{self.city}, {province_name}'
        super().save(*args, **kwargs)


class JobApplication(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('reviewed', 'Reviewed'),
        ('shortlisted', 'Shortlisted'),
        ('interview', 'Interview'),
        ('offered', 'Offered'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
    ]

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    physician = models.ForeignKey(PhysicianProfile, on_delete=models.CASCADE, related_name='applications')
    cover_letter = models.TextField(blank=True)
    resume = models.FileField(upload_to=application_resume_path, blank=True, null=True,
                              help_text='CV/resume submitted with this application')
    phone = models.CharField(max_length=30, blank=True)
    years_experience = models.PositiveSmallIntegerField(null=True, blank=True)
    linkedin_url = models.URLField(blank=True)
    availability_date = models.DateField(null=True, blank=True)
    willing_to_relocate = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    employer_notes = models.TextField(blank=True, help_text='Internal notes visible only to the employer')
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('job', 'physician')
        ordering = ['-applied_at']

    def __str__(self):
        return f'{self.physician.user.full_name} → {self.job.title}'


class SavedJob(models.Model):
    physician = models.ForeignKey(PhysicianProfile, on_delete=models.CASCADE, related_name='saved_jobs')
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='saved_by')
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('physician', 'job')
        ordering = ['-saved_at']

    def __str__(self):
        return f'{self.physician.user.full_name} saved {self.job.title}'
