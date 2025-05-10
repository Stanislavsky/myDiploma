from django.http import HttpResponseForbidden

class SuperuserOnlyAdminMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Пропускаем проверку для суперпользователя
        if request.user.is_superuser:
            return self.get_response(request)
            
        # Блокируем только стандартную админку Django (/admin/), но не staff-admin
        if request.path.startswith('/admin/') and not request.path.startswith('/staff-admin/') and request.user.is_authenticated and not request.user.is_superuser:
            return HttpResponseForbidden('нет доступа')
        return self.get_response(request) 