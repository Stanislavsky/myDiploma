from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import DoctorProfile, Question, Patient
from .serializers import DoctorProfileSerializer, QuestionSerializer, PatientSerializer
from doctorProfile import serializers
from users.models import StaffRole

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
        print(f"Current user: {self.request.user}")
        # Если пользователь админ или поддержка, показываем все профили
        if hasattr(self.request.user, 'staffrole') and self.request.user.staffrole.role in ['admin', 'support']:
            queryset = DoctorProfile.objects.all()
            print(f"Admin view - all profiles: {queryset}")
            return queryset
        # Для обычных пользователей показываем только их профиль
        queryset = DoctorProfile.objects.filter(staff_role__user=self.request.user)
        print(f"User view - filtered profiles: {queryset}")
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response([])
        
        queryset = self.get_queryset().filter(
            Q(staff_role__user__username__icontains=query) |
            Q(staff_role__user__first_name__icontains=query) |
            Q(staff_role__user__last_name__icontains=query) |
            Q(workplace__icontains=query) |
            Q(position__icontains=query)
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

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

class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            staff_role = StaffRole.objects.get(user=self.request.user)
            doctor_profile = DoctorProfile.objects.get(staff_role=staff_role)
            return Patient.objects.filter(doctor=doctor_profile)
        except (StaffRole.DoesNotExist, DoctorProfile.DoesNotExist):
            return Patient.objects.none()

    def perform_create(self, serializer):
        staff_role = StaffRole.objects.get(user=self.request.user)
        doctor_profile = DoctorProfile.objects.get(staff_role=staff_role)
        serializer.save(doctor=doctor_profile)

    @action(detail=True, methods=['delete'])
    def delete_patient(self, request, pk=None):
        patient = self.get_object()
        patient.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response([])
        
        queryset = self.get_queryset().filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(middle_name__icontains=query) |
            Q(phone_number__icontains=query)
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
