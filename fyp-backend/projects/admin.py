from django.contrib import admin
from .models import Faculty, ProjectGroup, GroupMember, FYDPProposal, ChangeRequest

@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'designation', 'department', 'email', 'current_projects_count', 'is_active']
    list_filter = ['designation', 'department', 'is_active']
    search_fields = ['full_name', 'email', 'employee_id']
    readonly_fields = ['current_projects_count', 'created_at', 'updated_at']

@admin.register(ProjectGroup)
class ProjectGroupAdmin(admin.ModelAdmin):
    list_display = ['group_number', 'project_title', 'supervisor', 'status', 'semester', 'fydp_phase', 'created_at']
    list_filter = ['status', 'fydp_phase', 'semester', 'supervisor']
    search_fields = ['project_title', 'group_number']
    readonly_fields = ['group_id', 'group_number', 'created_at', 'updated_at']

@admin.register(GroupMember)
class GroupMemberAdmin(admin.ModelAdmin):
    list_display = ['student', 'group', 'role', 'cgpa', 'earned_credit_hours', 'has_special_permission']
    list_filter = ['role', 'has_special_permission', 'group']
    search_fields = ['student__email', 'student__full_name']
    readonly_fields = ['join_date']

@admin.register(FYDPProposal)
class FYDPProposalAdmin(admin.ModelAdmin):
    list_display = ['title', 'group', 'status', 'submitted_at', 'project_serial_no']
    list_filter = ['status', 'submitted_at']
    search_fields = ['title', 'group__project_title']
    readonly_fields = ['submitted_at', 'created_at', 'updated_at']

@admin.register(ChangeRequest)
class ChangeRequestAdmin(admin.ModelAdmin):
    list_display = ['group', 'change_type', 'status', 'submitted_at', 'penalty_percentage']
    list_filter = ['change_type', 'status', 'submitted_at']
    search_fields = ['group__project_title', 'reason']
    readonly_fields = ['submitted_at', 'decided_at', 'penalty_percentage']