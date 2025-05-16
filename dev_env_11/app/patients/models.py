from django.db import models
from datetime import date
from doctorProfile.models import DoctorProfile

# Выбор пола
GENDER_CHOICES = [
    ('male', 'Мужской'),
    ('female', 'Женский'),
]

class Patient(models.Model):
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='patients_list')
    last_name = models.CharField(max_length=100, verbose_name="Фамилия")
    first_name = models.CharField(max_length=100, verbose_name="Имя")
    middle_name = models.CharField(max_length=100, blank=True, null=True, verbose_name="Отчество")
    gender = models.CharField(max_length=6, choices=GENDER_CHOICES, verbose_name="Пол")
    birth_date = models.DateField(verbose_name="Дата рождения")
    clinic = models.CharField(max_length=255, verbose_name="Поликлиника", blank=True)

    @property
    def age(self):
        today = date.today()
        return today.year - self.birth_date.year - (
            (today.month, today.day) < (self.birth_date.month, self.birth_date.day)
        )

    def save(self, *args, **kwargs):
        if self.doctor and self.doctor.workplace:
            self.clinic = self.doctor.workplace
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.last_name} {self.first_name}"

# Документы пациента
class PatientDocument(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='document')
    snils = models.CharField(max_length=14, verbose_name="СНИЛС")
    document_type = models.CharField(max_length=100, verbose_name="Тип документа (паспорт и т.д.)")
    series = models.CharField(max_length=10, verbose_name="Серия")
    number = models.CharField(max_length=20, verbose_name="Номер")
    issue_date = models.DateField(verbose_name="Дата выдачи")
    issued_by = models.CharField(max_length=255, verbose_name="Кем выдан")

# Адреса пациента
class PatientAddress(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='address')
    registration_address = models.CharField(max_length=255, verbose_name="Адрес регистрации")
    residential_address = models.CharField(max_length=255, verbose_name="Адрес проживания")

# Полис пациента
class InsurancePolicy(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='policy')
    insurance_area = models.CharField(max_length=255, verbose_name="Территория страхования")
    smo = models.CharField(max_length=255, verbose_name="СМО (страховая компания)")
    policy_type = models.CharField(max_length=50, verbose_name="Тип полиса")
    series = models.CharField(max_length=10, blank=True, null=True, verbose_name="Серия")
    number = models.CharField(max_length=20, verbose_name="Номер")
    issue_date = models.DateField(verbose_name="Дата начала действия полиса")
    expiry_date = models.DateField(verbose_name="Дата окончания действия полиса", blank=True, null=True)

