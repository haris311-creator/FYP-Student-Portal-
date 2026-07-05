from rest_framework import serializers
from .models import (
    EvaluationCriteria,
    SessionalEvaluation,
    MeetingLogEvaluation,
    ReportEvaluation,
    PresentationEvaluation,
    FinalEvaluationResult,
)
from projects.models import ProjectGroup, GroupMember


class EvaluationCriteriaSerializer(serializers.ModelSerializer):
    total_max_marks = serializers.ReadOnlyField()
    
    class Meta:
        model = EvaluationCriteria
        fields = '__all__'


class SessionalEvaluationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    group_number = serializers.CharField(source='group.group_number', read_only=True)
    evaluator_name = serializers.CharField(source='evaluator.full_name', read_only=True)

    # ✅ Custom field jo student_id string accept kare
    student = serializers.PrimaryKeyRelatedField(queryset=GroupMember.objects.all())
    
    class Meta:
        model = SessionalEvaluation
        fields = [
            'id', 'group', 'group_number', 'student', 'student_name', 'student_id',
            'evaluator', 'evaluator_name', 'criteria_marks', 'raw_total',
            'final_marks', 'comments', 'evaluated_at', 'updated_at'
        ]
        read_only_fields = ['final_marks', 'evaluated_at', 'updated_at']
    
    def validate(self, data):
        """Validate raw_total and auto-calculate final_marks"""
        raw_total = data.get('raw_total', 0)
        if raw_total < 0 or raw_total > 50:
            raise serializers.ValidationError("Raw total must be between 0 and 50")
        
        # Auto-calculate final marks
        data['final_marks'] = (raw_total / 50) * 20
        return data


class MeetingLogEvaluationSerializer(serializers.ModelSerializer):
    group_number = serializers.CharField(source='group.group_number', read_only=True)
    
    class Meta:
        model = MeetingLogEvaluation
        fields = [
            'id', 'group', 'group_number', 'evaluator', 'evaluator_name',
            'marks', 'comments', 'evaluated_at', 'updated_at'
        ]
        read_only_fields = ['evaluated_at', 'updated_at']
    
    def validate_marks(self, value):
        if value < 0 or value > 10:
            raise serializers.ValidationError("Marks must be between 0 and 10")
        return value


class ReportEvaluationSerializer(serializers.ModelSerializer):
    group_number = serializers.CharField(source='group.group_number', read_only=True)
    
    class Meta:
        model = ReportEvaluation
        fields = [
            'id', 'group', 'group_number', 'report_submission', 'evaluator',
            'evaluator_name', 'criteria_marks', 'raw_total', 'final_marks',
            'comments', 'evaluated_at', 'updated_at'
        ]
        read_only_fields = ['final_marks', 'evaluated_at', 'updated_at']
    
    def validate(self, data):
        raw_total = data.get('raw_total', 0)
        if raw_total < 0 or raw_total > 35:
            raise serializers.ValidationError("Raw total must be between 0 and 35")
        data['final_marks'] = (raw_total / 35) * 30
        return data


class PresentationEvaluationSerializer(serializers.ModelSerializer):
    group_number = serializers.CharField(source='group.group_number', read_only=True)
    evaluator_name_display = serializers.CharField(source='evaluator_name', read_only=True)
    
    class Meta:
        model = PresentationEvaluation
        fields = [
            'id', 'evaluation_token', 'group', 'group_number', 'evaluator',
            'evaluator_name', 'evaluator_name_display', 'evaluator_type',
            'presentation_criteria_marks', 'presentation_raw_total',
            'viva_marks', 'total_raw', 'comments', 'is_submitted',
            'evaluated_at', 'updated_at'
        ]
        read_only_fields = [
            'evaluation_token', 'total_raw', 'evaluated_at', 'updated_at'
        ]
    
    def validate(self, data):
        """Validate presentation and viva marks"""
        presentation_raw = data.get('presentation_raw_total', 0)
        if presentation_raw < 0 or presentation_raw > 50:
            raise serializers.ValidationError({
                'presentation_raw_total': "Must be between 0 and 50"
            })
        
        viva_marks = data.get('viva_marks', {})
        for student_id, marks in viva_marks.items():
            if marks < 0 or marks > 5:
                raise serializers.ValidationError({
                    'viva_marks': f"Viva marks for student {student_id} must be between 0 and 5"
                })
        
        # Auto-calculate total
        viva_total = sum(viva_marks.values()) if viva_marks else 0
        data['total_raw'] = presentation_raw + viva_total
        
        return data


class PublicPresentationEvaluationSerializer(serializers.Serializer):
    """Serializer for public evaluation (no auth required)"""
    evaluator_name = serializers.CharField(max_length=200)
    presentation_criteria_marks = serializers.JSONField()
    presentation_raw_total = serializers.DecimalField(max_digits=5, decimal_places=2)
    viva_marks = serializers.JSONField()
    comments = serializers.CharField(required=False, allow_blank=True)
    
    def validate_presentation_raw_total(self, value):
        if value < 0 or value > 50:
            raise serializers.ValidationError("Must be between 0 and 50")
        return value
    
    def validate_viva_marks(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be a dictionary")
        for student_id, marks in value.items():
            if marks < 0 or marks > 5:
                raise serializers.ValidationError(f"Viva marks must be between 0 and 5")
        return value


class FinalEvaluationResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    group_number = serializers.CharField(source='group.group_number', read_only=True)
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = FinalEvaluationResult
        fields = [
            'id', 'group', 'group_number', 'student', 'student_name', 'student_id',
            'sessional_marks', 'meeting_log_marks', 'report_marks', 'presentation_marks',
            'total_marks', 'is_passed', 'passing_marks', 'status_display',
            'calculated_at', 'updated_at'
        ]
        read_only_fields = [
            'total_marks', 'is_passed', 'calculated_at', 'updated_at'
        ]
    
    def get_status_display(self, obj):
        return "Passed" if obj.is_passed else "Failed"