from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PatientViewSet, PatientDocumentViewSet,
    PatientAddressViewSet, InsurancePolicyViewSet
)

router = DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'documents', PatientDocumentViewSet, basename='patient-document')
router.register(r'addresses', PatientAddressViewSet, basename='patient-address')
router.register(r'policies', InsurancePolicyViewSet, basename='insurance-policy')

app_name = 'patients'

urlpatterns = [
    path('', include(router.urls)),
]
