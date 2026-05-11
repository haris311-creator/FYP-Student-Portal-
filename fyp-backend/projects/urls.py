from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FacultyViewSet,
    ProjectGroupViewSet,
    FYDPProposalViewSet,
    ChangeRequestViewSet,
    AdminGroupApprovalViewSet,
)

router = DefaultRouter()
router.register(r'faculty', FacultyViewSet, basename='faculty')
router.register(r'groups', ProjectGroupViewSet, basename='project-group')
router.register(r'proposals', FYDPProposalViewSet, basename='proposal')
router.register(r'change-requests', ChangeRequestViewSet, basename='change-request')
router.register(r'admin/approval', AdminGroupApprovalViewSet, basename='admin-approval')

urlpatterns = [
    path('', include(router.urls)),
]