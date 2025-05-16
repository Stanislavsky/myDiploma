from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from .models import Patient, PatientDocument, PatientAddress, InsurancePolicy
from .serializers import (
    PatientSerializer,
    PatientDocumentSerializer,
    PatientAddressSerializer,
    InsurancePolicySerializer
)
from doctorProfile.models import DoctorProfile
from users.models import StaffRole
import logging

logger = logging.getLogger(__name__)

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

    def create(self, request, *args, **kwargs):
        logger.info(f"Received data: {request.data}")
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error creating patient: {str(e)}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        try:
            # Получаем текущего пользователя
            user = self.request.user
            logger.info(f"Current user: {user.username}")

            # Получаем роль пользователя
            staff_role = StaffRole.objects.get(user=user)
            logger.info(f"Staff role: {staff_role.role}")

            # Получаем профиль врача
            doctor_profile = DoctorProfile.objects.get(staff_role=staff_role)
            logger.info(f"Doctor profile: {doctor_profile.id}")

            # Сохраняем пациента с привязкой к врачу
            serializer.save(doctor=doctor_profile)
            logger.info("Patient saved successfully")
        except StaffRole.DoesNotExist:
            logger.error("StaffRole not found")
            raise serializers.ValidationError("User does not have a staff role")
        except DoctorProfile.DoesNotExist:
            logger.error("DoctorProfile not found")
            raise serializers.ValidationError("User does not have a doctor profile")
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            raise

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
            Q(middle_name__icontains=query)
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class PatientDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = PatientDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            staff_role = StaffRole.objects.get(user=self.request.user)
            doctor_profile = DoctorProfile.objects.get(staff_role=staff_role)
            return PatientDocument.objects.filter(patient__doctor=doctor_profile)
        except (StaffRole.DoesNotExist, DoctorProfile.DoesNotExist):
            return PatientDocument.objects.none()

class PatientAddressViewSet(viewsets.ModelViewSet):
    serializer_class = PatientAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            staff_role = StaffRole.objects.get(user=self.request.user)
            doctor_profile = DoctorProfile.objects.get(staff_role=staff_role)
            return PatientAddress.objects.filter(patient__doctor=doctor_profile)
        except (StaffRole.DoesNotExist, DoctorProfile.DoesNotExist):
            return PatientAddress.objects.none()

class InsurancePolicyViewSet(viewsets.ModelViewSet):
    serializer_class = InsurancePolicySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            staff_role = StaffRole.objects.get(user=self.request.user)
            doctor_profile = DoctorProfile.objects.get(staff_role=staff_role)
            return InsurancePolicy.objects.filter(patient__doctor=doctor_profile)
        except (StaffRole.DoesNotExist, DoctorProfile.DoesNotExist):
            return InsurancePolicy.objects.none()
