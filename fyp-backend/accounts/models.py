from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager
from django.db import models

class CustomUserManager(UserManager):
    """
    Custom manager for creating users with email
    """
    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('user_type', 'admin')
        
        # Username ko email se set karein (Django requirement)
        extra_fields.setdefault('username', email.split('@')[0])
        
        return super().create_superuser(email, password, **extra_fields)

class CustomUser(AbstractUser):
    """
    Custom User Model - Email se login hoga
    User Types: student, supervisor, admin
    """
    
    # User type choices
    USER_TYPE_CHOICES = (
        ('student', 'Student'),
        ('supervisor', 'Supervisor'),
        ('admin', 'Admin'),
    )
    
    # Email unique hoga (login ke liye)
    email = models.EmailField(unique=True)
    
    # User type - batayega ke user kis type ka hai
    user_type = models.CharField(
        max_length=20, 
        choices=USER_TYPE_CHOICES,
        default='student'
    )
    
    # Student ke liye fields
    student_id = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True)
    
    # Supervisor ke liye fields
    designation = models.CharField(max_length=100, blank=True)
    
    # Common fields
    phone = models.CharField(max_length=15, blank=True)
    
    # Username ki jagah email se login hoga
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['user_type']
    
    # Custom manager set karein
    objects = CustomUserManager()
    
    def __str__(self):
        return f"{self.email} - {self.user_type}"