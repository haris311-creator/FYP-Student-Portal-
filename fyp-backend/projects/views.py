# fyp-backend/projects/views.py
from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django.core.exceptions import PermissionDenied
from accounts.models import CustomUser 
from django.db import models
from .models import ProjectGroup, Faculty
from .serializers import ProjectGroupSerializer


from .models import ProjectGroup, GroupMember, Faculty, FYDPProposal, ChangeRequest
from .serializers import (
    FacultyListSerializer,
    GroupMemberSerializer,
    ProjectGroupSerializer,
    GroupCreateSerializer,
    FYDPProposalSerializer,
    ChangeRequestSerializer,
    AdminProjectGroupSerializer,
    AdminApprovalSerializer,
)
from .permissions import IsStudent, IsGroupMemberOrReadOnly, IsAdminUser


# =============================================================================
# 1. FACULTY LIST - Dropdown ke liye (Read Only)
# =============================================================================
class FacultyViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Show ALL active faculty. No filtering/blocking."""
    queryset = Faculty.objects.filter(is_active=True)
    serializer_class = FacultyListSerializer
    permission_classes = [IsAuthenticated]


# =============================================================================
# 2. ELIGIBILITY CHECK - Real-time warning preview
# =============================================================================
class EligibilityCheckView(viewsets.ViewSet):
    """
    POST /api/projects/check-eligibility/
    Body: { "cgpa": 1.8, "earned_credit_hours": 95, "prerequisites_completed": true }
    Returns warnings but does NOT save anything.
    """
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        members_data = request.data.pop('members', [])
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        self.perform_create(serializer)
        group = serializer.instance
        
        member_errors = []
        for idx, member_data in enumerate(members_data):
            user_odoo_id = member_data.get('odoo_id')
            user = CustomUser.objects.filter(student_id=user_odoo_id).first()
            
            if not user:
                member_errors.append({
                    "index": idx,
                    "error": f"User with ID {user_odoo_id} not found in database."
                })
                continue
            
            try:
                GroupMember.objects.create(
                    group=group,
                    student=user,
                    role=member_data.get('role', 'member'),
                    full_name=member_data.get('full_name'),
                    odoo_id=member_data.get('odoo_id'),
                    cgpa=member_data.get('cgpa'),
                    earned_credit_hours=member_data.get('earned_credit_hours'),
                    prerequisites_completed=member_data.get('prerequisites_completed', True),
                    has_special_permission=member_data.get('has_special_permission', False)
                )
            except Exception as e:
                member_errors.append({"index": idx, "error": str(e)})

        if member_errors:
            group.delete()
            return Response({"member_errors": member_errors}, status=status.HTTP_400_BAD_REQUEST)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


# =============================================================================
# 3. PROJECT GROUPS - Creation & Management
# =============================================================================
class ProjectGroupViewSet(viewsets.ModelViewSet):
    queryset = ProjectGroup.objects.all()
    serializer_class = ProjectGroupSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        # ✅ Save members data first
        members_data = request.data.pop('members', [])
        
        # ✅ NO AUTO-DELETE: Rejected groups will stay in database for audit trail
        # Admin can see all rejected groups in history
        
        # 2️⃣ Continue with normal group creation
        request.data['status'] = 'pending_approval'
        request.data.pop('group_number', None)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        group = serializer.instance
        
        print(f"✅ New group created: {group.id}, Status: {group.status}")
        
        # 3️⃣ Create members
        member_errors = []
        for idx, member_data in enumerate(members_data):
            user_input_id = member_data.get('odoo_id')
            user = CustomUser.objects.filter(student_id=user_input_id).first()
            
            if not user:
                member_errors.append({
                    "index": idx,
                    "error": f"User '{user_input_id}' not found."
                })
                continue
            
            GroupMember.objects.create(
                group=group,
                student=user,
                role=member_data.get('role', 'member'),
                full_name=member_data.get('full_name'),
                odoo_id=member_data.get('odoo_id'),
                cgpa=member_data.get('cgpa'),
                earned_credit_hours=member_data.get('earned_credit_hours'),
                prerequisites_completed=member_data.get('prerequisites_completed', True),
                has_special_permission=member_data.get('has_special_permission', False)
            )
            
            print(f"✅ Member {idx+1} added: {user.email}")
        
        if member_errors:
            group.delete()
            return Response({"member_errors": member_errors}, status=status.HTTP_400_BAD_REQUEST)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=False, methods=['get'])
    def my_group(self, request):
        """Get current user's group (EXCLUDE rejected groups)"""
        user = request.user
        
        # ✅ Only return non-rejected groups
        member = GroupMember.objects.filter(
            student=user,
            group__status__in=[
                'pending_approval',
                'idea_pitch',
                'approved',
                'proposal_pending',
                'proposal_approved',
                'in_progress',
                'completed'
            ]
        ).select_related('group').first()
        
        if member:
            serializer = self.get_serializer(member.group)
            return Response(serializer.data)
        
        # No active group found - student can create new one
        return Response(None, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def pending_approval(self, request):
        """
        GET /api/projects/groups/pending_approval/
        For students to see their pending groups
        """
        user = request.user
        pending = ProjectGroup.objects.filter(
            members__student=user,
            status='pending_approval'
        ).prefetch_related('members__student')
        
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='my-group-with-history')
    def my_group_with_history(self, request):
        """
        Get user's latest group (including rejected ones for display)
        This helps show rejection status to students
        """
        user = request.user
        
        # Get ALL groups for this user, ordered by creation date
        member = GroupMember.objects.filter(
            student=user
        ).select_related('group').order_by('-group__created_at').first()
        
        if member:
            serializer = self.get_serializer(member.group)
            return Response(serializer.data)
        
        return Response(None, status=status.HTTP_404_NOT_FOUND)


# =============================================================================
# 4. FYDP PROPOSALS - Digital Form 1
# =============================================================================
class FYDPProposalViewSet(viewsets.ModelViewSet):
    serializer_class = FYDPProposalSerializer
    permission_classes = [IsAuthenticated, IsStudent, IsGroupMemberOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return FYDPProposal.objects.filter(group__members__student=self.request.user)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Move proposal from Draft -> Submitted"""
        proposal = self.get_object()
        if proposal.status != 'draft':
            return Response({"error": "Already submitted"}, status=status.HTTP_400_BAD_REQUEST)
        
        proposal.status = 'submitted'
        proposal.submitted_at = timezone.now()
        proposal.save()
        return Response({"message": "Proposal submitted for committee review"})


# =============================================================================
# 5. CHANGE REQUESTS - Form 3 & 4
# =============================================================================
class ChangeRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ChangeRequestSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return ChangeRequest.objects.filter(requested_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)


# =============================================================================
# ✅ ADMIN APPROVAL VIEWSET - FIXED & COMPLETE
# =============================================================================

class AdminGroupApprovalViewSet(viewsets.ViewSet):
    """
    Admin ke liye group approval system.
    Endpoints:
    - GET /api/projects/admin/approval/pending/
    - GET /api/projects/admin/approval/all/
    - POST /api/projects/admin/approval/{id}/approve/
    - POST /api/projects/admin/approval/{id}/reject/
    - GET /api/projects/admin/approval/{id}/details/
    """
    permission_classes = [IsAuthenticated]
    
    def check_admin_permission(self, request):
        """Check if user is admin"""
        if not hasattr(request.user, 'user_type') or request.user.user_type != 'admin':
            raise PermissionDenied("Only admin users can access this endpoint")
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """GET /api/projects/admin/approval/pending/"""
        self.check_admin_permission(request)
        
        pending_groups = ProjectGroup.objects.filter(
            status='pending_approval'
        ).prefetch_related(
            'members__student',
            'supervisor',
            'co_supervisor'
        ).order_by('-created_at')
        
        serializer = AdminProjectGroupSerializer(pending_groups, many=True)
        return Response({
            'count': pending_groups.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='all')
    def all_groups(self, request):
        """GET /api/projects/admin/approval/all/"""
        self.check_admin_permission(request)
        
        groups = ProjectGroup.objects.all().prefetch_related(
            'members__student',
            'supervisor',
            'co_supervisor'
        ).order_by('-created_at')
        
        # Optional filtering
        status_filter = request.query_params.get('status', None)
        if status_filter:
            groups = groups.filter(status=status_filter)
        
        semester_filter = request.query_params.get('semester', None)
        if semester_filter:
            groups = groups.filter(semester=semester_filter)
        
        paginator = PageNumberPagination()
        paginator.page_size = 20
        result_page = paginator.paginate_queryset(groups, request)
        
        serializer = AdminProjectGroupSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """POST /api/projects/admin/approval/{id}/approve/"""
        self.check_admin_permission(request)
        
        try:
            group = ProjectGroup.objects.select_related(
                'supervisor', 'co_supervisor'
            ).prefetch_related('members__student').get(pk=pk)
        except ProjectGroup.DoesNotExist:
            return Response(
                {'error': 'Group not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if group.status != 'pending_approval':
            return Response(
                {'error': f'Group is not pending approval. Current status: {group.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check for optional group number override
        override_number = request.data.get('group_number_override', None)
        if override_number:
            if ProjectGroup.objects.filter(group_number=override_number).exclude(pk=pk).exists():
                return Response(
                    {'error': 'Group number already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            group.group_number = override_number
        
        # ✅ Approve logic inline (no need for model method)
        group.status = 'idea_pitch'  # Next status after approval
        group.approved_by = request.user
        group.approved_at = timezone.now()
        group.rejection_reason = None
        
        # Auto-generate group_number if not provided
        if not group.group_number:
            semester = group.semester or '2026'
            year = semester.split()[0] if semester else '2026'
            last_group = ProjectGroup.objects.filter(
                semester=semester,
                group_number__isnull=False,
                group_number__startswith=f'GRP-{year}'
            ).order_by('-group_number').first()
            
            if last_group and last_group.group_number:
                try:
                    last_num = int(last_group.group_number.split('-')[-1])
                    group.group_number = f"GRP-{year}-{last_num + 1:03d}"
                except:
                    group.group_number = f"GRP-{year}-001"
            else:
                group.group_number = f"GRP-{year}-001"
        
        group.save()
        
        serializer = AdminProjectGroupSerializer(group)
        return Response({
            'message': f'Group {group.group_number} approved successfully!',
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """POST /api/projects/admin/approval/{id}/reject/"""
        self.check_admin_permission(request)
        
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response(
                {'error': 'Rejection reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            group = ProjectGroup.objects.get(pk=pk)
        except ProjectGroup.DoesNotExist:
            return Response(
                {'error': 'Group not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if group.status not in ['pending_approval']:
            return Response(
                {'error': f'Group cannot be rejected. Current status: {group.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ✅ Reject logic inline
        group.status = 'rejected'
        group.rejection_reason = reason
        group.approved_by = request.user
        group.approved_at = timezone.now()
        group.save()
        
        serializer = AdminProjectGroupSerializer(group)
        return Response({
            'message': 'Group rejected',
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """GET /api/projects/admin/approval/{id}/details/"""
        self.check_admin_permission(request)
        
        try:
            group = ProjectGroup.objects.select_related(
                'supervisor', 'co_supervisor'
            ).prefetch_related('members__student').get(pk=pk)
        except ProjectGroup.DoesNotExist:
            return Response(
                {'error': 'Group not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = AdminProjectGroupSerializer(group)
        return Response(serializer.data)


# fyp-backend/projects/views.py - Replace the entire SupervisorGroupViewSet with this:

# =============================================================================
# ✅ SUPERVISOR DASHBOARD VIEWSET - FIXED (Using GenericViewSet)
# =============================================================================
class SupervisorGroupViewSet(viewsets.GenericViewSet):
    """
    Supervisor ke liye assigned groups fetch karne ka endpoint.
    Endpoint: GET /api/projects/groups/supervisor/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ProjectGroupSerializer  # Add this line

    def list(self, request):
        """GET /api/projects/groups/supervisor/"""

        user = request.user
        
        # Check if user is supervisor
        if user.user_type != 'supervisor':
            return Response(
                {'error': 'Only supervisors can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get Faculty profile linked to this user
        try:
            faculty = Faculty.objects.get(user=user)
        except Faculty.DoesNotExist:
            return Response(
                {'error': 'Faculty profile not found for this user'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Fetch groups where this faculty is supervisor OR co-supervisor
        groups = ProjectGroup.objects.filter(
            models.Q(supervisor=faculty) | models.Q(co_supervisor=faculty),
            status__in=['idea_pitch', 'proposal_pending', 'proposal_approved', 
                       'in_progress', 'completed']
        ).prefetch_related(
            'members__student',
            'supervisor',
            'co_supervisor'
        ).order_by('-created_at')
        
        serializer = self.get_serializer(groups, many=True, context={'request': request})
        
        return Response({
            'count': groups.count(),
            'results': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """GET /api/projects/groups/supervisor/{id}/members/"""
        try:
            group = ProjectGroup.objects.prefetch_related('members__student').get(pk=pk)
        except ProjectGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Verify supervisor access
        faculty = Faculty.objects.filter(user=request.user).first()
        if not faculty or (group.supervisor != faculty and group.co_supervisor != faculty):
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        members_data = []
        for member in group.members.all():
            members_data.append({
                'id': member.id,
                'full_name': member.full_name or member.student.get_full_name(),
                'email': member.student.email,
                'student_id': member.student.student_id,
                'role': member.role,
                'cgpa': float(member.cgpa),
                'credit_hours': member.earned_credit_hours,
                'contribution': member.contribution_percentage
            })
        
        return Response({'members': members_data})