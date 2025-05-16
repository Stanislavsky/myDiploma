from rest_framework import serializers
from .models import DoctorProfile, Question, Patient, StaffRole

class DoctorProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    clinic_name = serializers.SerializerMethodField()

    class Meta:
        model = DoctorProfile
        fields = ['id', 'full_name', 'clinic_name', 'workplace', 'position']

    def get_full_name(self, obj):
        return f"{obj.staff_role.user.first_name} {obj.staff_role.user.last_name}"

    def get_clinic_name(self, obj):
        return obj.workplace or "Не указано"

class QuestionSerializer(serializers.ModelSerializer):
    doctor = DoctorProfileSerializer(source='doctor_profile', read_only=True)
    attached_file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Question
        fields = ['id', 'doctor', 'question_text', 'created_at', 'attached_file']
        read_only_fields = ['id', 'created_at', 'doctor']

    def create(self, validated_data):
        attached_file = validated_data.pop('attached_file', None)
        question = Question.objects.create(**validated_data)
        if attached_file:
            question.attached_file = attached_file
            question.save()
        return question

class PatientSerializer(serializers.ModelSerializer):
    age = serializers.IntegerField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id', 'first_name', 'last_name', 'middle_name', 'gender',
            'birth_date', 'passport_series', 'passport_number',
            'passport_issued_by', 'address', 'phone_number', 'email',
            'medical_history', 'created_at', 'updated_at', 'age'
        ]
        read_only_fields = ['created_at', 'updated_at', 'age']

    def create(self, validated_data):
        # Получаем профиль врача текущего пользователя
        try:
            staff_role = StaffRole.objects.get(user=self.context['request'].user)
            doctor_profile = DoctorProfile.objects.get(staff_role=staff_role)
            validated_data['doctor'] = doctor_profile
        except (StaffRole.DoesNotExist, DoctorProfile.DoesNotExist):
            pass
        
        return super().create(validated_data)

    def validate_phone_number(self, value):
        # Удаляем все нецифровые символы
        digits = ''.join(filter(str.isdigit, value))
        if len(digits) < 10:
            raise serializers.ValidationError("Номер телефона должен содержать минимум 10 цифр")
        return value

    def validate_passport_series(self, value):
        if not value.isdigit() or len(value) != 4:
            raise serializers.ValidationError("Серия паспорта должна состоять из 4 цифр")
        return value

    def validate_passport_number(self, value):
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError("Номер паспорта должен состоять из 6 цифр")
        return value 