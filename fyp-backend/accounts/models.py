from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager
from django.db import models
from django.utils import timezone


class CustomUserManager(BaseUserManager):
    """
    Custom user model manager where email is the unique identifier
    """
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('user_type', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    username = None
    
    USER_TYPE_CHOICES = (
        ('student', 'Student'),
        ('supervisor', 'Supervisor'),
        ('admin', 'Admin'),
    )
    
    email = models.EmailField(unique=True)
    user_type = models.CharField(
        max_length=20, 
        choices=USER_TYPE_CHOICES,
        default='student'
    )
    
    student_id = models.CharField(max_length=20, blank=True, null=True, unique=True)
    department = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=15, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['user_type']
    
    objects = CustomUserManager()
    
    def __str__(self):
        return f"{self.email} - {self.user_type}"


class EnrolledStudent(models.Model):
    roll_number = models.CharField(max_length=50, unique=True, blank=True)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=200)
    is_registered = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Approval system fields
    approval_status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='pending'
    )
    rejected_reason = models.TextField(blank=True, null=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.roll_number or self.email} - {self.full_name}"