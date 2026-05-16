from django.core.management.base import BaseCommand


PLANS = [
    {
        'name': 'Basic',
        'plan_type': 'employer',
        'price_monthly': 0,
        'is_free': True,
        'is_enterprise': False,
        'is_popular': False,
        'job_post_limit': 1,
        'order': 1,
        'features': [
            '1 Job Posting (30 days)',
            'Standard listing placement',
            'Application management',
            'Email notifications',
        ],
    },
    {
        'name': 'Professional',
        'plan_type': 'employer',
        'price_monthly': 499,
        'is_free': False,
        'is_enterprise': False,
        'is_popular': True,
        'job_post_limit': 5,
        'order': 2,
        'features': [
            '5 Active Job Postings',
            'Featured listing highlights',
            'Priority in search results',
            'Candidate database access',
            'Applicant tracking tools',
            'Email + SMS notifications',
            'Dedicated account manager',
        ],
    },
    {
        'name': 'Enterprise',
        'plan_type': 'employer',
        'price_monthly': 0,
        'is_free': False,
        'is_enterprise': True,
        'is_popular': False,
        'job_post_limit': None,
        'order': 3,
        'features': [
            'Unlimited Job Postings',
            'Homepage featured placement',
            'Top priority in search results',
            'Full candidate database access',
            'Advanced analytics & reporting',
            'Dedicated account manager',
            'Custom branding options',
        ],
    },
]


class Command(BaseCommand):
    help = 'Create initial subscription plans in the database'

    def handle(self, *args, **kwargs):
        from subscriptions.models import SubscriptionPlan

        for plan_data in PLANS:
            plan, created = SubscriptionPlan.objects.update_or_create(
                name=plan_data['name'],
                defaults=plan_data,
            )
            verb = 'Created' if created else 'Updated'
            self.stdout.write(f'{verb}: {plan.name} (${plan.price_monthly}/mo)')

        self.stdout.write(self.style.SUCCESS('All plans set up successfully.'))
