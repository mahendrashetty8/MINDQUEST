// src/pages/Admin/QuestionUploadReview.jsx
import React, { useState, useEffect } from 'react';
import {
  Upload, FileText, CheckCircle2, AlertTriangle, Edit3, Trash2,
  Plus, Check, Download, AlertCircle, Eye, RefreshCw
} from 'lucide-react';
import { api } from '../../utils/api.js';
import Modal from '../../components/Modal.jsx';

export default function QuestionUploadReview({ onBankUpdated }) {
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'bank'
  const [stagingQuestions, setStagingQuestions] = useState([]);
  const [publishedQuestions, setPublishedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // Modal editing state
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isEditingStaged, setIsEditingStaged] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newQuestionForm, setNewQuestionForm] = useState({
    question: '',
    options: { A: '', B: '', C: '', D: '' },
    answer: 'A',
    category: 'General'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stageRes, pubRes] = await Promise.all([
        api.getStagingQuestions(),
        api.getQuestions()
      ]);
      setStagingQuestions(stageRes.stagingQuestions || []);
      setPublishedQuestions(pubRes.questions || []);
    } catch (err) {
      console.error('Fetch questions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Upload PDF Handler
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatusMessage({ text: 'Parsing PDF question bank on server...', type: 'info' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.uploadPdf(formData);
      setStagingQuestions(res.stagingQuestions || []);
      setActiveTab('review');
      setStatusMessage({
        text: `Parsed ${res.count} questions (${res.validCount} valid, ${res.invalidCount} need review). Please inspect before publishing.`,
        type: res.invalidCount > 0 ? 'warning' : 'success'
      });
    } catch (err) {
      setStatusMessage({ text: err.message || 'Failed to parse PDF', type: 'error' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Upload CSV Handler
  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatusMessage({ text: 'Parsing CSV question bank...', type: 'info' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.uploadCsv(formData);
      setStagingQuestions(res.stagingQuestions || []);
      setActiveTab('review');
      setStatusMessage({
        text: `Parsed ${res.count} items (${res.validCount} valid, ${res.invalidCount} need review).`,
        type: 'success'
      });
    } catch (err) {
      setStatusMessage({ text: err.message || 'Failed to parse CSV', type: 'error' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Save Staged Edits
  const handleSaveEdit = async () => {
    if (!editingQuestion) return;

    // Check validity
    const issues = [];
    if (!editingQuestion.question || editingQuestion.question.length < 5) issues.push('Missing question text');
    if (!editingQuestion.options.A) issues.push('Missing option A');
    if (!editingQuestion.options.B) issues.push('Missing option B');
    if (!editingQuestion.options.C) issues.push('Missing option C');
    if (!editingQuestion.options.D) issues.push('Missing option D');
    if (!['A', 'B', 'C', 'D'].includes(editingQuestion.answer)) issues.push('Answer must be A, B, C, or D');

    const updated = {
      ...editingQuestion,
      isValid: issues.length === 0,
      issues
    };

    if (isEditingStaged) {
      const nextStaging = stagingQuestions.map(q => q.id === updated.id ? updated : q);
      setStagingQuestions(nextStaging);
      await api.updateStagingQuestions(nextStaging);
    } else {
      await api.updateQuestion(updated.id, updated);
      const pubRes = await api.getQuestions();
      setPublishedQuestions(pubRes.questions || []);
    }

    setEditingQuestion(null);
    setStatusMessage({ text: 'Item updated successfully.', type: 'success' });
  };

  // Delete staged item
  const handleDeleteStaged = async (id) => {
    const nextStaging = stagingQuestions.filter(q => q.id !== id);
    setStagingQuestions(nextStaging);
    await api.updateStagingQuestions(nextStaging);
  };

  // Delete published item
  const handleDeletePublished = async (id) => {
    if (!window.confirm('Delete this question from the active bank?')) return;
    await api.deleteQuestion(id);
    const pubRes = await api.getQuestions();
    setPublishedQuestions(pubRes.questions || []);
    if (onBankUpdated) onBankUpdated();
  };

  // Publish reviewed questions
  const handlePublishStaged = async (replaceExisting = false) => {
    const invalidCount = stagingQuestions.filter(q => !q.isValid).length;
    if (invalidCount > 0) {
      if (!window.confirm(`${invalidCount} question(s) have parsing issues. Only valid questions will be published. Continue?`)) {
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.publishStagingQuestions(replaceExisting);
      setStatusMessage({ text: res.message, type: 'success' });
      await fetchData();
      setActiveTab('bank');
      if (onBankUpdated) onBankUpdated();
    } catch (err) {
      setStatusMessage({ text: err.message || 'Publishing failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Manual Question Creation
  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionForm.question.trim()) return;

    try {
      await api.createQuestion(newQuestionForm);
      setIsCreateModalOpen(false);
      setNewQuestionForm({
        question: '',
        options: { A: '', B: '', C: '', D: '' },
        answer: 'A',
        category: 'General'
      });
      await fetchData();
      setStatusMessage({ text: 'New question added to active bank.', type: 'success' });
      if (onBankUpdated) onBankUpdated();
    } catch (err) {
      alert('Error creating question: ' + err.message);
    }
  };

  const validStagingCount = stagingQuestions.filter(q => q.isValid).length;
  const invalidStagingCount = stagingQuestions.filter(q => !q.isValid).length;

  return (
    <div>
      {/* Upload & Sample Section */}
      <div className="paper-card" style={{ marginBottom: '1.5rem' }}>
        <div className="paper-card-header">
          <div>
            <h3 style={{ fontSize: '1.2rem' }}>Upload Question Bank</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Upload questions in standardized PDF or CSV format. Parsed questions enter a mandatory review stage before publishing.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a
              href="/sample/sample-questions.pdf"
              download="sample-questions.pdf"
              className="btn btn-sm btn-outline"
            >
              <Download size={14} /> Download Sample PDF
            </a>
            <a
              href="/sample/sample-questions.csv"
              download="sample-questions.csv"
              className="btn btn-sm btn-outline"
            >
              <Download size={14} /> Download Sample CSV
            </a>
          </div>
        </div>

        {/* Upload Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            <Upload size={16} />
            {uploading ? 'Parsing PDF...' : 'Upload Question PDF'}
            <input
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>

          <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
            <FileText size={16} />
            {uploading ? 'Parsing CSV...' : 'Upload Question CSV'}
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} /> Add Single Question
          </button>
        </div>

        {statusMessage.text && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-dark)',
            background: statusMessage.type === 'error' ? 'var(--signal-warning-soft)' : statusMessage.type === 'warning' ? '#FEF3C7' : 'var(--accent-teal-soft)',
            color: statusMessage.type === 'error' ? 'var(--signal-warning)' : statusMessage.type === 'warning' ? '#92400E' : 'var(--accent-teal)',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}>
            {statusMessage.text}
          </div>
        )}
      </div>

      {/* Tabs: Staged Review vs Active Bank */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'review' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('review')}
        >
          Review Staged Questions ({stagingQuestions.length})
          {invalidStagingCount > 0 && (
            <span style={{ background: 'var(--signal-warning)', color: '#FFFDF8', borderRadius: '10px', padding: '1px 6px', fontSize: '0.75rem', marginLeft: '4px' }}>
              {invalidStagingCount} flagged
            </span>
          )}
        </button>

        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'bank' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('bank')}
        >
          Active Published Bank ({publishedQuestions.length})
        </button>
      </div>

      {/* TAB 1: REVIEW STAGED QUESTIONS */}
      {activeTab === 'review' && (
        <div className="paper-card">
          <div className="paper-card-header">
            <div>
              <h4 style={{ fontSize: '1.1rem' }}>Mandatory Review Before Publishing</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Inspect extracted questions, verify options (A-D) and answer key. Flagged items must be resolved before publishing.
              </p>
            </div>

            {stagingQuestions.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => handlePublishStaged(false)}
                  disabled={validStagingCount === 0 || loading}
                >
                  <Check size={14} /> Append {validStagingCount} to Active Bank
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => handlePublishStaged(true)}
                  disabled={validStagingCount === 0 || loading}
                  title="Replaces existing question bank with this reviewed set"
                >
                  Replace Entire Bank
                </button>
              </div>
            )}
          </div>

          {stagingQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <FileText size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
              <p style={{ fontWeight: 600 }}>No staged questions in review.</p>
              <p style={{ fontSize: '0.85rem' }}>Upload a PDF or CSV above to parse questions into this review table.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="editorial-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Question Text</th>
                    <th style={{ width: '220px' }}>Options Preview</th>
                    <th style={{ width: '80px' }}>Answer</th>
                    <th style={{ width: '120px' }}>Status</th>
                    <th style={{ width: '110px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stagingQuestions.map((q, idx) => (
                    <tr key={q.id || idx} style={{ background: q.isValid ? 'inherit' : '#FFF5F2' }}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-ink)' }}>{q.question}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Category: {q.category || 'General'}</div>
                        {!q.isValid && (
                          <div style={{ color: 'var(--signal-warning)', fontSize: '0.78rem', marginTop: '4px' }}>
                            ⚠ {q.issues.join(', ')}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                        <div><strong>A:</strong> {q.options.A || <em style={{ color: 'var(--signal-warning)' }}>Missing</em>}</div>
                        <div><strong>B:</strong> {q.options.B || <em style={{ color: 'var(--signal-warning)' }}>Missing</em>}</div>
                        <div><strong>C:</strong> {q.options.C || <em style={{ color: 'var(--signal-warning)' }}>Missing</em>}</div>
                        <div><strong>D:</strong> {q.options.D || <em style={{ color: 'var(--signal-warning)' }}>Missing</em>}</div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: q.answer ? 'var(--accent-teal)' : 'var(--signal-warning)' }}>
                        {q.answer || '?'}
                      </td>
                      <td>
                        {q.isValid ? (
                          <span className="badge badge-teal">Verified</span>
                        ) : (
                          <span className="badge badge-warning">Needs Fix</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{ padding: '0 6px', minHeight: '30px' }}
                            onClick={() => {
                              setIsEditingStaged(true);
                              setEditingQuestion({ ...q });
                            }}
                            title="Edit / Fix question"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{ padding: '0 6px', minHeight: '30px', color: 'var(--signal-warning)' }}
                            onClick={() => handleDeleteStaged(q.id)}
                            title="Remove from staging"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE PUBLISHED BANK */}
      {activeTab === 'bank' && (
        <div className="paper-card">
          <div className="paper-card-header">
            <div>
              <h4 style={{ fontSize: '1.1rem' }}>Active Question Bank ({publishedQuestions.length} Items)</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                These questions are live and available for random candidate subset generation.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={fetchData}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {publishedQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
              No published questions in active bank.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="editorial-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Question</th>
                    <th style={{ width: '220px' }}>Options</th>
                    <th style={{ width: '70px' }}>Answer</th>
                    <th style={{ width: '90px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {publishedQuestions.map((q, idx) => (
                    <tr key={q.id || idx}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{q.question}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category: {q.category || 'General'}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>
                        <div>A: {q.options.A}</div>
                        <div>B: {q.options.B}</div>
                        <div>C: {q.options.C}</div>
                        <div>D: {q.options.D}</div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-teal)' }}>
                        {q.answer}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{ padding: '0 6px', minHeight: '30px' }}
                            onClick={() => {
                              setIsEditingStaged(false);
                              setEditingQuestion({ ...q });
                            }}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            style={{ padding: '0 6px', minHeight: '30px', color: 'var(--signal-warning)' }}
                            onClick={() => handleDeletePublished(q.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <Modal
          isOpen={Boolean(editingQuestion)}
          onClose={() => setEditingQuestion(null)}
          title={`Edit Question (${isEditingStaged ? 'Staging Review' : 'Active Bank'})`}
          maxWidth="640px"
          actions={
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setEditingQuestion(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEdit}
              >
                Save Changes
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Question Text</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={editingQuestion.question}
              onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">Option A</label>
              <input
                type="text"
                className="form-input"
                value={editingQuestion.options.A || ''}
                onChange={(e) => setEditingQuestion({
                  ...editingQuestion,
                  options: { ...editingQuestion.options, A: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="form-label">Option B</label>
              <input
                type="text"
                className="form-input"
                value={editingQuestion.options.B || ''}
                onChange={(e) => setEditingQuestion({
                  ...editingQuestion,
                  options: { ...editingQuestion.options, B: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="form-label">Option C</label>
              <input
                type="text"
                className="form-input"
                value={editingQuestion.options.C || ''}
                onChange={(e) => setEditingQuestion({
                  ...editingQuestion,
                  options: { ...editingQuestion.options, C: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="form-label">Option D</label>
              <input
                type="text"
                className="form-input"
                value={editingQuestion.options.D || ''}
                onChange={(e) => setEditingQuestion({
                  ...editingQuestion,
                  options: { ...editingQuestion.options, D: e.target.value }
                })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Correct Answer</label>
              <select
                className="form-select"
                value={editingQuestion.answer}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, answer: e.target.value.toUpperCase() })}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                type="text"
                className="form-input"
                value={editingQuestion.category || 'General'}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Manual Add Question Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Add New Question to Active Bank"
          maxWidth="640px"
          actions={
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateQuestion}
              >
                Add Question
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Question Text</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="e.g. Which layer of the OSI model does TLS operate at?"
              value={newQuestionForm.question}
              onChange={(e) => setNewQuestionForm({ ...newQuestionForm, question: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">Option A</label>
              <input
                type="text"
                className="form-input"
                value={newQuestionForm.options.A}
                onChange={(e) => setNewQuestionForm({
                  ...newQuestionForm,
                  options: { ...newQuestionForm.options, A: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="form-label">Option B</label>
              <input
                type="text"
                className="form-input"
                value={newQuestionForm.options.B}
                onChange={(e) => setNewQuestionForm({
                  ...newQuestionForm,
                  options: { ...newQuestionForm.options, B: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="form-label">Option C</label>
              <input
                type="text"
                className="form-input"
                value={newQuestionForm.options.C}
                onChange={(e) => setNewQuestionForm({
                  ...newQuestionForm,
                  options: { ...newQuestionForm.options, C: e.target.value }
                })}
              />
            </div>
            <div>
              <label className="form-label">Option D</label>
              <input
                type="text"
                className="form-input"
                value={newQuestionForm.options.D}
                onChange={(e) => setNewQuestionForm({
                  ...newQuestionForm,
                  options: { ...newQuestionForm.options, D: e.target.value }
                })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Correct Answer Key</label>
              <select
                className="form-select"
                value={newQuestionForm.answer}
                onChange={(e) => setNewQuestionForm({ ...newQuestionForm, answer: e.target.value })}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category / Subject</label>
              <input
                type="text"
                className="form-input"
                value={newQuestionForm.category}
                onChange={(e) => setNewQuestionForm({ ...newQuestionForm, category: e.target.value })}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
