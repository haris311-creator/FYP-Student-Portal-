import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { evaluationAPI } from '../utils/api';
import PublicTitleDefenseForm from '../features/PublicTitleDefenseForm';

const PublicTitleDefensePage = () => {
  const { token } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await evaluationAPI.getPublicTitleDefense(token);
        const d = res.data.group || res.data;
        setGroup({
          id: d.id,
          name: d.name || d.group_number || 'Unknown Group',
          project: d.project || d.project_title || 'Untitled Project',
          supervisor: d.supervisor || 'Not Assigned',
          phase: d.phase || d.semester || 'FYP-1',
          members: d.members || []
        });
      } catch (err) {
        setGroup({
          id: null,
          name: 'Demo Group',
          project: 'Demo Project (backend not connected)',
          supervisor: 'Demo Supervisor',
          phase: 'FYP-2',
          members: []
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f0f4f8', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: '#64748b' }}>Loading evaluation form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f0f4f8', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '3rem', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ width: '64px', height: '64px', background: '#fee2e2', color: '#991b1b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 1rem' }}>!</div>
          <h2 style={{ color: '#1e3a8a', margin: '0 0 0.5rem' }}>Link Invalid</h2>
          <p style={{ color: '#64748b', margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <img src="/iqra-logo.png" alt="Iqra University" style={{ height: '40px' }} onError={e => e.target.style.display = 'none'} />
        <div>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e3a8a' }}>Iqra University FEST</h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Title Defense Evaluation Form</p>
        </div>
      </div>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        <PublicTitleDefenseForm group={group} token={token} />
      </div>
    </div>
  );
};

export default PublicTitleDefensePage;
