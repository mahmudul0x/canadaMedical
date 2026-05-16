import django_filters
from .models import Job, PRACTICE_SETTING_CHOICES


class JobFilter(django_filters.FilterSet):
    keyword = django_filters.CharFilter(method='filter_keyword', label='Keyword')
    search = django_filters.CharFilter(method='filter_keyword', label='Search')
    specialty = django_filters.CharFilter(field_name='specialty', lookup_expr='iexact')
    sub_specialty = django_filters.CharFilter(field_name='sub_specialty', lookup_expr='iexact')
    province = django_filters.CharFilter(field_name='province', lookup_expr='iexact')
    city = django_filters.CharFilter(field_name='city', lookup_expr='icontains')
    job_type = django_filters.CharFilter(field_name='job_type', lookup_expr='iexact')
    employer = django_filters.CharFilter(field_name='employer__company_name', lookup_expr='icontains')
    posted_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    posted_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    practice_setting = django_filters.CharFilter(field_name='practice_setting', lookup_expr='iexact')
    salary_min = django_filters.NumberFilter(field_name='salary_min', lookup_expr='gte')
    salary_max = django_filters.NumberFilter(field_name='salary_max', lookup_expr='lte')

    class Meta:
        model = Job
        fields = ['specialty', 'sub_specialty', 'province', 'city', 'job_type', 'practice_setting']

    def filter_keyword(self, queryset, name, value):
        from django.db.models import Q
        return queryset.filter(
            Q(title__icontains=value) |
            Q(description__icontains=value) |
            Q(qualifications__icontains=value) |
            Q(employer__company_name__icontains=value)
        )
