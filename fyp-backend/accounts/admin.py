from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser, EnrolledStudent


# ✅ Bulk Actions
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


@admin.action(description='Reject selected users (Deactivate + Delete enrollment)')
def reject_users(modeladmin, request, queryset):
    """
    Selected users ko reject karein - accounts deactivate ho jayenge
    """
    updated_count = queryset.update(is_active=False)
    modeladmin.message_user(request, f'{updated_count} user(s) rejected.')


# ✅ Custom User Admin
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
    actions = [approve_users, disable_users, reject_users]
    
    # ✅ FIX: Fieldsets - username ko hata diya, email ko primary banaya
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
    
    # ✅ FIX: Add user form - email se start, username nahi
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'user_type', 'first_name', 'last_name', 'student_id'),
        }),
    )
    
    readonly_fields = ['date_joined', 'last_login']
    
    # ✅ FIX: save_model - username set karne ki zaroorat nahi
    def save_model(self, request, obj, form, change):
        # Email ko lowercase karein (consistency ke liye)
        if obj.email:
            obj.email = obj.email.lower().strip()
        
        # Agar student_id hai toh usko bhi clean karein
        if obj.student_id:
            obj.student_id = obj.student_id.strip().upper()
        
        super().save_model(request, obj, form, change)


# ✅ Enrolled Student Admin (Bonus - Admin panel se bhi manage kar sakte hain)
class EnrolledStudentAdmin(admin.ModelAdmin):
    list_display = ['roll_number', 'email', 'full_name', 'approval_status', 'is_registered', 'created_at']
    list_filter = ['approval_status', 'is_registered']
    search_fields = ['email', 'full_name', 'roll_number']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Student Info', {
            'fields': ('roll_number', 'email', 'full_name')
        }),
        ('Status', {
            'fields': ('approval_status', 'is_registered', 'rejected_reason', 'approved_at')
        }),
    )
    readonly_fields = ['created_at', 'approved_at']
    
    actions = ['approve_students', 'reject_students']
    
    @admin.action(description='Approve selected students')
    def approve_students(self, request, queryset):
        from django.utils import timezone
        count = 0
        for student in queryset.filter(approval_status='pending'):
            student.approval_status = 'approved'
            student.approved_at = timezone.now()
            student.is_registered = True
            student.save()
            
            # User account activate karein
            user = CustomUser.objects.filter(email=student.email).first()
            if user:
                user.is_active = True
                user.save()
            count += 1
        
        self.message_user(request, f'{count} student(s) approved successfully!')
    
    @admin.action(description='Reject selected students')
    def reject_students(self, request, queryset):
        count = 0
        for student in queryset.filter(approval_status='pending'):
            student.approval_status = 'rejected'
            student.rejected_reason = 'Rejected via admin panel'
            student.save()
            
            # User account delete karein
            user = CustomUser.objects.filter(email=student.email).first()
            if user:
                user.delete()
            count += 1
        
        self.message_user(request, f'{count} student(s) rejected.')


# ✅ Register Models
admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(EnrolledStudent, EnrolledStudentAdmin)

# ✅ Admin Panel Branding
admin.site.site_header = "FYP Portal Administration"
admin.site.site_title = "FYP Admin"
admin.site.index_title = "Welcome to FYP Portal Admin Panel"