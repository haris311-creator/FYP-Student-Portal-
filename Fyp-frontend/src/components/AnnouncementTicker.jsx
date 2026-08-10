import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AnnouncementTicker() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:8000/api/projects/announcements/active/');
        setAnnouncements(response.data.results || []);
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || announcements.length === 0) return null;

  // Priority colors
  const getPriorityStyle = (priority) => {
    switch(priority) {
      case 'urgent':
        return {
          background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)',
          color: 'white',
          fontWeight: '700',
          padding: '6px 16px',
          borderRadius: '20px',
          boxShadow: '0 0 10px rgba(220, 38, 38, 0.5)',
          animation: 'pulse 2s infinite'
        };
      case 'high':
        return {
          background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
          color: '#78350f',
          fontWeight: '700',
          padding: '6px 16px',
          borderRadius: '20px',
          boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)'
        };
      case 'medium':
        return {
          background: 'rgba(255, 255, 255, 0.15)',
          color: 'white',
          fontWeight: '500',
          padding: '6px 16px',
          borderRadius: '20px'
        };
      case 'low':
      default:
        return {
          background: 'transparent',
          color: 'rgba(255, 255, 255, 0.8)',
          fontWeight: '400',
          padding: '6px 16px',
          borderRadius: '20px'
        };
    }
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'urgent': return ;
      case 'high': return ;
      case 'medium': return ;
      case 'low': return ;
      default: return ;
    }
  };

  return (
    <div style={{
      background: '#1e3a8a',
      padding: '12px 0',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      borderTop: '2px solid rgba(255,255,255,0.1)',
      borderBottom: '2px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{
        display: 'inline-flex',
        animation: 'ticker 60s linear infinite',
        gap: '2rem',
        paddingLeft: '100%',
      }}>
        {announcements.map((a, index) => (
          <div 
            key={a.id} 
            style={{
              ...getPriorityStyle(a.priority),
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.95rem',
              letterSpacing: '0.3px',
              marginRight: '2rem',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{getPriorityIcon(a.priority)}</span>
            <span>{a.title}</span>
            {a.priority === 'urgent' && (
              <span style={{
                background: 'white',
                color: '#dc2626',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.7rem',
                fontWeight: '800',
                marginLeft: '0.5rem'
              }}>
                URGENT
              </span>
            )}
          </div>
        ))}
        {/* Duplicate for seamless loop */}
        {announcements.map((a, index) => (
          <div 
            key={`dup-${a.id}`} 
            style={{
              ...getPriorityStyle(a.priority),
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.95rem',
              letterSpacing: '0.3px',
              marginRight: '2rem',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{getPriorityIcon(a.priority)}</span>
            <span>{a.title}</span>
            {a.priority === 'urgent' && (
              <span style={{
                background: 'white',
                color: '#dc2626',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.7rem',
                fontWeight: '800',
                marginLeft: '0.5rem'
              }}>
                URGENT
              </span>
            )}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

export default AnnouncementTicker;