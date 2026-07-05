from django.contrib import admin
from .models import (
    EvaluationCriteria,
    SessionalEvaluation,
    MeetingLogEvaluation,
    ReportEvaluation,
    PresentationEvaluation,
    FinalEvaluationResult,
)


# =============================================================================
# 1. EVALUATION CRITERIA ADMIN (Rubrics Management)
# =============================================================================
@admin.register(EvaluationCriteria)
class EvaluationCriteriaAdmin(admin.ModelAdmin):
    list_display = [
        'name', 
        'evaluation_type', 
        'clo',
        'ga',
        'weight', 
        'max_marks', 
        'total_max_marks', 
        'order',
        'is_active'
    ]
    list_filter = ['evaluation_type', 'is_active', 'clo']
    search_fields = ['name', 'clo', 'ga', 'description_1', 'description_5']
    list_editable = ['weight', 'max_marks', 'order', 'is_active']
    ordering = ['evaluation_type', 'order']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'evaluation_type', 'clo', 'ga', 'order', 'is_active')
        }),
        ('Marks Configuration', {
            'fields': ('weight', 'max_marks')
        }),
        ('Rubric Descriptions (1-5 Scale)', {
            'fields': (
                'description_1', 
                'description_2', 
                'description_3', 
                'description_4', 
                'description_5'
            ),
            'classes': ('collapse',)
        }),
    )


# =============================================================================
# 2. SESSIONAL EVALUATION ADMIN (Supervisor Marks)
# =============================================================================
@admin.register(SessionalEvaluation)
class SessionalEvaluationAdmin(admin.ModelAdmin):
    list_display = [
        'student_name',
        'group_number',
        'evaluator_name',
        'raw_total',
        'final_marks',
        'evaluated_at'
    ]
    list_filter = ['group__semester', 'group__fydp_phase', 'evaluated_at']
    search_fields = [
        'student__full_name',
        'student__student__email',
        'group__group_number',
        'group__project_title'
    ]
    readonly_fields = ['final_marks', 'evaluated_at', 'updated_at']
    ordering = ['-evaluated_at']
    
    def student_name(self, obj):
        return obj.student.full_name
    student_name.short_description = 'Student'
    student_name.admin_order_field = 'student__full_name'
    
    def group_number(self, obj):
        return obj.group.group_number
    group_number.short_description = 'Group'
    group_number.admin_order_field = 'group__group_number'
    
    def evaluator_name(self, obj):
        return obj.evaluator.get_full_name() if obj.evaluator else 'N/A'
    evaluator_name.short_description = 'Evaluator'


# =============================================================================
# 3. MEETING LOG EVALUATION ADMIN (Committee Marks)
# =============================================================================
@admin.register(MeetingLogEvaluation)
class MeetingLogEvaluationAdmin(admin.ModelAdmin):
    list_display = [
        'group_number',
        'project_title',
        'evaluator_name',
        'marks',
        'evaluated_at'
    ]
    list_filter = ['group__semester', 'group__fydp_phase', 'evaluated_at']
    search_fields = [
        'group__group_number',
        'group__project_title',
        'evaluator_name'
    ]
    readonly_fields = ['evaluated_at', 'updated_at']
    ordering = ['-evaluated_at']
    
    def group_number(self, obj):
        return obj.group.group_number
    group_number.short_description = 'Group'
    group_number.admin_order_field = 'group__group_number'
    
    def project_title(self, obj):
        return obj.group.project_title[:50] if obj.group.project_title else 'N/A'
    project_title.short_description = 'Project'
    
    def evaluator_name(self, obj):
        return obj.evaluator_name
    evaluator_name.short_description = 'Evaluator'


# =============================================================================
# 4. REPORT EVALUATION ADMIN (Committee Marks)
# =============================================================================
@admin.register(ReportEvaluation)
class ReportEvaluationAdmin(admin.ModelAdmin):
    list_display = [
        'group_number',
        'project_title',
        'evaluator_name',
        'raw_total',
        'final_marks',
        'evaluated_at'
    ]
    list_filter = ['group__semester', 'group__fydp_phase', 'evaluated_at']
    search_fields = [
        'group__group_number',
        'group__project_title',
        'evaluator_name'
    ]
    readonly_fields = ['final_marks', 'evaluated_at', 'updated_at']
    ordering = ['-evaluated_at']
    
    fieldsets = (
        ('Evaluation Details', {
            'fields': (
                'group',
                'report_submission',
                'evaluator',
                'evaluator_name'
            )
        }),
        ('Marks', {
            'fields': ('criteria_marks', 'raw_total', 'final_marks')
        }),
        ('Comments & Timestamps', {
            'fields': ('comments', 'evaluated_at', 'updated_at')
        }),
    )
    
    def group_number(self, obj):
        return obj.group.group_number
    group_number.short_description = 'Group'
    group_number.admin_order_field = 'group__group_number'
    
    def project_title(self, obj):
        return obj.group.project_title[:50] if obj.group.project_title else 'N/A'
    project_title.short_description = 'Project'
    
    def evaluator_name(self, obj):
        return obj.evaluator_name
    evaluator_name.short_description = 'Evaluator'


# =============================================================================
# 5. PRESENTATION EVALUATION ADMIN (Multiple Evaluators)
# =============================================================================
@admin.register(PresentationEvaluation)
class PresentationEvaluationAdmin(admin.ModelAdmin):
    list_display = [
        'group_number',
        'project_title',
        'evaluator_name',
        'evaluator_type',
        'presentation_raw_total',
        'total_raw',
        'is_submitted',
        'evaluated_at'
    ]
    list_filter = [
        'evaluator_type',
        'is_submitted',
        'group__semester',
        'group__fydp_phase',
        'evaluated_at'
    ]
    search_fields = [
        'group__group_number',
        'group__project_title',
        'evaluator_name',
        'evaluation_token'
    ]
    readonly_fields = [
        'evaluation_token',
        'total_raw',
        'is_submitted',
        'evaluated_at',
        'updated_at'
    ]
    ordering = ['-evaluated_at']
    list_editable = ['is_submitted']
    
    fieldsets = (
        ('Evaluator Information', {
            'fields': (
                'group',
                'evaluator',
                'evaluator_name',
                'evaluator_type',
                'evaluation_token'
            )
        }),
        ('Presentation Marks (Group-wise)', {
            'fields': (
                'presentation_criteria_marks',
                'presentation_raw_total'
            )
        }),
        ('Viva Marks (Individual)', {
            'fields': ('viva_marks',)
        }),
        ('Total Calculation', {
            'fields': ('total_raw',)
        }),
        ('Status & Comments', {
            'fields': ('is_submitted', 'comments', 'evaluated_at', 'updated_at')
        }),
    )
    
    def group_number(self, obj):
        return obj.group.group_number
    group_number.short_description = 'Group'
    group_number.admin_order_field = 'group__group_number'
    
    def project_title(self, obj):
        return obj.group.project_title[:50] if obj.group.project_title else 'N/A'
    project_title.short_description = 'Project'
    
    def evaluator_name(self, obj):
        return obj.evaluator_name
    evaluator_name.short_description = 'Evaluator'


# =============================================================================
# 6. FINAL EVALUATION RESULT ADMIN (Consolidated Results)
# =============================================================================
@admin.register(FinalEvaluationResult)
class FinalEvaluationResultAdmin(admin.ModelAdmin):
    list_display = [
        'student_name',
        'student_id',
        'group_number',
        'project_title',
        'sessional_marks',
        'meeting_log_marks',
        'report_marks',
        'presentation_marks',
        'total_marks',
        'is_passed',
        'calculated_at'
    ]
    list_filter = [
        'is_passed',
        'group__semester',
        'group__fydp_phase',
        'calculated_at'
    ]
    search_fields = [
        'student__full_name',
        'student__student__student_id',
        'group__group_number',
        'group__project_title'
    ]
    readonly_fields = [
        'total_marks',
        'is_passed',
        'calculated_at',
        'updated_at'
    ]
    ordering = ['-total_marks', 'group__group_number']
    
    fieldsets = (
        ('Student & Group Information', {
            'fields': ('group', 'student')
        }),
        ('Component Marks', {
            'fields': (
                'sessional_marks',
                'meeting_log_marks',
                'report_marks',
                'presentation_marks'
            )
        }),
        ('Final Result', {
            'fields': (
                'total_marks',
                'is_passed',
                'passing_marks'
            )
        }),
        ('Timestamps', {
            'fields': ('calculated_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def student_name(self, obj):
        return obj.student.full_name
    student_name.short_description = 'Student'
    student_name.admin_order_field = 'student__full_name'
    
    def student_id(self, obj):
        return obj.student.student.student_id
    student_id.short_description = 'Student ID'
    student_id.admin_order_field = 'student__student__student_id'
    
    def group_number(self, obj):
        return obj.group.group_number
    group_number.short_description = 'Group'
    group_number.admin_order_field = 'group__group_number'
    
    def project_title(self, obj):
        return obj.group.project_title[:50] if obj.group.project_title else 'N/A'
    project_title.short_description = 'Project'


# =============================================================================
# ADMIN SITE CUSTOMIZATION
# =============================================================================
admin.site.site_header = 'FYP Portal Administration'
admin.site.site_title = 'FYP Admin'
admin.site.index_title = 'Evaluation Management System'