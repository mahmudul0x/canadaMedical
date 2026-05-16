from rest_framework.permissions import BasePermission
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class IsAdminUser(BasePermission):
    message = 'Access restricted to admin accounts.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IPRateThrottle(SimpleRateThrottle):
    """Rate-limits by IP regardless of authentication status."""

    def get_cache_key(self, request, view):
        ident = (
            request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
            or request.META.get('REMOTE_ADDR', 'unknown')
        )
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class ContactFormThrottle(IPRateThrottle):
    rate = '5/minute'
    scope = 'contact_form'


class AssessmentFormThrottle(IPRateThrottle):
    rate = '5/minute'
    scope = 'assessment_form'


class RegistrationThrottle(IPRateThrottle):
    rate = '10/minute'
    scope = 'registration'


class PasswordResetThrottle(IPRateThrottle):
    rate = '5/minute'
    scope = 'password_reset'


class IsPhysician(BasePermission):
    message = 'Access restricted to physician accounts.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.user_type == 'physician'
        )


class IsEmployer(BasePermission):
    message = 'Access restricted to employer accounts.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.user_type == 'employer'
        )


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user and request.user.is_staff


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        if hasattr(obj, 'employer'):
            return obj.employer.user == request.user
        if hasattr(obj, 'physician'):
            return obj.physician.user == request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False
