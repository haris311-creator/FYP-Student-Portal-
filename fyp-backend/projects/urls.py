from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FacultyViewSet,
    ProjectGroupViewSet,
    FYDPProposalViewSet,
    ChangeRequestViewSet,
    AdminGroupApprovalViewSet,
    SupervisorGroupViewSet,
    MeetingMinuteViewSet,        
    AttendanceSheetViewSet,
    StudentMeetingDataView,         
)

router = DefaultRouter()
router.register(r'groups/supervisor', SupervisorGroupViewSet, basename='supervisor-groups')
router.register(r'faculty', FacultyViewSet, basename='faculty')
router.register(r'groups', ProjectGroupViewSet, basename='project-group')
router.register(r'proposals', FYDPProposalViewSet, basename='proposal')
router.register(r'change-requests', ChangeRequestViewSet, basename='change-request')
router.register(r'admin/approval', AdminGroupApprovalViewSet, basename='admin-approval')
router.register(r'meetings', MeetingMinuteViewSet, basename='meeting')  
router.register(r'attendance-sheet', AttendanceSheetViewSet, basename='attendance') 
router.register(r'students/my-meetings', StudentMeetingDataView, basename='student-meetings') 

urlpatterns = [
    path('', include(router.urls)),
]