"""
accounts/utils.py
=================
Yeh file enrollment system ke utility functions contain karti hai.
Main kaam: Unique enrollment codes generate karna.
"""

import secrets
import string
from .models import EnrollmentCode


# Code generation ke liye configuration
CODE_PREFIX = "FYP2026-"      # Har code ke aage yeh prefix hoga
CODE_LENGTH = 5                # Prefix ke baad kitne random characters honge
# Example final code: FYP2026-A7K9M (total 14 characters)


def generate_unique_code(max_attempts=100):
    """
    Ek unique enrollment code generate karta hai.
    
    Format: FYP2026-XXXXX (jahan XXXXX random alphanumeric characters hain)
    
    Security Note:
    - `secrets` module use kiya hai `random` ki jagah, kyunki yeh 
      cryptographically secure hai (brute-force attacks ke against safe).
    - Characters pool mein uppercase letters (A-Z) aur digits (0-9) hain.
    - Lowercase letters exclude kiye hain taake confusion na ho (0 vs O, 1 vs l).
    
    Args:
        max_attempts (int): Maximum attempts unique code dhundne ke liye.
                           Default 100 rakha hai taake infinite loop na ho.
    
    Returns:
        str: Unique enrollment code (e.g., "FYP2026-A7K9M")
    
    Raises:
        RuntimeError: Agar unique code generate nahi ho pa raha (bahut zyada codes already exist).
    """
    
    # Characters pool: Uppercase letters + digits (no lowercase to avoid confusion)
    # Example: ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
    alphabet = string.ascii_uppercase + string.digits
    
    for attempt in range(max_attempts):
        # Random characters generate karo
        random_part = ''.join(secrets.choice(alphabet) for _ in range(CODE_LENGTH))
        
        # Full code banao prefix ke saath
        candidate_code = f"{CODE_PREFIX}{random_part}"
        
        # Check karo ke yeh code database mein pehle se exist karta hai ya nahi
        if not EnrollmentCode.objects.filter(code=candidate_code).exists():
            return candidate_code
    
    # Agar max attempts tak bhi unique code nahi mila, toh error raise karo
    raise RuntimeError(
        f"Unique code generate nahi ho paya {max_attempts} attempts ke baad. "
        "Database mein bahut zyada codes hain, CODE_LENGTH badhane ki zaroorat hai."
    )


def get_expiry_date(days=7):
    """
    Expiry date calculate karta hai current time se 'days' din aage.
    
    Args:
        days (int): Kitne din baad code expire hoga. Default 7 days.
    
    Returns:
        datetime: Expiry date and time
    
    Example:
        >>> get_expiry_date(7)
        datetime.datetime(2026, 6, 30, 14, 30, 0, tzinfo=<UTC>)
    """
    from django.utils import timezone
    from datetime import timedelta
    
    return timezone.now() + timedelta(days=days)


# Valid expiry options jo admin choose kar sakta hai
VALID_EXPIRY_OPTIONS = {
    3: "3 days (Urgent)",
    7: "7 days (Recommended)",
    14: "14 days (Extended)",
    30: "30 days (Special Cases)"
}


def validate_expiry_days(days):
    """
    Check karta hai ke admin ne valid expiry days choose kiye hain ya nahi.
    
    Args:
        days (int): Expiry days jo admin ne select kiye
    
    Returns:
        bool: True agar valid hai, False otherwise
    """
    return days in VALID_EXPIRY_OPTIONS.keys()