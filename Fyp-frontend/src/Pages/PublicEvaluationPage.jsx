import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PresentationEvaluationForm from '../Components/PresentationEvaluationForm';

const PublicEvaluationPage = () => {
  const { token } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGroupByToken = async () => {
      try {
        setLoading(true);
        // Backend API call hogi baad mein:
        // const res = await api.get(`/evaluations/token/${token}/`);
        // setGroup(res.data.group);

        // Dummy data abhi ke liye:
        setGroup({
          id: 1,
          name: 'Group GRP-001',
          project: 'FYDP Automation System',
          supervisor: 'Dr. Ahmed',
          phase: 'FYP-1',
          members: [
            { name: 'Ahmed Khan', odoo_id: 'IU-001', student_db_id: 1 },
            { name: 'Ali Hassan', odoo_id: 'IU-002', student_db_id: 2 },
            { name: 'Sara Malik', odoo_id: 'IU-003', student_db_id: 3 },
          ]
        });
      } catch (err) {
        if (err.response?.status === 404) {
          setError('This evaluation link is invalid or has already been used.');
        } else {
          setError('Failed to load evaluation form. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGroupByToken();
  }, [token]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f0f4f8',
        fontFamily: 'Inter, sans-serif'
      }}>
        <p style={{ color: '#64748b' }}>Loading evaluation form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f0f4f8',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '3rem',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{
            width: '64px', height: '64px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            margin: '0 auto 1rem'
          }}>!</div>
          <h2 style={{ color: '#1e3a8a', margin: '0 0 0.5rem' }}>Link Invalid</h2>
          <p style={{ color: '#64748b', margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh' }}>
      {/* Simple header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <img
          src="/iqra-logo.png"
          alt="Iqra University"
          style={{ height: '40px' }}
          onError={e => e.target.style.display = 'none'}
        />
        <div>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e3a8a' }}>
            Iqra University FEST
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
            FYP Presentation Evaluation Form
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        <PresentationEvaluationForm
          group={group}
          isPublicLink={true}
          token={token}
        />
      </div>
    </div>
  );
};

export default PublicEvaluationPage;
