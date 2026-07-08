from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from projects.models import ProjectGroup, GroupMember, MeetingMinute, ProjectReportSubmission
import uuid


class EvaluationCriteria(models.Model):
    """
    Dynamic rubric criteria for different evaluation types.
    Admin can add/update criteria without code changes.
    """
    EVALUATION_TYPE_CHOICES = [
        ('sessional', 'Sessional/Progress'),
        ('report', 'Project Report'),
        ('presentation', 'Presentation'),
    ]
    
    evaluation_type = models.CharField(max_length=20, choices=EVALUATION_TYPE_CHOICES)
    name = models.CharField(max_length=200)
    clo = models.CharField(max_length=50, blank=True, help_text="e.g., CLO2")
    ga = models.CharField(max_length=100, blank=True, help_text="e.g., GA3: Problem Analysis")
    weight = models.PositiveIntegerField(default=1, help_text="Multiplier for marks")
    max_marks = models.PositiveIntegerField(help_text="Maximum marks for this criterion (before weight)")
    description_1 = models.TextField(blank=True, help_text="Description for score 1")
    description_2 = models.TextField(blank=True)
    description_3 = models.TextField(blank=True)
    description_4 = models.TextField(blank=True)
    description_5 = models.TextField(blank=True, help_text="Description for score 5")
    order = models.PositiveIntegerField(default=0, help_text="Display order")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['evaluation_type', 'order', 'id']
        unique_together = ['evaluation_type', 'name']
    
    def __str__(self):
        return f"{self.get_evaluation_type_display()} - {self.name} (Weight: {self.weight})"
    
    @property
    def total_max_marks(self):
        """Calculate total max marks including weight"""
        return self.max_marks * self.weight


class SessionalEvaluation(models.Model):
    """
    Supervisor evaluates each student individually for sessional marks.
    Raw marks out of 50, scaled to 20.
    """
    group = models.ForeignKey(ProjectGroup, on_delete=models.CASCADE, related_name='sessional_evaluations')
    student = models.ForeignKey(GroupMember, on_delete=models.CASCADE, related_name='sessional_evaluations')
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='conducted_sessional_evaluations'
    )
    
    # Marks storage (JSON for flexibility)
    criteria_marks = models.JSONField(
        default=dict,
        help_text="e.g., {'criteria_id': score, ...}"
    )
    
    raw_total = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(50)]
    )
    final_marks = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        help_text="Scaled marks: (raw_total / 50) * 20"
    )
    
    comments = models.TextField(blank=True)
    evaluated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['group', 'student']
        ordering = ['-evaluated_at']
    
    def __str__(self):
        return f"{self.student.full_name} - Sessional: {self.final_marks}/20"
    
    def calculate_final_marks(self):
        """Auto-calculate scaled marks"""
        self.final_marks = (self.raw_total / 50) * 20
        return self.final_marks


class MeetingLogEvaluation(models.Model):
    """
    Committee member evaluates group's meeting logs.
    Group-wise evaluation, marks out of 10.
    """
    group = models.ForeignKey(ProjectGroup, on_delete=models.CASCADE, related_name='meeting_log_evaluations')
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='conducted_meeting_evaluations'
    )
    evaluator_name = models.CharField(max_length=200, help_text="Name of committee member")
    
    marks = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(10)]
    )
    
    comments = models.TextField(blank=True)
    evaluated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-evaluated_at']
        unique_together = ['group']
    
    def __str__(self):
        return f"{self.group.group_number} - Meeting Log: {self.marks}/10"


class ReportEvaluation(models.Model):
    """
    Committee member evaluates project report.
    Group-wise evaluation, raw marks out of 35, scaled to 30.
    """
    group = models.ForeignKey(ProjectGroup, on_delete=models.CASCADE, related_name='report_evaluations')
    report_submission = models.ForeignKey(
        ProjectReportSubmission,
        on_delete=models.CASCADE,
        related_name='evaluations',
        null=True,
        blank=True
    )
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='conducted_report_evaluations'
    )
    evaluator_name = models.CharField(max_length=200)
    
    # Marks storage
    criteria_marks = models.JSONField(
        default=dict,
        help_text="e.g., {'criteria_id': score, ...}"
    )
    
    raw_total = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(35)]
    )
    final_marks = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(30)],
        help_text="Scaled marks: (raw_total / 35) * 30"
    )
    
    comments = models.TextField(blank=True)
    evaluated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-evaluated_at']
    
    def __str__(self):
        return f"{self.group.group_number} - Report: {self.final_marks}/30"
    
    def calculate_final_marks(self):
        """Auto-calculate scaled marks"""
        self.final_marks = (self.raw_total / 35) * 30
        return self.final_marks


class PresentationEvaluation(models.Model):
    """
    Multiple evaluators (committee/faculty) evaluate presentation.
    Group-wise for presentation (50 marks) + individual viva (5 marks).
    Raw total out of 55, scaled to 40.
    """
    EVALUATOR_TYPE_CHOICES = [
        ('committee', 'Committee Member'),
        ('faculty', 'Faculty Member'),
        ('external', 'External Examiner'),
    ]
    
    # Unique token for public evaluation link
    evaluation_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    group = models.ForeignKey(ProjectGroup, on_delete=models.CASCADE, related_name='presentation_evaluations')
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conducted_presentation_evaluations'
    )
    evaluator_name = models.CharField(max_length=200)
    evaluator_type = models.CharField(max_length=20, choices=EVALUATOR_TYPE_CHOICES, default='committee')
    
    # Presentation marks (group-wise)
    presentation_criteria_marks = models.JSONField(
        default=dict,
        blank=True,
        help_text="Criteria marks for presentation (out of 50)"
    )
    presentation_raw_total = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(50)],
        null=True,
        blank=True,
        default=0
    )
    
    # Viva marks (individual per student)
    viva_marks = models.JSONField(
        default=dict,
        blank=True,
        help_text="e.g., {'student_id': marks, ...} (out of 5 each)"
    )
    
    # Total calculation
    total_raw = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True, 
        blank=True, 
        default=0, 
        help_text="Presentation + Viva total (out of 55)"
    )
    
    comments = models.TextField(blank=True)
    is_submitted = models.BooleanField(default=False)
    evaluated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-evaluated_at']
    
    def __str__(self):
        return f"{self.group.group_number} - Presentation by {self.evaluator_name}"
    
    def calculate_total(self):
        """Calculate total raw marks"""
        viva_total = sum(self.viva_marks.values()) if self.viva_marks else 0
        self.total_raw = self.presentation_raw_total + viva_total
        return self.total_raw


class FinalEvaluationResult(models.Model):
    """
    Final consolidated marks for each student.
    Auto-calculated from all evaluation components.
    """
    group = models.ForeignKey(ProjectGroup, on_delete=models.CASCADE, related_name='final_results')
    student = models.ForeignKey(GroupMember, on_delete=models.CASCADE, related_name='final_results')
    
    # Component marks
    sessional_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    meeting_log_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    report_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    presentation_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Total
    total_marks = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Status
    is_passed = models.BooleanField(default=False)
    passing_marks = models.DecimalField(max_digits=5, decimal_places=2, default=60)
    
    calculated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['group', 'student']
        ordering = ['-total_marks']
    
    def __str__(self):
        status = "✓ Passed" if self.is_passed else "✗ Failed"
        return f"{self.student.full_name} - {self.total_marks}/100 ({status})"
    
    def calculate_total(self):
        """Calculate total marks from all components"""
        self.total_marks = (
            self.sessional_marks +
            self.meeting_log_marks +
            self.report_marks +
            self.presentation_marks
        )
        self.is_passed = self.total_marks >= self.passing_marks
        return self.total_marks