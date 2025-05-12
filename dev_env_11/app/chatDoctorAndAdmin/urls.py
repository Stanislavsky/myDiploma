from django.urls import path
from . import views

urlpatterns = [
    path('messages/', views.get_messages, name='get_messages'),
    path('upload-image/', views.upload_image, name='upload_image'),
    path('delete-messages/<int:user_id>/', views.delete_messages, name='delete_messages'),
    path('check-question/<int:user_id>/', views.check_question_exists, name='check_question_exists'),
] 