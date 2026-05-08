from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """
    Naya user register karega
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]  # Koi bhi register kar sakta hai
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Tokens generate karein
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
    permission_classes = [permissions.AllowAny]  # Koi bhi login kar sakta hai
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        # User dhundhein
        try:
            user = User.objects.get(email=email)
            
            # Password check karein
            if not user.check_password(password):
                return Response(
                    {'error': 'Invalid email or password'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # User active hai?
            if not user.is_active:
                return Response(
                    {'error': 'Account is disabled'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Tokens generate karein
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
                token.blacklist()  # Token ko invalid kar dein
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
        return self.request.user  # Current user