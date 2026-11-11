// src/pages/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle, ArrowRight, HelpCircle, RotateCcw } from 'lucide-react';
import { api } from '../utils/api.js';

// Helper: Persistent device ID generator
export function getOrCreateDeviceId() {
  let devId = localStorage.getItem('mindquest_device_id');
  if (!devId) {
    devId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('mindquest_device_id', devId);
    document.cookie = `mindquest_device_id=${devId}; max-age=31536000; path=/; SameSite=Lax`;
  }
  return devId;
}

export default function LandingPage({ quizInfo, onStartQuiz }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [unfinishedPrompt, setUnfinishedPrompt] = useState(null); // { attemptId, name, startTime }

  const settings = quizInfo?.settings || {};
  const totalQ = settings.totalQuestionsPerParticipant || 10;
  const timeMode = settings.timeLimitMode || 'total';
  const timeLimitMinutes = settings.timeLimitMinutes || 15;
  const timeSecPerQ = settings.timeLimitSecondsPerQuestion || 60;
  const computedTotalMinutes = settings.computedTotalMinutes || (
    timeMode === 'per_question' ? Math.max(1, Math.ceil((timeSecPerQ * totalQ) / 60)) : timeLimitMinutes
  );

  // Validate name according to rule:
  // 2 to 40 characters, letters, spaces, and basic punctuation, trimmed
  const validateName = (val) => {
    const trimmed = (val || '').trim();
    if (trimmed.length < 2) return "Name must be at least 2 characters.";
    if (trimmed.length > 40) return "Name cannot exceed 40 characters.";
    if (!/^[a-zA-Z\s.'\-,]{2,40}$/.test(trimmed)) {
      return "Name can only contain letters, spaces, and basic punctuation (. ' - ,).";
    }
    return "";
  };

  const handleStartAttempt = async (forceNew = false) => {
    setError('');
    const validationErr = validateName(name);
    if (validationErr) {
      setError(validationErr);
      return;
    }
    if (!agreed) {
      setError('Please certify that you have read and accepted the examination rules.');
      return;
    }

    setLoading(true);
    const deviceId = getOrCreateDeviceId();

    try {
      const response = await api.registerAndStart({
        name: name.trim(),
        deviceId,
        forceNew
      });

      // If server detected an unfinished attempt with this name on this device
      if (response.promptResume) {
        setUnfinishedPrompt({
          attemptId: response.existingAttemptId,
          name: response.name,
          startTime: response.startTime
        });
        setLoading(false);
        return;
      }

      onStartQuiz(response);
    } catch (err) {
      setError(err.message || 'Failed to start examination session.');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUnfinished = async () => {
    if (!unfinishedPrompt) return;
    setLoading(true);
    try {
      const res = await api.registerAndStart({
        resumeAttemptId: unfinishedPrompt.attemptId
      });
      onStartQuiz(res);
    } catch (err) {
      setError(err.message || 'Could not resume attempt.');
      setUnfinishedPrompt(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewAttempt = async () => {
    setUnfinishedPrompt(null);
    await handleStartAttempt(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setUnfinishedPrompt(null);
    handleStartAttempt(false);
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      {/* Title Stamp Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-block', marginBottom: '0.75rem' }}>
          <span className="badge badge-teal" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}>
            {quizInfo?.organization || 'ACADEMIC COMPETITION COUNCIL'}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', marginBottom: '0.5rem', lineHeight: 1.15 }}>
          {quizInfo?.quizName || 'MINDQUEST 2026'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto' }}>
          {quizInfo?.quizSubtitle || 'High-stakes online competition with server-side item selection, anti-cheat surveillance, and instant merit ranking.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Left Column: Rules & Examination Scheme */}
        <div>
          <div className="paper-card">
            <div className="paper-card-header">
              <h3 style={{ fontSize: '1.15rem' }}>Examination Scheme</h3>
              <span className={`badge ${settings.isQuizActive ? 'badge-teal' : 'badge-warning'}`}>
                {settings.isQuizActive ? 'EXAM ACTIVE' : 'EXAM CLOSED'}
              </span>
            </div>

            {/* Display: "20 questions, 30 minutes" */}
            <div style={{
              background: 'var(--accent-teal-soft)',
              border: '1.5px solid var(--accent-teal)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  CURRENT EXAM FORMAT
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-teal)' }}>
                  {totalQ} questions, {timeMode === 'per_question' ? `${timeSecPerQ}s per question (${computedTotalMinutes} mins total)` : `${timeLimitMinutes} minutes`}
                </div>
              </div>
              <Clock size={28} style={{ color: 'var(--accent-teal)', opacity: 0.8 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.85rem', background: 'var(--bg-card-alt)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Assigned Items</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>
                  {totalQ}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Randomized subset</div>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--bg-card-alt)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Time Allocated</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>
                  {computedTotalMinutes} <span style={{ fontSize: '0.9rem' }}>mins</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Server timer enforced</div>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--bg-card-alt)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Marking Scheme</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  +{settings.marksPerCorrect ?? 4.0} / -{settings.negativeMarking ?? 1.0}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Correct / Incorrect</div>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--bg-card-alt)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Pass Mark</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {settings.passMarkPercentage || 40}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Benchmark to qualify</div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Candidate Code of Conduct
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--text-ink)' }}>
              {(quizInfo?.rules || []).map((rule, idx) => (
                <li key={idx} style={{ marginBottom: '0.45rem' }}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Candidate Entry Card (NAME ONLY) */}
        <div>
          <div className="paper-card">
            <div className="paper-card-header">
              <h3 style={{ fontSize: '1.15rem' }}>Candidate Entry</h3>
              <span className="badge badge-neutral">NAME ONLY</span>
            </div>

            {error && (
              <div className="cheat-alert-banner" role="alert" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Is this you? Duplicate unfinished attempt prompt */}
            {unfinishedPrompt && (
              <div style={{
                background: '#FEF3C7',
                border: '1.5px solid #D97706',
                padding: '1.25rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.5rem',
                color: '#78350F'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <HelpCircle size={18} style={{ color: '#D97706' }} />
                  <span>Is this you?</span>
                </div>
                <p style={{ fontSize: '0.88rem', marginBottom: '1rem', lineHeight: 1.4 }}>
                  An unfinished examination as <strong>"{unfinishedPrompt.name}"</strong> was started on this device. Would you like to resume your existing questions or start a new attempt?
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleResumeUnfinished}
                    disabled={loading}
                    style={{ background: '#D97706', borderColor: '#B45309' }}
                  >
                    <RotateCcw size={14} /> Resume Existing Attempt
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleStartNewAttempt}
                    disabled={loading}
                  >
                    Start New Attempt
                  </button>
                </div>
              </div>
            )}

            {!settings.isQuizActive && (
              <div className="cheat-alert-banner" style={{ background: '#FDF1ED', borderColor: '#C8431F' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>The administrator has temporarily paused the examination. Registration is currently closed.</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="cand-name">
                  Your Name *
                </label>
                <input
                  id="cand-name"
                  type="text"
                  className="form-input"
                  placeholder="Enter your name (e.g. Alex Morgan)"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  disabled={loading || !settings.isQuizActive}
                  maxLength={40}
                  autoComplete="name"
                  autoFocus
                  required
                />
                <div className="form-hint">
                  2 to 40 characters. Letters, spaces, and basic punctuation only.
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <input
                  id="rules-agree"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ marginTop: '0.25rem', width: '18px', height: '18px', accentColor: 'var(--accent-teal)' }}
                  disabled={loading || !settings.isQuizActive}
                />
                <label htmlFor="rules-agree" style={{ fontSize: '0.85rem', color: 'var(--text-ink)', cursor: 'pointer' }}>
                  I solemnly certify that I will undertake this examination independently without unauthorized aids, browser extensions, or tab switching.
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '1.05rem', gap: '0.65rem' }}
                disabled={loading || !settings.isQuizActive}
              >
                {loading ? 'Preparing Examination...' : 'Enter Examination Hall'}
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
