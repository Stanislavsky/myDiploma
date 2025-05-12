from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django import forms
from django.core.exceptions import ValidationError
from .models import StaffRole
from django.urls import resolve, reverse
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.db import transaction
from django.shortcuts import redirect
from django.db.models import Q

class CustomAdminSite(admin.AdminSite):
    site_header = 'Панель администратора'
    site_title = 'Администрирование'
    index_title = 'Добро пожаловать в панель администратора'

    def has_permission(self, request):
        # Суперпользователь всегда имеет доступ
        if request.user.is_superuser:
            return True
            
        # Проверяем, аутентифицирован ли пользователь и является ли он персоналом
        if not request.user.is_authenticated or not request.user.is_staff:
            return False
            
        # Логирование информации о пользователе
        user_role = StaffRole.objects.filter(user=request.user).first()
        if user_role:
            print(f"User: {request.user.username}, Role: {user_role.role}")  # Логируем роль
            return user_role.role in ['admin', 'support']
        
        return False

    def get_app_list(self, request, app_label=None):
        """
        Возвращает список приложений, которые должны отображаться в админке
        """
        app_list = super().get_app_list(request, app_label)
        
        # Если суперпользователь, показываем все приложения
        if request.user.is_superuser:
            return app_list
            
        # Проверяем права доступа пользователя
        if not self.has_permission(request):
            return []
            
        # Фильтруем приложения и модели в зависимости от роли пользователя
        user_role = StaffRole.objects.filter(user=request.user).first()
        if not user_role:
            return []
            
        # Создаем новый список приложений
        filtered_app_list = []
        
        for app in app_list:
            # Создаем копию приложения
            app_dict = {
                'name': app['name'],
                'app_label': app['app_label'],
                'models': []
            }
            
            # Фильтруем модели
            for model in app['models']:
                if model['object_name'] in ['User', 'StaffRole']:
                    app_dict['models'].append(model)
            
            # Добавляем приложение только если в нем есть модели
            if app_dict['models']:
                filtered_app_list.append(app_dict)
        
        return filtered_app_list

# Создаем экземпляр кастомной админки
custom_admin_site = CustomAdminSite(name='staff-admin')

class CustomUserCreationForm(forms.ModelForm):
    password1 = forms.CharField(label='Пароль', widget=forms.PasswordInput)
    password2 = forms.CharField(label='Подтвердите пароль', widget=forms.PasswordInput)
    
    # Role checkboxes
    is_doctor = forms.BooleanField(label='Врач', required=False)
    is_admin = forms.BooleanField(label='Системный администратор', required=False)
    is_support = forms.BooleanField(label='Сопровождающий программы', required=False)
    
    # Doctor specific fields
    gender = forms.ChoiceField(
        choices=[('male', 'Мужчина'), ('female', 'Женщина')],
        label='Пол',
        required=False
    )
    birth_date = forms.DateField(label='Дата рождения', required=False)
    passport_series = forms.CharField(max_length=4, label='Серия паспорта', required=False)
    passport_number = forms.CharField(max_length=6, label='Номер паспорта', required=False)
    passport_issued_by = forms.CharField(max_length=100, label='Кем выдан', required=False)
    workplace = forms.CharField(max_length=255, label='Место работы', required=False)
    position = forms.CharField(max_length=255, label='Должность', required=False)

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active')

    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super().__init__(*args, **kwargs)
        
        print("Initializing form...")  # Debug print
        
        # Получаем роль текущего пользователя
        if self.request and self.request.user.is_authenticated:
            print(f"User: {self.request.user.username}")  # Debug print
            current_user_role = StaffRole.objects.filter(user=self.request.user).first()
            print(f"Current user role: {current_user_role.role if current_user_role else 'None'}")  # Debug print
            
            # Если пользователь не суперпользователь, скрываем некоторые роли
            if not self.request.user.is_superuser:
                print("User is not superuser")  # Debug print
                if current_user_role:
                    print(f"Processing role: {current_user_role.role}")  # Debug print
                    if current_user_role.role == 'admin':
                        print("User is admin, removing support field")  # Debug print
                        # Админ видит только doctor и admin
                        del self.fields['is_support']
                    elif current_user_role.role == 'support':
                        print("User is support, showing all fields")  # Debug print
                        # Support видит все роли
                        pass
                    else:
                        print("User has other role, removing all role fields")  # Debug print
                        # Остальные не видят никаких ролей
                        del self.fields['is_doctor']
                        del self.fields['is_admin']
                        del self.fields['is_support']
            
            print(f"Available fields after processing: {list(self.fields.keys())}")  # Debug print

    def clean(self):
        print("Cleaning form data...")  # Debug print
        cleaned_data = super().clean()
        print(f"Cleaned data: {cleaned_data}")  # Debug print
        
        # Проверяем, что выбрана только одна роль
        roles = [
            cleaned_data.get('is_doctor', False),
            cleaned_data.get('is_admin', False),
            cleaned_data.get('is_support', False)
        ]
        if sum(roles) > 1:
            raise ValidationError("Можно выбрать только одну роль")
        
        return cleaned_data

    def clean_password2(self):
        p1 = self.cleaned_data.get("password1")
        p2 = self.cleaned_data.get("password2")
        if p1 and p2 and p1 != p2:
            raise ValidationError("Пароли не совпадают")
        return p2

    def save(self, commit=True):
        print("Starting save method...")  # Debug print
        try:
            # Создаем пользователя
            user = super().save(commit=False)
            print(f"Created user object: {user}")  # Debug print
            
            # Сохраняем дополнительные данные в атрибуты пользователя
            user.is_doctor = self.cleaned_data.get('is_doctor', False)
            user.is_admin = self.cleaned_data.get('is_admin', False)
            user.is_support = self.cleaned_data.get('is_support', False)
            user.gender = self.cleaned_data.get('gender')
            user.birth_date = self.cleaned_data.get('birth_date')
            user.passport_series = self.cleaned_data.get('passport_series')
            user.passport_number = self.cleaned_data.get('passport_number')
            user.passport_issued_by = self.cleaned_data.get('passport_issued_by')
            user.workplace = self.cleaned_data.get('workplace')
            user.position = self.cleaned_data.get('position')
            
            user.set_password(self.cleaned_data["password1"])
            print("Password set")  # Debug print
            
            if commit:
                print("Saving user...")  # Debug print
                user.save()
                print(f"User saved with ID: {user.id}")  # Debug print
            
            return user
        except Exception as e:
            print(f"Error in save method: {str(e)}")  # Debug print
            raise


class CustomUserChangeForm(forms.ModelForm):
    password = forms.CharField(label="Пароль", widget=forms.PasswordInput, required=False)
    
    # Doctor specific fields
    gender = forms.ChoiceField(
        choices=[('male', 'Мужчина'), ('female', 'Женщина')],
        label='Пол',
        required=False
    )
    birth_date = forms.DateField(label='Дата рождения', required=False)
    passport_series = forms.CharField(max_length=4, label='Серия паспорта', required=False)
    passport_number = forms.CharField(max_length=6, label='Номер паспорта', required=False)
    passport_issued_by = forms.CharField(max_length=100, label='Кем выдан', required=False)
    workplace = forms.CharField(max_length=255, label='Место работы', required=False)
    position = forms.CharField(max_length=255, label='Должность', required=False)

    class Meta:
        model = User
        exclude = ('is_superuser', 'groups', 'user_permissions')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            # Получаем профиль врача, если он существует
            staff_role = StaffRole.objects.filter(user=self.instance).first()
            if staff_role and staff_role.role == 'doctor':
                try:
                    from doctorProfile.models import DoctorProfile
                    doctor_profile = DoctorProfile.objects.get(staff_role=staff_role)
                    # Заполняем поля данными из профиля
                    self.fields['gender'].initial = doctor_profile.gender
                    self.fields['birth_date'].initial = doctor_profile.birth_date
                    self.fields['passport_series'].initial = doctor_profile.passport_series
                    self.fields['passport_number'].initial = doctor_profile.passport_number
                    self.fields['passport_issued_by'].initial = doctor_profile.passport_issued_by
                    self.fields['workplace'].initial = doctor_profile.workplace
                    self.fields['position'].initial = doctor_profile.position
                except DoctorProfile.DoesNotExist:
                    pass

    def clean_password(self):
        password = self.cleaned_data.get("password")
        if password:
            return password
        return self.initial["password"]

    def save(self, commit=True):
        user = super().save(commit=False)
        password = self.cleaned_data.get("password")
        if password:
            user.set_password(password)
        
        if commit:
            user.save()
            # Обновляем профиль врача, если он существует
            staff_role = StaffRole.objects.filter(user=user).first()
            if staff_role and staff_role.role == 'doctor':
                try:
                    from doctorProfile.models import DoctorProfile
                    doctor_profile = DoctorProfile.objects.get(staff_role=staff_role)
                    # Обновляем поля профиля
                    doctor_profile.gender = self.cleaned_data.get('gender')
                    doctor_profile.birth_date = self.cleaned_data.get('birth_date')
                    doctor_profile.passport_series = self.cleaned_data.get('passport_series')
                    doctor_profile.passport_number = self.cleaned_data.get('passport_number')
                    doctor_profile.passport_issued_by = self.cleaned_data.get('passport_issued_by')
                    doctor_profile.workplace = self.cleaned_data.get('workplace')
                    doctor_profile.position = self.cleaned_data.get('position')
                    doctor_profile.save()
                except DoctorProfile.DoesNotExist:
                    pass
        
        return user


# --- Кастомная админка пользователей ---
class DoctorAndAdminUserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'get_role')
    search_fields = ('username', 'email')
    list_filter = ('is_active', 'is_staff')

    add_form = CustomUserCreationForm
    form = CustomUserChangeForm

    class Media:
        js = ('admin/js/doctor_fields.js',)

    def get_form(self, request, obj=None, **kwargs):
        if obj is None:
            kwargs['form'] = self.add_form
            kwargs['form'].request = request
        else:
            kwargs['form'] = self.form
        return super().get_form(request, obj, **kwargs)

    def get_fieldsets(self, request, obj=None):
        if obj is None:  # Add view
            print("Setting up fieldsets for new user...")  # Debug print
            
            # Определяем базовые поля
            role_fields = ['is_doctor', 'is_admin']
            
            # Проверяем роль пользователя
            if request.user.is_superuser:
                # Суперпользователь видит все роли
                role_fields.append('is_support')
            else:
                current_user_role = StaffRole.objects.filter(user=request.user).first()
                if current_user_role:
                    if current_user_role.role == 'support':
                        # Support видит все роли
                        role_fields.append('is_support')
                    elif current_user_role.role != 'admin':
                        # Остальные не видят никаких ролей
                        role_fields = []
            
            fieldsets = (
                (None, {
                    'fields': ['username', 'password1', 'password2'] + role_fields
                }),
                ('Личная информация', {
                    'fields': ('first_name', 'last_name', 'email')
                }),
                ('Права доступа', {
                    'fields': ('is_active', 'is_staff')
                }),
                ('Информация о враче', {
                    'fields': ('gender', 'birth_date', 'passport_series', 'passport_number', 
                             'passport_issued_by', 'workplace', 'position'),
                    'classes': ('doctor-fields',),
                    'description': 'Заполните эти поля, если создаете пользователя с ролью врача'
                })
            )
            print(f"Fieldsets: {fieldsets}")  # Debug print
            return fieldsets
        else:  # Change view
            # Проверяем, является ли пользователь врачом
            staff_role = StaffRole.objects.filter(user=obj).first()
            is_doctor = staff_role and staff_role.role == 'doctor'
            
            fieldsets = (
                (None, {
                    'fields': ('username', 'password')
                }),
                ('Личная информация', {
                    'fields': ('first_name', 'last_name', 'email')
                }),
                ('Права доступа', {
                    'fields': ('is_active', 'is_staff')
                }),
            )
            
            # Добавляем поля врача, если пользователь является врачом
            if is_doctor:
                fieldsets += (
                    ('Информация о враче', {
                        'fields': ('gender', 'birth_date', 'passport_series', 'passport_number', 
                                 'passport_issued_by', 'workplace', 'position'),
                        'classes': ('doctor-fields',),
                    }),
                )
            
            return fieldsets

    def get_role(self, obj):
        staff_role = StaffRole.objects.filter(user=obj).first()
        return staff_role.role if staff_role else 'Нет роли'

    get_role.short_description = 'Роль'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        current_user_role = StaffRole.objects.filter(user=request.user).first()
        if current_user_role and current_user_role.role == 'support':
            return qs.filter(staffrole__role__in=['admin', 'doctor', 'support'])
        else:
            return qs.filter(staffrole__role__in=['admin', 'doctor'])

    def has_module_permission(self, request):
        # Суперпользователь всегда имеет доступ
        if request.user.is_superuser:
            return True
        if not request.user.is_authenticated or not request.user.is_staff:
            return False
        user_role = StaffRole.objects.filter(user=request.user).first()
        return user_role and user_role.role in ['admin', 'support']

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_add_permission(self, request):
        return self.has_module_permission(request)

    def has_change_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_delete_permission(self, request, obj=None):
        return self.has_module_permission(request)


# --- Админка модели StaffRole ---
class RoleFilter(admin.SimpleListFilter):
    title = 'Роль'
    parameter_name = 'role'

    def lookups(self, request, model_admin):
        current_user_role = StaffRole.objects.filter(user=request.user).first()
        
        if current_user_role and current_user_role.role == 'support':
            return [
                ('', '---------'),
                ('doctor', 'Врач'),
                ('admin', 'Системный администратор'),
                ('support', 'Техническая поддержка'),
            ]
        else:
            return [
                ('', '---------'),
                ('doctor', 'Врач'),
                ('admin', 'Системный администратор'),
            ]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(role=self.value())
        return queryset


class UserInline(admin.StackedInline):
    model = User
    fields = ('username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff')
    readonly_fields = ('username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff')
    can_delete = False
    max_num = 0
    extra = 0

class StaffRoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'get_username', 'get_email', 'get_first_name', 'get_last_name', 'get_is_active', 'get_is_staff')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    list_filter = (RoleFilter,)

    def get_username(self, obj):
        return obj.user.username
    get_username.short_description = 'Имя пользователя'
    get_username.admin_order_field = 'user__username'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'
    get_email.admin_order_field = 'user__email'

    def get_first_name(self, obj):
        return obj.user.first_name
    get_first_name.short_description = 'Имя'
    get_first_name.admin_order_field = 'user__first_name'

    def get_last_name(self, obj):
        return obj.user.last_name
    get_last_name.short_description = 'Фамилия'
    get_last_name.admin_order_field = 'user__last_name'

    def get_is_active(self, obj):
        return obj.user.is_active
    get_is_active.short_description = 'Активен'
    get_is_active.boolean = True
    get_is_active.admin_order_field = 'user__is_active'

    def get_is_staff(self, obj):
        return obj.user.is_staff
    get_is_staff.short_description = 'Персонал'
    get_is_staff.boolean = True
    get_is_staff.admin_order_field = 'user__is_staff'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Если суперпользователь — показываем всё
        if request.user.is_superuser:
            return qs
        current_user_role = StaffRole.objects.filter(user=request.user).first()
        if current_user_role and current_user_role.role == 'support':
            return qs.filter(role__in=['admin', 'doctor', 'support', '']).exclude(user__is_superuser=True)
        else:
            return qs.filter(role__in=['admin', 'doctor', '']).exclude(user__is_superuser=True)

    def has_module_permission(self, request):
        # Суперпользователь всегда имеет доступ
        if request.user.is_superuser:
            return True
        if not request.user.is_authenticated or not request.user.is_staff:
            return False
        user_role = StaffRole.objects.filter(user=request.user).first()
        return user_role and user_role.role in ['admin', 'support']

    def has_view_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_add_permission(self, request):
        return self.has_module_permission(request)

    def has_change_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def has_delete_permission(self, request, obj=None):
        return self.has_module_permission(request)

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name == "user":
            # Если суперпользователь — показываем всех пользователей
            if request.user.is_superuser:
                kwargs["queryset"] = User.objects.all().order_by('username')
            else:
                current_user_role = StaffRole.objects.filter(user=request.user).first()
                if current_user_role and current_user_role.role == 'support':
                    kwargs["queryset"] = User.objects.filter(
                        Q(staffrole__role__in=['admin', 'doctor', 'support', '']) |
                        Q(staffrole__isnull=True)
                    ).filter(is_superuser=False).distinct().order_by('username')
                else:
                    kwargs["queryset"] = User.objects.filter(
                        Q(staffrole__role__in=['admin', 'doctor', '']) |
                        Q(staffrole__isnull=True)
                    ).filter(is_superuser=False).distinct().order_by('username')
        return super().formfield_for_dbfield(db_field, request, **kwargs)

    def formfield_for_choice_field(self, db_field, request, **kwargs):
        if db_field.name == "role":
            # Если суперпользователь — показываем все роли
            if request.user.is_superuser:
                kwargs['choices'] = [
                    ('', '---------'),
                    ('doctor', 'Врач'),
                    ('admin', 'Системный администратор'),
                    ('support', 'Техническая поддержка'),
                ]
            else:
                current_user_role = StaffRole.objects.filter(user=request.user).first()
                if current_user_role and current_user_role.role == 'support':
                    kwargs['choices'] = [
                        ('', '---------'),
                        ('doctor', 'Врач'),
                        ('admin', 'Системный администратор'),
                        ('support', 'Техническая поддержка'),
                    ]
                else:
                    kwargs['choices'] = [
                        ('', '---------'),
                        ('doctor', 'Врач'),
                        ('admin', 'Системный администратор'),
                    ]
        return super().formfield_for_choice_field(db_field, request, **kwargs)

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        extra_context['show_save_and_add_another'] = False
        extra_context['show_save_and_continue'] = False
        extra_context['show_add_another'] = False
        extra_context['has_add_permission'] = False
        return super().change_view(request, object_id, form_url, extra_context)

    def add_view(self, request, form_url='', extra_context=None):
        return redirect('staff-admin:auth_user_add')

    def delete_model(self, request, obj):
        if obj.user:
            super().delete_model(request, obj)
            obj.user.delete()
        else:
            super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        for obj in queryset:
            if obj.user:
                super().delete_model(request, obj)
                obj.user.delete()



# Регистрируем модели в кастомной админке
custom_admin_site.register(User, DoctorAndAdminUserAdmin)
custom_admin_site.register(StaffRole, StaffRoleAdmin)

@receiver(post_delete, sender=StaffRole)
def delete_user_on_staff_role_delete(sender, instance, **kwargs):
    if instance.user_id:
        try:
            User.objects.filter(id=instance.user_id).delete()
        except Exception:
            pass
