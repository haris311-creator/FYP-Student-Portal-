from rest_framework import permissions

class IsStudent(permissions.BasePermission):
    """Allow access only to users with user_type='student'"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'user_type', None) == 'student'

class IsGroupMemberOrReadOnly(permissions.BasePermission):
    """Allow read to anyone, write only to group members"""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.members.filter(student=request.user).exists()