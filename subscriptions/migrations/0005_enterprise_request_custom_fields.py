from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('subscriptions', '0004_enterprise_revoke_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='enterpriserequest',
            name='num_job_posts',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='enterpriserequest',
            name='featured_jobs',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='enterpriserequest',
            name='hiring_duration',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='enterpriserequest',
            name='additional_services',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='enterpriserequest',
            name='budget_range',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
