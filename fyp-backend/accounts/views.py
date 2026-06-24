from rest_framework import status, permissions, viewsets, generics
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.db.models import Count, Q
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import EnrolledStudent
from .serializers import (
    RegisterSerializer, 
    LoginSerializer, 
    UserSerializer, 
    StudentRegistrationSerializer,
    EnrolledStudentSerializer
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    Naya user register karega
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refetch.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    """
    User login karega - email aur password se
    """
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        try:
            user = User.objects.get(email=email)
            
            if not user.check_password(password):
                return Response(
                    {'error': 'Invalid email or password'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not user.is_active:
                return Response(
                    {'error': 'Account pending approval. Please contact the administrator.'},
                    status=status.HTTP_403_FORBIDDEN
                )
                
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_200_OK)


class LogoutView(generics.GenericAPIView):
    """
    User logout karega - token blacklist karega
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logout successful'})
        except:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    User apni profile dekh aur update kar sakta hai
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class StudentRegistrationView(generics.CreateAPIView):
    serializer_class = StudentRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                "success": False,
                "message": "Registration failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = serializer.save()
            
            return Response({
                "success": True,
                "message": "Registration successful! Your account is pending admin approval.",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "student_id": user.student_id,
                    "user_type": user.user_type
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                "success": False,
                "message": f"Registration failed: {str(e)}",
                "errors": {"general": [str(e)]}
            }, status=status.HTTP_400_BAD_REQUEST)
        

class EnrolledStudentViewSet(viewsets.ModelViewSet):
    """
    Admin enrolled students ko manage karega (approve/reject)
    """
    queryset = EnrolledStudent.objects.all()
    serializer_class = EnrolledStudentSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(approval_status=status_filter)
        return queryset
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Student ko approve karein
        """
        student = self.get_object()
        student.approval_status = 'approved'
        student.approved_at = timezone.now()
        student.is_registered = True
        student.save()
        
        # Activate user account
        user = User.objects.filter(email=student.email).first()
        if user:
            user.is_active = True
            user.save()
        
        return Response({
            "success": True,
            "message": f"{student.full_name} approved successfully"
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Student ko reject karein
        """
        student = self.get_object()
        reason = request.data.get('reason', 'No reason provided')
        
        student.approval_status = 'rejected'
        student.rejected_reason = reason
        student.save()
        
        # Delete user account
        user = User.objects.filter(email=student.email).first()
        if user:
            user.delete()
        
        return Response({
            "success": True,
            "message": f"{student.full_name} rejected"
        })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def registration_stats(request):
    """
    Registration statistics for admin dashboard
    """
    total_enrolled = EnrolledStudent.objects.count()
    approved = EnrolledStudent.objects.filter(approval_status='approved').count()
    pending = EnrolledStudent.objects.filter(approval_status='pending').count()
    rejected = EnrolledStudent.objects.filter(approval_status='rejected').count()
    
    return Response({
        "success": True,
        "data": {
            "total_enrolled": total_enrolled,
            "registered_students": approved,
            "pending_registration": pending,
            "rejected_students": rejected
        }
    })