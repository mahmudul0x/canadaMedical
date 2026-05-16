from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    PhysicianRegisterView,
    EmployerRegisterView,
    CustomLoginView,
    LogoutView,
    CurrentUserView,
    PhysicianProfileView,
    PhysicianResumeUploadView,
    EmployerProfileView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    # Auth
    path('auth/register/physician/', PhysicianRegisterView.as_view(), name='register-physician'),
    path('auth/register/employer/', EmployerRegisterView.as_view(), name='register-employer'),
    path('auth/login/', CustomLoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/password/reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('auth/password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    # Current user
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
    # Profiles
    path('profile/physician/', PhysicianProfileView.as_view(), name='physician-profile'),
    path('profile/physician/resume/', PhysicianResumeUploadView.as_view(), name='physician-resume'),
    path('profile/employer/', EmployerProfileView.as_view(), name='employer-profile'),
]
