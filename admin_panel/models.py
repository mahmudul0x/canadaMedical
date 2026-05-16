from django.db import models


class AdminNotification(models.Model):
    NOTIFICATION_TYPES = [
        ('job', 'New Job'),
        ('physician', 'New Physician'),
        ('employer', 'New Employer'),
        ('assessment', 'New Assessment'),
        ('contact', 'New Contact'),
        ('enterprise', 'Enterprise Request'),
    ]

    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
