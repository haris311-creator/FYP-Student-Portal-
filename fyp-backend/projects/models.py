from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid

# =============================================================================
# FACULTY MODEL
# =============================================================================
class Faculty(models.Model):
    DESIGNATION_CHOICES = [
        ('lecturer', 'Lecturer'),
        ('senior_lecturer', 'Senior Lecturer'),
        ('assistant_professor', 'Assistant Professor'),
        ('associate_professor', 'Associate Professor'),
        ('professor', 'Professor'),
    ]
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='faculty_profile',
        null=True, blank=True
    )
    employee_id = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    designation = models.CharField(max_length=50, choices=DESIGNATION_CHOICES)
    department = models.CharField(max_length=100, default='Computer Science')
    phone = models.CharField(max_length=15, blank=True)
    recommended_max_projects = models.PositiveIntegerField(default=3)
    current_projects_count = models.PositiveIntegerField(default=0, editable=False)
    is_active = models.BooleanField(default=True)
    research_interests = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['full_name']
    
    def __str__(self):
        return f"{self.full_name} ({self.designation})"


# =============================================================================
# PROJECT GROUP MODEL
# =============================================================================
class ProjectGroup(models.Model):
    STATUS_CHOICES = [
        ('idea_pitch', 'Idea Pitch Submitted'),
        ('proposal_pending', 'Proposal Pending'),
        ('proposal_approved', 'Proposal Approved'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    ]
    
    group_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    group_number = models.CharField(max_length=20, unique=True, blank=True)
    project_title = models.CharField(max_length=300, blank=True)
    domain = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='idea_pitch')
    
    supervisor = models.ForeignKey(
        Faculty,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supervised_groups'
    )
    co_supervisor = models.ForeignKey(
        Faculty,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='co_supervised_groups'
    )
    
    semester = models.CharField(max_length=20, help_text="e.g., 'Fall 2024'")
    fydp_phase = models.CharField(
        max_length=20,
        choices=[('fydp1', 'FYDP-I'), ('fydp2', 'FYDP-II')],
        default='fydp1'
    )
    sdg_goals = models.JSONField(default=list, blank=True)
    acm_knowledge_areas = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.group_number or self.group_id} - {self.project_title or 'Untitled'}"


# =============================================================================
# GROUP MEMBER MODEL
# =============================================================================
class GroupMember(models.Model):
    ROLE_CHOICES = [('member', 'Member'), ('lead', 'Group Lead')]
    
    group = models.ForeignKey(
        ProjectGroup,
        on_delete=models.CASCADE,
        related_name='members'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'student'}
    )
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='member')
    
    # ✅ Nullable fields for backward compatibility
    full_name = models.CharField(max_length=255, blank=True, null=True, help_text="Student's full name as per records")
    odoo_id = models.CharField(max_length=50, blank=True, null=True, help_text="University/Odoo ID (e.g., IU02-0322-0288)")
    
    join_date = models.DateTimeField(auto_now_add=True)
    
    # Eligibility fields (soft validation)
    cgpa = models.DecimalField(max_digits=4, decimal_places=2)
    earned_credit_hours = models.PositiveIntegerField()
    prerequisites_completed = models.BooleanField(default=True)
    
    # Special permission
    has_special_permission = models.BooleanField(default=False)
    permission_level = models.CharField(
        max_length=10,
        choices=[('hod', 'HOD Approved'), ('dean', 'Dean Approved')],
        blank=True,
        null=True
    )
    permission_document = models.FileField(
        upload_to='approvals/permission_letters/',
        blank=True
    )
    contribution_percentage = models.PositiveIntegerField(default=33)
    
    class Meta:
        unique_together = ['group', 'student']
        ordering = ['role', 'student__email']
    
    def __str__(self):
        return f"{self.full_name or self.student.email} in Group {self.group.group_number}"
    
    def get_eligibility_warnings(self):
        """Return warnings for UI display"""
        warnings = []
        
        if self.cgpa < 2.0:
            warnings.append({
                'field': 'cgpa',
                'message': f'CGPA {self.cgpa} < 2.0 (Policy 10.b)',
                'severity': 'warning',
                'requires_permission': True
            })
        
        if self.earned_credit_hours < 94:
            warnings.append({
                'field': 'credit_hours',
                'message': f'Credit Hours {self.earned_credit_hours} < 94 minimum',
                'severity': 'error',
                'requires_permission': False
            })
        elif self.earned_credit_hours < 97:
            warnings.append({
                'field': 'credit_hours',
                'message': f'2-course deficiency (Dean approval needed)',
                'severity': 'warning',
                'requires_permission': True,
                'permission_level': 'dean'
            })
        elif self.earned_credit_hours < 100:
            warnings.append({
                'field': 'credit_hours',
                'message': f'1-course deficiency (HOD approval needed)',
                'severity': 'warning',
                'requires_permission': True,
                'permission_level': 'hod'
            })
        
        if not self.prerequisites_completed:
            warnings.append({
                'field': 'prerequisites',
                'message': 'Prerequisites not completed',
                'severity': 'warning',
                'requires_permission': True
            })
        
        return warnings
    
    def can_register_with_warnings(self):
        """Check if student can register"""
        if self.earned_credit_hours < 94:
            return False, "Credit hours below absolute minimum (94)"
        return True, None


# =============================================================================
# FYDP PROPOSAL MODEL
# =============================================================================
class FYDPProposal(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('revision_requested', 'Revision Requested'),
        ('rejected', 'Rejected'),
    ]
    
    group = models.OneToOneField(
        ProjectGroup,
        on_delete=models.CASCADE,
        related_name='proposal'
    )
    title = models.CharField(max_length=300)
    domain = models.CharField(max_length=100)
    nature_of_project = models.JSONField(help_text="Checkboxes for project type")
    problem_statement = models.TextField(max_length=500)
    proposed_solution = models.TextField()
    scope_included = models.TextField()
    scope_excluded = models.TextField(blank=True)
    methodology = models.TextField()
    resources_involved = models.TextField()
    final_deliverables = models.TextField()
    learning_outcomes = models.TextField()
    industrial_support = models.TextField(blank=True)
    industry_partner_name = models.CharField(max_length=200, blank=True)
    sdg_mapping = models.JSONField(default=dict, blank=True)
    ccp_mapping = models.JSONField(default=dict, blank=True)
    acm_mapping = models.JSONField(default=list, blank=True)
    project_schedule = models.FileField(upload_to='proposals/schedules/', blank=True)
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    submitted_at = models.DateTimeField(null=True, blank=True)
    committee_remarks = models.TextField(blank=True)
    project_serial_no = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"


# =============================================================================
# CHANGE REQUEST MODEL
# =============================================================================
class ChangeRequest(models.Model):
    CHANGE_TYPE_CHOICES = [
        ('A1', 'Minor title modification - No penalty'),
        ('A2', 'Major scope change - 5% penalty'),
        ('B', 'Supervisor change - 10% penalty'),
        ('C', 'Member switch groups - 10% penalty'),
        ('D', 'Insufficient members - No special consideration'),
        ('E', 'Special circumstances - Forward to HOD'),
    ]
    
    STATUS_CHOICES = [('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')]
    
    group = models.ForeignKey(
        ProjectGroup,
        on_delete=models.CASCADE,
        related_name='change_requests'
    )
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    change_type = models.CharField(max_length=2, choices=CHANGE_TYPE_CHOICES)
    previous_value = models.TextField()
    new_value = models.TextField()
    reason = models.TextField()
    supervisor_consent = models.BooleanField(default=False)
    supervisor_remarks = models.TextField(blank=True)
    penalty_percentage = models.DecimalField(
        max_digits=4, decimal_places=2, default=0.00
    )
    penalty_applied = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    decision_remarks = models.TextField(blank=True)
    supporting_document = models.FileField(upload_to='change_requests/', blank=True)
    
    class Meta:
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"{self.get_change_type_display()} - {self.group.project_title}"
    
    def calculate_penalty(self):
        """Auto-calculate penalty"""
        penalties = {'A1': 0.00, 'A2': 5.00, 'B': 10.00, 'C': 10.00, 'D': 0.00, 'E': None}
        return penalties.get(self.change_type, 0.00)