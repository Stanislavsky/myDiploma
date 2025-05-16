from rest_framework import serializers
from .models import Patient, PatientDocument, PatientAddress, InsurancePolicy
from doctorProfile.models import DoctorProfile
from users.models import StaffRole
from datetime import date

class PatientDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientDocument
        fields = [
            'id', 'snils', 'document_type', 'series', 'number',
            'issue_date', 'issued_by'
        ]

class PatientAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientAddress
        fields = [
            'id', 'registration_address', 'residential_address'
        ]

class InsurancePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = InsurancePolicy
        fields = [
            'id', 'insurance_area', 'smo', 'policy_type',
            'series', 'number', 'issue_date', 'expiry_date'
        ]

class PatientSerializer(serializers.ModelSerializer):
    document = PatientDocumentSerializer()
    address = PatientAddressSerializer()
    policy = InsurancePolicySerializer()
    age = serializers.SerializerMethodField()
    clinic = serializers.CharField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id', 'last_name', 'first_name', 'middle_name', 'gender',
            'birth_date', 'document', 'address', 'policy', 'age', 'clinic'
        ]
        read_only_fields = ['age', 'clinic']

    def get_age(self, obj):
        if obj.birth_date:
            today = date.today()
            return today.year - obj.birth_date.year - ((today.month, today.day) < (obj.birth_date.month, obj.birth_date.day))
        return None

    def create(self, validated_data):
        document_data = validated_data.pop('document')
        address_data = validated_data.pop('address')
        policy_data = validated_data.pop('policy')

        patient = Patient.objects.create(**validated_data)
        PatientDocument.objects.create(patient=patient, **document_data)
        PatientAddress.objects.create(patient=patient, **address_data)
        InsurancePolicy.objects.create(patient=patient, **policy_data)

        return patient

    def update(self, instance, validated_data):
        document_data = validated_data.pop('document', None)
        address_data = validated_data.pop('address', None)
        policy_data = validated_data.pop('policy', None)

        # Обновляем пациента
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Обновляем или создаем связанные объекты
        if document_data:
            PatientDocument.objects.update_or_create(
                patient=instance,
                defaults=document_data
            )

        if address_data:
            PatientAddress.objects.update_or_create(
                patient=instance,
                defaults=address_data
            )

        if policy_data:
            InsurancePolicy.objects.update_or_create(
                patient=instance,
                defaults=policy_data
            )

        return instance 