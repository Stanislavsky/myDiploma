import json
import logging
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import User, AnonymousUser
from .models import Message
from users.models import StaffRole

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncJsonWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_group_name = 'admin_doctor_chat'
        self.user = None

    async def connect(self):
        try:
            self.user = self.scope["user"]
            logger.info(f"Попытка подключения пользователя {self.user.username if not isinstance(self.user, AnonymousUser) else 'Anonymous'}")
            
            # Проверяем, что пользователь аутентифицирован
            if isinstance(self.user, AnonymousUser):
                logger.warning("Анонимный пользователь пытается подключиться к чату")
                await self.close()
                return

            # Проверяем права доступа
            if not await self.check_user_permissions():
                logger.warning(f"Пользователь {self.user.username} не имеет доступа к чату")
                await self.close()
                return

            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            logger.info(f"Пользователь {self.user.username} успешно подключился к чату")
        except Exception as e:
            logger.error(f"Ошибка при подключении к WebSocket: {str(e)}")
            await self.close()

    @sync_to_async
    def check_user_permissions(self):
        try:
            if isinstance(self.user, AnonymousUser):
                return False
            return Message.can_access_chat(self.user)
        except Exception as e:
            logger.error(f"Ошибка при проверке прав доступа: {str(e)}")
            return False

    async def disconnect(self, close_code):
        try:
            if hasattr(self, 'channel_layer') and hasattr(self, 'channel_name'):
                await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
                username = self.user.username if self.user and not isinstance(self.user, AnonymousUser) else 'Anonymous'
                logger.info(f"Пользователь {username} отключился от чата")
        except Exception as e:
            logger.error(f"Ошибка при отключении от WebSocket: {str(e)}")

    @sync_to_async
    def save_message(self, user, content, message_type, image=None):
        try:
            message = Message.objects.create(
                user=user,
                content=content,
                message_type=message_type,
                image=image
            )
            return message
        except Exception as e:
            logger.error(f"Ошибка при сохранении сообщения: {str(e)}")
            raise

    async def receive_json(self, content):
        try:
            if isinstance(self.user, AnonymousUser):
                await self.send_json({'error': 'Требуется аутентификация'})
                return

            message = content.get('message', '')
            image_url = content.get('image_url')
            
            logger.info(f"Получено сообщение от пользователя {self.user.username}")
            
            # Получаем роль пользователя
            staff_role = await self.get_user_role()
            logger.info(f"Роль пользователя {self.user.username}: is_admin={staff_role.is_admin}, is_doctor={staff_role.is_doctor}, role={staff_role.role}")
            
            message_type = 'admin_to_doctor' if staff_role.is_admin else 'doctor_to_admin'
            logger.info(f"Определен тип сообщения: {message_type} для пользователя {self.user.username}")
            
            # Сохраняем сообщение в базе данных
            saved_message = await self.save_message(self.user, message, message_type)
            logger.info(f"Сообщение сохранено в базе данных: id={saved_message.id}, type={saved_message.message_type}")

            # Формируем данные для отправки
            message_data = {
                'type': 'chat_message',
                'message': message,
                'user': self.user.id,
                'message_type': message_type,
                'timestamp': saved_message.timestamp.isoformat(),
                'message_id': saved_message.id,
                'role': staff_role.role
            }

            if image_url:
                message_data['image_url'] = image_url

            # Отправляем сообщение в группу
            await self.channel_layer.group_send(
                self.room_group_name,
                message_data
            )
            logger.info(f"Сообщение от пользователя {self.user.username} успешно отправлено")
        except Exception as e:
            logger.error(f"Ошибка при обработке сообщения: {str(e)}")
            await self.send_json({
                'error': 'Ошибка при обработке сообщения'
            })

    @sync_to_async
    def get_user_role(self):
        try:
            if isinstance(self.user, AnonymousUser):
                raise StaffRole.DoesNotExist("Anonymous user has no role")
            return StaffRole.objects.get(user=self.user)
        except StaffRole.DoesNotExist:
            logger.error(f"Роль не найдена для пользователя {self.user.username if not isinstance(self.user, AnonymousUser) else 'Anonymous'}")
            raise

    async def chat_message(self, event):
        try:
            message_data = {
                'message': event['message'],
                'user': event['user'],
                'message_type': event['message_type'],
                'timestamp': event['timestamp'],
                'message_id': event['message_id'],
                'role': event['role']  # Добавляем роль в сообщение
            }
            
            if 'image_url' in event:
                message_data['image_url'] = event['image_url']
            
            await self.send_json(message_data)
            username = self.user.username if self.user and not isinstance(self.user, AnonymousUser) else 'Anonymous'
            logger.info(f"Сообщение успешно отправлено пользователю {username}")
        except Exception as e:
            logger.error(f"Ошибка при отправке сообщения: {str(e)}")
            await self.send_json({
                'error': 'Ошибка при отправке сообщения'
            })
