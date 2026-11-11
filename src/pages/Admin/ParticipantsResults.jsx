// src/pages/Admin/ParticipantsResults.jsx
import React, { useState, useEffect } from 'react';
import {
  Download, Search, RefreshCw, Eye, RotateCcw, AlertCircle,
  FileSpreadsheet, FileText, CheckCircle2, XCircle, ShieldAlert
} from 'lucide-react';
import { api } from '../../utils/api.js';
import { exportLeaderboardPdf } from '../../utils/pdfExport.js';
import Modal from '../../components/Modal.jsx';

export default function ParticipantsResults({ quizInfo }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resettingId, setResettingId] = useState(null);

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminResults();
      setAttempts(res.attempts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, []);

  const handleInspectAttempt = async (attemptId) => {
    setDetailLoading(true);
    try {
      const res = await api.getParticipantDetail(attemptId);
      setSelectedAttempt(res.attempt);
    } catch (err) {
      alert('Error fetching details: ' + err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResetAttempt = async (attemptId, name) => {
    if (!window.confirm(`Are you sure you want to reset the attempt for ${name}? All their recorded answers and scores will be permanently deleted, allowing them to re-attempt the exam.`)) {
      return;
    }

    setResettingId(attemptId);
    try {
      await api.resetAttempt(attemptId);
      await fetchAttempts();
      if (selectedAttempt && selectedAttempt.id === attemptId) {
        setSelectedAttempt(null);
      }
    } catch (err) {
      alert('Reset failed: ' + err.message);
    } finally {
      setResettingId(null);
    }
  };

  const filtered = attempts.filter(a => {
    const q = filter.toLowerCase();
    const name = (a.displayName || a.participant?.name || '').toLowerCase();
    const id = (a.id || '').toLowerCase();
    return name.includes(q) || id.includes(q);
  });

  const formatStartTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="paper-card">
        <div className="paper-card-header">
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>Candidate Attempts & Merit Rankings</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Real-time audit log of candidate attempts, scores, and anti-cheat events. Duplicates with the same name are distinguished with (#2), (#3).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={fetchAttempts}
              title="Refresh Results"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <a
              href="/api/admin/export/csv"
              download="quiz-results.csv"
              className="btn btn-sm btn-outline"
            >
              <FileSpreadsheet size={14} />
              Export CSV
            </a>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => exportLeaderboardPdf(attempts, quizInfo)}
              disabled={attempts.length === 0}
            >
              <FileText size={14} />
              Printable PDF
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '380px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ minHeight: '38px', fontSize: '0.9rem' }}
            placeholder="Search candidate name or attempt ID..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {/* Participants Table */}
        <div className="table-wrapper">
          <table className="editorial-table">
            <thead>
              <tr>
                <th style={{ width: '65px' }}>Rank</th>
                <th>Candidate Name</th>
                <th>Attempt ID</th>
                <th>Start Time</th>
                <th>Status</th>
                <th>Attended</th>
                <th>Score</th>
                <th>Accuracy</th>
                <th>Time</th>
                <th>Violations</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading candidates...' : 'No candidate records found matching query.'}
                  </td>
                </tr>
              ) : (
                filtered.map((att, idx) => (
                  <tr key={att.id || idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {att.rank ? `#${att.rank}` : '-'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {att.displayName || att.participant?.name}
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.78rem', background: 'var(--bg-card-alt)', padding: '2px 5px', borderRadius: '2px' }}>
                        {att.id.length > 18 ? att.id.substring(0, 18) + '...' : att.id}
                      </code>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {formatStartTime(att.startTime)}
                    </td>
                    <td>
                      <span className={`badge ${
                        att.status === 'submitted' ? 'badge-teal' :
                        att.status === 'auto_submitted' ? 'badge-warning' :
                        'badge-neutral'
                      }`}>
                        {att.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {att.attended} / {att.totalQuestions}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-teal)' }}>
                      {att.score ?? '-'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {att.percentage !== null ? `${att.percentage}%` : '-'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      {att.timeTakenSeconds ? `${Math.floor(att.timeTakenSeconds / 60)}m ${att.timeTakenSeconds % 60}s` : '-'}
                    </td>
                    <td>
                      {att.tabSwitchCount > 0 ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                          <ShieldAlert size={12} /> {att.tabSwitchCount}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>0</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          style={{ padding: '0 6px', minHeight: '30px' }}
                          onClick={() => handleInspectAttempt(att.id)}
                          title="Inspect questions & answers"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          style={{ padding: '0 6px', minHeight: '30px', color: 'var(--signal-warning)' }}
                          onClick={() => handleResetAttempt(att.id, att.displayName || att.participant?.name)}
                          disabled={resettingId === att.id}
                          title="Reset attempt (allows retake)"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Participant Deep Inspection Modal */}
      {selectedAttempt && (
        <Modal
          isOpen={Boolean(selectedAttempt)}
          onClose={() => setSelectedAttempt(null)}
          title={`Candidate Audit: ${selectedAttempt.displayName || selectedAttempt.participant?.name}`}
          maxWidth="760px"
          actions={
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setSelectedAttempt(null)}
            >
              Close
            </button>
          }
        >
          <div style={{ background: 'var(--bg-card-alt)', padding: '1rem', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div><strong>Candidate:</strong> {selectedAttempt.displayName || selectedAttempt.participant?.name}</div>
              <div><strong>Attempt ID:</strong> <code>{selectedAttempt.id}</code></div>
              <div><strong>Started:</strong> {formatStartTime(selectedAttempt.startTime)}</div>
              <div><strong>Final Score:</strong> <strong>{selectedAttempt.result?.finalScore ?? 'Pending'}</strong> ({selectedAttempt.result?.percentage ?? 0}%)</div>
              <div><strong>Attended / Total:</strong> {selectedAttempt.result?.attended ?? 0} / {selectedAttempt.assignedQuestionIds?.length}</div>
              <div><strong>Anti-Cheat Warnings:</strong> {selectedAttempt.tabSwitchCount || 0} violations</div>
            </div>

            {selectedAttempt.tabSwitchEvents && selectedAttempt.tabSwitchEvents.length > 0 && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-rule)', fontSize: '0.8rem', color: 'var(--signal-warning)' }}>
                <strong>Anti-Cheat Log:</strong>
                <ul style={{ paddingLeft: '1.2rem', marginTop: '4px' }}>
                  {selectedAttempt.tabSwitchEvents.map((evt, eIdx) => (
                    <li key={eIdx}>
                      {new Date(evt.timestamp).toLocaleTimeString()}: {evt.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Assigned Question Set & Responses</h4>

          <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '4px' }}>
            {(selectedAttempt.questionDetails || []).map((q, qIdx) => (
              <div
                key={q.id || qIdx}
                style={{
                  border: '1px solid var(--border-dark)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: q.isCorrect ? '#F4F9F7' : (q.isUnattended ? 'var(--bg-card-alt)' : '#FDF3F0')
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
                  <span className="badge badge-neutral">Q{qIdx + 1}</span>
                  {q.isCorrect ? (
                    <span className="badge badge-teal"><CheckCircle2 size={12} /> Correct</span>
                  ) : q.isUnattended ? (
                    <span className="badge badge-neutral">Unattended</span>
                  ) : (
                    <span className="badge badge-warning"><XCircle size={12} /> Incorrect</span>
                  )}
                </div>

                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>{q.question}</div>

                <div style={{ fontSize: '0.85rem', display: 'flex', gap: '1.5rem', fontFamily: 'var(--font-mono)' }}>
                  <span>Candidate Selected: <strong>{q.chosenOption || 'None'}</strong></span>
                  <span style={{ color: 'var(--accent-teal)' }}>Correct Answer: <strong>{q.correctOption}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
