from django.db import models
from django.contrib.auth.models import User
from users.models import StaffRole
import os
from datetime import datetime

def chat_image_path(instance, filename):
    # Генерируем путь для сохранения изображения
    # Формат: chat_images/YYYY/MM/DD/filename
    date_path = datetime.now().strftime('%Y/%m/%d')
    # Получаем расширение файла
    ext = filename.split('.')[-1]
    # Генерируем уникальное имя файла
    filename = f"{datetime.now().strftime('%H%M%S')}_{instance.user.id}.{ext}"
    return os.path.join('chat_images', date_path, filename)

# Create your models here.
class Message(models.Model):
    MESSAGE_TYPES = [
        ('admin_to_doctor', 'От администратора к врачу'),
        ('doctor_to_admin', 'От врача к администратору'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES)
    content = models.TextField(blank=True)  # Делаем поле необязательным
    image = models.ImageField(upload_to=chat_image_path, null=True, blank=True)  # Добавляем поле для изображения
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        if self.content:
            return f'{self.user.username}: {self.content[:20]}'
        elif self.image:
            return f'{self.user.username}: [Изображение]'
        return f'{self.user.username}: [Пустое сообщение]'

    @staticmethod
    def can_access_chat(user):
        """Проверяет, имеет ли пользователь доступ к чату"""
        try:
            staff_role = StaffRole.objects.get(user=user)
            return staff_role.is_admin or staff_role.is_doctor
        except StaffRole.DoesNotExist:
            return False

    class Meta:
        ordering = ['timestamp']