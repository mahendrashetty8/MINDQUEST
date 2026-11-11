// server/auth.js
// Admin authentication handling
import crypto from 'crypto';
import { CONFIG } from '../config.js';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'pragyan-quiz-secret-token-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || CONFIG.adminPassword;

// Active admin sessions: token -> timestamp
const activeSessions = new Map();

export function adminLogin(password) {
  if (password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, Date.now());
    return { success: true, token };
  }
  return { success: false, error: 'Invalid admin credentials' };
}

export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  if (!activeSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
  }

  // Refresh session timestamp
  activeSessions.set(token, Date.now());
  next();
}
