from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Avg
from .models import (
    EvaluationCriteria,
    SessionalEvaluation,
    MeetingLogEvaluation,
    ReportEvaluation,
    PresentationEvaluation,
    FinalEvaluationResult,
)
from .serializers import (
    EvaluationCriteriaSerializer,
    SessionalEvaluationSerializer,
    MeetingLogEvaluationSerializer,
    ReportEvaluationSerializer,
    PresentationEvaluationSerializer,
    PublicPresentationEvaluationSerializer,
    FinalEvaluationResultSerializer,
)
from projects.models import ProjectGroup, GroupMember


class IsAdminOrSupervisor(permissions.BasePermission):
    """
    Allow access to admin, supervisor, and committee (read-only for committee)
    """
    def has_permission(self, request, view):
        # Read operations (GET, HEAD, OPTIONS) - committee ko bhi allow karo
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated and (
                request.user.user_type in ['admin', 'supervisor', 'committee']
            )
        # Write operations (POST, PUT, DELETE, PATCH) - sirf admin/supervisor
        return request.user.is_authenticated and (
            request.user.user_type in ['admin', 'supervisor']
        )



class IsAdminOrCommittee(permissions.BasePermission):
    """
    Allow access to admin or committee members.
    Read access also given to supervisor for future use.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.method in permissions.SAFE_METHODS:
            return request.user.user_type in ['admin', 'committee', 'supervisor']
        
        return request.user.user_type in ['admin', 'committee']


class EvaluationCriteriaViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for evaluation criteria (Admin only)
    """
    queryset = EvaluationCriteria.objects.filter(is_active=True)
    serializer_class = EvaluationCriteriaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSupervisor]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        evaluation_type = self.request.query_params.get('type', None)
        if evaluation_type:
            queryset = queryset.filter(evaluation_type=evaluation_type)
        return queryset


class SessionalEvaluationViewSet(viewsets.ModelViewSet):
    """
    Supervisor evaluates students for sessional marks.
    """
    serializer_class = SessionalEvaluationSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSupervisor]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'admin':
            return SessionalEvaluation.objects.all()
        elif user.user_type == 'supervisor':
            return SessionalEvaluation.objects.filter(
                group__supervisor__user=user
            ) | SessionalEvaluation.objects.filter(
                group__co_supervisor__user=user
            )
        elif user.user_type == 'committee':
            #  Committee ko sab groups ke sessional marks dikhao
            return SessionalEvaluation.objects.all()
        return SessionalEvaluation.objects.none()
    
    def perform_create(self, serializer):
        """Auto-set evaluator"""
        serializer.save(evaluator=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_group(self, request):
        """Get all sessional evaluations for a group"""
        group_id = request.query_params.get('group_id')
        if not group_id:
            return Response(
                {'error': 'group_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        evaluations = self.get_queryset().filter(group_id=group_id)
        serializer = self.get_serializer(evaluations, many=True)
        return Response(serializer.data)


class MeetingLogEvaluationViewSet(viewsets.ModelViewSet):
    """
    Committee evaluates meeting logs (group-wise).
    Only ONE evaluation per group allowed.
    """
    serializer_class = MeetingLogEvaluationSerializer
    permission_classes = [IsAuthenticated, IsAdminOrCommittee]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'admin':
            return MeetingLogEvaluation.objects.all()
        elif user.user_type == 'committee':
            #  Committee ko sab groups ke meeting logs dikhao
            return MeetingLogEvaluation.objects.all()
        return MeetingLogEvaluation.objects.filter(evaluator=user)
    
    def create(self, request, *args, **kwargs):
        """
        Override create to update existing evaluation instead of creating duplicate.
        """
        group_id = request.data.get('group')
        
        # Check if evaluation already exists for this group
        existing_eval = MeetingLogEvaluation.objects.filter(group_id=group_id).first()
        
        if existing_eval:
            # Update existing evaluation
            serializer = self.get_serializer(existing_eval, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # Create new evaluation
            return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        serializer.save(evaluator=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(evaluator=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_group(self, request):
        """Get meeting log evaluations for a group"""
        group_id = request.query_params.get('group_id')
        if not group_id:
            return Response(
                {'error': 'group_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        evaluations = self.get_queryset().filter(group_id=group_id)
        serializer = self.get_serializer(evaluations, many=True)
        return Response(serializer.data)


class ReportEvaluationViewSet(viewsets.ModelViewSet):
    """
    Committee evaluates project reports (group-wise).
    - Admin and Committee can view and evaluate
    - Supervisor can only view (read-only, for future use)
    - One evaluation per group (update allowed, no duplicates)
    """
    serializer_class = ReportEvaluationSerializer
    permission_classes = [IsAuthenticated, IsAdminOrCommittee]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.user_type == 'admin':
            return ReportEvaluation.objects.all().select_related(
                'group', 'evaluator', 'report_submission'
            )
        elif user.user_type == 'committee':
            return ReportEvaluation.objects.all().select_related(
                'group', 'evaluator', 'report_submission'
            )
        elif user.user_type == 'supervisor':
            return ReportEvaluation.objects.filter(
                group__supervisor__user=user
            ).select_related('group', 'evaluator', 'report_submission')
        
        return ReportEvaluation.objects.none()
    
    def create(self, request, *args, **kwargs):
        """
        Override create to prevent duplicate evaluations per group.
        If evaluation already exists for this group, update it instead of creating new one.
        """
        group_id = request.data.get('group')
        
        if group_id:
            existing_eval = ReportEvaluation.objects.filter(group_id=group_id).first()
            
            if existing_eval:
                serializer = self.get_serializer(
                    existing_eval,
                    data=request.data,
                    partial=True,
                    context={'request': request}
                )
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)
                
                return Response(
                    {
                        'message': 'Report evaluation updated successfully',
                        'data': serializer.data
                    },
                    status=status.HTTP_200_OK
                )
        
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        serializer.save(evaluator=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(evaluator=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_group(self, request):
        """Get report evaluations for a group"""
        group_id = request.query_params.get('group_id')
        if not group_id:
            return Response(
                {'error': 'group_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        evaluations = self.get_queryset().filter(group_id=group_id)
        serializer = self.get_serializer(evaluations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def group_status(self, request):
        """
        Check if a group has been evaluated.
        Useful for showing status on dashboard cards.
        """
        group_id = request.query_params.get('group_id')
        if not group_id:
            return Response(
                {'error': 'group_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        evaluation = ReportEvaluation.objects.filter(group_id=group_id).first()
        
        if evaluation:
            return Response({
                'evaluated': True,
                'evaluator': evaluation.evaluator_name,
                'final_marks': float(evaluation.final_marks),
                'raw_total': float(evaluation.raw_total),
                'evaluated_at': evaluation.evaluated_at.isoformat()
            })
        
        return Response({
            'evaluated': False,
            'evaluator': None,
            'final_marks': None,
            'raw_total': None,
            'evaluated_at': None
        })


class PresentationEvaluationViewSet(viewsets.ModelViewSet):
    """
    Multiple evaluators evaluate presentations.
    - Admin/Committee can evaluate from portal
    - External evaluators use public token-based links
    """
    serializer_class = PresentationEvaluationSerializer
    permission_classes = [IsAuthenticated, IsAdminOrCommittee]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'admin':
            return PresentationEvaluation.objects.all().select_related('group')
        elif user.user_type == 'committee':
            return PresentationEvaluation.objects.filter(
                models.Q(evaluator=user) | models.Q(evaluator_type='external')
            ).select_related('group')
        return PresentationEvaluation.objects.filter(evaluator=user)
    
    def perform_create(self, serializer):
        # Auto-set evaluator if logged in user
        if self.request.user.is_authenticated:
            serializer.save(
                evaluator=self.request.user,
                evaluator_type='committee'
            )
        else:
            serializer.save(evaluator_type='external')
    
    @action(detail=False, methods=['get'])
    def by_group(self, request):
        """Get all presentation evaluations for a group"""
        group_id = request.query_params.get('group_id')
        if not group_id:
            return Response(
                {'error': 'group_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        evaluations = self.get_queryset().filter(
            group_id=group_id,
            is_submitted=True
        )
        serializer = self.get_serializer(evaluations, many=True)
        
        # Calculate scaled marks
        total_evaluators = evaluations.count()
        
        if total_evaluators > 0:
            # Sum all presentation marks
            total_presentation = sum(
                float(e.presentation_raw_total) for e in evaluations
            )
            
            # Sum all viva marks per student
            all_viva_marks = {}
            for evaluation in evaluations:
                for student_id, marks in evaluation.viva_marks.items():
                    if student_id not in all_viva_marks:
                        all_viva_marks[student_id] = []
                    all_viva_marks[student_id].append(marks)
            
            # Calculate averages
            avg_presentation = total_presentation / total_evaluators
            avg_viva = {
                student_id: sum(marks_list) / len(marks_list)
                for student_id, marks_list in all_viva_marks.items()
            }
            
            # Calculate scaled marks
            # If 1 evaluator: max 55, if 2 evaluators: max 110
            max_possible = 55 * total_evaluators
            total_obtained = total_presentation + sum(sum(marks) for marks in all_viva_marks.values())
            
            scaled_marks = (total_obtained / max_possible) * 40
            
            return Response({
                'count': total_evaluators,
                'results': serializer.data,
                'summary': {
                    'total_evaluators': total_evaluators,
                    'average_presentation': round(avg_presentation, 2),
                    'average_viva': {k: round(v, 2) for k, v in avg_viva.items()},
                    'total_obtained': round(total_obtained, 2),
                    'max_possible': max_possible,
                    'scaled_marks': round(scaled_marks, 2)
                }
            })
        
        return Response({
            'count': 0,
            'results': [],
            'summary': None
        })
    
    @action(detail=False, methods=['post'])
    def generate_token(self, request):
        """
        Generate unique evaluation token for external evaluator
        """
        from django.shortcuts import get_object_or_404
        from projects.models import ProjectGroup
        
        group_id = request.data.get('group_id')
        if not group_id:
            return Response(
                {'error': 'group_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            group = ProjectGroup.objects.get(id=group_id)
        except ProjectGroup.DoesNotExist:
            return Response(
                {'error': 'Group not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
       
        evaluation = PresentationEvaluation.objects.create(
            group=group,
            evaluator=None,
            evaluator_type='external',
            evaluator_name='External Evaluator',
            presentation_raw_total=0,           
            viva_marks={},                       
            presentation_criteria_marks={},      
            total_raw=0,                         
            is_submitted=False
        )
        
        
        token = str(evaluation.evaluation_token)
        
        
        frontend_url = "http://localhost:5173"
        evaluation_link = f"{frontend_url}/evaluate/{token}"
        
        return Response({
            'token': token,
            'link': evaluation_link,
            'evaluation_id': evaluation.id,
            'message': 'Evaluation link generated successfully'
        })



class PublicPresentationEvaluationView(APIView):
    """
    Public evaluation endpoint (no authentication required).
    Uses unique token for security.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, token):
        """
        GET /api/evaluations/public/presentation/<token>/
        Get group details for evaluation
        """
        evaluation = get_object_or_404(
            PresentationEvaluation,
            evaluation_token=token
        )
        
        # Check if already submitted
        if evaluation.is_submitted:
            return Response(
                {'error': 'This evaluation link has already been used'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get group members for viva evaluation
        members = GroupMember.objects.filter(group=evaluation.group)
        members_data = [
            {
                'id': member.id,
                'name': f"{member.student.first_name} {member.student.last_name}".strip() or member.student.email or 'Unknown',
                'student_id': member.student.student_id if member.student else member.odoo_id or 'N/A',
                'student_db_id': member.id
            }
            for member in members
        ]
        
        return Response({
            'group': {
            'id': evaluation.group.id,
            'group_number': evaluation.group.group_number or 'N/A',
            'project': evaluation.group.project_title or 'Untitled Project', 
            'project_title': evaluation.group.project_title or 'Untitled Project',
            'name': f"Group {evaluation.group.group_number}" if evaluation.group.group_number else 'Unknown Group',
            'supervisor': evaluation.group.supervisor.full_name if evaluation.group.supervisor else 'Not Assigned',
            'phase': evaluation.group.get_fydp_phase_display() if hasattr(evaluation.group, 'get_fydp_phase_display') else evaluation.group.fydp_phase or 'FYP-1',
            'semester': evaluation.group.semester or 'Fall 2024',
            'members': members_data  
        },
        'evaluation_token': str(evaluation.evaluation_token)
        })
    
    def post(self, request, token):
        """
        POST /api/evaluations/public/presentation/<token>/
        Submit evaluation
        """
        evaluation = get_object_or_404(
            PresentationEvaluation,
            evaluation_token=token
        )
        
        # Check if already submitted
        if evaluation.is_submitted:
            return Response(
                {'error': 'This evaluation link has already been used'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = PublicPresentationEvaluationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update evaluation
        evaluation.evaluator_name = serializer.validated_data['evaluator_name']
        evaluation.presentation_criteria_marks = serializer.validated_data['presentation_criteria_marks']
        evaluation.presentation_raw_total = serializer.validated_data['presentation_raw_total']
        evaluation.viva_marks = serializer.validated_data['viva_marks']
        evaluation.comments = serializer.validated_data.get('comments', '')
        
        # Calculate total
        viva_total = sum(evaluation.viva_marks.values())
        evaluation.total_raw = evaluation.presentation_raw_total + viva_total
        evaluation.is_submitted = True
        evaluation.save()
        
        return Response({
            'message': 'Evaluation submitted successfully',
            'total_raw': evaluation.total_raw,
            'scaled_marks': round((evaluation.total_raw / 55) * 40, 2)
        }, status=status.HTTP_201_CREATED)



class FinalEvaluationResultViewSet(viewsets.ReadOnlyModelViewSet):
    """
    View final evaluation results (Admin only).
    """
    serializer_class = FinalEvaluationResultSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSupervisor]
    
    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'admin':
            return FinalEvaluationResult.objects.all()
        elif user.user_type == 'supervisor':
            return FinalEvaluationResult.objects.filter(
                group__supervisor__user=user
            ) | FinalEvaluationResult.objects.filter(
                group__co_supervisor__user=user
            )
        return FinalEvaluationResult.objects.none()
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """
        Calculate final marks for all students in a group.
        POST /api/evaluations/final-results/calculate/
        Body: {"group_id": 1}
        """
        group_id = request.data.get('group_id')
        if not group_id:
            return Response(
                {'error': 'group_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        group = get_object_or_404(ProjectGroup, id=group_id)
        members = GroupMember.objects.filter(group=group)
        
        results = []
        for member in members:
            # Get sessional marks
            sessional = SessionalEvaluation.objects.filter(
                group=group, student=member
            ).first()
            sessional_marks = sessional.final_marks if sessional else 0
            
            # Get meeting log marks (group-wise, same for all)
            meeting_log = MeetingLogEvaluation.objects.filter(group=group).first()
            meeting_log_marks = meeting_log.marks if meeting_log else 0
            
            # Get report marks (group-wise, same for all)
            report = ReportEvaluation.objects.filter(group=group).first()
            report_marks = report.final_marks if report else 0
            
            # Get presentation marks (average of all evaluators)
            presentations = PresentationEvaluation.objects.filter(
                group=group, is_submitted=True
            )
            
            if presentations.exists():
                # Average presentation marks
                avg_presentation = presentations.aggregate(
                    Avg('presentation_raw_total')
                )['presentation_raw_total__avg'] or 0
                
                # Average viva marks for this student
                viva_marks_list = []
                for presentation in presentations:
                    viva_marks = presentation.viva_marks.get(str(member.id), 0)
                    viva_marks_list.append(viva_marks)
                
                avg_viva = sum(viva_marks_list) / len(viva_marks_list) if viva_marks_list else 0
                total_raw = avg_presentation + avg_viva
                presentation_marks = (total_raw / 55) * 40
            else:
                presentation_marks = 0
            
            # Create or update final result
            final_result, created = FinalEvaluationResult.objects.update_or_create(
                group=group,
                student=member,
                defaults={
                    'sessional_marks': sessional_marks,
                    'meeting_log_marks': meeting_log_marks,
                    'report_marks': report_marks,
                    'presentation_marks': round(presentation_marks, 2),
                }
            )
            
            # Calculate total
            final_result.calculate_total()
            final_result.save()
            
            results.append(final_result)
        
        serializer = self.get_serializer(results, many=True)
        return Response({
            'message': f'Final marks calculated for {len(results)} students',
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def award_list(self, request):
        """
        GET /api/evaluations/final-results/award_list/
        Get all final results for award list generation
        """
        semester = request.query_params.get('semester')
        fydp_phase = request.query_params.get('fydp_phase', 'fydp1')
        
        queryset = self.get_queryset()
        if semester:
            queryset = queryset.filter(group__semester=semester)
        
        queryset = queryset.filter(group__fydp_phase=fydp_phase)
        
        # Group by project
        groups_data = {}
        for result in queryset:
            group_id = result.group.id
            if group_id not in groups_data:
                groups_data[group_id] = {
                    'group_number': result.group.group_number,
                    'project_title': result.group.project_title,
                    'supervisor': result.group.supervisor.full_name if result.group.supervisor else 'N/A',
                    'students': []
                }
            
            groups_data[group_id]['students'].append({
                'name': result.student.full_name,
                'student_id': result.student.student_id,
                'sessional': float(result.sessional_marks),
                'meeting_log': float(result.meeting_log_marks),
                'report': float(result.report_marks),
                'presentation': float(result.presentation_marks),
                'total': float(result.total_marks),
                'is_passed': result.is_passed
            })
        
        return Response({
            'count': len(groups_data),
            'results': list(groups_data.values())
        })