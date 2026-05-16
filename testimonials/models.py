from django.db import models


def testimonial_photo_path(instance, filename):
    return f'testimonial_photos/{filename}'


TESTIMONIAL_TYPE_CHOICES = [
    ('physician', 'Physician'),
    ('employer', 'Employer'),
]


class Testimonial(models.Model):
    physician_name = models.CharField(max_length=255)
    specialty = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    testimonial_text = models.TextField()
    photo = models.ImageField(upload_to=testimonial_photo_path, blank=True, null=True)
    testimonial_type = models.CharField(max_length=20, choices=TESTIMONIAL_TYPE_CHOICES, default='physician')
    rating = models.PositiveSmallIntegerField(default=5, choices=[(i, i) for i in range(1, 6)])
    organization = models.CharField(max_length=200, blank=True, null=True, help_text='For employer testimonials: organization name and role')
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return f'{self.physician_name} — {self.specialty}'
