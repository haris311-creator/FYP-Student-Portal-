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
        ('pending_approval', 'Pending Admin Approval'),  
        ('idea_pitch', 'Idea Pitch Submitted'),
        ('proposal_pending', 'Proposal Pending'),
        ('proposal_approved', 'Proposal Approved'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),  
    ]
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending_approval'
    )
    group_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    group_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    project_title = models.CharField(max_length=300, blank=True)
    domain = models.CharField(max_length=100, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_project_groups',
        limit_choices_to={'user_type': 'admin'}
    )
    rejection_reason = models.TextField(blank=True, null=True)


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
    
    def save(self, *args, **kwargs):
        """Auto-generate group_number only on approval"""
        if self.status == 'idea_pitch' and not self.group_number:
            # Generate group number
            semester = self.semester or '2026'
            last_group = ProjectGroup.objects.filter(
                semester=semester,
                group_number__isnull=False
            ).order_by('-group_number').first()
            
            if last_group and last_group.group_number:
                try:
                    last_num = int(last_group.group_number.split('-')[-1])
                    new_num = f"GRP-{semester.split()[0]}-{last_num + 1:03d}"
                except:
                    new_num = f"GRP-{semester.split()[0]}-001"
            else:
                new_num = f"GRP-{semester.split()[0]}-001"
            
            self.group_number = new_num
            self.approved_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    def approve(self, admin_user):
        """Admin approval method"""
        self.status = 'idea_pitch'
        self.approved_by = admin_user
        self.approved_at = timezone.now()
        self.rejection_reason = None
        self.save()
    
    def reject(self, admin_user, reason):
        """Admin rejection method"""
        self.status = 'rejected'
        self.approved_by = admin_user
        self.rejection_reason = reason
        self.save()


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
# FYDP PROPOSAL MODEL - UPDATED
# =============================================================================
class FYDPProposal(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved_by_supervisor', 'Approved by Supervisor'),  # ✅ NEW
        ('revision_needed', 'Revision Needed'),  # ✅ NEW
        ('approved', 'Approved'),
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
    
    # ✅ NEW: Proposal file upload field
    proposal_file = models.FileField(
        upload_to='proposals/documents/',
        blank=True,
        null=True,
        help_text="Upload filled proposal form (PDF/DOCX only, Max 10MB)"
    )
    
    # ✅ NEW: Track submission attempts (Max 3)
    submission_count = models.PositiveIntegerField(default=0)
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    submitted_at = models.DateTimeField(null=True, blank=True)
    
    # ✅ NEW: Supervisor review fields
    supervisor_remarks = models.TextField(blank=True, help_text="Supervisor's feedback")
    approved_by_supervisor = models.ForeignKey(
        Faculty,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_proposals',
        help_text="Supervisor who approved this proposal"
    )
    supervisor_reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # ✅ NEW: Admin final review fields
    admin_remarks = models.TextField(blank=True, help_text="Admin's final decision remarks")
    finally_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finally_approved_proposals',
        limit_choices_to={'user_type': 'admin'},
        help_text="Admin who gave final approval"
    )
    admin_reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Existing fields
    committee_remarks = models.TextField(blank=True)
    project_serial_no = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"
    
    def can_upload(self):
        """
        Check if student can upload/modify proposal.
        Returns: (can_upload: bool, reason: str)
        """
        if self.status == 'approved':
            return False, "Proposal already approved. Cannot modify."
        
        if self.status == 'rejected':
            return False, "Proposal rejected. Contact admin."
        
        if self.submission_count >= 3:
            return False, "Maximum 3 submission attempts reached."
        
        return True, "Upload allowed"
    
    def increment_submission_count(self):
        """Increment submission count and check limit"""
        if self.submission_count >= 3:
            return False, "Maximum submission attempts (3) reached"
        
        self.submission_count += 1
        self.save()
        return True, f"Submission #{self.submission_count}"
    
    def submit_for_review(self):
        """Move proposal from Draft -> Submitted"""
        if self.status != 'draft':
            return False, "Proposal already submitted"
        
        self.status = 'submitted'
        self.submitted_at = timezone.now()
        self.save()
        return True, "Proposal submitted for review"
    
    def supervisor_review(self, faculty, action, remarks=''):
        """
        Supervisor review action.
        action: 'approve' or 'revision'
        """
        if self.status not in ['submitted', 'under_review', 'revision_needed']:
            return False, f"Cannot review. Current status: {self.status}"
        
        if action == 'approve':
            self.status = 'approved_by_supervisor'
            self.supervisor_remarks = remarks
            self.approved_by_supervisor = faculty
            self.supervisor_reviewed_at = timezone.now()
        elif action == 'revision':
            self.status = 'revision_needed'
            self.supervisor_remarks = remarks
            self.supervisor_reviewed_at = timezone.now()
        else:
            return False, "Invalid action. Use 'approve' or 'revision'"
        
        self.save()
        return True, f"Proposal {action}d by supervisor"
    
    def admin_review(self, admin_user, action, remarks=''):
        """
        Admin final review action.
        action: 'approve' or 'reject'
        """
        if self.status != 'approved_by_supervisor':
            return False, f"Cannot review. Status must be 'approved_by_supervisor', current: {self.status}"
        
        if action == 'approve':
            self.status = 'approved'
            self.admin_remarks = remarks
            self.finally_approved_by = admin_user
            self.admin_reviewed_at = timezone.now()
            self.project_serial_no = self._generate_serial_number()
        elif action == 'reject':
            self.status = 'rejected'
            self.admin_remarks = remarks
            self.finally_approved_by = admin_user
            self.admin_reviewed_at = timezone.now()
        else:
            return False, "Invalid action. Use 'approve' or 'reject'"
        
        self.save()
        return True, f"Proposal finally {action}d by admin"
    
    def _generate_serial_number(self):
        """Generate project serial number"""
        year = timezone.now().year
        prefix = f"PRJ-{year}"
        
        # Get last serial number
        last_proposal = FYDPProposal.objects.filter(
            project_serial_no__startswith=prefix,
            status='approved'
        ).order_by('-project_serial_no').first()
        
        if last_proposal and last_proposal.project_serial_no:
            try:
                last_num = int(last_proposal.project_serial_no.split('-')[-1])
                return f"{prefix}-{last_num + 1:04d}"
            except:
                return f"{prefix}-0001"
        else:
            return f"{prefix}-0001"


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


    # =============================================================================
# MEETING MINUTES & ATTENDANCE MODELS
# =============================================================================

class MeetingMinute(models.Model):
    """
    Supervisor ke liye meeting minutes form.
    Total 16 meetings per semester.
    """
    MEETING_STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
    ]
    
    PREVIOUS_TASK_STATUS_CHOICES = [
        ('complete', '✅ Completed'),
        ('incomplete', '❌ Incomplete'),
        ('partial', '⚠️ Partial'),
    ]
    
    group = models.ForeignKey(
        ProjectGroup,
        on_delete=models.CASCADE,
        related_name='meeting_minutes'
    )
    supervisor = models.ForeignKey(
        Faculty,
        on_delete=models.CASCADE,
        related_name='conducted_meetings'
    )
    meeting_number = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(16)],
        help_text="Meeting number (1-16)"
    )
    date = models.DateField()
    agenda = models.TextField(help_text="Discussion agenda")
    
    # Previous task tracking (for meeting 2 onwards)
    previous_task_status = models.CharField(
        max_length=20,
        choices=PREVIOUS_TASK_STATUS_CHOICES,
        null=True,
        blank=True
    )
    previous_task_comment = models.TextField(blank=True)
    
    # New task assignment
    new_task = models.TextField(help_text="Tasks assigned for next week")
    
    status = models.CharField(
        max_length=20,
        choices=MEETING_STATUS_CHOICES,
        default='draft'
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['group', 'meeting_number']
        ordering = ['meeting_number']
    
    def __str__(self):
        return f"{self.group.group_number} - Meeting #{self.meeting_number}"
    
    def save(self, *args, **kwargs):
        # Auto-set status to submitted when saved
        self.status = 'submitted'
        super().save(*args, **kwargs)


class AttendanceLog(models.Model):
    """
    Per-meeting attendance for each student.
    """
    ATTENDANCE_STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
    ]
    
    meeting = models.ForeignKey(
        MeetingMinute,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'user_type': 'student'}
    )
    status = models.CharField(
        max_length=10,
        choices=ATTENDANCE_STATUS_CHOICES
    )
    marked_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['meeting', 'student']
        
    
    def __str__(self):
        return f"{self.student.full_name} - {self.status}"




# =============================================================================
# ANNOUNCEMENT MODEL
# =============================================================================
class Announcement(models.Model):
    """
    Announcement model for homepage ticker and admin management.
    """
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    title = models.CharField(max_length=200)
    content = models.TextField(help_text="Full announcement content")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True, help_text="Leave blank for no expiry")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    class Meta:
        ordering = ['-priority', '-created_at']
        verbose_name_plural = 'Announcements'
    
    def __str__(self):
        return self.title
    
    def is_current(self):
        """Check if announcement is currently active"""
        if not self.is_active:
            return False
        if self.end_date and timezone.now() > self.end_date:
            return False
        return True