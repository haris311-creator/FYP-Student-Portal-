from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser

@admin.action(description='Approve selected users (Activate accounts)')
def approve_users(modeladmin, request, queryset):
    """
    Selected users ko approve karein - accounts activate ho jayenge
    """
    updated_count = queryset.update(is_active=True)
    modeladmin.message_user(request, f'{updated_count} user(s) approved successfully!')

@admin.action(description='Disable selected users')
def disable_users(modeladmin, request, queryset):
    """
    Selected users ko disable karein
    """
    updated_count = queryset.update(is_active=False)
    modeladmin.message_user(request, f'{updated_count} user(s) disabled.')

class CustomUserAdmin(BaseUserAdmin):
    # Admin panel mein dikhane wale fields (list view)
    list_display = ['email', 'user_type', 'student_id', 'first_name', 'last_name', 'is_active', 'is_staff', 'date_joined']
    
    # Filters - sidebar mein
    list_filter = ['user_type', 'is_active', 'is_staff', 'date_joined']
    
    # Search fields
    search_fields = ['email', 'first_name', 'last_name', 'student_id']
    
    # Ordering - newest pehle
    ordering = ['-date_joined']
    
    # Actions (bulk operations)
    actions = [approve_users, disable_users]
    
    # Fieldsets - form layout (edit view)
    fieldsets = (
        ('Login Credentials', {
            'fields': ('email', 'password', 'user_type')
        }),
        ('Personal Info', {
            'fields': ('first_name', 'last_name', 'phone')
        }),
        ('Student Info', {
            'fields': ('student_id', 'department'),
            'classes': ('collapse',)
        }),
        ('Supervisor Info', {
            'fields': ('designation',),
            'classes': ('collapse',)
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
    )
    
    # Add user form fields
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'user_type', 'first_name', 'last_name', 'student_id'),
        }),
    )
    
    readonly_fields = ['date_joined', 'last_login']
    
    # ✅ NEW: Auto-generate username before saving
    def save_model(self, request, obj, form, change):
        if not obj.username:
            if obj.student_id:
                obj.username = obj.student_id
            else:
                # Email se username banao
                base = obj.email.split('@')[0]
                obj.username = base
                
                # Unique banane ke liye
                counter = 1
                original = obj.username
                while CustomUser.objects.filter(username=obj.username).exists():
                    obj.username = f"{original}_{counter}"
                    counter += 1
        
        super().save_model(request, obj, form, change)

# CustomUser ko register karein
admin.site.register(CustomUser, CustomUserAdmin)

# Admin panel ka title change karein
admin.site.site_header = "FYP Portal Administration"
admin.site.site_title = "FYP Admin"
admin.site.index_title = "Welcome to FYP Portal Admin Panel"