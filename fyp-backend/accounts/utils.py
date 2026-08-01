"""
accounts/utils.py
=================
Utility functions for email notifications.
"""

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
import random


def send_approval_email(student, user):
    """Send approval email to student"""
    try:
        context = {
            'student_name': f"{user.first_name} {user.last_name}",
            'student_email': user.email,
            'student_id': user.student_id or 'N/A',
            'login_url': 'http://localhost:5173/login',
        }
        
        try:
            html_message = render_to_string('emails/approval_email.html', context)
        except Exception:
            html_message = f"Welcome {user.first_name}! Your FYP Portal account has been approved."
        
        send_mail(
            subject='Your FYP Portal Account Has Been Approved',
            message='',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        print(f"Approval email sent to {user.email}")
        return True
    except Exception as e:
        print(f"Failed to send approval email: {str(e)}")
        return False


def send_rejection_email(student, rejection_reason):
    """Send rejection email to student"""
    try:
        context = {
            'student_name': student.full_name,
            'student_email': student.email,
            'student_id': student.roll_number or 'N/A',
            'rejection_reason': rejection_reason,
            'registration_date': student.created_at.strftime('%B %d, %Y') if student.created_at else 'N/A',
        }
        
        try:
            html_message = render_to_string('emails/rejection_email.html', context)
        except Exception:
            html_message = f"Dear {student.full_name}, your registration was rejected. Reason: {rejection_reason}"
        
        send_mail(
            subject='FYP Portal Registration Update',
            message='',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            html_message=html_message,
            fail_silently=False,
        )
        print(f"Rejection email sent to {student.email}")
        return True
    except Exception as e:
        print(f"Failed to send rejection email: {str(e)}")
        return False



def generate_otp():
    """Generates a secure 6-digit random OTP"""
    return str(random.randint(100000, 999999))


def send_otp_email(email, otp_code):
    """Sends the OTP code to the user's email"""
    try:
        context = {
            'otp_code': otp_code,
            'expiry_minutes': 10,
        }
        
        # Plain text fallback if HTML template is missing
        html_message = f"""
        <h2>FYP Portal Email Verification</h2>
        <p>Your One-Time Password (OTP) for registration is:</p>
        <h1 style="color: #1e3a8a; letter-spacing: 2px;">{otp_code}</h1>
        <p>This OTP is valid for 10 minutes. Do not share this with anyone.</p>
        """
        
        send_mail(
            subject='FYP Portal - Email Verification OTP',
            message='',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        print(f"OTP email sent to {email}")
        return True
    except Exception as e:
        print(f"Failed to send OTP email: {str(e)}")
        return False