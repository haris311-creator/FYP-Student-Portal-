import React, { useState } from 'react';
import './PresentationEvaluationForm.css';

const presentationCriteria = [
  {
    sno: 1,
    criteria: 'Introduction & Background',
    clo: 'CLO2',
    ga: 'GA3: Problem Analysis',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Fails to explain the research problem; lacks clarity and engagement.',
      2: 'Provides minimal background but lacks structure or clarity.',
      3: 'Explains key points but lacks depth or coherence.',
      4: 'Provides a good overview with some engagement and clarity.',
      5: 'Clearly presents objectives, engages the audience, and shows significance.'
    }
  },
  {
    sno: 2,
    criteria: 'Problem Statement & Justification',
    clo: 'CLO2',
    ga: 'GA3: Problem Analysis',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Problem is unclear or missing, lacks any justification.',
      2: 'Problem is weakly defined with little supporting evidence.',
      3: 'The problem is somewhat clear but lacks strong justification.',
      4: 'The problem is well-stated with supporting data but could be more detailed.',
      5: 'Strong problem statement, clearly justified with relevant data and evidence.'
    }
  },
  {
    sno: 3,
    criteria: 'Methodology',
    clo: 'CLO4',
    ga: 'GA4: Investigation',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Methodology is unclear, lacks structure or technical explanation.',
      2: 'Basic methodology is mentioned but lacks clarity.',
      3: 'Some key elements of the methodology are explained but not in depth.',
      4: 'Well-structured methodology with good explanation of data sources, algorithms, and workflow.',
      5: 'Clearly explains methodology, data sources, algorithms, and workflow in a structured manner.'
    }
  },
  {
    sno: 4,
    criteria: 'Complex Computing Problem (CCP) Handling',
    clo: 'CLO2',
    ga: 'GA3: Problem Analysis',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Lacks computational complexity or problem is too simple.',
      2: 'Some computing aspects but lacks significant complexity.',
      3: 'Addresses some complexity but not deeply explained.',
      4: 'Handles a moderately complex problem with some advanced computing elements.',
      5: 'Effectively addresses a real-world complex computing problem with constraints and high computational challenges.'
    }
  },
  {
    sno: 5,
    criteria: 'Innovation & Novelty',
    clo: 'CLO12',
    ga: 'GA10: Lifelong Learning',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'No innovation or originality, lacks differentiation.',
      2: 'Minimal innovation, approach is common or unoriginal.',
      3: 'Some innovative aspects are mentioned but not well explained.',
      4: 'Identifies innovative aspects but lacks strong differentiation from existing work.',
      5: 'Clearly highlights strong originality and novel aspects of the approach.'
    }
  },
  {
    sno: 6,
    criteria: 'Expected Outcomes & Impact',
    clo: 'CLO12',
    ga: 'GA10: Lifelong Learning',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'No clear outcomes or impact discussed.',
      2: 'Outcomes are vague or lack justification.',
      3: 'Expected outcomes are mentioned but not well articulated.',
      4: 'Outcomes are well explained but need stronger justification.',
      5: 'Clearly defines well-justified outcomes with strong real-world impact.'
    }
  },
  {
    sno: 7,
    criteria: 'Alignment with SDGs',
    clo: 'CLO7',
    ga: 'GA8: Computing Professionalism and Society',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'No mention of SDGs or unclear alignment.',
      2: 'Mentions SDGs but lacks depth or clear connection.',
      3: 'Some alignment with SDGs lacks strong justification.',
      4: 'SDG alignment is present but could be more strongly connected.',
      5: 'Strongly aligns with SDGs and is well-justified.'
    }
  },
  {
    sno: 8,
    criteria: 'Presentation Skills & Delivery',
    clo: 'CLO8',
    ga: 'GA7: Communication',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Poor delivery, lacks engagement, unclear speech, or unstructured presentation.',
      2: 'Weak delivery with little confidence and engagement.',
      3: 'Adequate delivery but lacks confidence or clarity.',
      4: 'Good delivery, mostly confident with effective use of time.',
      5: 'Highly confident, engaging, clear voice, and well-structured delivery.'
    }
  },
  {
    sno: 9,
    criteria: 'Use of Visuals (Slides, Charts, Figures)',
    clo: 'CLO8',
    ga: 'GA7: Communication',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Poor visuals, cluttered slides, no support for understanding.',
      2: 'Basic visuals but ineffective or unclear.',
      3: 'Visuals are present but may lack design clarity or impact.',
      4: 'Good visuals, mostly effective but could be improved.',
      5: 'Professional, well-designed visuals that strongly enhance understanding.'
    }
  },
  {
    sno: 10,
    criteria: 'Overall Organization & Structure',
    clo: 'CLO8',
    ga: 'GA7: Communication',
    weight: 1,
    maxMarks: 5,
    descriptions: {
      1: 'Lacks logical flow, poorly structured with weak transitions.',
      2: 'Disorganized with unclear flow.',
      3: 'Some structure but lacks smooth transitions.',
      4: 'Mostly well-structured with good flow.',
      5: 'Excellent organization, smooth transitions, and logical flow.'
    }
  }
];

const vivaCriteria = {
  criteria: 'Handling of Questions',
  clo: 'CLO8',
  ga: 'GA7: Communication',
  weight: 1,
  maxMarks: 5,
  descriptions: {
    1: 'Unable to answer questions or lacks understanding.',
    2: 'Struggles to answer questions, lacks confidence.',
    3: 'Answers are somewhat vague or uncertain.',
    4: 'Answers most questions well but lacks depth in some areas.',
    5: 'Confidently answers all questions, showing deep understanding and strong reasoning.'
  }
};

const PresentationEvaluationForm = ({ group, onClose, isPublicLink = false, token = null }) => {
  const [showRubric, setShowRubric] = useState(false);
  const [evaluatorName, setEvaluatorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [presentationSelections, setPresentationSelections] = useState(
    Object.fromEntries(presentationCriteria.map((_, i) => [i, null]))
  );
  const [presentationMarks, setPresentationMarks] = useState(
    Object.fromEntries(presentationCriteria.map((_, i) => [i, '']))
  );

  const [vivaSelections, setVivaSelections] = useState(
    Object.fromEntries((group?.members || []).map((_, i) => [i, null]))
  );
  const [vivaMarks, setVivaMarks] = useState(
    Object.fromEntries((group?.members || []).map((_, i) => [i, '']))
  );

  const [comments, setComments] = useState('');

  const handlePresentationRadio = (cIdx, value) => {
    setPresentationSelections(prev => ({ ...prev, [cIdx]: value }));
    setPresentationMarks(prev => ({
      ...prev,
      [cIdx]: ((value / 5) * presentationCriteria[cIdx].maxMarks).toFixed(1)
    }));
  };

  const handlePresentationManual = (cIdx, value) => {
    setPresentationMarks(prev => ({ ...prev, [cIdx]: value }));
    const max = presentationCriteria[cIdx].maxMarks;
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= max) {
      setPresentationSelections(prev => ({ ...prev, [cIdx]: Math.round((num / max) * 5) || null }));
    }
  };

  const handleVivaRadio = (sIdx, value) => {
    setVivaSelections(prev => ({ ...prev, [sIdx]: value }));
    setVivaMarks(prev => ({ ...prev, [sIdx]: ((value / 5) * vivaCriteria.maxMarks).toFixed(1) }));
  };

  const handleVivaManual = (sIdx, value) => {
    setVivaMarks(prev => ({ ...prev, [sIdx]: value }));
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 5) {
      setVivaSelections(prev => ({ ...prev, [sIdx]: Math.round((num / 5) * 5) || null }));
    }
  };

  const getPresentationTotal = () => {
    return Object.values(presentationMarks).reduce((sum, m) => sum + (parseFloat(m) || 0), 0);
  };

  const getStudentTotal = (sIdx) => {
    const pTotal = getPresentationTotal();
    const viva = parseFloat(vivaMarks[sIdx]) || 0;
    return (pTotal + viva).toFixed(1);
  };

  const getStudentFinal = (sIdx) => {
    const raw = parseFloat(getStudentTotal(sIdx));
    return ((raw / 55) * 40).toFixed(1);
  };

  const handleSubmit = async () => {
    if (!evaluatorName.trim()) {
      alert('Please enter your name.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        token,
        evaluator_name: evaluatorName,
        group_id: group?.id,
        presentation_marks: presentationMarks,
        viva_marks: vivaMarks,
        comments,
        per_student: (group?.members || []).map((m, i) => ({
          student_id: m.student_db_id,
          student_name: m.name,
          raw_total: getStudentTotal(i),
          final_marks: getStudentFinal(i)
        }))
      };
      console.log('Submitting presentation evaluation:', payload);
      setSubmitted(true);
    } catch (err) {
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="pef-container">
        <div className="pef-success">
          <div className="pef-success-icon">&#10003;</div>
          <h2>Submitted Successfully</h2>
          <p>Your evaluation has been recorded. This link is now inactive.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pef-container">

      <div className="pef-header">
        <div>
          <h2>Rubrics for Evaluation of FYDP-1 Presentation</h2>
          {group && <p>{group.project} — {group.name}</p>}
        </div>
        {!isPublicLink && (
          <button className="pef-rubric-btn" onClick={() => setShowRubric(!showRubric)}>
            {showRubric ? 'Hide Rubric Reference' : 'View Rubric Reference'}
          </button>
        )}
      </div>

      {/* Group Info */}
      <div className="pef-info-table">
        <table>
          <tbody>
            <tr>
              <td className="pef-info-label">Project Title</td>
              <td className="pef-info-value">{group?.project || '—'}</td>
              <td className="pef-info-label">Student Names</td>
              <td className="pef-info-value">{group?.members?.map(m => m.name).join(', ') || '—'}</td>
            </tr>
            <tr>
              <td className="pef-info-label">Supervisor</td>
              <td className="pef-info-value">{group?.supervisor || '—'}</td>
              <td className="pef-info-label">Semester</td>
              <td className="pef-info-value">{group?.phase || 'FYP-1'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Rubric Reference */}
      {(showRubric || isPublicLink) && (
        <div className="pef-section">
          <h3 className="pef-section-title">Rubric Reference</h3>
          <div className="pef-table-wrap">
            <table className="pef-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Criteria</th>
                  <th>CLOs</th>
                  <th>GA</th>
                  <th>1 (Worst)</th>
                  <th>2 (Below Average)</th>
                  <th>3 (Satisfactory)</th>
                  <th>4 (Good)</th>
                  <th>5 (Excellent)</th>
                </tr>
              </thead>
              <tbody>
                {presentationCriteria.map((row) => (
                  <tr key={row.sno}>
                    <td className="pef-center">{row.sno}</td>
                    <td><strong>{row.criteria}</strong></td>
                    <td className="pef-center">{row.clo}</td>
                    <td className="pef-small">{row.ga}</td>
                    {[1, 2, 3, 4, 5].map(l => (
                      <td key={l} className="pef-desc">{row.descriptions[l]}</td>
                    ))}
                  </tr>
                ))}
                <tr className="pef-viva-row">
                  <td className="pef-center">Viva</td>
                  <td><strong>{vivaCriteria.criteria}</strong></td>
                  <td className="pef-center">{vivaCriteria.clo}</td>
                  <td className="pef-small">{vivaCriteria.ga}</td>
                  {[1, 2, 3, 4, 5].map(l => (
                    <td key={l} className="pef-desc">{vivaCriteria.descriptions[l]}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evaluator Name */}
      <div className="pef-section">
        <h3 className="pef-section-title">Evaluator Information</h3>
        <div className="pef-info-table">
          <table>
            <tbody>
              <tr>
                <td className="pef-info-label">Evaluator Name</td>
                <td>
                  <input
                    type="text"
                    className="pef-text-input"
                    placeholder="Enter your full name"
                    value={evaluatorName}
                    onChange={e => setEvaluatorName(e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Presentation Marks Table */}
      <div className="pef-section">
        <h3 className="pef-section-title">Part 1 — Presentation Evaluation (Group)</h3>
        <p className="pef-note">These marks apply to the entire group (all students get same presentation marks).</p>
        <div className="pef-table-wrap">
          <table className="pef-table pef-marks-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Criteria</th>
                <th>CLOs</th>
                <th>GA</th>
                <th className="pef-center">Wt.</th>
                <th className="pef-center">1</th>
                <th className="pef-center">2</th>
                <th className="pef-center">3</th>
                <th className="pef-center">4</th>
                <th className="pef-center">5</th>
                <th className="pef-center">Marks</th>
              </tr>
            </thead>
            <tbody>
              {presentationCriteria.map((row, cIdx) => (
                <tr key={cIdx}>
                  <td className="pef-center">{row.sno}</td>
                  <td><strong>{row.criteria}</strong></td>
                  <td className="pef-center">{row.clo}</td>
                  <td className="pef-small">{row.ga}</td>
                  <td className="pef-center">{row.weight}</td>
                  {[1, 2, 3, 4, 5].map(level => (
                    <td key={level} className="pef-center">
                      <input
                        type="radio"
                        name={`pres_${cIdx}`}
                        value={level}
                        checked={presentationSelections[cIdx] === level}
                        onChange={() => handlePresentationRadio(cIdx, level)}
                      />
                    </td>
                  ))}
                  <td className="pef-center">
                    <input
                      type="number"
                      className="pef-num-input"
                      min="0"
                      max={row.maxMarks}
                      step="0.5"
                      value={presentationMarks[cIdx]}
                      onChange={e => handlePresentationManual(cIdx, e.target.value)}
                      placeholder={`/${row.maxMarks}`}
                    />
                  </td>
                </tr>
              ))}
              <tr className="pef-total-row">
                <td colSpan="10" className="pef-right"><strong>Total Presentation (out of 50)</strong></td>
                <td className="pef-center"><strong>{getPresentationTotal().toFixed(1)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Viva Marks Table */}
      <div className="pef-section">
        <h3 className="pef-section-title">Part 2 — Viva / Q&A (Per Student)</h3>
        <p className="pef-note">Each student gets individual viva marks based on their Q&A performance.</p>
        <div className="pef-table-wrap">
          <table className="pef-table pef-marks-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>CLOs</th>
                <th>GA</th>
                <th className="pef-center">Wt.</th>
                <th className="pef-center">1</th>
                <th className="pef-center">2</th>
                <th className="pef-center">3</th>
                <th className="pef-center">4</th>
                <th className="pef-center">5</th>
                <th className="pef-center">Marks</th>
              </tr>
            </thead>
            <tbody>
              {(group?.members || []).map((member, sIdx) => (
                <tr key={sIdx}>
                  <td><strong>{member.name}</strong></td>
                  <td className="pef-center">{vivaCriteria.clo}</td>
                  <td className="pef-small">{vivaCriteria.ga}</td>
                  <td className="pef-center">{vivaCriteria.weight}</td>
                  {[1, 2, 3, 4, 5].map(level => (
                    <td key={level} className="pef-center">
                      <input
                        type="radio"
                        name={`viva_${sIdx}`}
                        value={level}
                        checked={vivaSelections[sIdx] === level}
                        onChange={() => handleVivaRadio(sIdx, level)}
                      />
                    </td>
                  ))}
                  <td className="pef-center">
                    <input
                      type="number"
                      className="pef-num-input"
                      min="0"
                      max="5"
                      step="0.5"
                      value={vivaMarks[sIdx]}
                      onChange={e => handleVivaManual(sIdx, e.target.value)}
                      placeholder="/5"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per Student Summary */}
      <div className="pef-section">
        <h3 className="pef-section-title">Per Student Final Marks Summary</h3>
        <div className="pef-table-wrap">
          <table className="pef-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th className="pef-center">Presentation (50)</th>
                <th className="pef-center">Viva (5)</th>
                <th className="pef-center">Raw Total (55)</th>
                <th className="pef-center">Final Marks (40)</th>
              </tr>
            </thead>
            <tbody>
              {(group?.members || []).map((member, sIdx) => (
                <tr key={sIdx}>
                  <td><strong>{member.name}</strong></td>
                  <td className="pef-center">{getPresentationTotal().toFixed(1)}</td>
                  <td className="pef-center">{vivaMarks[sIdx] || '—'}</td>
                  <td className="pef-center">{getStudentTotal(sIdx)}</td>
                  <td className="pef-center pef-final">{getStudentFinal(sIdx)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comments */}
      <div className="pef-section">
        <div className="pef-info-table">
          <table>
            <tbody>
              <tr>
                <td className="pef-info-label" style={{ verticalAlign: 'top', paddingTop: '10px' }}>Comments</td>
                <td>
                  <textarea
                    className="pef-textarea"
                    rows="3"
                    placeholder="Any additional remarks..."
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="pef-actions">
        <button className="pef-submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Evaluation'}
        </button>
        {!isPublicLink && onClose && (
          <button className="pef-cancel-btn" onClick={onClose}>Cancel</button>
        )}
      </div>

    </div>
  );
};

export default PresentationEvaluationForm;
