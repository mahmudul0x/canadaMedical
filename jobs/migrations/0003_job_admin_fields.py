from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0002_job_job_active_approved_idx_job_job_specialty_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='rejection_reason',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='rejected_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
