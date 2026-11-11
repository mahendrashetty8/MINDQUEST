// src/pages/QuizPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Clock, Flag, Check, ChevronLeft, ChevronRight, XCircle,
  AlertTriangle, Send, ShieldAlert, Award
} from 'lucide-react';
import { api } from '../utils/api.js';
import Modal from '../components/Modal.jsx';

export default function QuizPage({ session, onCompleted }) {
  const {
    attemptId,
    participant,
    questions = [],
    remainingSeconds: initialRemainingSeconds = 900,
    answers: initialAnswers = {},
    reviewed: initialReviewed = {},
    tabSwitchCount: initialTabCount = 0
  } = session;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [reviewed, setReviewed] = useState(initialReviewed);
  const [remainingSeconds, setRemainingSeconds] = useState(initialRemainingSeconds);
  const [tabSwitches, setTabSwitches] = useState(initialTabCount);
  const [cheatWarning, setCheatWarning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Sync Timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerAutoSubmit('Time expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time MM:SS
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Anti-cheat Listeners: Visibility Change & Blur
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordTabSwitch('Exited tab / Minimized window');
      }
    };

    const handleBlur = () => {
      recordTabSwitch('Window lost focus');
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      setCheatWarning('Right-click context menu is disabled during the examination.');
      setTimeout(() => setCheatWarning(''), 4000);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [attemptId]);

  // Anti-cheat logger
  const recordTabSwitch = async (reason) => {
    try {
      const res = await api.logTabSwitch({ attemptId, reason });
      setTabSwitches(res.tabSwitchCount);
      if (res.autoSubmitted) {
        setCheatWarning('Maximum window switch violations exceeded. Your exam has been submitted automatically.');
        setTimeout(() => {
          triggerAutoSubmit('Exceeded window switch threshold');
        }, 1500);
      } else {
        setCheatWarning(`Warning: Screen departure detected (${res.tabSwitchCount} / ${res.maxAllowed}). Further departures will force submission.`);
        setTimeout(() => setCheatWarning(''), 6000);
      }
    } catch (err) {
      console.error('Failed to log anti-cheat event:', err);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showSubmitModal || isSubmitting) return;

      // 1-4 or A-D to select options
      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        handleOptionSelect(key);
      } else if (key === '1') handleOptionSelect('A');
      else if (key === '2') handleOptionSelect('B');
      else if (key === '3') handleOptionSelect('C');
      else if (key === '4') handleOptionSelect('D');
      else if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, questions, showSubmitModal, isSubmitting]);

  const currentQ = questions[currentIndex] || {};
  const currentAnswer = answers[currentQ.id] || null;
  const isMarked = Boolean(reviewed[currentQ.id]);

  // Handle Option Click
  const handleOptionSelect = async (optKey) => {
    if (!currentQ.id) return;
    const newAnswers = { ...answers, [currentQ.id]: optKey };
    setAnswers(newAnswers);

    // Save to server in background
    try {
      await api.saveAnswer({
        attemptId,
        questionId: currentQ.id,
        selectedOption: optKey,
        isMarkedForReview: isMarked
      });
    } catch (err) {
      console.warn('Auto-save answer background warning:', err);
    }
  };

  // Clear current question selection
  const handleClearSelection = async () => {
    if (!currentQ.id) return;
    const newAnswers = { ...answers };
    delete newAnswers[currentQ.id];
    setAnswers(newAnswers);

    try {
      await api.saveAnswer({
        attemptId,
        questionId: currentQ.id,
        selectedOption: null,
        isMarkedForReview: isMarked
      });
    } catch (err) {
      console.warn('Clear option background warning:', err);
    }
  };

  // Toggle Mark for Review
  const handleToggleReview = async () => {
    if (!currentQ.id) return;
    const newStatus = !isMarked;
    const newReviewed = { ...reviewed, [currentQ.id]: newStatus };
    setReviewed(newReviewed);

    try {
      await api.saveAnswer({
        attemptId,
        questionId: currentQ.id,
        selectedOption: currentAnswer,
        isMarkedForReview: newStatus
      });
    } catch (err) {
      console.warn('Toggle review background warning:', err);
    }
  };

  // Submit trigger
  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await api.submitQuiz({
        attemptId,
        manualAnswers: answers
      });
      setShowSubmitModal(false);
      onCompleted(response.result);
    } catch (err) {
      alert('Error submitting examination: ' + err.message);
      setIsSubmitting(false);
    }
  };

  const triggerAutoSubmit = async (reason) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await api.submitQuiz({
        attemptId,
        manualAnswers: answers
      });
      onCompleted(response.result);
    } catch (err) {
      console.error('Auto-submit error:', err);
    }
  };

  // Stats Counters
  const totalQuestions = questions.length;
  const attendedCount = Object.keys(answers).filter(qId => answers[qId] !== null && answers[qId] !== "").length;
  const remainingCount = totalQuestions - attendedCount;
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const isTimerLow = remainingSeconds <= 120;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Anti-cheat banner if active */}
      {cheatWarning && (
        <div className="cheat-alert-banner" role="alert">
          <ShieldAlert size={20} style={{ flexShrink: 0 }} />
          <span>{cheatWarning}</span>
        </div>
      )}

      {/* Exam Header Status Bar */}
      <div className="exam-status-bar">
        <div className="participant-badge">
          <span className="participant-name">{participant.name}</span>
          <span className="participant-sub">Candidate &bull; ID: {attemptId.substring(0, 14)}</span>
        </div>

        {/* Live Attended & Remaining Counters */}
        <div className="live-counters">
          <span className="counter-pill attended" title="Questions Answered">
            Attended: {attendedCount} / {totalQuestions}
          </span>
          <span className="counter-pill remaining" title="Questions Remaining">
            Remaining: {remainingCount}
          </span>
        </div>

        {/* Countdown Timer */}
        <div className={`timer-container ${isTimerLow ? 'timer-warning' : ''}`} aria-live="polite">
          <Clock size={18} style={{ color: isTimerLow ? 'var(--signal-warning)' : 'var(--accent-teal)' }} />
          <span className="timer-digits">{formatTimer(remainingSeconds)}</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="progress-container">
        <div className="progress-header">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
          <span>{Math.round(progressPercent)}% Completed</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Main Grid: Question Card (Left) + Palette (Right) */}
      <div className="quiz-layout">
        <div>
          {/* Question Display Card */}
          <div className="question-card">
            <div className="question-meta">
              <span className="question-badge-num">QUESTION {currentIndex + 1}</span>
              <span className="question-category">{currentQ.category || 'General'}</span>
            </div>

            <div className="question-text">
              {currentQ.question || 'Loading question...'}
            </div>

            {/* Tap-Friendly Options */}
            <div className="options-stack" role="radiogroup" aria-label={`Options for question ${currentIndex + 1}`}>
              {['A', 'B', 'C', 'D'].map((key) => {
                const optText = currentQ.options ? currentQ.options[key] : null;
                if (!optText) return null;
                const isSelected = currentAnswer === key;

                return (
                  <div
                    key={key}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    className={`option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleOptionSelect(key)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleOptionSelect(key);
                      }
                    }}
                  >
                    <div className="option-key">{key}</div>
                    <div className="option-content">{optText}</div>
                  </div>
                );
              })}
            </div>

            {/* Action Bar */}
            <div className="question-actions-bar">
              <div className="actions-left">
                <button
                  type="button"
                  className={`btn btn-sm ${isMarked ? 'btn-warning' : 'btn-outline'}`}
                  onClick={handleToggleReview}
                  title="Mark for later review in the question palette"
                >
                  <Flag size={14} />
                  {isMarked ? 'Marked for Review' : 'Mark for Review'}
                </button>

                {currentAnswer && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleClearSelection}
                    title="Clear selected choice"
                  >
                    <XCircle size={14} />
                    Clear Choice
                  </button>
                )}
              </div>

              <div className="actions-right">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  aria-label="Previous question"
                >
                  <ChevronLeft size={16} />
                  Prev
                </button>

                {currentIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                    aria-label="Next question"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setShowSubmitModal(true)}
                    style={{ background: 'var(--accent-teal)' }}
                  >
                    Submit Exam
                    <Send size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Submit Strip for Mobile */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowSubmitModal(true)}
              style={{ fontSize: '0.9rem' }}
            >
              <Send size={14} />
              Finalize & Submit Exam
            </button>
          </div>
        </div>

        {/* Right Column: Question Palette */}
        <div>
          <div className="palette-card">
            <h4 className="palette-title">Question Palette</h4>

            <div className="palette-legend">
              <div className="legend-item">
                <div className="legend-chip answered" />
                <span>Answered ({attendedCount})</span>
              </div>
              <div className="legend-item">
                <div className="legend-chip review" />
                <span>Marked for Review ({Object.values(reviewed).filter(Boolean).length})</span>
              </div>
              <div className="legend-item">
                <div className="legend-chip unattended" />
                <span>Unattended ({remainingCount})</span>
              </div>
            </div>

            <div className="palette-grid" role="group" aria-label="Question Navigation Palette">
              {questions.map((q, idx) => {
                const isAns = Boolean(answers[q.id]);
                const isRev = Boolean(reviewed[q.id]);
                const isCurr = idx === currentIndex;

                let classes = 'palette-btn';
                if (isAns) classes += ' answered';
                if (isRev) classes += ' reviewed';
                if (isCurr) classes += ' active';

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    className={classes}
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Jump to question ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-rule)' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => setShowSubmitModal(true)}
              >
                <Send size={16} />
                Submit Examination
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Submit Confirmation Dialog */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Confirm Examination Submission"
        actions={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowSubmitModal(false)}
              disabled={isSubmitting}
            >
              Return to Exam
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Evaluating Score...' : 'Confirm & Submit'}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: '1rem', color: 'var(--text-ink)' }}>
          Are you ready to submit your exam responses? Once submitted, your answers will be evaluated server-side and your final score recorded.
        </p>

        <div style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border-dark)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
            <span>Attended Items:</span>
            <strong>{attendedCount} of {totalQuestions}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', color: remainingCount > 0 ? 'var(--signal-warning)' : 'var(--text-ink)' }}>
            <span>Unattended Items:</span>
            <strong>{remainingCount}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
            <span>Marked for Review:</span>
            <strong>{Object.values(reviewed).filter(Boolean).length}</strong>
          </div>
        </div>

        {remainingCount > 0 && (
          <p style={{ fontSize: '0.85rem', color: 'var(--signal-warning)', fontWeight: 600 }}>
            Notice: You still have {remainingCount} unattended questions. Unattended questions receive zero marks.
          </p>
        )}
      </Modal>
    </div>
  );
}
