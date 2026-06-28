from rest_framework import serializers
from .models import ProjectGroup, GroupMember, Faculty, FYDPProposal, ChangeRequest, MeetingMinute, AttendanceLog, Announcement, ReportDeadline, ProjectReportSubmission
from django.contrib.auth import get_user_model
from django.db import transaction
from accounts.models import CustomUser

User = get_user_model()

# =============================================================================
# FACULTY SERIALIZERS
# =============================================================================
class FacultyListSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    current_projects_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Faculty
        fields = ['id', 'full_name', 'email', 'designation', 'department', 
                  'display_name', 'current_projects_count', 'research_interests']
    
    def get_display_name(self, obj):
        return f"{obj.full_name} - {obj.get_designation_display()}"


class FacultyDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Faculty
        fields = '__all__'


# =============================================================================
# GROUP MEMBER SERIALIZERS
# =============================================================================
class GroupMemberSerializer(serializers.ModelSerializer):
    student_email = serializers.EmailField(source='student.email', read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)  # ✅ ADDED
    student_first_name = serializers.CharField(source='student.first_name', read_only=True)  # ✅ ADD
    student_last_name = serializers.CharField(source='student.last_name', read_only=True)    # ✅ ADD
    eligibility_warnings = serializers.SerializerMethodField()
    registration_status = serializers.SerializerMethodField()
    
    class Meta:
        model = GroupMember
        fields = [
            'id', 'group', 'student', 'student_email', 'student_name', 'student_id',
            'student_first_name', 'student_last_name', 'full_name', 'odoo_id', 'role', 'cgpa', 'earned_credit_hours', 
            'prerequisites_completed', 'has_special_permission', 'permission_level', 
            'permission_document', 'contribution_percentage', 'eligibility_warnings', 
            'registration_status'
        ]
        read_only_fields = ['eligibility_warnings', 'registration_status']
    
    def get_eligibility_warnings(self, obj):
        return obj.get_eligibility_warnings()
    
    def get_registration_status(self, obj):
        can_reg, msg = obj.can_register_with_warnings()
        return {
            'allowed': can_reg,
            'message': msg or "Eligible to register",
            'requires_permission': any(w.get('requires_permission') for w in obj.get_eligibility_warnings())
        }
    
    def validate(self, data):
        cgpa = data.get('cgpa')
        credit_hours = data.get('earned_credit_hours')
        has_permission = data.get('has_special_permission', False)
        
        if credit_hours < 94:
            raise serializers.ValidationError({
                'earned_credit_hours': 'Credit hours cannot be below 94 (absolute minimum per Policy 10.b)'
            })
        
        warnings = []
        if cgpa and cgpa < 2.0 and not has_permission:
            warnings.append("CGPA < 2.0: Ensure you have HOD/Dean approval")
        if credit_hours and credit_hours < 100 and not has_permission:
            warnings.append("Credit deficiency: Ensure you have required approval")
        
        if warnings:
            self.context['warnings'] = warnings
        
        return data


# =============================================================================
# PROJECT GROUP SERIALIZERS
# =============================================================================
class ProjectGroupSerializer(serializers.ModelSerializer):
    members = GroupMemberSerializer(many=True, read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.full_name', read_only=True)
    member_count = serializers.SerializerMethodField()
    domain_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectGroup
        fields = [
            'id', 'group_id', 'group_number', 'project_title', 'domain', 'domain_display', 
            'status', 'supervisor', 'supervisor_name', 'co_supervisor',
            'semester', 'fydp_phase', 'members', 'member_count',
            'sdg_goals', 'acm_knowledge_areas', 'created_at', 'updated_at',
            'rejection_reason'
        ]
        read_only_fields = ['group_id', 'group_number', 'member_count', 'status', 'rejection_reason']
    
    def get_member_count(self, obj):
        return obj.members.count()
    
    def get_domain_display(self, obj):
        """Full domain name return karein"""
        domain_map = {
            'AI': 'AI & Machine Learning',
            'Web': 'Web Development',
            'App': 'Mobile Apps',
            'IoT': 'IoT / Embedded',
            'Other': 'Other',
            'ML': 'AI & Machine Learning',
            'Mobile': 'Mobile Apps',
            'Embedded': 'IoT / Embedded',
        }
        domain = obj.domain or ''
        return domain_map.get(domain, domain)  # Agar mapping nahi mili toh original return kare
    
    def create(self, validated_data):
        validated_data['status'] = 'pending_approval'
        validated_data.pop('group_number', None)
        return super().create(validated_data)


class GroupCreateSerializer(serializers.Serializer):
    project_title = serializers.CharField(max_length=300)
    domain = serializers.CharField(max_length=100)
    supervisor = serializers.PrimaryKeyRelatedField(queryset=Faculty.objects.all())
    co_supervisor = serializers.PrimaryKeyRelatedField(queryset=Faculty.objects.all(), required=False, allow_null=True)
    semester = serializers.CharField(max_length=20)
    fydp_phase = serializers.ChoiceField(choices=[('fydp1', 'FYDP-I'), ('fydp2', 'FYDP-II')])
    sdg_goals = serializers.JSONField(required=False, default=list)
    acm_knowledge_areas = serializers.JSONField(required=False, default=list)
    
    members = serializers.ListField(
        child=serializers.DictField(),
        min_length=2,
        max_length=3,
        error_messages={'min_length': 'Group must have at least 2 members',
                       'max_length': 'Group cannot have more than 3 members'}
    )
    
    def validate_members(self, members):
        if len(members) < 2:
            raise serializers.ValidationError("Group must have at least 2 members")
        
        student_ids = [m.get('student') for m in members if m.get('student')]
        if len(student_ids) != len(set(student_ids)):
            raise serializers.ValidationError("Duplicate students in group")
        
        for i, member in enumerate(members):
            if 'cgpa' not in member or 'earned_credit_hours' not in member:
                raise serializers.ValidationError(f"Member {i+1}: CGPA and credit hours required")
            if member['earned_credit_hours'] < 94:
                raise serializers.ValidationError(f"Member {i+1}: Credit hours cannot be below 94")
        
        return members
    
    @transaction.atomic  
    def create(self, validated_data):  
        members_data = validated_data.pop('members')
        group = ProjectGroup.objects.create(**validated_data)
        
        for member_data in members_data:
            student_id = member_data.pop('student')
            student = User.objects.get(id=student_id)
            GroupMember.objects.create(group=group, student=student, **member_data)
        
        return group 


# =============================================================================
# FYDP PROPOSAL SERIALIZERS - UPDATED
# =============================================================================
class FYDPProposalSerializer(serializers.ModelSerializer):
    group_id = serializers.UUIDField(source='group.group_id', read_only=True)
    project_title = serializers.CharField(source='group.project_title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Read-only fields for frontend display
    submission_count = serializers.IntegerField(read_only=True)
    supervisor_remarks = serializers.CharField(read_only=True)
    admin_remarks = serializers.CharField(read_only=True)
    approved_by_supervisor_name = serializers.CharField(
        source='approved_by_supervisor.full_name', read_only=True, default=None
    )
    finally_approved_by_name = serializers.CharField(
        source='finally_approved_by.full_name', read_only=True, default=None
    )
    
    class Meta:
        model = FYDPProposal
        fields = [
            'id', 'group', 'group_id', 'project_title', 'title', 'domain', 
            'nature_of_project', 'problem_statement', 'proposed_solution',
            'scope_included', 'scope_excluded', 'methodology', 'resources_involved',
            'final_deliverables', 'learning_outcomes', 'industrial_support', 
            'industry_partner_name', 'sdg_mapping', 'ccp_mapping', 'acm_mapping',
            'project_schedule', 'proposal_file', 'submission_count',
            'status', 'status_display', 'submitted_at',
            'supervisor_remarks', 'approved_by_supervisor_name', 'supervisor_reviewed_at',
            'admin_remarks', 'finally_approved_by_name', 'admin_reviewed_at',
            'committee_remarks', 'project_serial_no', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'status', 'submitted_at', 'committee_remarks', 'project_serial_no',
            'submission_count', 'supervisor_remarks', 'admin_remarks',
            'approved_by_supervisor_name', 'finally_approved_by_name',
            'supervisor_reviewed_at', 'admin_reviewed_at'
        ]
    
    def validate(self, data):
        required_fields = ['problem_statement', 'proposed_solution', 'methodology']
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            raise serializers.ValidationError(f"Missing required fields: {', '.join(missing)}")
        if len(data.get('problem_statement', '').split()) > 100:
            raise serializers.ValidationError({
                'problem_statement': 'Problem statement should be 2-3 lines (max 100 words)'
            })
        return data


class FYDPProposalUploadSerializer(serializers.ModelSerializer):
    """
    Serializer specifically for handling proposal file uploads.
    Validates file type (PDF/DOCX) and size (Max 10MB).
    """
    proposal_file = serializers.FileField(required=True)

    class Meta:
        model = FYDPProposal
        fields = ['proposal_file']

    def validate_proposal_file(self, value):
        # Check file extension
        file_extension = value.name.split('.')[-1].lower()
        allowed_extensions = ['pdf', 'docx']
        
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(
                f"Only {', '.join(allowed_extensions)} files are allowed."
            )
        
        # Check file size (10MB limit)
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError("File size cannot exceed 10MB.")
            
        return value


class FYDPProposalReviewSerializer(serializers.Serializer):
    """
    Serializer for Supervisor and Admin review actions.
    """
    action = serializers.ChoiceField(choices=['approve', 'revision', 'reject'])
    remarks = serializers.CharField(
        required=False, 
        allow_blank=True, 
        max_length=1000,
        help_text="Remarks for the review action"
    )

    def validate(self, data):
        action = data.get('action')
        remarks = data.get('remarks', '').strip()
        
        # If rejecting or asking for revision, remarks should ideally be provided
        if action in ['reject', 'revision'] and not remarks:
            raise serializers.ValidationError({
                'remarks': 'Remarks are required when rejecting or requesting revision.'
            })
            
        return data

# =============================================================================
# CHANGE REQUEST SERIALIZERS
# =============================================================================
class ChangeRequestSerializer(serializers.ModelSerializer):
    change_type_display = serializers.CharField(source='get_change_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    calculated_penalty = serializers.SerializerMethodField()
    
    class Meta:
        model = ChangeRequest
        fields = [
            'id', 'group', 'requested_by', 'change_type', 'change_type_display',
            'previous_value', 'new_value', 'reason', 'supervisor_consent', 
            'supervisor_remarks', 'penalty_percentage', 'calculated_penalty', 
            'penalty_applied', 'status', 'status_display', 'submitted_at', 
            'decided_at', 'decision_remarks', 'supporting_document'
        ]
        read_only_fields = ['penalty_percentage', 'submitted_at', 'decided_at']
    
    def get_calculated_penalty(self, obj):
        return obj.calculate_penalty()
    
    def create(self, validated_data):
        change_type = validated_data.get('change_type')
        penalty_map = {'A1': 0.00, 'A2': 5.00, 'B': 10.00, 'C': 10.00, 'D': 0.00}
        validated_data['penalty_percentage'] = penalty_map.get(change_type, 0.00)
        return super().create(validated_data)


# =============================================================================
# UTILITY SERIALIZERS
# =============================================================================
class EligibilityCheckSerializer(serializers.Serializer):
    cgpa = serializers.DecimalField(max_digits=4, decimal_places=2)
    earned_credit_hours = serializers.IntegerField()
    prerequisites_completed = serializers.BooleanField(default=True)
    
    def to_representation(self, instance):
        warnings = []
        if instance['cgpa'] < 2.0:
            warnings.append({
                'field': 'cgpa', 'message': f"CGPA {instance['cgpa']} < 2.0 (Policy 10.b)",
                'severity': 'warning', 'requires_permission': True
            })
        if instance['earned_credit_hours'] < 94:
            raise serializers.ValidationError("Credit hours cannot be below 94 (absolute minimum)")
        elif instance['earned_credit_hours'] < 97:
            warnings.append({
                'field': 'credit_hours', 'message': "2-course deficiency (Dean approval needed)",
                'severity': 'warning', 'requires_permission': True, 'permission_level': 'dean'
            })
        elif instance['earned_credit_hours'] < 100:
            warnings.append({
                'field': 'credit_hours', 'message': "1-course deficiency (HOD approval needed)",
                'severity': 'warning', 'requires_permission': True, 'permission_level': 'hod'
            })
        if not instance['prerequisites_completed']:
            warnings.append({
                'field': 'prerequisites', 'message': 'Prerequisites not completed',
                'severity': 'warning', 'requires_permission': True
            })
        return {'warnings': warnings, 'can_register': instance['earned_credit_hours'] >= 94}


# =============================================================================
# ADMIN APPROVAL SERIALIZERS
# =============================================================================
class AdminProjectGroupSerializer(serializers.ModelSerializer):
    members_details = serializers.SerializerMethodField()
    supervisor_details = serializers.SerializerMethodField()
    co_supervisor_details = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectGroup
        fields = '__all__'
        read_only_fields = ['group_id', 'group_number', 'approved_at', 'approved_by']
    
    def get_members_details(self, obj):
        members = obj.members.select_related('student').all()
        return [
            {
                'id': m.student.id, 'email': m.student.email,
                'full_name': m.student.get_full_name() if hasattr(m.student, 'get_full_name') else m.student.email,
                'student_id': m.student.student_id, 'role': m.role,
                'cgpa': m.cgpa, 'credit_hours': m.earned_credit_hours,
            } for m in members
        ]
    
    def get_supervisor_details(self, obj):
        if obj.supervisor:
            return {'id': obj.supervisor.id, 'name': obj.supervisor.full_name, 
                    'email': obj.supervisor.email, 'designation': obj.supervisor.designation}
        return None
    
    def get_co_supervisor_details(self, obj):
        if obj.co_supervisor:
            return {'id': obj.co_supervisor.id, 'name': obj.co_supervisor.full_name, 
                    'email': obj.co_supervisor.email}
        return None
    
    def get_created_by(self, obj):
        lead = obj.members.filter(role='lead').first()
        if lead:
            return {'id': lead.student.id, 'email': lead.student.email}
        return None


class AdminApprovalSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True, max_length=500)
    group_number_override = serializers.CharField(required=False, max_length=20)
    
    def validate(self, data):
        if data.get('action') == 'reject' and not data.get('rejection_reason', '').strip():
            raise serializers.ValidationError({'rejection_reason': 'Rejection reason is required when rejecting a group'})
        return data
    


# =============================================================================
# MEETING MINUTES SERIALIZERS
# =============================================================================

class AttendanceLogSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    student = serializers.IntegerField(source='student.id', read_only=True)  # Database ID
    
    class Meta:
        model = AttendanceLog
        fields = ['id', 'student', 'student_name', 'student_id', 'status', 'marked_at']
        read_only_fields = ['marked_at']


class MeetingMinuteSerializer(serializers.ModelSerializer):
    """
    Meeting minutes with nested attendance records.
    """
    attendance_records = AttendanceLogSerializer(many=True, read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.full_name', read_only=True)
    
    class Meta:
        model = MeetingMinute
        fields = [
            'id', 'group', 'supervisor', 'supervisor_name',
            'meeting_number', 'date', 'agenda',
            'previous_task_status', 'previous_task_comment',
            'new_task', 'status', 'submitted_at', 'updated_at',
            'attendance_records'
        ]
        read_only_fields = ['submitted_at', 'updated_at']
    
    def create(self, validated_data):
        # Auto-set supervisor from request user
        request = self.context.get('request')
        if request and hasattr(request.user, 'faculty_profile'):
            validated_data['supervisor'] = request.user.faculty_profile
        return super().create(validated_data)


class MeetingMinuteCreateUpdateSerializer(serializers.ModelSerializer):
    attendance = serializers.DictField(
        child=serializers.ChoiceField(choices=['present', 'absent']),
        write_only=True,
        required=False
    )
    supervisor = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = MeetingMinute
        fields = [
            'meeting_number', 'date', 'agenda',
            'previous_task_status', 'previous_task_comment',
            'new_task', 'attendance', 'supervisor'
        ]
    
    def create(self, validated_data):
        attendance_data = validated_data.pop('attendance', {})
        
        # Supervisor auto-set
        request = self.context.get('request')
        if request and hasattr(request.user, 'faculty_profile'):
            validated_data['supervisor'] = request.user.faculty_profile
        
        meeting = MeetingMinute.objects.create(**validated_data)
        
        group = meeting.group
        
        # ✅ UPDATED: Handle BOTH Database ID (int) and Odoo ID (string)
        for student_key, status in attendance_data.items():
            try:
                student = None
                # Check if key is an integer (Database ID)
                if str(student_key).isdigit():
                    student = CustomUser.objects.get(id=student_key)
                else:
                    # If not integer, assume Odoo ID
                    student = CustomUser.objects.get(student_id=student_key)
                
                if student:
                    AttendanceLog.objects.create(
                        meeting=meeting,
                        student=student,
                        status=status
                    )
            except CustomUser.DoesNotExist:
                print(f"⚠️ Student with key {student_key} not found")
                pass
        
        return meeting
    
    def update(self, instance, validated_data):
        attendance_data = validated_data.pop('attendance', None)
        
        # Update meeting fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # ✅ UPDATED: Update/Delete and Re-create Attendance
        if attendance_data is not None:
            # Delete old records for this meeting to avoid duplicates/conflicts
            instance.attendance_records.all().delete()
            
            for student_key, status in attendance_data.items():
                try:
                    student = None
                    if str(student_key).isdigit():
                        student = CustomUser.objects.get(id=student_key)
                    else:
                        student = CustomUser.objects.get(student_id=student_key)
                    
                    if student:
                        AttendanceLog.objects.create(
                            meeting=instance,
                            student=student,
                            status=status
                        )
                except CustomUser.DoesNotExist:
                    pass
        
        return instance


class GroupAttendanceSheetSerializer(serializers.Serializer):
    """
    FP-5 Attendance Sheet format - All meetings summary.
    """
    group_id = serializers.UUIDField()
    group_number = serializers.CharField()
    project_title = serializers.CharField()
    supervisor_name = serializers.CharField()
    semester = serializers.CharField()
    fydp_phase = serializers.CharField()
    members = serializers.ListField()
    meetings_summary = serializers.ListField()



# =============================================================================
# ANNOUNCEMENT SERIALIZERS
# =============================================================================
class AnnouncementSerializer(serializers.ModelSerializer):
    """Serializer for Announcement model - Public read access"""
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    is_current = serializers.ReadOnlyField()
    
    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'content', 'priority', 'priority_display',
            'is_active', 'is_current', 'start_date', 'end_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class AnnouncementCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating announcements (Admin only)"""
    
    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'content', 'priority', 'is_active',
            'start_date', 'end_date'
        ]
    
    def validate(self, data):
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date'
            })
        
        return data
    




# =============================================================================
# PROJECT REPORT SUBMISSION SERIALIZERS
# =============================================================================
class ProjectReportSubmissionSerializer(serializers.ModelSerializer):
    """
    Serializer for Project Report Submission.
    Includes all fields for frontend display.
    """
    group_number = serializers.CharField(source='group.group_number', read_only=True)
    project_title = serializers.CharField(source='group.project_title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Read-only fields for frontend display
    submission_count = serializers.IntegerField(read_only=True)
    is_late = serializers.BooleanField(read_only=True)
    supervisor_remarks = serializers.CharField(read_only=True)
    admin_remarks = serializers.CharField(read_only=True)
    approved_by_supervisor_name = serializers.CharField(
        source='approved_by_supervisor.full_name', read_only=True, default=None
    )
    finally_approved_by_name = serializers.CharField(
        source='finally_approved_by.full_name', read_only=True, default=None
    )
    
    # Plagiarism fields
    internal_similarity_score = serializers.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        read_only=True
    )
    turnitin_similarity_score = serializers.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        read_only=True
    )
    plagiarism_check_completed = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = ProjectReportSubmission
        fields = [
            'id', 'group', 'group_number', 'project_title',
            'report_file', 'submission_count', 'status', 'status_display',
            'submitted_at', 'is_late', 'late_reason',
            'supervisor_remarks', 'approved_by_supervisor_name', 'supervisor_reviewed_at',
            'admin_remarks', 'finally_approved_by_name', 'admin_reviewed_at',
            'internal_similarity_score', 'internal_similarity_report',
            'turnitin_similarity_score', 'plagiarism_check_completed',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'status', 'submitted_at', 'submission_count', 'is_late',
            'supervisor_remarks', 'admin_remarks',
            'approved_by_supervisor_name', 'finally_approved_by_name',
            'supervisor_reviewed_at', 'admin_reviewed_at',
            'internal_similarity_score', 'internal_similarity_report',
            'turnitin_similarity_score', 'plagiarism_check_completed'
        ]


class ProjectReportUploadSerializer(serializers.ModelSerializer):
    """
    Serializer specifically for handling report file uploads.
    Validates file type (PDF/DOCX) and size (Max 20MB).
    """
    report_file = serializers.FileField(required=True)

    class Meta:
        model = ProjectReportSubmission
        fields = ['report_file']

    def validate_report_file(self, value):
        # Check file extension
        file_extension = value.name.split('.')[-1].lower()
        allowed_extensions = ['pdf', 'docx']
        
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(
                f"Only {', '.join(allowed_extensions)} files are allowed."
            )
        
        # Check file size (20MB limit)
        max_size = 20 * 1024 * 1024  # 20MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError("File size cannot exceed 20MB.")
            
        return value


class ProjectReportReviewSerializer(serializers.Serializer):
    """
    Serializer for Supervisor and Admin review actions.
    """
    action = serializers.ChoiceField(choices=['approve', 'revision', 'reject'])
    remarks = serializers.CharField(
        required=False, 
        allow_blank=True, 
        max_length=1000,
        help_text="Remarks for the review action"
    )

    def validate(self, data):
        action = data.get('action')
        remarks = data.get('remarks', '').strip()
        
        # If rejecting or asking for revision, remarks should ideally be provided
        if action in ['reject', 'revision'] and not remarks:
            raise serializers.ValidationError({
                'remarks': 'Remarks are required when rejecting or requesting revision.'
            })
            
        return data


class ReportDeadlineSerializer(serializers.ModelSerializer):
    """
    Serializer for Report Deadline management (Admin only).
    """
    is_active = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    fydp_phase_display = serializers.CharField(source='get_fydp_phase_display', read_only=True)
    
    class Meta:
        model = ReportDeadline
        fields = [
            'id', 'semester', 'fydp_phase', 'fydp_phase_display',
            'deadline_date', 'late_submission_allowed',
            'is_active', 'is_expired', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']