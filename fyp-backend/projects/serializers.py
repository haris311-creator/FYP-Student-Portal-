from rest_framework import serializers
from .models import ProjectGroup, GroupMember, Faculty, FYDPProposal, ChangeRequest
from django.contrib.auth import get_user_model
from django.db import transaction

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
# FYDP PROPOSAL SERIALIZERS
# =============================================================================
class FYDPProposalSerializer(serializers.ModelSerializer):
    group_id = serializers.UUIDField(source='group.group_id', read_only=True)
    project_title = serializers.CharField(source='group.project_title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = FYDPProposal
        fields = [
            'id', 'group', 'group_id', 'project_title', 'title', 'domain', 
            'nature_of_project', 'problem_statement', 'proposed_solution',
            'scope_included', 'scope_excluded', 'methodology', 'resources_involved',
            'final_deliverables', 'learning_outcomes', 'industrial_support', 
            'industry_partner_name', 'sdg_mapping', 'ccp_mapping', 'acm_mapping',
            'project_schedule', 'status', 'status_display', 'submitted_at',
            'committee_remarks', 'project_serial_no', 'created_at', 'updated_at'
        ]
        read_only_fields = ['status', 'submitted_at', 'committee_remarks', 'project_serial_no']
    
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