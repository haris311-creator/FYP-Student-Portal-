from rest_framework import serializers
from .models import ProjectGroup, GroupMember, Faculty, FYDPProposal, ChangeRequest
from django.contrib.auth import get_user_model  # Your custom user model
from django.db import transaction

# Get the custom user model
User = get_user_model()

# =============================================================================
# FACULTY SERIALIZERS
# =============================================================================
class FacultyListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdown - shows ALL faculty"""
    display_name = serializers.SerializerMethodField()
    current_projects_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Faculty
        fields = ['id', 'full_name', 'email', 'designation', 'department', 
                  'display_name', 'current_projects_count', 'research_interests']
    
    def get_display_name(self, obj):
        return f"{obj.full_name} - {obj.get_designation_display()}"


class FacultyDetailSerializer(serializers.ModelSerializer):
    """Detailed faculty profile"""
    class Meta:
        model = Faculty
        fields = '__all__'


# =============================================================================
# GROUP MEMBER SERIALIZERS - With Soft Validation
# =============================================================================
class GroupMemberSerializer(serializers.ModelSerializer):
    """
    Student membership in group.
    Shows warnings but doesn't block (except absolute minimum credit hours).
    """
    student_email = serializers.EmailField(source='student.email', read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    eligibility_warnings = serializers.SerializerMethodField()
    registration_status = serializers.SerializerMethodField()
    
    class Meta:
        model = GroupMember
        fields = [
            'id', 'group', 'student', 'student_email', 'student_name', 
            'full_name', 'odoo_id',  # ✅ NEW FIELDS ADDED HERE
            'role', 'cgpa', 'earned_credit_hours', 'prerequisites_completed',
            'has_special_permission', 'permission_level', 'permission_document',
            'contribution_percentage', 'eligibility_warnings', 'registration_status'
        ]
        read_only_fields = ['eligibility_warnings', 'registration_status']
    
    def get_eligibility_warnings(self, obj):
        """Return warnings for UI display"""
        return obj.get_eligibility_warnings()
    
    def get_registration_status(self, obj):
        """Return if student can register"""
        can_reg, msg = obj.can_register_with_warnings()
        return {
            'allowed': can_reg,
            'message': msg or "Eligible to register",
            'requires_permission': any(w.get('requires_permission') for w in obj.get_eligibility_warnings())
        }
    
    def validate(self, data):
        """Soft validation - allow with warnings"""
        cgpa = data.get('cgpa')
        credit_hours = data.get('earned_credit_hours')
        has_permission = data.get('has_special_permission', False)
        
        # ONLY hard block: credit hours < 94
        if credit_hours < 94:
            raise serializers.ValidationError({
                'earned_credit_hours': 'Credit hours cannot be below 94 (absolute minimum per Policy 10.b)'
            })
        
        # Store warnings for audit
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
    """
    Project group creation and management.
    Students self-coordinate offline, just register here.
    """
    members = GroupMemberSerializer(many=True, read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.full_name', read_only=True)
    member_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectGroup
        fields = [
            'id', 'group_id', 'group_number', 'project_title', 'domain', 
            'status', 'supervisor', 'supervisor_name', 'co_supervisor',
            'semester', 'fydp_phase', 'members', 'member_count',
            'sdg_goals', 'acm_knowledge_areas', 'created_at', 'updated_at'
        ]
        read_only_fields = ['group_id', 'group_number', 'member_count', 'status']
    
    def get_member_count(self, obj):
        return obj.members.count()
    
    def create(self, validated_data):
        """Create group with auto-generated group number"""
        # Generate group number (coordinator can change later)
        semester = validated_data.get('semester', '2026')
        last_group = ProjectGroup.objects.filter(semester=semester).order_by('-id').first()
        
        if last_group and last_group.group_number:
            try:
                last_num = int(last_group.group_number.split('-')[-1])
                new_num = f"GRP-{semester.split()[0]}-{last_num + 1:03d}"
            except:
                new_num = f"GRP-{semester.split()[0]}-001"
        else:
            new_num = f"GRP-{semester.split()[0]}-001"
        
        validated_data['group_number'] = new_num
        validated_data['status'] = 'idea_pitch'
        
        return super().create(validated_data)


class GroupCreateSerializer(serializers.Serializer):
    """
    Combined serializer for creating group + members in one API call.
    """
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
        """Validate member data"""
        if len(members) < 2:
            raise serializers.ValidationError("Group must have at least 2 members")
        
        # Check for duplicate students
        student_ids = [m.get('student') for m in members if m.get('student')]
        if len(student_ids) != len(set(student_ids)):
            raise serializers.ValidationError("Duplicate students in group")
        
        # Validate each member's eligibility
        for i, member in enumerate(members):
            if 'cgpa' not in member or 'earned_credit_hours' not in member:
                raise serializers.ValidationError(f"Member {i+1}: CGPA and credit hours required")
            
            if member['earned_credit_hours'] < 94:
                raise serializers.ValidationError(
                    f"Member {i+1}: Credit hours cannot be below 94"
                )
        
        return members
    
    @transaction.atomic
    def create(self, validated_data):
        """Create group and all members"""
        members_data = validated_data.pop('members')
        
        # Create group
        group = ProjectGroup.objects.create(**validated_data)
        
        # Create members
        for member_data in members_data:
            student_id = member_data.pop('student')
            student = User.objects.get(id=student_id)
            
            GroupMember.objects.create(
                group=group,
                student=student,
                **member_data
            )
        
        return group


# =============================================================================
# FYDP PROPOSAL SERIALIZERS - Digital Form 1
# =============================================================================
class FYDPProposalSerializer(serializers.ModelSerializer):
    """Digital FYDP Proposal Form (Form 1)"""
    group_id = serializers.UUIDField(source='group.group_id', read_only=True)
    project_title = serializers.CharField(source='group.project_title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = FYDPProposal
        fields = [
            'id', 'group', 'group_id', 'project_title',
            'title', 'domain', 'nature_of_project',
            'problem_statement', 'proposed_solution',
            'scope_included', 'scope_excluded',
            'methodology', 'resources_involved',
            'final_deliverables', 'learning_outcomes',
            'industrial_support', 'industry_partner_name',
            'sdg_mapping', 'ccp_mapping', 'acm_mapping',
            'project_schedule',
            'status', 'status_display', 'submitted_at',
            'committee_remarks', 'project_serial_no',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['status', 'submitted_at', 'committee_remarks', 'project_serial_no']
    
    def validate(self, data):
        """Validate required fields"""
        required_fields = ['problem_statement', 'proposed_solution', 'methodology']
        missing = [f for f in required_fields if not data.get(f)]
        
        if missing:
            raise serializers.ValidationError(f"Missing required fields: {', '.join(missing)}")
        
        # Check problem statement length (Policy: 2-3 lines)
        if len(data.get('problem_statement', '').split()) > 100:
            raise serializers.ValidationError({
                'problem_statement': 'Problem statement should be 2-3 lines (max 100 words)'
            })
        
        return data


# =============================================================================
# CHANGE REQUEST SERIALIZERS - Form 3 & 4
# =============================================================================
class ChangeRequestSerializer(serializers.ModelSerializer):
    """Handle project changes with auto-penalty calculation"""
    change_type_display = serializers.CharField(source='get_change_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    calculated_penalty = serializers.SerializerMethodField()
    
    class Meta:
        model = ChangeRequest
        fields = [
            'id', 'group', 'requested_by', 'change_type', 'change_type_display',
            'previous_value', 'new_value', 'reason',
            'supervisor_consent', 'supervisor_remarks',
            'penalty_percentage', 'calculated_penalty', 'penalty_applied',
            'status', 'status_display', 'submitted_at', 'decided_at',
            'decision_remarks', 'supporting_document'
        ]
        read_only_fields = ['penalty_percentage', 'submitted_at', 'decided_at']
    
    def get_calculated_penalty(self, obj):
        """Show calculated penalty based on change type"""
        return obj.calculate_penalty()
    
    def create(self, validated_data):
        """Auto-calculate penalty on creation"""
        change_type = validated_data.get('change_type')
        penalty_map = {
            'A1': 0.00,
            'A2': 5.00,
            'B': 10.00,
            'C': 10.00,
            'D': 0.00,
        }
        validated_data['penalty_percentage'] = penalty_map.get(change_type, 0.00)
        
        return super().create(validated_data)


# =============================================================================
# UTILITY SERIALIZERS
# =============================================================================
class EligibilityCheckSerializer(serializers.Serializer):
    """
    Check eligibility without creating record.
    Returns warnings for frontend display.
    """
    cgpa = serializers.DecimalField(max_digits=4, decimal_places=2)
    earned_credit_hours = serializers.IntegerField()
    prerequisites_completed = serializers.BooleanField(default=True)
    
    def to_representation(self, instance):
        warnings = []
        
        if instance['cgpa'] < 2.0:
            warnings.append({
                'field': 'cgpa',
                'message': f"CGPA {instance['cgpa']} < 2.0 (Policy 10.b)",
                'severity': 'warning',
                'requires_permission': True
            })
        
        if instance['earned_credit_hours'] < 94:
            raise serializers.ValidationError("Credit hours cannot be below 94 (absolute minimum)")
        elif instance['earned_credit_hours'] < 97:
            warnings.append({
                'field': 'credit_hours',
                'message': f"2-course deficiency (Dean approval needed)",
                'severity': 'warning',
                'requires_permission': True,
                'permission_level': 'dean'
            })
        elif instance['earned_credit_hours'] < 100:
            warnings.append({
                'field': 'credit_hours',
                'message': f"1-course deficiency (HOD approval needed)",
                'severity': 'warning',
                'requires_permission': True,
                'permission_level': 'hod'
            })
        
        if not instance['prerequisites_completed']:
            warnings.append({
                'field': 'prerequisites',
                'message': 'Prerequisites not completed',
                'severity': 'warning',
                'requires_permission': True
            })
        
        return {
            'warnings': warnings,
            'can_register': instance['earned_credit_hours'] >= 94
        }