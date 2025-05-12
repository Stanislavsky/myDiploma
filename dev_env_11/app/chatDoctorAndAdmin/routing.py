from django.urls import re_path
from . import consumers
import logging

logger = logging.getLogger(__name__)

websocket_urlpatterns = [
    re_path(r'^chat/$', consumers.ChatConsumer.as_asgi(), name='ws_chat'),
]

logger.info("WebSocket URL patterns registered: %s", websocket_urlpatterns) 