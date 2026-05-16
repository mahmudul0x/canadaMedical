import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = await self._get_user()
        if user is None:
            await self.close(code=4001)
            return

        self.user_id = user.pk
        self.is_staff = user.is_staff

        if self.is_staff:
            self.group_name = 'notifications_admin'
        else:
            self.group_name = f'notifications_user_{self.user_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info('WS connected: %s → %s', user.email, self.group_name)

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        pass

    async def notify(self, event):
        await self.send(text_data=json.dumps(event['notification']))

    @database_sync_to_async
    def _get_user(self):
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework_simplejwt.exceptions import TokenError
        from django.contrib.auth import get_user_model

        User = get_user_model()
        scope = self.scope
        token = None

        qs = scope.get('query_string', b'').decode()
        for part in qs.split('&'):
            if part.startswith('token='):
                token = part[6:]
                break

        if not token:
            return None
        try:
            validated = AccessToken(token)
            user_id = validated['user_id']
            return User.objects.get(pk=user_id, is_active=True)
        except (TokenError, User.DoesNotExist, Exception):
            return None
