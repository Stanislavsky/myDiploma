import os
from django.db import models
from datetime import date

from django.utils import timezone
from django.db import models
from users.models import StaffRole

class DoctorProfile(models.Model):
    staff_role = models.OneToOneField(StaffRole, on_delete=models.CASCADE, related_name='doctor_profile', verbose_name='Staff role')
    gender = models.CharField(max_length=10, choices=[('male', 'Мужчина'), ('female', 'Женщина')], verbose_name='Пол', null=True, blank=True)
    birth_date = models.DateField(verbose_name='Дата рождения', null=True, blank=True)
    passport_series = models.CharField(max_length=4, verbose_name='Серия паспорта', null=True, blank=True)
    passport_number = models.CharField(max_length=6, verbose_name='Номер паспорта', null=True, blank=True)
    passport_issued_by = models.CharField(max_length=100, verbose_name='Кем выдан', null=True, blank=True)
    workplace = models.CharField(max_length=255, verbose_name='Место работы', null=True, blank=True)
    position = models.CharField(max_length=255, verbose_name='Должность', null=True, blank=True)
    age = models.IntegerField(verbose_name='Возраст', editable=False, null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.birth_date:
            self.age = timezone.now().year - self.birth_date.year
            if timezone.now().month < self.birth_date.month or (timezone.now().month == self.birth_date.month and timezone.now().day < self.birth_date.day):
                self.age -= 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Профиль врача {self.staff_role.user.username}"

class Question(models.Model):
    doctor_profile = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, verbose_name="Профиль врача")
    question_text = models.TextField(verbose_name="Текст вопроса")
    attached_file = models.FileField(upload_to='questions/', null=True, blank=True, verbose_name="Прикрепленный файл")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания вопроса")
    redirected = models.BooleanField(default=False, verbose_name="Перенаправлен")

    def delete(self, *args, **kwargs):
        # Удаляем файл с диска, если он есть
        if self.attached_file:
            if os.path.isfile(self.attached_file.path):
                os.remove(self.attached_file.path)
        super().delete(*args, **kwargs)  # удаление объекта из базы данных

    def __str__(self):
        return f"Вопрос от {self.doctor_profile.staff_role.user.username} (ID: {self.id})"

    class Meta:
        verbose_name = "Вопрос"
        verbose_name_plural = "Вопросы"

class Patient(models.Model):
    GENDER_CHOICES = [
        ('male', 'Мужчина'),
        ('female', 'Женщина')
    ]

    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='patients', verbose_name='Врач')
    first_name = models.CharField(max_length=100, verbose_name='Имя')
    last_name = models.CharField(max_length=100, verbose_name='Фамилия')
    middle_name = models.CharField(max_length=100, verbose_name='Отчество', null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, verbose_name='Пол')
    birth_date = models.DateField(verbose_name='Дата рождения')
    passport_series = models.CharField(max_length=4, verbose_name='Серия паспорта')
    passport_number = models.CharField(max_length=6, verbose_name='Номер паспорта')
    passport_issued_by = models.CharField(max_length=100, verbose_name='Кем выдан')
    address = models.CharField(max_length=255, verbose_name='Адрес проживания')
    phone_number = models.CharField(max_length=15, verbose_name='Номер телефона')
    email = models.EmailField(verbose_name='Email', null=True, blank=True)
    medical_history = models.TextField(verbose_name='История болезни', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата добавления')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    age = models.IntegerField(verbose_name='Возраст', editable=False)

    def save(self, *args, **kwargs):
        if self.birth_date:
            self.age = timezone.now().year - self.birth_date.year
            if timezone.now().month < self.birth_date.month or (timezone.now().month == self.birth_date.month and timezone.now().day < self.birth_date.day):
                self.age -= 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.last_name} {self.first_name} {self.middle_name or ''}"

    class Meta:
        verbose_name = 'Пациент'
        verbose_name_plural = 'Пациенты'
        ordering = ['-created_at']
