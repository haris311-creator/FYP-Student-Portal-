"""
Utility functions for Project Report Submission.
Includes internal plagiarism check using cosine similarity.
"""

import os
from django.conf import settings
from PyPDF2 import PdfReader
from docx import Document
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def extract_text_from_pdf(file_path):
    """
    Extract text from PDF file.
    """
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        return ""


def extract_text_from_docx(file_path):
    """
    Extract text from DOCX file.
    """
    try:
        doc = Document(file_path)
        text = ""
        for para in doc.paragraphs:
            text += para.text + "\n"
        return text
    except Exception as e:
        print(f"Error extracting text from DOCX: {str(e)}")
        return ""


def extract_text_from_file(file_path):
    """
    Extract text from file based on extension.
    """
    extension = file_path.split('.')[-1].lower()
    
    if extension == 'pdf':
        return extract_text_from_pdf(file_path)
    elif extension == 'docx':
        return extract_text_from_docx(file_path)
    else:
        return ""


def check_internal_plagiarism(report_submission):
    """
    Check plagiarism internally by comparing with other submitted reports.
    Uses cosine similarity with TF-IDF vectorization.
    
    Returns:
        tuple: (similarity_score, similarity_report)
            - similarity_score: float (0-100)
            - similarity_report: dict with matched groups
    """
    from .models import ProjectReportSubmission
    
    # Get current report's text
    current_file_path = report_submission.report_file.path
    current_text = extract_text_from_file(current_file_path)
    
    if not current_text or len(current_text.strip()) < 100:
        return 0.00, {"message": "Insufficient text for comparison"}
    
    # Get all other approved/submitted reports (exclude current)
    other_reports = ProjectReportSubmission.objects.exclude(
        id=report_submission.id
    ).filter(
        status__in=['submitted', 'approved_by_supervisor', 'approved'],
        report_file__isnull=False
    ).select_related('group')
    
    if not other_reports.exists():
        return 0.00, {"message": "No other reports to compare"}
    
    # Extract texts from all reports
    texts = [current_text]
    report_data = []
    
    for other_report in other_reports:
        other_file_path = other_report.report_file.path
        if os.path.exists(other_file_path):
            other_text = extract_text_from_file(other_file_path)
            if other_text and len(other_text.strip()) > 100:
                texts.append(other_text)
                report_data.append({
                    'id': other_report.id,
                    'group_number': other_report.group.group_number,
                    'project_title': other_report.group.project_title
                })
    
    if len(texts) < 2:
        return 0.00, {"message": "Not enough reports for comparison"}
    
    # Calculate TF-IDF and cosine similarity
    try:
        vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
        tfidf_matrix = vectorizer.fit_transform(texts)
        
        # Calculate similarity between current report (index 0) and all others
        similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        
        # Find maximum similarity
        max_similarity = float(similarities.max()) * 100  # Convert to percentage
        
        # Find all reports with high similarity (>70%)
        high_similarity_matches = []
        threshold = 70.0
        
        for idx, similarity in enumerate(similarities):
            similarity_pct = float(similarity) * 100
            if similarity_pct >= threshold:
                high_similarity_matches.append({
                    'group_number': report_data[idx]['group_number'],
                    'project_title': report_data[idx]['project_title'],
                    'similarity_percentage': round(similarity_pct, 2)
                })
        
        # Sort by similarity (highest first)
        high_similarity_matches.sort(key=lambda x: x['similarity_percentage'], reverse=True)
        
        similarity_report = {
            'total_reports_compared': len(report_data),
            'high_similarity_matches': high_similarity_matches,
            'threshold': threshold
        }
        
        return round(max_similarity, 2), similarity_report
        
    except Exception as e:
        print(f"Error in plagiarism check: {str(e)}")
        return 0.00, {"error": str(e)}