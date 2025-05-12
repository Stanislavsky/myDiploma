from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.core.serializers import serialize
from django.views.decorators.http import require_http_methods
from django.core.files.storage import default_storage
from django.db.models import Q
from .models import Message
from users.models import StaffRole
import json

# Create your views here.

@login_required
def chat_room(request):
    # Проверяем права доступа
    if not Message.can_access_chat(request.user):
        return JsonResponse({'error': 'У вас нет доступа к чату'}, status=403)
    
    # Получаем историю сообщений
    messages = Message.objects.all().order_by('timestamp')[:50]
    
    # Получаем роль пользователя
    staff_role = StaffRole.objects.get(user=request.user)
    
    context = {
        'messages': messages,
        'is_admin': staff_role.is_admin,
        'is_doctor': staff_role.is_doctor,
        'username': request.user.username
    }
    
    return render(request, 'chatDoctorAndAdmin/chat_room.html', context)

@login_required
def get_messages(request):
    """API endpoint для получения истории сообщений"""
    if not Message.can_access_chat(request.user):
        return JsonResponse({'error': 'У вас нет доступа к чату'}, status=403)
    
    messages = Message.objects.all().order_by('timestamp')[:50]
    
    # Форматируем сообщения для JSON
    messages_data = []
    for msg in messages:
        try:
            staff_role = StaffRole.objects.get(user=msg.user)
            role = staff_role.role
        except StaffRole.DoesNotExist:
            role = None
            
        message_data = {
            'id': msg.id,
            'content': msg.content,
            'user': msg.user.id,
            'message_type': msg.message_type,
            'timestamp': msg.timestamp.isoformat(),
            'is_read': msg.is_read,
            'image': msg.image.url if msg.image else None,
            'role': role  # Добавляем роль пользователя
        }
        messages_data.append(message_data)
    
    return JsonResponse({'messages': messages_data})

@login_required
@require_http_methods(["POST"])
def upload_image(request):
    """API endpoint для загрузки изображений"""
    if not Message.can_access_chat(request.user):
        return JsonResponse({'error': 'У вас нет доступа к чату'}, status=403)
    
    if 'image' not in request.FILES:
        return JsonResponse({'error': 'Изображение не найдено'}, status=400)
    
    image = request.FILES['image']
    
    # Проверяем тип файла
    if not image.content_type.startswith('image/'):
        return JsonResponse({'error': 'Файл должен быть изображением'}, status=400)
    
    # Создаем сообщение с изображением
    staff_role = StaffRole.objects.get(user=request.user)
    message_type = 'admin_to_doctor' if staff_role.is_admin else 'doctor_to_admin'
    
    message = Message.objects.create(
        user=request.user,
        message_type=message_type,
        image=image
    )
    
    return JsonResponse({
        'id': message.id,
        'image': message.image.url,
        'timestamp': message.timestamp.isoformat(),
        'user': request.user.id,
        'message_type': message.message_type
    })

@login_required
@require_http_methods(["DELETE"])
def delete_messages(request, user_id):
    """API endpoint для удаления всех сообщений чата с конкретным пользователем"""
    if not Message.can_access_chat(request.user):
        return JsonResponse({'error': 'У вас нет доступа к чату'}, status=403)
    
    try:
        # Получаем все сообщения чата
        chat_messages = Message.objects.filter(
            message_type__in=['admin_to_doctor', 'doctor_to_admin']
        )
        
        # Получаем сообщения от пользователя
        user_messages = Message.objects.filter(user_id=user_id)
        
        # Объединяем QuerySets
        messages = (chat_messages | user_messages).distinct()
        
        print(f"Найдено сообщений для удаления: {messages.count()}")
        
        # Удаляем изображения, связанные с сообщениями
        for message in messages:
            if message.image and message.image.name:
                try:
                    default_storage.delete(message.image.name)
                    print(f"Удалено изображение: {message.image.name}")
                except Exception as e:
                    print(f"Ошибка при удалении изображения {message.image.name}: {str(e)}")
        
        # Удаляем все сообщения
        deleted_count = messages.delete()[0]
        print(f"Удалено сообщений: {deleted_count}")
        
        return JsonResponse({
            'status': 'success',
            'message': f'Успешно удалено {deleted_count} сообщений',
            'deleted_count': deleted_count
        })
    except Exception as e:
        print(f"Ошибка при удалении сообщений: {str(e)}")
        return JsonResponse({
            'error': f'Ошибка при удалении сообщений: {str(e)}'
        }, status=500)

@login_required
def check_question_exists(request, user_id):
    """API endpoint для проверки существования чата с пользователем"""
    if not Message.can_access_chat(request.user):
        return JsonResponse({'error': 'У вас нет доступа к чату'}, status=403)
    
    try:
        # Проверяем наличие сообщений в чате
        messages = Message.objects.filter(
            Q(user_id=user_id) |  # сообщения от пользователя
            Q(message_type__in=['admin_to_doctor', 'doctor_to_admin'])  # сообщения в чате
        ).distinct()
        
        exists = messages.exists()
        print(f"Проверка чата для пользователя {user_id}: найдено сообщений {messages.count()}, чат существует: {exists}")
        
        return JsonResponse({
            'exists': exists,
            'message_count': messages.count()  # добавляем количество сообщений для отладки
        })
    except Exception as e:
        print(f"Ошибка при проверке существования чата: {str(e)}")
        return JsonResponse({
            'error': f'Ошибка при проверке существования чата: {str(e)}'
        }, status=500)
