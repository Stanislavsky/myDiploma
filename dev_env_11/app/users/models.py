from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

class StaffRole(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Системный администратор'),
        ('doctor', 'Врач'),
        ('support', 'Сопровождающий программы'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name='Staff roles')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_doctor(self):
        return self.role == 'doctor'

    @property
    def is_support(self):
        return self.role == 'support'

    def save(self, *args, **kwargs):
        # Устанавливаем is_staff=True при создании или обновлении роли
        self.user.is_staff = True
        self.user.save()
        super().save(*args, **kwargs)

@receiver(post_save, sender=User)
def create_staff_role(sender, instance, created, **kwargs):
    """
    Сигнал для автоматического создания StaffRole при создании нового пользователя.
    """
    if created:
        print(f"Creating StaffRole for user {instance.username}")  # Debug print
        
        # Определяем роль пользователя
        role = ''
        if getattr(instance, 'is_doctor', False):
            role = 'doctor'
        elif getattr(instance, 'is_admin', False):
            role = 'admin'
        elif getattr(instance, 'is_support', False):
            role = 'support'
            
        print(f"Selected role: {role}")  # Debug print
        
        try:
            # Используем get_or_create вместо filter и create, чтобы избежать дублирования
            staff_role, created = StaffRole.objects.get_or_create(user=instance)
            if created:
                staff_role.role = role
                staff_role.save()
                print(f"Created StaffRole: {staff_role}")  # Debug print
                
                # Если это врач, создаем DoctorProfile
                if role == 'doctor':
                    print("Creating DoctorProfile...")  # Debug print
                    from doctorProfile.models import DoctorProfile
                    doctor_profile = DoctorProfile.objects.create(
                        staff_role=staff_role,
                        gender=getattr(instance, 'gender', None),
                        birth_date=getattr(instance, 'birth_date', None),
                        passport_series=getattr(instance, 'passport_series', None),
                        passport_number=getattr(instance, 'passport_number', None),
                        passport_issued_by=getattr(instance, 'passport_issued_by', None),
                        workplace=getattr(instance, 'workplace', None),
                        position=getattr(instance, 'position', None)
                    )
                    print(f"Created DoctorProfile: {doctor_profile}")  # Debug print
            
        except Exception as e:
            print(f"Error creating StaffRole: {e}")