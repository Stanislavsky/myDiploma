from django.contrib import admin
from django.urls import path, include
from users.admin import custom_admin_site, StaffRoleAdmin, DoctorAndAdminUserAdmin
from django.contrib.auth.models import User, Group
from rest_framework.authtoken.models import Token
from users.models import StaffRole
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse, HttpResponse
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

# --- Только суперпользователь может попасть в стандартную админку Django ---
class SuperuserOnlyAdminSite(admin.AdminSite):
    def has_permission(self, request):
        # Проверяем только is_superuser, игнорируя is_staff
        return request.user.is_superuser

# Переопределяем стандартную админку Django
admin.site = SuperuserOnlyAdminSite()

# Регистрируем модели в стандартной админке (только для суперпользователей)
admin.site.register(User, DoctorAndAdminUserAdmin)
admin.site.register(Group)
admin.site.register(Token)
admin.site.register(StaffRole, StaffRoleAdmin)

# Представление для получения CSRF токена
@ensure_csrf_cookie
def get_csrf_token(request):
    return HttpResponse()

urlpatterns = [
    path('admin/', admin.site.urls),  # только для суперпользователей
    path('staff-admin/', custom_admin_site.urls),  # для персонала
    path('api/auth/', include('users.urls')),
    path('api/main/', include('main.urls')),
    path('api/doctor-profile/', include('doctorProfile.urls')),  # маршруты для doctorProfile
    path('api/csrf-token/', get_csrf_token, name='csrf-token'),  # маршрут для получения CSRF токена
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT, show_indexes=True) + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
