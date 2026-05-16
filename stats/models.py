from django.db import models


class PlatformStats(models.Model):
    total_active_jobs = models.PositiveIntegerField(default=0)
    new_opportunities = models.PositiveIntegerField(default=0)
    total_active_candidates = models.PositiveIntegerField(default=0)
    new_candidates = models.PositiveIntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Platform Stats'
        verbose_name_plural = 'Platform Stats'

    def __str__(self):
        return f'Platform Stats (last updated: {self.last_updated})'

    @classmethod
    def get_stats(cls):
        stats, _ = cls.objects.get_or_create(pk=1)
        return stats
