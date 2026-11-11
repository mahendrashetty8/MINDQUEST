// src/pages/ResultPage.jsx
import React, { useState } from 'react';
import {
  Award, Download, CheckCircle2, XCircle, Clock,
  FileText, ArrowRight, RotateCcw, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import { exportParticipantResultPdf } from '../utils/pdfExport.js';

export default function ResultPage({ result, quizInfo, onReturnHome, onViewLeaderboard }) {
  const [showReview, setShowReview] = useState(false);

  const {
    participant = {},
    totalQuestions = 0,
    attended = 0,
    unattended = 0,
    correct = 0,
    wrong = 0,
    finalScore = 0,
    maxPossibleScore = 0,
    percentage = 0,
    passed = false,
    passMarkPercentage = 40,
    timeTakenSeconds = 0,
    rank = null,
    tabSwitchCount = 0,
    questionReview = []
  } = result;

  const handleDownloadScorecard = () => {
    exportParticipantResultPdf(result, quizInfo);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      {/* Editorial Certificate / Result Stamp Card */}
      <div className="paper-card" style={{ padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span className="badge badge-teal" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
            {quizInfo?.organization || 'ACADEMIC COMPETITION COUNCIL'}
          </span>
          <span className="badge badge-neutral">OFFICIAL TRANSCRIPT</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', marginBottom: '0.5rem' }}>
          Examination Performance Report
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem' }}>
          Candidate: <strong>{participant.name}</strong> &bull; Attempt ID: <code>{result.attemptId}</code>
        </p>

        {/* Primary Score Board */}
        <div style={{
          background: 'var(--accent-teal)',
          color: '#FFFDF8',
          padding: '2rem',
          borderRadius: 'var(--radius-md)',
          maxWidth: '560px',
          margin: '0 auto 2rem auto',
          border: '2px solid var(--border-dark)',
          boxShadow: 'var(--shadow-lift)'
        }}>
          <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.9 }}>
            Total Merit Score
          </div>
          <div style={{ fontSize: 'clamp(2.8rem, 6vw, 4.2rem)', fontWeight: 800, fontFamily: 'var(--font-mono)', lineHeight: 1.1, margin: '0.5rem 0' }}>
            {finalScore} <span style={{ fontSize: '1.6rem', fontWeight: 500, opacity: 0.85 }}>/ {maxPossibleScore}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {percentage}%
            </span>
            <span style={{ height: '18px', width: '1px', background: 'rgba(255,253,248,0.3)' }} />
            <span style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              padding: '0.2rem 0.75rem',
              borderRadius: '2px',
              background: passed ? '#1E824C' : '#96281B',
              border: '1px solid #FFFDF8'
            }}>
              {passed ? 'QUALIFIED / PASSED' : 'UNSUCCESSFUL'}
            </span>
            {rank && (
              <>
                <span style={{ height: '18px', width: '1px', background: 'rgba(255,253,248,0.3)' }} />
                <span style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  Rank #{rank}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', maxWidth: '720px', margin: '0 auto 2rem auto' }}>
          <div style={{ padding: '0.75rem', background: 'var(--bg-card-alt)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{totalQuestions}</div>
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-card-alt)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attended</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>{attended}</div>
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-card-alt)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unattended</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: unattended > 0 ? 'var(--signal-warning)' : 'var(--text-ink)' }}>{unattended}</div>
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-card-alt)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Correct</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#1E824C' }}>{correct}</div>
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-card-alt)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Incorrect</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--signal-warning)' }}>{wrong}</div>
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-card-alt)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Time Elapsed</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{formatTime(timeTakenSeconds)}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownloadScorecard}
            style={{ gap: '0.65rem' }}
          >
            <Download size={16} />
            Download Printable Scorecard (PDF)
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={onViewLeaderboard}
            style={{ gap: '0.65rem' }}
          >
            <Award size={16} />
            View Live Leaderboard
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={onReturnHome}
            style={{ gap: '0.65rem' }}
          >
            <RotateCcw size={16} />
            Home
          </button>
        </div>
      </div>

      {/* Answer Review Section (Only shown if permitted by administrator) */}
      {questionReview && questionReview.length > 0 && (
        <div className="paper-card">
          <div
            className="paper-card-header"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setShowReview(!showReview)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={20} style={{ color: 'var(--accent-teal)' }} />
              <h3 style={{ fontSize: '1.15rem' }}>Itemized Question & Answer Review</h3>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              style={{ minHeight: '32px' }}
            >
              {showReview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showReview ? 'Collapse Review' : 'Expand Review'}
            </button>
          </div>

          {showReview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
              {questionReview.map((item, idx) => {
                const isUnattended = item.isUnattended;
                const isCorrect = item.isCorrect;

                return (
                  <div
                    key={item.id || idx}
                    style={{
                      border: '1px solid var(--border-dark)',
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isCorrect ? '#F4F9F7' : (isUnattended ? 'var(--bg-card-alt)' : '#FDF3F0')
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className="badge badge-neutral">ITEM {idx + 1} &bull; {item.category || 'General'}</span>
                      {isCorrect ? (
                        <span className="badge badge-teal" style={{ background: '#E6F4EA', color: '#137333', borderColor: '#137333' }}>
                          <CheckCircle2 size={13} /> Correct (+4.0)
                        </span>
                      ) : isUnattended ? (
                        <span className="badge badge-neutral">
                          Unattended (0.0)
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          <XCircle size={13} /> Incorrect (-1.0)
                        </span>
                      )}
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '1rem', color: 'var(--text-ink)' }}>
                      {item.question}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                      {['A', 'B', 'C', 'D'].map(optKey => {
                        const optText = item.options ? item.options[optKey] : null;
                        if (!optText) return null;

                        const isUserChoice = item.userAnswer === optKey;
                        const isRealCorrect = item.correctAnswer === optKey;

                        let borderStyle = '1px solid var(--border-rule)';
                        let bgStyle = 'var(--bg-card)';
                        let textWeight = 'normal';

                        if (isRealCorrect) {
                          borderStyle = '2px solid #137333';
                          bgStyle = '#E6F4EA';
                          textWeight = '600';
                        }
                        if (isUserChoice && !isRealCorrect) {
                          borderStyle = '2px solid var(--signal-warning)';
                          bgStyle = '#FDF1ED';
                        }

                        return (
                          <div
                            key={optKey}
                            style={{
                              padding: '0.6rem 0.85rem',
                              border: borderStyle,
                              background: bgStyle,
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontWeight: textWeight
                            }}
                          >
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              width: '24px',
                              height: '24px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isRealCorrect ? '#137333' : (isUserChoice ? 'var(--signal-warning)' : 'var(--bg-card-alt)'),
                              color: (isRealCorrect || isUserChoice) ? '#FFFDF8' : 'var(--text-ink)',
                              borderRadius: '2px',
                              fontSize: '0.8rem'
                            }}>
                              {optKey}
                            </span>
                            <span>{optText}</span>
                            {isRealCorrect && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#137333', fontWeight: 700 }}>ANSWER</span>}
                            {isUserChoice && !isRealCorrect && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--signal-warning)', fontWeight: 700 }}>YOUR CHOICE</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
