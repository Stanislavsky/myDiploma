from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    get_csrf_token,
    LoginView,
    LogoutView,
    CheckAuthView,
    DeleteUserView
)

urlpatterns = [
    path('csrf/', get_csrf_token),
    path('login/', LoginView.as_view(), name='login'),
    path('check/', CheckAuthView.as_view(), name='check-auth'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('users/<int:user_id>/', DeleteUserView.as_view(), name='delete-user'),
]