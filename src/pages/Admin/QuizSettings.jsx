// src/pages/Admin/QuizSettings.jsx
import React, { useState, useEffect } from 'react';
import {
  Save, AlertCircle, CheckCircle2, Power, RotateCcw,
  Clock, Plus, Minus, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { api } from '../../utils/api.js';

export default function QuizSettings({ onSettingsUpdated }) {
  const [settings, setSettings] = useState(null);
  const [bankSize, setBankSize] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [extendingTime, setExtendingTime] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getSettings();
      setSettings(res.settings);
      setBankSize(res.bankSize || 0);
      setActiveCount(res.activeParticipantsCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setMessage({ text: '', type: '' });

    const qCount = parseInt(settings.totalQuestionsPerParticipant, 10);
    if (isNaN(qCount) || qCount < 1) {
      setMessage({ text: 'Error: Number of questions per participant must be at least 1.', type: 'error' });
      return;
    }

    if (bankSize > 0 && qCount > bankSize) {
      setMessage({
        text: `Error: Number of questions per participant (${qCount}) cannot exceed the published question bank size (${bankSize}).`,
        type: 'error'
      });
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateSettings(settings);
      setSettings(res.settings);
      setActiveCount(res.activeParticipantsCount || 0);
      setMessage({
        text: 'Quiz configuration saved successfully. New rules will apply to all subsequent attempts.',
        type: 'success'
      });
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      setMessage({ text: err.message || 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all quiz settings to default values?')) return;
    setSaving(true);
    try {
      const res = await api.resetSettingsToDefault();
      setSettings(res.settings);
      setMessage({ text: 'Settings restored to default configuration.', type: 'success' });
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      setMessage({ text: err.message || 'Reset failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleExtendActiveTime = async (minutes) => {
    if (activeCount === 0) {
      alert('There are currently no active participants taking the quiz.');
      return;
    }

    const confirmed = window.confirm(
      `Extend examination time by +${minutes} minute(s) for all ${activeCount} active participants currently in session?`
    );
    if (!confirmed) return;

    setExtendingTime(true);
    try {
      const res = await api.extendActiveTime(minutes);
      setMessage({
        text: `Successfully added +${minutes} minute(s) for ${res.affectedCount} active participant(s).`,
        type: 'success'
      });
      await fetchSettings();
    } catch (err) {
      alert('Error extending time: ' + err.message);
    } finally {
      setExtendingTime(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      const res = await api.toggleQuiz();
      setSettings(prev => ({ ...prev, isQuizActive: res.isQuizActive }));
      setMessage({
        text: res.isQuizActive ? 'Quiz is now ACTIVE and accepting candidates.' : 'Quiz is now PAUSED.',
        type: 'success'
      });
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      alert('Toggle error: ' + err.message);
    }
  };

  if (loading || !settings) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading configuration...</div>;
  }

  const qCount = parseInt(settings.totalQuestionsPerParticipant, 10) || 1;
  const timeMode = settings.timeLimitMode || 'total';

  return (
    <div style={{ maxWidth: '860px' }}>
      <div className="paper-card">
        <div className="paper-card-header">
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>Competition Engine & Proctor Settings</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Configure item subset size, exam duration, scoring scheme, and device rules.
            </p>
          </div>

          <button
            type="button"
            className={`btn btn-sm ${settings.isQuizActive ? 'btn-primary' : 'btn-warning'}`}
            onClick={handleToggleActive}
            style={{ gap: '6px' }}
          >
            <Power size={14} />
            {settings.isQuizActive ? 'Quiz is Active (Click to Pause)' : 'Quiz is Paused (Click to Open)'}
          </button>
        </div>

        {/* Warning if participants are taking the quiz */}
        {activeCount > 0 && (
          <div style={{
            background: '#FEF3C7',
            border: '1.5px solid #D97706',
            color: '#78350F',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <AlertTriangle size={20} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                Active Participants Warning ({activeCount} taking quiz)
              </div>
              <div style={{ fontSize: '0.88rem', lineHeight: 1.4 }}>
                There are currently <strong>{activeCount} participant(s)</strong> actively taking the quiz. Saving new settings applies only to attempts that start after saving. In-progress attempts preserve their initial question count and duration.
              </div>
            </div>
          </div>
        )}

        {/* Proctor Live Time Extension Widget */}
        <div style={{
          background: 'var(--bg-card-alt)',
          border: '1.5px solid var(--border-dark)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} style={{ color: 'var(--accent-teal)' }} />
              Live Proctor Time Extension
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Add emergency time for all {activeCount} active candidate(s) currently taking the exam.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => handleExtendActiveTime(1)}
              disabled={extendingTime || activeCount === 0}
            >
              +1 min
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => handleExtendActiveTime(5)}
              disabled={extendingTime || activeCount === 0}
            >
              +5 min
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => handleExtendActiveTime(10)}
              disabled={extendingTime || activeCount === 0}
            >
              +10 min
            </button>
          </div>
        </div>

        {message.text && (
          <div style={{
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-dark)',
            background: message.type === 'error' ? 'var(--signal-warning-soft)' : 'var(--accent-teal-soft)',
            color: message.type === 'error' ? 'var(--signal-warning)' : 'var(--accent-teal)',
            fontWeight: 600,
            fontSize: '0.88rem'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Number of questions per participant with +/- buttons */}
            <div className="form-group" style={{ background: 'var(--bg-card-alt)', padding: '1rem', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)' }}>
              <label className="form-label" htmlFor="set-total-q">
                Number of Questions per Participant *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  style={{ width: '40px', height: '40px', padding: 0 }}
                  onClick={() => {
                    const next = Math.max(1, qCount - 1);
                    setSettings({ ...settings, totalQuestionsPerParticipant: next });
                  }}
                  disabled={qCount <= 1}
                  aria-label="Decrease question count"
                >
                  <Minus size={16} />
                </button>

                <input
                  id="set-total-q"
                  type="number"
                  min="1"
                  max={bankSize || 100}
                  className="form-input"
                  style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)', width: '100px' }}
                  value={settings.totalQuestionsPerParticipant}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setSettings({ ...settings, totalQuestionsPerParticipant: isNaN(val) ? '' : val });
                  }}
                  required
                />

                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  style={{ width: '40px', height: '40px', padding: 0 }}
                  onClick={() => {
                    const next = Math.min(bankSize || 100, qCount + 1);
                    setSettings({ ...settings, totalQuestionsPerParticipant: next });
                  }}
                  disabled={bankSize > 0 && qCount >= bankSize}
                  aria-label="Increase question count"
                >
                  <Plus size={16} />
                </button>

                <span style={{
                  padding: '0.35rem 0.75rem',
                  background: 'var(--accent-teal)',
                  color: '#FFFDF8',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600
                }}>
                  Bank has {bankSize} questions
                </span>
              </div>
              <div className="form-hint">
                Must be between 1 and total published questions in the bank ({bankSize}).
              </div>
            </div>

            {/* Time limit controls: Total vs Per Question */}
            <div className="form-group" style={{ background: 'var(--bg-card-alt)', padding: '1rem', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)' }}>
              <label className="form-label">
                Time Limit Mode *
              </label>

              {/* Mode Selection */}
              <div style={{ display: 'flex', gap: '1rem', margin: '0.5rem 0 0.85rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="timeLimitMode"
                    value="total"
                    checked={timeMode === 'total'}
                    onChange={() => setSettings({ ...settings, timeLimitMode: 'total' })}
                    style={{ accentColor: 'var(--accent-teal)' }}
                  />
                  Total Quiz Time (Minutes)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="timeLimitMode"
                    value="per_question"
                    checked={timeMode === 'per_question'}
                    onChange={() => setSettings({ ...settings, timeLimitMode: 'per_question' })}
                    style={{ accentColor: 'var(--accent-teal)' }}
                  />
                  Time Per Question (Seconds)
                </label>
              </div>

              {/* Input & Presets */}
              {timeMode === 'total' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min="1"
                      max="360"
                      className="form-input"
                      style={{ width: '120px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                      value={settings.timeLimitMinutes || 15}
                      onChange={(e) => setSettings({ ...settings, timeLimitMinutes: parseInt(e.target.value, 10) || 1 })}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Minutes</span>
                  </div>

                  {/* Presets: 5, 10, 15, 30, 60 min */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Presets:</span>
                    {[5, 10, 15, 30, 60].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        className={`btn btn-sm ${settings.timeLimitMinutes === mins ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0 8px', minHeight: '28px', fontSize: '0.75rem' }}
                        onClick={() => setSettings({ ...settings, timeLimitMinutes: mins })}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min="10"
                      max="600"
                      className="form-input"
                      style={{ width: '120px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                      value={settings.timeLimitSecondsPerQuestion || 60}
                      onChange={(e) => setSettings({ ...settings, timeLimitSecondsPerQuestion: parseInt(e.target.value, 10) || 10 })}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Seconds / Question</span>
                  </div>

                  {/* Presets for seconds */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Presets:</span>
                    {[30, 45, 60, 90, 120].map(secs => (
                      <button
                        key={secs}
                        type="button"
                        className={`btn btn-sm ${settings.timeLimitSecondsPerQuestion === secs ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0 8px', minHeight: '28px', fontSize: '0.75rem' }}
                        onClick={() => setSettings({ ...settings, timeLimitSecondsPerQuestion: secs })}
                      >
                        {secs}s
                      </button>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', marginTop: '0.4rem', fontWeight: 600 }}>
                    Computed Total Duration: {Math.ceil(((settings.timeLimitSecondsPerQuestion || 60) * qCount) / 60)} minutes
                  </div>
                </div>
              )}
            </div>

            {/* Marks Per Correct */}
            <div className="form-group">
              <label className="form-label" htmlFor="set-marks-correct">
                Marks Per Correct Answer *
              </label>
              <input
                id="set-marks-correct"
                type="number"
                step="0.5"
                min="0.5"
                className="form-input"
                value={settings.marksPerCorrect}
                onChange={(e) => setSettings({ ...settings, marksPerCorrect: parseFloat(e.target.value) || 1 })}
                required
              />
            </div>

            {/* Negative Marking */}
            <div className="form-group">
              <label className="form-label" htmlFor="set-neg-mark">
                Negative Marking Per Incorrect Answer
              </label>
              <input
                id="set-neg-mark"
                type="number"
                step="0.25"
                min="0"
                className="form-input"
                value={settings.negativeMarking}
                onChange={(e) => setSettings({ ...settings, negativeMarking: parseFloat(e.target.value) || 0 })}
              />
              <div className="form-hint">Set to 0 for no negative marking penalty.</div>
            </div>

            {/* Pass Mark % */}
            <div className="form-group">
              <label className="form-label" htmlFor="set-pass-mark">
                Qualifying Pass Mark (%)
              </label>
              <input
                id="set-pass-mark"
                type="number"
                min="1"
                max="100"
                className="form-input"
                value={settings.passMarkPercentage}
                onChange={(e) => setSettings({ ...settings, passMarkPercentage: parseInt(e.target.value, 10) || 40 })}
              />
            </div>

            {/* Anti-cheat Max Tab switches */}
            <div className="form-group">
              <label className="form-label" htmlFor="set-max-tab">
                Max Allowed Window/Tab Exits Before Auto-Submit
              </label>
              <input
                id="set-max-tab"
                type="number"
                min="1"
                max="10"
                className="form-input"
                value={settings.maxTabSwitchesAllowed}
                onChange={(e) => setSettings({ ...settings, maxTabSwitchesAllowed: parseInt(e.target.value, 10) || 3 })}
              />
            </div>
          </div>

          {/* Toggle Switches */}
          <div style={{
            background: 'var(--bg-card-alt)',
            border: '1px solid var(--border-dark)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {/* Allow multiple attempts per device toggle (off by default) */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.95rem' }}>
              <input
                type="checkbox"
                checked={Boolean(settings.allowMultipleAttemptsPerDevice)}
                onChange={(e) => setSettings({ ...settings, allowMultipleAttemptsPerDevice: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-teal)' }}
              />
              <span>
                <strong>Allow Multiple Attempts Per Device:</strong> When turned OFF (default), only one attempt is permitted per device/browser session.
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.95rem' }}>
              <input
                type="checkbox"
                checked={settings.shuffleOptions}
                onChange={(e) => setSettings({ ...settings, shuffleOptions: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-teal)' }}
              />
              <span><strong>Shuffle Options:</strong> Randomize option sequence (A-D) per participant for fairness.</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.95rem' }}>
              <input
                type="checkbox"
                checked={settings.showResultsImmediately}
                onChange={(e) => setSettings({ ...settings, showResultsImmediately: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-teal)' }}
              />
              <span><strong>Instant Results:</strong> Reveal total score and rank to candidate immediately upon submit.</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.95rem' }}>
              <input
                type="checkbox"
                checked={settings.showAnswerReviewAfterSubmit}
                onChange={(e) => setSettings({ ...settings, showAnswerReviewAfterSubmit: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-teal)' }}
              />
              <span><strong>Show Answer Key After Submit:</strong> Reveal question review and correct options to candidate after exam completion.</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ gap: '0.5rem' }}
            >
              <Save size={16} />
              {saving ? 'Saving Settings...' : 'Save Settings'}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleResetDefaults}
              disabled={saving}
              style={{ gap: '0.5rem' }}
            >
              <RotateCcw size={16} />
              Reset to Defaults
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
