from rest_framework import serializers
from .models import DoctorProfile, Question

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