from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import EnrolledStudent
from django.db import transaction 
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.db.models import Q  
from django.utils import timezone  
from .utils import send_approval_email, generate_otp, send_otp_email
import re  
from .models import OTPVerification


CustomUser = get_user_model()
User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'password', 'confirm_password', 'user_type', 'first_name', 'last_name', 'student_id', 'department', 'designation', 'phone']


    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        return data
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        return User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            user_type=validated_data['user_type'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            student_id=validated_data.get('student_id'),
            department=validated_data.get('department'),
            designation=validated_data.get('designation'),
            phone=validated_data.get('phone'),
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'user_type', 'first_name', 'last_name', 'student_id', 'department', 'designation', 'phone']


class OTPRequestSerializer(serializers.Serializer):
    """
    Step 1: Validates input and sends OTP to email.
    """
    email = serializers.EmailField(required=True)
    student_id = serializers.CharField(required=True, max_length=50)
    first_name = serializers.CharField(required=True, max_length=100)
    last_name = serializers.CharField(required=True, max_length=100)


    def validate_first_name(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError("First name must be at least 3 characters long.")
        if not re.match(r"^[A-Za-z\s]+$", value):
            raise serializers.ValidationError("Name can only contain alphabets and spaces.")
        return value.strip().title()

    def validate_last_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Last name must be at least 2 characters long.")
        if not re.match(r"^[A-Za-z\s]+$", value):
            raise serializers.ValidationError("Name can only contain alphabets and spaces.")
        return value.strip().title()

    def validate_email(self, value):
        email = value.lower().strip()
        if not email.endswith('@iqra.edu.pk'):
            raise serializers.ValidationError("Only @iqra.edu.pk email addresses are allowed.")
        
        # Check EnrolledStudent (pending/approved users)
        enrolled_record = EnrolledStudent.objects.filter(email=email).first()
        if enrolled_record:
            if enrolled_record.approval_status == 'pending':
                raise serializers.ValidationError({
                    "email": "This email is pending approval. Please wait for admin approval."
                })
            elif enrolled_record.approval_status == 'approved':
                raise serializers.ValidationError({
                    "email": "This email is already registered. Please login."
                })
        
        # Check CustomUser (registered users)
        if CustomUser.objects.filter(email=email).exists():
            raise serializers.ValidationError({
                "email": "This email is already registered. Please login."
            })
            
        return email

    def validate_student_id(self, value):
        clean_id = value.strip().upper().replace(" ", "")
        if not clean_id:
            raise serializers.ValidationError("Odoo ID is required.")
        
        pattern_with_dashes = r"^IU\d{2}-\d{4}-\d{4}$"
        pattern_without_dashes = r"^IU\d{10}$"
        
        if re.match(pattern_with_dashes, clean_id):
            return clean_id
        elif re.match(pattern_without_dashes, clean_id):
            return f"{clean_id[:4]}-{clean_id[4:8]}-{clean_id[8:]}"
        else:
            raise serializers.ValidationError("Invalid Odoo ID format. Use pattern: IU02-0122-0289")

    def validate(self, data):
        email = data['email']
        student_id = data['student_id']
        
        # Check if this email or ID exists in pre-approved list
        pre_approved_record = EnrolledStudent.objects.filter(
            Q(roll_number=student_id) | Q(email=email),
            approval_status='pre_approved'
        ).first()
        
        if pre_approved_record:
            # Pre-approved record mila hai - ab strict check karein
            sheet_email = pre_approved_record.email.lower().strip()
            sheet_id = pre_approved_record.roll_number
            
            email_matches = (email == sheet_email)
            id_matches = (student_id == sheet_id)
            
            if email_matches and id_matches:
                # Perfect match - allow OTP
                pass
            elif email_matches and not id_matches:
                # Email match hai lekin ID galat hai
                raise serializers.ValidationError({
                    "student_id": f"This email is pre-approved. Please use the correct Odoo ID."
                })
            elif not email_matches and id_matches:
                # ID match hai lekin email galat hai
                raise serializers.ValidationError({
                    "email": f"This Odoo ID is pre-approved. Please use the correct email."
                })
            else:
                # Dono galat hain - yeh possible nahi hona chahiye lekin just in case
                raise serializers.ValidationError({
                    "non_field_errors": "The provided email and Odoo ID do not match our records. Please use exact details from the Excel sheet."
                })
        
        # Check for already registered users
        if CustomUser.objects.filter(email=email).exists():
            raise serializers.ValidationError({
                "email": "This email is already registered. Please login."
            })
        
        if CustomUser.objects.filter(student_id=student_id).exists():
            raise serializers.ValidationError({
                "student_id": "This Odoo ID is already registered. Please login."
            })
        
        # Check for pending approvals
        pending_record = EnrolledStudent.objects.filter(
            Q(email=email) | Q(roll_number=student_id),
            approval_status='pending'
        ).first()
        
        if pending_record:
            if pending_record.email == email:
                raise serializers.ValidationError({
                    "email": "This email is pending approval. Please wait for admin approval."
                })
            else:
                raise serializers.ValidationError({
                    "student_id": "This Odoo ID is pending approval. Please wait for admin approval."
                })
        
        # Check for spam (OTP already sent)
        active_otp = OTPVerification.objects.filter(email=email, is_verified=False).first()
        if active_otp and not active_otp.is_expired():
            raise serializers.ValidationError({
                "email": "An OTP has already been sent to this email. Please check your inbox or wait for it to expire."
            })
            
        return data

    def create(self, validated_data):
        email = validated_data['email'].lower().strip()
        student_id = validated_data['student_id']
        first_name = validated_data['first_name'].strip().title()
        last_name = validated_data['last_name'].strip().title()
        
        otp_code = generate_otp()
        expires_at = timezone.now() + timezone.timedelta(minutes=10)
        
        # Create or update OTP record
        OTPVerification.objects.create(
            email=email,
            student_id=student_id,
            first_name=first_name,
            last_name=last_name,
            otp_code=otp_code,
            expires_at=expires_at,
            is_verified=False
        )
        
        send_otp_email(email, otp_code)
        return validated_data


class OTPVerificationSerializer(serializers.Serializer):
    """
    Step 2: Verifies OTP and creates the actual user account.
    """
    email = serializers.EmailField(required=True)
    otp_code = serializers.CharField(required=True, max_length=6)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not re.search(r"[0-9]", value):
            raise serializers.ValidationError("Password must contain at least one digit/number.")
        if not re.search(r"[^A-Za-z0-9]", value):
            raise serializers.ValidationError("Password must contain at least one symbol (e.g., @, #, $).")
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        
        email = data['email'].lower().strip()
        otp_code = data['otp_code']
        
        # Find the OTP record
        otp_record = OTPVerification.objects.filter(email=email, is_verified=False).first()
        
        if not otp_record:
            raise serializers.ValidationError("No registration request found for this email. Please request a new OTP.")
            
        if otp_record.is_expired():
            raise serializers.ValidationError("OTP has expired. Please request a new one.")
            
        if otp_record.otp_code != otp_code:
            raise serializers.ValidationError("Invalid OTP code. Please try again.")
            
        data['otp_record'] = otp_record
        return data

    @transaction.atomic
    def create(self, validated_data):
        otp_record = validated_data.pop('otp_record')
        password = validated_data['password']
        
        email = otp_record.email
        student_id = otp_record.student_id
        first_name = otp_record.first_name
        last_name = otp_record.last_name
        full_name = f"{first_name} {last_name}"
        
        # --- STRICT PRE-APPROVED LOGIC ---
        whitelist_record = EnrolledStudent.objects.filter(
            roll_number=student_id,
            approval_status='pre_approved'
        ).first()

        is_auto_approved = False

        if whitelist_record:
            sheet_email = whitelist_record.email.lower().strip()
            sheet_name = whitelist_record.full_name.strip().title()
            
            email_matches = (email == sheet_email)
            name_matches = (full_name == sheet_name)
            
            if email_matches and name_matches:
                is_auto_approved = True
                whitelist_record.approval_status = 'approved'
                whitelist_record.is_registered = True
                whitelist_record.approved_at = timezone.now()
                whitelist_record.save()
            else:
                # BLOCK registration if details do not match Excel sheet
                raise serializers.ValidationError(
                    "Registration failed: Name or Email does not match university records. "
                    "Please use exact details from the Excel sheet or contact admin."
                )
        
        # Create User Account
        user = CustomUser.objects.create_user(
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=password,
            student_id=student_id,
            user_type='student',
            is_active=is_auto_approved
        )
        
        # Create Pending Record if not auto-approved
        if not is_auto_approved:
            EnrolledStudent.objects.create(
                roll_number=student_id,
                email=email,
                full_name=full_name,
                approval_status='pending'
            )
        
        # Mark OTP as used and send welcome email if approved
        otp_record.is_verified = True
        otp_record.save()
        
        if is_auto_approved:
            try:
                send_approval_email(whitelist_record, user)
            except Exception as e:
                print(f"Auto-approval email failed: {e}")
                
        return user



class EnrolledStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnrolledStudent
        fields = ['id', 'roll_number', 'email', 'full_name', 'is_registered', 'approval_status', 'rejected_reason', 'approved_at', 'created_at']
        read_only_fields = ['id', 'created_at', 'approved_at']


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        email = value.lower().strip()
        return email


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True, min_length=8)
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        try:
            uid = force_str(urlsafe_base64_decode(data['uid']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"uid": "Invalid user ID"})
        
        if not default_token_generator.check_token(user, data['token']):
            raise serializers.ValidationError({"token": "Invalid or expired token."})
        
        data['user'] = user
        return data