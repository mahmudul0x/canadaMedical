"""
Single source of truth for all choice constants used across the project.
Import from here instead of defining locally in each app.
"""

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
    ('1_3_years', '1-3 Years'),
    ('3_5_years', '3-5 Years'),
    ('5_10_years', '5-10 Years'),
    ('10_plus', '10+ Years'),
]

APPLICATION_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('reviewed', 'Reviewed'),
    ('shortlisted', 'Shortlisted'),
    ('interview', 'Interview'),
    ('offered', 'Offered'),
    ('accepted', 'Accepted'),
    ('offer_declined', 'Offer Declined'),
    ('rejected', 'Rejected'),
    ('withdrawn', 'Withdrawn'),
]

# Lookup dicts for fast display-value resolution
SPECIALTY_MAP         = dict(SPECIALTY_CHOICES)
SUB_SPECIALTY_MAP     = dict(SUB_SPECIALTY_CHOICES)
PROVINCE_MAP          = dict(PROVINCE_CHOICES)
JOB_TYPE_MAP          = dict(JOB_TYPE_CHOICES)
PRACTICE_SETTING_MAP  = dict(PRACTICE_SETTING_CHOICES)
