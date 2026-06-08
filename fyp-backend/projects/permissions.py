from rest_framework import permissions

class IsStudent(permissions.BasePermission):
    """Only students can access"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and getattr(request.user, 'user_type', None) == 'student'

class IsAdminUser(permissions.BasePermission):
    """Only admin users can access"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'admin'
    
class IsGroupMemberOrReadOnly(permissions.BasePermission):
    """Group members can edit, others read-only"""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Check if user is a group member
        return GroupMember.objects.filter(
            group=obj,
            student=request.user
        ).exists()