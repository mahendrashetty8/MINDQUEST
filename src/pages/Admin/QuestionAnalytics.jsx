// src/pages/Admin/QuestionAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Users, Award, CheckCircle } from 'lucide-react';
import { api } from '../../utils/api.js';

export default function QuestionAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboard();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Calculating analytics...</div>;
  }

  const {
    totalRegistered = 0,
    totalStarted = 0,
    totalCompleted = 0,
    averageScore = 0,
    passRate = 0,
    bankSize = 0,
    questionStats = []
  } = stats;

  return (
    <div>
      {/* High-Level Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-press)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Total Registered</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{totalRegistered}</div>
        </div>

        <div style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-press)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>In Progress</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>{totalStarted}</div>
        </div>

        <div style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-press)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Completed</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#1E824C' }}>{totalCompleted}</div>
        </div>

        <div style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-press)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Average Score</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{averageScore}</div>
        </div>

        <div style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-press)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Pass Rate</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{passRate}%</div>
        </div>

        <div style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-press)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Bank Size</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{bankSize}</div>
        </div>
      </div>

      {/* Question Difficulty & Error Rate Table */}
      <div className="paper-card">
        <div className="paper-card-header">
          <div>
            <h3 style={{ fontSize: '1.2rem' }}>Item Difficulty & Error Rate Analytics</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Identifies the most challenging questions where candidates made the highest error rates.
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="editorial-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Question</th>
                <th style={{ width: '120px' }}>Category</th>
                <th style={{ width: '90px' }}>Assigned</th>
                <th style={{ width: '90px' }}>Attended</th>
                <th style={{ width: '80px' }}>Correct</th>
                <th style={{ width: '80px' }}>Wrong</th>
                <th style={{ width: '110px' }}>Error Rate</th>
              </tr>
            </thead>
            <tbody>
              {questionStats.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No completed exam submissions recorded yet to compute error metrics.
                  </td>
                </tr>
              ) : (
                questionStats.map((stat, idx) => (
                  <tr key={stat.id || idx}>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{stat.question}</td>
                    <td>
                      <span className="badge badge-neutral">{stat.category}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{stat.timesAssigned}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{stat.timesAttended}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#1E824C' }}>{stat.timesCorrect}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--signal-warning)' }}>{stat.timesWrong}</td>
                    <td>
                      <span className={`badge ${stat.errorRate >= 50 ? 'badge-warning' : 'badge-teal'}`}>
                        {stat.errorRate}%
                      </span>
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
