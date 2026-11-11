// src/pages/Admin/AdminLogin.jsx
import React, { useState } from 'react';
import { Lock, Shield, ArrowRight, AlertCircle } from 'lucide-react';
import { api, setAdminToken } from '../../utils/api.js';

export default function AdminLogin({ onLoginSuccess, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.adminLogin(password);
      if (res.token) {
        setAdminToken(res.token);
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || 'Incorrect administrator password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '4rem auto' }}>
      <div className="paper-card" style={{ padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            background: 'var(--accent-teal-soft)',
            border: '1.5px solid var(--accent-teal)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '0.75rem'
          }}>
            <Shield size={24} style={{ color: 'var(--accent-teal)' }} />
          </div>
          <h2 style={{ fontSize: '1.4rem' }}>Administrator Portal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Restricted access for competition controllers and proctors.
          </p>
        </div>

        {error && (
          <div className="cheat-alert-banner" role="alert" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-pass">Access Password</label>
            <input
              id="admin-pass"
              type="password"
              className="form-input"
              placeholder="Enter admin password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className="btn btn-outline"
            style={{ width: '100%' }}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel & Return
          </button>
        </form>
      </div>
    </div>
  );
}
