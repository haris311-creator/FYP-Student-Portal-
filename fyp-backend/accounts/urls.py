from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView, LogoutView, ProfileView
from . import views

router = DefaultRouter()
router.register(r'enrolled-students', views.EnrolledStudentViewSet, basename='enrolled-students')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Student Registration (Public)
    path('register/student/', views.StudentRegistrationView.as_view(), name='student-register'),
    
    # Registration Stats (Admin)
    path('registration-stats/', views.registration_stats, name='registration-stats'),
    
    # Router URLs (Admin)
    path('', include(router.urls)),
]