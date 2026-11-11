// src/pages/Admin/AdminDashboard.jsx
import React, { useState } from 'react';
import {
  BarChart3, Upload, Settings, Users, LogOut, ArrowLeft, Shield
} from 'lucide-react';
import { setAdminToken } from '../../utils/api.js';
import QuestionUploadReview from './QuestionUploadReview.jsx';
import QuizSettings from './QuizSettings.jsx';
import ParticipantsResults from './ParticipantsResults.jsx';
import QuestionAnalytics from './QuestionAnalytics.jsx';

export default function AdminDashboard({ onLogout, onReturnHome, quizInfo, onSettingsChanged }) {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'questions' | 'settings' | 'results'

  const handleSignOut = () => {
    setAdminToken('');
    onLogout();
  };

  return (
    <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
      {/* Admin Title Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid var(--border-dark)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--accent-teal)',
            color: '#FFFDF8',
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid var(--border-dark)'
          }}>
            <Shield size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', lineHeight: 1.2 }}>Competition Controller Portal</h1>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Secure Proctoring, Item Banking & Server-Side Scoring Engine
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={onReturnHome}
            title="Switch to Candidate View"
          >
            <ArrowLeft size={14} /> Candidate View
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={handleSignOut}
            title="Sign out of Administrator Portal"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'analytics' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('analytics')}
          style={{ gap: '6px' }}
        >
          <BarChart3 size={15} /> Dashboard & Item Difficulty
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'questions' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('questions')}
          style={{ gap: '6px' }}
        >
          <Upload size={15} /> Question Bank & Review
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'settings' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('settings')}
          style={{ gap: '6px' }}
        >
          <Settings size={15} /> Quiz Settings
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'results' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('results')}
          style={{ gap: '6px' }}
        >
          <Users size={15} /> Candidates & Rankings
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'analytics' && <QuestionAnalytics />}
      {activeTab === 'questions' && <QuestionUploadReview onBankUpdated={() => {}} />}
      {activeTab === 'settings' && <QuizSettings onSettingsUpdated={onSettingsChanged} />}
      {activeTab === 'results' && <ParticipantsResults quizInfo={quizInfo} />}
    </div>
  );
}
