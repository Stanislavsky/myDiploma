from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorProfileViewSet, QuestionViewSet, PatientViewSet

router = DefaultRouter()
router.register(r'profiles', DoctorProfileViewSet, basename='doctor-profile')
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'patients', PatientViewSet, basename='patient')

urlpatterns = [
    path('', include(router.urls)),
] 