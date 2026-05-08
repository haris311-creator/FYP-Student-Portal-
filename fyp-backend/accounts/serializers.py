from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

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
        # Password match check
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        return data
    
    def create(self, validated_data):
        # Confirm password hata dein (save nahi karna)
        validated_data.pop('confirm_password')
        
        # User create karein
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
    User data dikhane ke liye (token ke saath nahi bhejna)
    """
    class Meta:
        model = User
        fields = ['id', 'email', 'user_type', 'first_name', 'last_name', 
                 'student_id', 'department', 'designation', 'phone']