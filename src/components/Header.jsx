// src/components/Header.jsx
import React from 'react';
import { Award, Shield, FileText, CheckCircle } from 'lucide-react';
import { CONFIG } from '../../config.js';

export default function Header({ currentView, setCurrentView, isQuizActive = true }) {
  return (
    <header className="header-bar">
      <div className="header-brand" onClick={() => setCurrentView('landing')} style={{ cursor: 'pointer' }}>
        <div className="brand-badge">{CONFIG.logoBadge}</div>
        <span className="brand-title">{CONFIG.logoText}</span>
      </div>

      <nav className="header-nav">
        <button
          onClick={() => setCurrentView('landing')}
          className="nav-link"
          style={{ background: 'none', border: 'none', fontWeight: currentView === 'landing' ? 700 : 500 }}
        >
          Registration & Rules
        </button>

        <button
          onClick={() => setCurrentView('leaderboard')}
          className="nav-link"
          style={{ background: 'none', border: 'none', fontWeight: currentView === 'leaderboard' ? 700 : 500 }}
        >
          Live Leaderboard
        </button>

        <button
          onClick={() => setCurrentView('admin')}
          className="btn btn-sm btn-outline"
          style={{ minHeight: '34px', gap: '6px' }}
        >
          <Shield size={14} />
          Admin Portal
        </button>
      </nav>
    </header>
  );
}
