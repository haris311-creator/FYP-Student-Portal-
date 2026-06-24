from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .models import EnrolledStudent
from django.db import transaction 

CustomUser = get_user_model()
User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """
    Registration ke liye - naya user banane ke liye
    """
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'confirm_password', 
            'user_type', 'first_name', 'last_name',
            'student_id', 'department', 'designation', 'phone'
        ]
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        return data
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        
        user = User.objects.create_user(
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
        return user


class LoginSerializer(serializers.Serializer):
    """
    Login ke liye - email aur password check karega
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    """
    User data dikhane ke liye
    """
    class Meta:
        model = User
        fields = ['id', 'email', 'user_type', 'first_name', 'last_name', 
                 'student_id', 'department', 'designation', 'phone']


class StudentRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    student_id = serializers.CharField(required=True, max_length=50)
    
    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'email', 'student_id', 'password', 'confirm_password']
    
    def validate_email(self, value):
        email = value.lower().strip()
        if not email.endswith('@iqra.edu.pk'):
            raise serializers.ValidationError("Only @iqra.edu.pk email addresses are allowed")
        return email
    
    def validate_student_id(self, value):
        student_id = value.strip().upper()
        if not student_id:
            raise serializers.ValidationError("Odoo ID is required")
        
        # ✅ Check if student_id already exists in CustomUser
        if CustomUser.objects.filter(student_id=student_id).exists():
            raise serializers.ValidationError("This Student ID is already registered")
        
        # ✅ Check if student_id already exists in EnrolledStudent
        if EnrolledStudent.objects.filter(roll_number=student_id).exists():
            raise serializers.ValidationError("This Student ID is already registered")
        
        return student_id
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match"})
        
        if CustomUser.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "This email is already registered"})
        
        existing = EnrolledStudent.objects.filter(email=data['email']).first()
        if existing and existing.approval_status in ['pending', 'approved']:
            raise serializers.ValidationError({"email": "This email is already pending approval"})
        
        return data
    
    @transaction.atomic  # ✅ Transaction use karein - sab success ho toh hi save ho
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        student_id = validated_data.pop('student_id').strip().upper()
        
        # ✅ Double check - transaction ke andar bhi
        if CustomUser.objects.filter(student_id=student_id).exists():
            raise serializers.ValidationError({"student_id": "This Student ID is already registered"})
        
        if EnrolledStudent.objects.filter(roll_number=student_id).exists():
            raise serializers.ValidationError({"student_id": "This Student ID is already registered"})
        
        # User create karein
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password'],
            student_id=student_id,
            user_type='student',
            is_active=False
        )
        
        # Check for existing rejected record
        existing = EnrolledStudent.objects.filter(email=user.email).first()
        
        if existing and existing.approval_status == 'rejected':
            # Update existing rejected record
            existing.roll_number = student_id
            existing.full_name = f"{user.first_name} {user.last_name}"
            existing.approval_status = 'pending'
            existing.rejected_reason = None
            existing.approved_at = None
            existing.save()
        else:
            # Create new enrollment record
            EnrolledStudent.objects.create(
                roll_number=student_id,
                email=user.email,
                full_name=f"{user.first_name} {user.last_name}",
                approval_status='pending'
            )
        
        return user


class EnrolledStudentSerializer(serializers.ModelSerializer):
    """
    Admin ko enrolled students dikhane ke liye
    """
    
    class Meta:
        model = EnrolledStudent
        fields = ['id', 'roll_number', 'email', 'full_name', 'is_registered', 
                  'approval_status', 'rejected_reason', 'approved_at', 'created_at']
        read_only_fields = ['id', 'created_at', 'approved_at']