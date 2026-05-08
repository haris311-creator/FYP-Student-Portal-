import React from 'react';
import { announcements } from '../Data/Ddata';

function AnnouncementTicker() {
  const tickerText = announcements
    .map(a => `📢 ${a.title} — ${a.description}`)
    .join('     ·····     ');

  return (
    <div style={{
      background: '#1e3a8a',
      color: 'white',
      padding: '10px 0',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    }}>
      <div style={{
        display: 'inline-block',
        animation: 'ticker 50s linear infinite',
        fontSize: '0.875rem',
        fontWeight: '500',
        letterSpacing: '0.3px',
      }}>
        {tickerText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{tickerText}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

export default AnnouncementTicker;