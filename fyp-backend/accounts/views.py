from rest_framework import status, permissions, viewsets, generics
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.db.models import Count, Q
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from .models import EnrolledStudent
from .serializers import (
    RegisterSerializer, 
    LoginSerializer, 
    UserSerializer, 
    StudentRegistrationSerializer,
    EnrolledStudentSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer
)

User = get_user_model()



# ============================================
# EMAIL HELPER FUNCTIONS
# ============================================

def send_approval_email(student, user):
    """
    Send approval email to student
    """
    try:
        context = {
            'student_name': f"{user.first_name} {user.last_name}",
            'student_email': user.email,
            'student_id': user.student_id or 'N/A',
            'login_url': 'http://localhost:5173/login',
        }
        
        html_message = render_to_string('emails/approval_email.html', context)
        
        send_mail(
            subject='Your FYP Portal Account Has Been Approved',
            message='',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        print(f" Approval email sent to {user.email}")
        return True
        
    except Exception as e:
        print(f" Failed to send approval email: {str(e)}")
        return False


def send_rejection_email(student, rejection_reason):
    """
    Send rejection email to student
    """
    try:
        context = {
            'student_name': student.full_name,
            'student_email': student.email,
            'student_id': student.roll_number,
            'rejection_reason': rejection_reason,
            'registration_date': student.created_at.strftime('%B %d, %Y'),
        }
        
        html_message = render_to_string('emails/rejection_email.html', context)
        
        send_mail(
            subject='FYP Portal Registration Update',
            message='',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        print(f" Rejection email sent to {student.email}")
        return True
        
    except Exception as e:
        print(f" Failed to send rejection email: {str(e)}")
        return False


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
        Student ko approve karein aur email bhejein
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
            
            # Send approval email
            email_sent = send_approval_email(student, user)
            
            if email_sent:
                return Response({
                    "success": True,
                    "message": f"{student.full_name} approved successfully. Approval email sent.",
                    "email_sent": True
                })
            else:
                return Response({
                    "success": True,
                    "message": f"{student.full_name} approved, but email failed to send.",
                    "email_sent": False
                })
        else:
            return Response({
                "success": True,
                "message": f"{student.full_name} approved (user account not found)."
            })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Student ko reject karein aur email bhejein
        """
        student = self.get_object()
        reason = request.data.get('reason', 'No reason provided')
        
        # Send rejection email BEFORE deleting
        email_sent = send_rejection_email(student, reason)
        
        # Delete user account (if exists)
        user = User.objects.filter(email=student.email).first()
        if user:
            user.delete()
        
        # ✅ Delete enrolled student record bhi
        student.delete()
        
        if email_sent:
            return Response({
                "success": True,
                "message": f"{student.full_name} rejected. Record deleted. Rejection email sent.",
                "email_sent": True
            })
        else:
            return Response({
                "success": True,
                "message": f"{student.full_name} rejected and deleted, but email failed to send.",
                "email_sent": False
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




# ============================================
# PASSWORD RESET VIEWS
# ============================================

class PasswordResetRequestView(generics.GenericAPIView):
    """
    User email dega - reset link email par chala jayega
    """
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email'].lower().strip()
        user = User.objects.filter(email=email).first()
        
        if user:
            # Token generate karein
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            
            # Reset URL (frontend ka URL)
            reset_url = f"http://localhost:5173/reset-password/{uid}/{token}"
            
            # Email bhejein
            try:
                context = {
                    'user_name': f"{user.first_name} {user.last_name}" or user.email,
                    'reset_url': reset_url,
                    'email': user.email,
                }
                
                html_message = render_to_string(
                    'emails/password_reset_email.html', 
                    context
                )
                
                send_mail(
                    subject='Password Reset Request - FYP Portal',
                    message='',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    html_message=html_message,
                    fail_silently=False,
                )
                
                print(f"✅ Password reset email sent to {user.email}")
                
            except Exception as e:
                print(f"❌ Failed to send reset email: {str(e)}")
        
        # Hamesha success message denge (security ke liye)
        return Response({
            "success": True,
            "message": "If an account exists with this email, a password reset link has been sent. Please check your inbox."
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(generics.GenericAPIView):
    """
    User naya password set karega (token valid hone par)
    """
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        new_password = serializer.validated_data['new_password']
        
        # Password set karein
        user.set_password(new_password)
        user.save()
        
        print(f"✅ Password reset successful for {user.email}")
        
        return Response({
            "success": True,
            "message": "Password has been reset successfully. You can now login with your new password."
        }, status=status.HTTP_200_OK)