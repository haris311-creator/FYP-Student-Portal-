from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EvaluationCriteriaViewSet,
    SessionalEvaluationViewSet,
    MeetingLogEvaluationViewSet,
    ReportEvaluationViewSet,
    PresentationEvaluationViewSet,
    FinalEvaluationResultViewSet,
    PublicPresentationEvaluationView,
)

router = DefaultRouter()
router.register(r'criteria', EvaluationCriteriaViewSet, basename='evaluation-criteria')
router.register(r'sessional', SessionalEvaluationViewSet, basename='sessional-evaluation')
router.register(r'meeting-logs', MeetingLogEvaluationViewSet, basename='meeting-log-evaluation')
router.register(r'reports', ReportEvaluationViewSet, basename='report-evaluation')
router.register(r'presentations', PresentationEvaluationViewSet, basename='presentation-evaluation')
router.register(r'final-results', FinalEvaluationResultViewSet, basename='final-result')

urlpatterns = [
    path('', include(router.urls)),
    
    #  APIView ke saath simple path
    path('public/presentation/<uuid:token>/', 
         PublicPresentationEvaluationView.as_view(), 
         name='public-presentation-evaluation'),
]