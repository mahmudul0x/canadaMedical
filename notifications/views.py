from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from core.exceptions import success_response
from .models import Notification
from .serializers import NotificationSerializer


def _admin_qs():
    return Notification.objects.filter(user__isnull=True)


def _user_qs(user):
    return Notification.objects.filter(user=user)


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.is_staff:
            qs = _admin_qs()
        else:
            qs = _user_qs(request.user)

        since = request.query_params.get('since')
        if since:
            try:
                from django.utils.dateparse import parse_datetime
                since_dt = parse_datetime(since)
                if since_dt:
                    qs = qs.filter(created_at__gt=since_dt)
            except (ValueError, TypeError):
                pass

        serializer = NotificationSerializer(qs[:50], many=True)
        return success_response(data=serializer.data)


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.is_staff:
            count = _admin_qs().filter(is_read=False).count()
        else:
            count = _user_qs(request.user).filter(is_read=False).count()
        return success_response(data={'count': count})


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.is_staff:
            qs = _admin_qs()
        else:
            qs = _user_qs(request.user)
        try:
            n = qs.get(pk=pk)
        except Notification.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        n.is_read = True
        n.save(update_fields=['is_read'])
        return success_response(data=NotificationSerializer(n).data)


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.is_staff:
            updated = _admin_qs().filter(is_read=False).update(is_read=True)
        else:
            updated = _user_qs(request.user).filter(is_read=False).update(is_read=True)
        return success_response(data={'marked_read': updated})
