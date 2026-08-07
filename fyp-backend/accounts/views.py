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
import io
from .serializers import (
    RegisterSerializer, 
    LoginSerializer, 
    UserSerializer, 
    EnrolledStudentSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    OTPRequestSerializer, 
    OTPVerificationSerializer
)
from .utils import send_approval_email, send_rejection_email
import pandas as pd
from rest_framework.parsers import MultiPartParser
from rest_framework.decorators import parser_classes
from .throttles import OTPRequestThrottle, OTPVerifyThrottle, LoginThrottle, AdminThrottle

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
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    """
    User login karega - email aur password se
    """
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]
    #throttle_classes = [LoginThrottle] 
    
    
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


class RequestOTPView(generics.CreateAPIView):
    """
    Step 1: Receives user details, validates, and sends OTP to email.
    Rate Limit: 5 requests per hour per IP
    """
    serializer_class = OTPRequestSerializer
    permission_classes = [AllowAny]
    #throttle_classes = [OTPRequestThrottle]
    
   
    def create(self, request, *args, **kwargs):
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            return Response({
                "success": True,
                "message": "OTP sent successfully to your email. It is valid for 10 minutes."
            }, status=status.HTTP_200_OK)


class VerifyOTPView(generics.CreateAPIView):
    """
    Step 2: Verifies the OTP and creates the user account.
    Rate Limit: 10 attempts per hour per IP
    """
    serializer_class = OTPVerificationSerializer
    permission_classes = [AllowAny]
    #throttle_classes = [OTPVerifyThrottle]
    
    def create(self, request, *args, **kwargs):
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            try:
                user = serializer.save()
                
                if user.is_active:
                    message = "Registration successful! Your account has been automatically approved. You can now login."
                else:
                    message = "Registration successful! Your account is pending admin approval."
                
                return Response({
                    "success": True,
                    "message": message,
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
    #throttle_classes = [AdminThrottle]  
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # 1. Status Filter
        status_filter = self.request.query_params.get('status', None)
        if status_filter and status_filter != 'all':
            queryset = queryset.filter(approval_status=status_filter)
        
        # 2. Search Filter (Name ya Email par case-insensitive search)
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(full_name__icontains=search_query) | 
                Q(email__icontains=search_query)
            )
            
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
        
        #  Delete enrolled student record bhi
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
    #throttle_classes = [OTPRequestThrottle]
    
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
                    
                    print(f" Password reset email sent to {user.email}")
                    
                except Exception as e:
                    print(f" Failed to send reset email: {str(e)}")
            
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
        
        print(f" Password reset successful for {user.email}")
        
        return Response({
            "success": True,
            "message": "Password has been reset successfully. You can now login with your new password."
        }, status=status.HTTP_200_OK)
    



class ExcelBulkUploadView(generics.GenericAPIView):
    """
    Admin will upload Excel/CSV for auto-approval whitelisting.
    """
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser]

    def post(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        # File size check (5MB limit)
        if file.size > 5 * 1024 * 1024:
            return Response({"error": "File size exceeds 5MB limit"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Read file based on extension
            if file.name.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)

            # Normalize column names (remove spaces, lowercase)
            df.columns = df.columns.str.strip().str.lower()
            
            # Check required columns
            required_cols = ['odoo_id', 'email', 'full_name']
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                return Response({
                    "error": f"Missing columns: {', '.join(missing_cols)}. Required: Odoo_ID, Email, Full_Name"
                }, status=status.HTTP_400_BAD_REQUEST)

            stats = {"total_processed": 0, "new_pre_approved": 0, "overridden": 0, "skipped": 0}

            for index, row in df.iterrows():
                odoo_id = str(row['odoo_id']).strip().upper()
                email = str(row['email']).strip().lower()
                full_name = str(row['full_name']).strip().title()

                if not odoo_id or not email or not full_name:
                    continue

                stats["total_processed"] += 1

                # Check existing record
                existing = EnrolledStudent.objects.filter(email=email).first()

                if existing:
                    if existing.approval_status in ['approved', 'pre_approved'] and existing.is_registered:
                        stats["skipped"] += 1
                        continue
                    elif existing.approval_status == 'rejected':
                        # Override rejected record
                        existing.roll_number = odoo_id
                        existing.full_name = full_name
                        existing.approval_status = 'pre_approved'
                        existing.rejected_reason = None
                        existing.save()
                        stats["overridden"] += 1
                    else:
                        stats["skipped"] += 1
                else:
                    # Create new pre-approved record
                    EnrolledStudent.objects.create(
                        roll_number=odoo_id,
                        email=email,
                        full_name=full_name,
                        approval_status='pre_approved',
                        is_registered=False
                    )
                    stats["new_pre_approved"] += 1

            return Response({
                "success": True,
                "message": "File processed successfully",
                "stats": stats
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": f"Failed to process file: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)