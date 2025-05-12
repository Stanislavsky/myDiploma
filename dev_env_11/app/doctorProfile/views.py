from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import DoctorProfile, Question
from .serializers import DoctorProfileSerializer, QuestionSerializer
from doctorProfile import serializers

# Create your views here.

class IsAdminOrSupport(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or 
            getattr(request.user, 'staffrole', None) and request.user.staffrole.role in ['admin', 'support']
        )

class DoctorProfileViewSet(viewsets.ModelViewSet):
    queryset = DoctorProfile.objects.all()
    serializer_class = DoctorProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Возвращаем только профиль текущего пользователя
        return DoctorProfile.objects.filter(staff_role__user=self.request.user)

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdminOrSupport()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        try:
            # Получаем профиль врача текущего пользователя
            doctor_profile = DoctorProfile.objects.get(staff_role__user=self.request.user)
            serializer.save(doctor_profile=doctor_profile)
        except DoctorProfile.DoesNotExist:
            # Если профиль не найден, возвращаем ошибку
            raise serializers.ValidationError(
                {"detail": "Профиль врача не найден. Пожалуйста, убедитесь, что вы авторизованы как врач."}
            )

    def get_queryset(self):
        # Для врачей показываем только их вопросы
        if hasattr(self.request.user, 'staffrole') and self.request.user.staffrole.role == 'doctor':
            return Question.objects.filter(doctor_profile__staff_role__user=self.request.user)
        # Для админов и поддержки показываем все вопросы
        return Question.objects.all()
