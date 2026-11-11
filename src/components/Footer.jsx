// src/components/Footer.jsx
import React from 'react';
import { Download, FileText, ExternalLink } from 'lucide-react';
import { CONFIG } from '../../config.js';

export default function Footer() {
  return (
    <footer className="footer-bar">
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center', fontSize: '0.85rem' }}>
          <a
            href="/sample/sample-questions.pdf"
            download="sample-questions.pdf"
            style={{ color: 'var(--accent-teal)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
          >
            <Download size={14} /> Download Sample Question PDF
          </a>
          <a
            href="/sample/sample-questions.csv"
            download="sample-questions.csv"
            style={{ color: 'var(--accent-teal)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
          >
            <Download size={14} /> Download Sample Question CSV
          </a>
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {CONFIG.quizName} &bull; Administered by {CONFIG.organization} &bull; Anti-Cheat Server Validation Active
        </div>
      </div>
    </footer>
  );
}
