# accounts/throttles.py
from rest_framework.throttling import SimpleRateThrottle

class OTPRequestThrottle(SimpleRateThrottle):
    scope = 'otp_request'

    def get_cache_key(self, request, view):
        # IP address ke hisaab se limit lagayega
        return self.get_ident(request)


class OTPVerifyThrottle(SimpleRateThrottle):
    scope = 'otp_verify'

    def get_cache_key(self, request, view):
        return self.get_ident(request)


class LoginThrottle(SimpleRateThrottle):
    scope = 'login'

    def get_cache_key(self, request, view):
        return self.get_ident(request)


class AdminThrottle(SimpleRateThrottle):
    scope = 'admin'
    def get_cache_key(self, request, view):
        return self.get_ident(request)