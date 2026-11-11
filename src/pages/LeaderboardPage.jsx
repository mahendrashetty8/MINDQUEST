// src/pages/LeaderboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Award, Download, Search, RefreshCw, ArrowLeft, Trophy } from 'lucide-react';
import { api } from '../utils/api.js';
import { exportLeaderboardPdf } from '../utils/pdfExport.js';

export default function LeaderboardPage({ quizInfo, onReturnHome }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminResults().catch(async () => {
        // If not logged in as admin, fetch dashboard summary or public attempts
        const info = await api.getQuizInfo();
        return { attempts: [] };
      });
      // Filter for submitted attempts only and sort by score desc
      const submitted = (res.attempts || []).filter(a => ['submitted', 'auto_submitted'].includes(a.status));
      setAttempts(submitted);
    } catch (err) {
      console.warn('Leaderboard fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const filteredAttempts = attempts.filter(a => {
    const q = filter.toLowerCase();
    const name = (a.displayName || a.participant?.name || '').toLowerCase();
    return name.includes(q);
  });

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={onReturnHome}
            style={{ marginBottom: '0.5rem', gap: '4px' }}
          >
            <ArrowLeft size={14} /> Back to Registration
          </button>
          <h1 style={{ fontSize: '1.8rem', lineHeight: 1.2 }}>Official Competition Leaderboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Live merit rankings calculated server-side based on final scores and time efficiency.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={fetchLeaderboard}
            title="Refresh Leaderboard"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => exportLeaderboardPdf(attempts, quizInfo)}
            disabled={attempts.length === 0}
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>
      </div>

      <div className="paper-card">
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '360px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ minHeight: '38px', fontSize: '0.9rem' }}
            placeholder="Search candidate name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="table-wrapper">
          <table className="editorial-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th>Candidate Name</th>
                <th>Attended</th>
                <th>Score</th>
                <th>Accuracy</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    {loading ? 'Refreshing leaderboard standings...' : 'No completed examination submissions yet.'}
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((att, idx) => (
                  <tr key={att.id || idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {att.rank === 1 ? '🥇 #1' : att.rank === 2 ? '🥈 #2' : att.rank === 3 ? '🥉 #3' : `#${att.rank || idx + 1}`}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '0.95rem' }}>{att.displayName || att.participant?.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{att.attended} / {att.totalQuestions}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-teal)' }}>
                      {att.score ?? 0}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{att.percentage ?? 0}%</td>
                    <td>
                      <span className={`badge ${att.passed ? 'badge-teal' : 'badge-warning'}`}>
                        {att.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      {att.timeTakenSeconds ? `${Math.floor(att.timeTakenSeconds / 60)}m ${att.timeTakenSeconds % 60}s` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
