from django.urls import path, include
from .views import MyApiView

urlpatterns = [
    path('api/hello/', MyApiView.as_view(), name='hello-api'),
    path('api/doctor-profile/', include('doctorProfile.urls')),
]