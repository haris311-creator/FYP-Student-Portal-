from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FacultyViewSet,
    EligibilityCheckView,
    ProjectGroupViewSet,
    FYDPProposalViewSet,
    ChangeRequestViewSet
)

router = DefaultRouter()
router.register(r'faculty', FacultyViewSet, basename='faculty')
router.register(r'groups', ProjectGroupViewSet, basename='groups')
router.register(r'proposals', FYDPProposalViewSet, basename='proposals')
router.register(r'change-requests', ChangeRequestViewSet, basename='change-requests')

urlpatterns = [
    path('', include(router.urls)),
    path('check-eligibility/', EligibilityCheckView.as_view({'post': 'create'}), name='check-eligibility'),
]