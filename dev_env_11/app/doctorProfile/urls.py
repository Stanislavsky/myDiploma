from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'profile', views.DoctorProfileViewSet, basename='doctor-profile')
router.register(r'questions', views.QuestionViewSet, basename='questions')

urlpatterns = [
    path('', include(router.urls)),
] 