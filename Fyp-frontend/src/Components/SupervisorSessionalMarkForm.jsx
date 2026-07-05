import React, { useState, useEffect  } from 'react';
import { evaluationAPI } from '../utils/api';
import './SupervisorSessionalMarkForm.css';

/**
 * Rubric data for sessional evaluation
 * Contains 4 criteria with weights, max marks, and descriptions for 1-5 scale
 */
const rubricData = [
  {
    sno: 1,
    criteria: 'Project Introduction & Literature Review',
    clo: 'CLO2',
    ga: 'GA3: Problem Analysis',
    weight: 2,
    maxMarks: 10,
    descriptions: {
      1: 'Unclear, lacks objectives and background. No citations, weak sources.',
      2: 'Weak objectives, vague background, minimal references.',
      3: 'Basic objectives, some relevant sources, need better structure.',
      4: 'Clear objectives, well-organized background, mostly relevant literature.',
      5: 'Well-structured, strong objectives, comprehensive and properly cited literature.'
    }
  },
  {
    sno: 2,
    criteria: 'Use Cases, ERD, and Prototyping',
    clo: 'CLO3',
    ga: 'GA4: Design/Development of Solution',
    weight: 4,
    maxMarks: 20,
    descriptions: {
      1: 'No diagrams or incorrect structure.',
      2: 'Minimal use cases, weak ERD, and prototype lacks usability.',
      3: 'Basic use cases, partially correct ERD, prototype missing details.',
      4: 'Clear use cases, mostly correct ERD, functional prototype with minor issues.',
      5: 'Comprehensive use cases, well-structured ERD, detailed and user-friendly prototype.'
    }
  },
  {
    sno: 3,
    criteria: 'Proposed Budgeting',
    clo: 'CLO6',
    ga: 'GA8: Computing Professionalism and Society',
    weight: 2,
    maxMarks: 10,
    descriptions: {
      1: 'No justification, unrealistic estimates.',
      2: 'Weak justification, inconsistent costs.',
      3: 'Some realistic estimates but lacks refinement.',
      4: 'Well-researched costs, mostly well-structured.',
      5: 'Highly accurate, well-documented budgeting with clear justifications.'
    }
  },
  {
    sno: 4,
    criteria: 'Business Canvas Model',
    clo: 'CLO6',
    ga: 'GA8: Computing Professionalism and Society',
    weight: 2,
    maxMarks: 10,
    descriptions: {
      1: 'Missing most components, lacks structure.',
      2: 'Few components covered, minimal feasibility.',
      3: 'Some feasibility, lacks strong uniqueness.',
      4: 'Well-structured, feasible with minor innovation.',
      5: 'Comprehensive, innovative, and highly feasible model.'
    }
  }
];

/**
 * SupervisorSessionalMarkForm Component
 * Allows supervisors to evaluate individual students for sessional marks
 * Each student is evaluated separately with different marks possible
 */
const SupervisorSessionalMarkForm = ({ group, onClose }) => {

  // State for tracking which student tab is currently active
  const [activeStudent, setActiveStudent] = useState(0);
  
  // State for showing/hiding rubric reference table
  const [showRubric, setShowRubric] = useState(false);
  
  // State for tracking submission process
  const [submitting, setSubmitting] = useState(false);
  
  // State for storing error messages
  const [error, setError] = useState('');

  // Track kya har student ki marking pehle se ho chuki hai
  const [submittedStatus, setSubmittedStatus] = useState({});
  const [loadingExisting, setLoadingExisting] = useState(true);

  /**
   * Initialize marks structure for a student
   * Creates empty structure for selections, manual marks, and comments
   * 
   * @returns {Object} Initial marks structure with selections, manualMarks, and comments
   */
  const initStudentMarks = () => ({
    selections: { 0: null, 1: null, 2: null, 3: null },
    manualMarks: { 0: '', 1: '', 2: '', 3: '' },
    comments: ''
  });

  // Initialize marks state for all students in the group
  const [studentMarks, setStudentMarks] = useState(
    group?.members?.map(() => initStudentMarks()) || []
  );

  // Form khulte hi existing marks fetch karein taake dobara submit na ho jaye
  useEffect(() => {
  const fetchExistingMarks = async () => {
    if (!group?.id) {
      setLoadingExisting(false);
      return;
    }

    try {
      const response = await evaluationAPI.getSessionalByGroup(group.id);
      const existingEvaluations = response.data;


      const newStudentMarks = [...studentMarks];
      const newSubmittedStatus = {};

      existingEvaluations.forEach(evalRecord => {
        // Match karein evaluation ka student ID group.members ke student_db_id se
        const studentIdx = group.members.findIndex(
          m => m.student_db_id === evalRecord.student
        );

        if (studentIdx !== -1) {
          // Selections rebuild karein criteria_marks se
          const selections = {};
          const manualMarks = {};

          Object.entries(evalRecord.criteria_marks || {}).forEach(([key, value]) => {
            const cIdx = parseInt(key);
            const maxMarks = rubricData[cIdx]?.maxMarks || 10;
            manualMarks[cIdx] = value.toString();
            selections[cIdx] = Math.round((value / maxMarks) * 5) || null;
          });

          newStudentMarks[studentIdx] = {
            selections,
            manualMarks,
            comments: evalRecord.comments || ''
          };

          // Is student ki submission ID save karein (update ke liye chahiye hogi)
          newSubmittedStatus[studentIdx] = evalRecord.id;
        }
      });

      setStudentMarks(newStudentMarks);
      setSubmittedStatus(newSubmittedStatus);
    } catch (err) {
      console.error('Error fetching existing marks:', err);
    } finally {
      setLoadingExisting(false);
    }
  };

  fetchExistingMarks();
}, [group?.id]);

  /**
   * Handle radio button selection for performance level (1-5)
   * Automatically calculates marks based on selected level
   * 
   * @param {number} studentIdx - Index of the student in the group
   * @param {number} criteriaIdx - Index of the criteria being evaluated
   * @param {number} value - Selected performance level (1-5)
   */
  const handleRadioSelect = (studentIdx, criteriaIdx, value) => {
    // Create a copy of the current student marks array
    const updated = [...studentMarks];
    
    // Update the selection for this criteria
    updated[studentIdx].selections[criteriaIdx] = value;
    
    // Get maximum marks for this criteria
    const maxMarks = rubricData[criteriaIdx].maxMarks;
    
    // Calculate marks based on performance level (value/5 * maxMarks)
    updated[studentIdx].manualMarks[criteriaIdx] = ((value / 5) * maxMarks).toFixed(1);
    
    // Update state with new values
    setStudentMarks(updated);
  };

  /**
   * Handle manual input for marks
   * Allows supervisor to enter marks directly and auto-calculates performance level
   * 
   * @param {number} studentIdx - Index of the student in the group
   * @param {number} criteriaIdx - Index of the criteria being evaluated
   * @param {string} value - Manually entered marks value
   */
  const handleManualInput = (studentIdx, criteriaIdx, value) => {
    // Create a copy of the current student marks array
    const updated = [...studentMarks];
    
    // Get maximum marks for this criteria
    const maxMarks = rubricData[criteriaIdx].maxMarks;
    
    // Parse the input value to number
    const numVal = parseFloat(value);
    
    // Store the manual input value
    updated[studentIdx].manualMarks[criteriaIdx] = value;
    
    // If valid number within range, calculate corresponding performance level
    if (!isNaN(numVal) && numVal >= 0 && numVal <= maxMarks) {
      const perfLevel = Math.round((numVal / maxMarks) * 5);
      updated[studentIdx].selections[criteriaIdx] = perfLevel || null;
    } else {
      // Clear selection if invalid input
      updated[studentIdx].selections[criteriaIdx] = null;
    }
    
    // Update state with new values
    setStudentMarks(updated);
  };

  /**
   * Handle comment input for a student
   * 
   * @param {number} studentIdx - Index of the student in the group
   * @param {string} value - Comment text entered by supervisor
   */
  const handleCommentChange = (studentIdx, value) => {
    // Create a copy of the current student marks array
    const updated = [...studentMarks];
    
    // Update comments for this student
    updated[studentIdx].comments = value;
    
    // Update state with new values
    setStudentMarks(updated);
  };

  /**
   * Calculate raw total marks for a student (out of 50)
   * Sums all criteria marks entered for the student
   * 
   * @param {number} studentIdx - Index of the student in the group
   * @returns {number} Total raw marks out of 50
   */
  const getRawTotal = (studentIdx) => {
    // Get manual marks for this student, default to empty object if not found
    const marks = studentMarks[studentIdx]?.manualMarks || {};
    
    // Initialize total to 0
    let total = 0;
    
    // Sum all numeric marks values
    Object.values(marks).forEach(m => {
      const num = parseFloat(m);
      if (!isNaN(num)) total += num;
    });
    
    return total;
  };

  /**
   * Calculate final scaled marks for a student (out of 20)
   * Converts raw marks (out of 50) to final marks (out of 20)
   * 
   * @param {number} studentIdx - Index of the student in the group
   * @returns {string} Final marks out of 20 (formatted to 1 decimal place)
   */
  const getFinalMarks = (studentIdx) => {
    // Get raw total for this student
    const raw = getRawTotal(studentIdx);
    
    // Scale from 50 to 20: (raw / 50) * 20
    return ((raw / 50) * 20).toFixed(2);
  };

  /**
   * Validate that all students have marks entered before submission
   * Checks if any student has 0 total marks
   * 
   * @returns {Object} Validation result with valid flag and message
   */
  const validateMarks = () => {
    // Loop through all students in the group
    for (let i = 0; i < group.members.length; i++) {
      // Get raw total for current student
      const rawTotal = getRawTotal(i);
      
      // If any student has 0 marks, return validation error
      if (rawTotal === 0) {
        return { 
          valid: false, 
          message: `Please enter marks for ${group.members[i].name}` 
        };
      }
    }
    
    // All students have marks, validation passed
    return { valid: true };
  };

  /**
   * Handle form submission
   * Validates data and submits sessional marks for each student individually
   * Each student's marks are submitted as a separate API call
   */
  const handleSubmit = async () => {
    // Validate that all students have marks entered
    const validation = validateMarks();
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    // Set submitting state to true to show loading indicator
    setSubmitting(true);
    
    // Clear any previous error messages
    setError('');
    
    try {
      
      const payload = group.members.map((member, idx) => {
        // Convert manualMarks to numeric criteria_marks object
        const criteriaMarksObj = {};
        Object.entries(studentMarks[idx].manualMarks).forEach(([key, value]) => {
          criteriaMarksObj[key] = parseFloat(value) || 0;
        });
        
        return {
          group: group.id,
          student: member.student_db_id,
          criteria_marks: criteriaMarksObj,  
          raw_total: getRawTotal(idx),
          final_marks: parseFloat(getFinalMarks(idx)),
          comments: studentMarks[idx].comments || ''
        };
      });

      // Submit each student's marks individually (student-wise submission)
      // Submit each student's marks individually (student-wise submission)
      const results = [];
      const newSubmittedStatus = { ...submittedStatus };

      for (let i = 0; i < payload.length; i++) {
        const data = payload[i];
        
        
        let response;
        const existingId = submittedStatus[i];

        if (existingId) {
          // NAYA: Pehle se marking mojood hai, to UPDATE (PUT) karein
          response = await evaluationAPI.updateSessional(existingId, data);
        } else {
          // Pehli dafa marking, CREATE (POST) karein
          response = await evaluationAPI.submitSessional(data);
          newSubmittedStatus[i] = response.data.id;
        }
        
        results.push(response.data);
      }

      setSubmittedStatus(newSubmittedStatus);

      
      // Show success message
      alert('Sessional marks submitted successfully!');
      
      // Close the form modal
      onClose && onClose();
      
    } catch (err) {
      // Log error details for debugging
      console.error('Error submitting marks:', err);
      
      // Extract meaningful error message from response
      let errorMessage = 'Failed to submit marks. Please try again.';
      
      if (err.response?.data) {
        // Handle different error response formats
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.student) {
          errorMessage = `Student Error: ${err.response.data.student}`;
        } else if (err.response.data.group) {
          errorMessage = `Group Error: ${err.response.data.group}`;
        } else if (err.response.data.raw_total) {
          errorMessage = `Marks Error: ${err.response.data.raw_total}`;
        } else {
          // Fallback: stringify the entire error object
          errorMessage = JSON.stringify(err.response.data, null, 2);
        }
      }
      
      // Update error state
      setError(errorMessage);
      
      // Show error alert to user
      alert(`Error:\n${errorMessage}`);
    } finally {
      // Reset submitting state regardless of success or failure
      setSubmitting(false);
    }
  };

  // Get group members array, default to empty array if not available
  const members = group?.members || [];

  return (
    <div className="ssm-container">

      {/* Header section with title and rubric toggle button */}
      <div className="ssm-header">
        <div>
          <h2>Sessional Marks</h2>
          <p>{group?.project || 'Project'} - {group?.name || 'Group'}</p>
        </div>
        <button className="ssm-rubric-btn" onClick={() => setShowRubric(!showRubric)}>
          {showRubric ? 'Hide Rubric' : 'View Rubric'}
        </button>
      </div>

      {/* Rubric Reference Table - Shows detailed descriptions for each performance level */}
      {showRubric && (
        <div className="ssm-rubric-section">
          <h3>Rubric Reference (FYDP-1 Sessional)</h3>
          <div className="ssm-table-wrapper">
            <table className="ssm-rubric-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Criteria</th>
                  <th>CLOs</th>
                  <th>GA</th>
                  <th>Wt.</th>
                  <th>Max</th>
                  <th>1</th>
                  <th>2</th>
                  <th>3</th>
                  <th>4</th>
                  <th>5</th>
                </tr>
              </thead>
              <tbody>
                {rubricData.map((row) => (
                  <tr key={row.sno}>
                    <td className="center">{row.sno}</td>
                    <td><strong>{row.criteria}</strong></td>
                    <td className="center">{row.clo}</td>
                    <td className="small">{row.ga}</td>
                    <td className="center">{row.weight}</td>
                    <td className="center">{row.maxMarks}</td>
                    {[1,2,3,4,5].map(level => (
                      <td key={level} className="desc-cell">{row.descriptions[level]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Tabs - Allows switching between different students in the group */}
      <div className="ssm-student-tabs">
        {members.map((member, idx) => (
          <button
            key={idx}
            className={`ssm-student-tab ${activeStudent === idx ? 'active' : ''}`}
            onClick={() => setActiveStudent(idx)}
          >
            <span className="ssm-avatar">{member.name?.charAt(0).toUpperCase()}</span>
            <span>{member.name}</span>
            {submittedStatus[idx] && (
              <span style={{ marginLeft: '6px', color: '#16a34a', fontSize: '0.75rem' }}></span>
            )}
          </button>
        ))}
      </div>

      {/* Marks Entry Form - One form per student, shown/hidden based on active tab */}
      {members.map((member, sIdx) => (
        <div key={sIdx} className={`ssm-student-form ${activeStudent === sIdx ? 'active' : 'hidden'}`}>
          {/* Student information header with avatar, name, ID, and marks summary */}
          <div className="ssm-student-info">
            <div className="ssm-avatar-lg">{member.name?.charAt(0).toUpperCase()}</div>
            <div>
              <h3>{member.name}</h3>
              <p>ID: {member.odoo_id}</p>
              {submittedStatus[sIdx] && (
                <p style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.85rem', marginTop: '4px' }}>
                   Already Submitted (You can update the marks)
                </p>
              )}
            </div>
            <div className="ssm-total-box">
              <span className="ssm-total-label">Raw Total</span>
              <span className="ssm-total-value">{getRawTotal(sIdx).toFixed(1)}/50</span>
              <span className="ssm-total-label">Final Marks</span>
              <span className="ssm-final-value">{getFinalMarks(sIdx)}/20</span>
            </div>
          </div>

          {/* Marks entry table with radio buttons and manual input fields */}
          <div className="ssm-table-wrapper">
            <table className="ssm-marks-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Criteria</th>
                  <th>CLOs</th>
                  <th>GA</th>
                  <th>Wt.</th>
                  <th>Max</th>
                  <th className="center">1</th>
                  <th className="center">2</th>
                  <th className="center">3</th>
                  <th className="center">4</th>
                  <th className="center">5</th>
                  <th>Marks</th>
                </tr>
              </thead>
              <tbody>
                {rubricData.map((row, cIdx) => (
                  <tr key={cIdx}>
                    <td className="center">{row.sno}</td>
                    <td><strong>{row.criteria}</strong></td>
                    <td className="center">{row.clo}</td>
                    <td className="small">{row.ga}</td>
                    <td className="center">{row.weight}</td>
                    <td className="center">{row.maxMarks}</td>
                    {/* Radio buttons for performance levels 1-5 */}
                    {[1,2,3,4,5].map(level => (
                      <td key={level} className="center">
                        <input
                          type="radio"
                          name={`student${sIdx}_criteria${cIdx}`}
                          value={level}
                          checked={studentMarks[sIdx]?.selections[cIdx] === level}
                          onChange={() => handleRadioSelect(sIdx, cIdx, level)}
                        />
                      </td>
                    ))}
                    {/* Manual marks input field */}
                    <td>
                      <input
                        type="number"
                        className="ssm-marks-input"
                        min="0"
                        max={row.maxMarks}
                        step="0.5"
                        value={studentMarks[sIdx]?.manualMarks[cIdx] || ''}
                        onChange={(e) => handleManualInput(sIdx, cIdx, e.target.value)}
                        placeholder={`/${row.maxMarks}`}
                      />
                    </td>
                  </tr>
                ))}
                {/* Total row showing raw marks out of 50 */}
                <tr className="ssm-total-row">
                  <td colSpan="11" className="right"><strong>Total (out of 50)</strong></td>
                  <td className="center"><strong>{getRawTotal(sIdx).toFixed(1)}</strong></td>
                </tr>
                {/* Final marks row showing scaled marks out of 20 */}
                <tr className="ssm-final-row">
                  <td colSpan="11" className="right"><strong>Final Marks (out of 20)</strong></td>
                  <td className="center"><strong>{getFinalMarks(sIdx)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Comments section for supervisor remarks */}
          <div className="ssm-comments">
            <label>Comments (optional)</label>
            <textarea
              rows="3"
              placeholder="Any remarks for this student..."
              value={studentMarks[sIdx]?.comments || ''}
              onChange={(e) => handleCommentChange(sIdx, e.target.value)}
            />
          </div>
        </div>
      ))}

      {/* Action buttons - Submit and Cancel */}
      <div className="ssm-actions">
        <button className="ssm-submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : Object.keys(submittedStatus).length > 0 ? 'Update Marks' : 'Submit Marks to Admin'}
        </button>
        <button className="ssm-cancel-btn" onClick={onClose}>Cancel</button>
      </div>

    </div>
  );
};

export default SupervisorSessionalMarkForm;