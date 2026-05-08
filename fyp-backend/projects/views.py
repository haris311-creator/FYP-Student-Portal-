from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from accounts.models import CustomUser 

from .models import ProjectGroup, GroupMember, Faculty, FYDPProposal, ChangeRequest
from .serializers import (
    FacultyListSerializer,
    GroupMemberSerializer,
    ProjectGroupSerializer,
    GroupCreateSerializer,
    FYDPProposalSerializer,
    ChangeRequestSerializer
)
from .permissions import IsStudent, IsGroupMemberOrReadOnly


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
        # 1. Data ko alag karo
        members_data = request.data.pop('members', [])
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 2. Group save karo
        self.perform_create(serializer)
        group = serializer.instance
        
        # 3. Members ko process karo
        member_errors = []
        for idx, member_data in enumerate(members_data):
            # ✅ CHANGED: odoo_id ki jagah student_id use karo
            # Frontend se jo 'odoo_id' aa raha hai, wo actually student_id hai
            user_odoo_id = member_data.get('odoo_id')
            
            # User ko dhoondo (student_id field se)
            user = CustomUser.objects.filter(student_id=user_odoo_id).first()
            
            if not user:
                member_errors.append({
                    "index": idx,
                    "error": f"User with ID {user_odoo_id} not found in database."
                })
                continue
            
            # GroupMember create karo
            try:
                GroupMember.objects.create(
                    group=group,
                    student=user,
                    role=member_data.get('role', 'member'),
                    full_name=member_data.get('full_name'),
                    odoo_id=member_data.get('odoo_id'),  # Ye save kar rahe hain GroupMember mein
                    cgpa=member_data.get('cgpa'),
                    earned_credit_hours=member_data.get('earned_credit_hours'),
                    prerequisites_completed=member_data.get('prerequisites_completed', True),
                    has_special_permission=member_data.get('has_special_permission', False)
                )
            except Exception as e:
                member_errors.append({"index": idx, "error": str(e)})

        # 4. Agar koi member error hai, toh Group delete karke error return karo
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
        # 1. Members data alag karo
        members_data = request.data.pop('members', [])
        
        # 2. Group validate & save karo
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        group = serializer.instance
        
        # 3. Members process karo
        member_errors = []
        for idx, member_data in enumerate(members_data):
            # ✅ FIX: Frontend se 'odoo_id' aa raha hai, lekin DB mein filter 'student_id' se hoga
            user_input_id = member_data.get('odoo_id')
            user = CustomUser.objects.filter(student_id=user_input_id).first()
            
            if not user:
                member_errors.append({
                    "index": idx,
                    "error": f"User '{user_input_id}' not found. Check if student_id matches database."
                })
                continue
            
            # ✅ GroupMember create karo
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

        # 4. Agar koi error hai, toh Group delete karke response do
        if member_errors:
            group.delete()
            return Response({"member_errors": member_errors}, status=status.HTTP_400_BAD_REQUEST)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    # ✅ CORRECT INDENTATION: @action class level par hai
    @action(detail=False, methods=['get'])
    def my_group(self, request):
        """Get current user's group"""
        user = request.user
        member = GroupMember.objects.filter(student=user).first()
        
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