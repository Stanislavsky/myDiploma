"""
ASGI config for app project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
import django
import logging
import json
from urllib.parse import parse_qs

# Настраиваем Django до импорта моделей
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'app.settings')
django.setup()

# Импорты после настройки Django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.contrib.sessions.middleware import SessionMiddleware
from django.contrib.auth.middleware import AuthenticationMiddleware
from django.contrib.auth.middleware import get_user
from django.contrib.sessions.backends.db import SessionStore
from chatDoctorAndAdmin.routing import websocket_urlpatterns
from django.urls import re_path
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

class WebSocketAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        try:
            # Получаем query string из scope
            query_string = scope.get('query_string', b'').decode()
            query_params = parse_qs(query_string)
            
            logger.info(f"WebSocket auth middleware: query_params={query_params}")
            
            # Пробуем получить токен из query параметров
            token = query_params.get('token', [None])[0]
            logger.info(f"WebSocket auth middleware: token={token}")
            
            if token:
                # Если есть токен, пробуем найти пользователя по нему
                try:
                    from rest_framework.authtoken.models import Token
                    token_obj = await sync_to_async(Token.objects.get)(key=token)
                    user = await sync_to_async(lambda: token_obj.user)()
                    scope['user'] = user
                    logger.info(f"WebSocket auth middleware: user={user.username} authenticated by token")
                except Token.DoesNotExist:
                    logger.error(f"Token not found: {token}")
                    scope['user'] = AnonymousUser()
                except Exception as e:
                    logger.error(f"Error authenticating by token: {str(e)}")
                    scope['user'] = AnonymousUser()
            else:
                logger.warning("No token provided in WebSocket connection")
                # Если токена нет, пробуем получить сессию из cookies
                cookies = dict(scope.get('headers', []))
                session_key = cookies.get(b'sessionid', b'').decode()
                
                if session_key:
                    # Получаем сессию из базы данных
                    session = SessionStore(session_key)
                    user_id = session.get('_auth_user_id')
                    
                    if user_id:
                        User = get_user_model()
                        scope['user'] = await sync_to_async(User.objects.get)(id=user_id)
                        logger.info(f"WebSocket auth middleware: user={scope['user'].username} authenticated by session")
                    else:
                        logger.warning("No user_id in session")
                        scope['user'] = AnonymousUser()
                else:
                    logger.warning("No session cookie found")
                    scope['user'] = AnonymousUser()
                    
            logger.info(f"WebSocket auth middleware: final user={scope['user']}")
            return await super().__call__(scope, receive, send)
        except Exception as e:
            logger.error(f"Error in WebSocket auth middleware: {str(e)}")
            scope['user'] = AnonymousUser()
            return await super().__call__(scope, receive, send)

# Добавляем префикс для WebSocket URL паттернов
websocket_urlpatterns_with_prefix = [
    re_path(r'^ws/', URLRouter(websocket_urlpatterns)),
]

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        WebSocketAuthMiddleware(
            URLRouter(
                websocket_urlpatterns_with_prefix
            )
        )
    ),
})
