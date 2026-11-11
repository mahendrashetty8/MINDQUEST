// server/index.js
// Express API backend server for MindQuest Quiz Competition
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

import { CONFIG } from '../config.js';
import {
  getSettings, updateSettings, resetSettingsToDefault, getActiveAttemptsCount, extendActiveAttemptsTime,
  getQuestions, setQuestions, addQuestion, updateQuestion, deleteQuestion,
  getStagingQuestions, setStagingQuestions, publishStagingQuestions,
  getAttempts, getAttemptById, findAttemptByDeviceId, findActiveAttemptByDeviceAndName,
  saveAttempt, resetAttempt, getDashboardStats, updateRanks
} from './db.js';
import { parsePdfBuffer } from './pdfParser.js';
import { parseCsvContent } from './csvParser.js';
import { adminLogin, requireAdmin } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer memory storage for uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Serve static sample files
const sampleDir = path.join(__dirname, '..', 'sample');
app.use('/sample', express.static(sampleDir));

// Serve production frontend assets if built
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/sample')) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Helper: Fisher-Yates array shuffle
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper: Validate Name (2 to 40 characters, letters, spaces, and basic punctuation)
function validateParticipantName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 40) return false;
  // Allows letters (a-z, A-Z), spaces, and basic punctuation: period, apostrophe, hyphen, comma
  return /^[a-zA-Z\s.'\-,]{2,40}$/.test(trimmed);
}

// ==========================================
// PUBLIC QUIZ ENDPOINTS
// ==========================================

// 1. Get Quiz Public Info & Current Settings
app.get('/api/quiz/info', (req, res) => {
  const settings = getSettings();
  const questions = getQuestions();
  const totalQ = Math.min(settings.totalQuestionsPerParticipant || 10, questions.length || 10);
  const timeMode = settings.timeLimitMode || 'total';
  const timeMinutes = settings.timeLimitMinutes || 15;
  const timeSecPerQ = settings.timeLimitSecondsPerQuestion || 60;
  const computedTotalMinutes = timeMode === 'per_question'
    ? Math.max(1, Math.ceil((timeSecPerQ * totalQ) / 60))
    : timeMinutes;

  res.json({
    quizName: CONFIG.quizName,
    quizSubtitle: CONFIG.quizSubtitle,
    organization: CONFIG.organization,
    logoText: CONFIG.logoText,
    logoBadge: CONFIG.logoBadge,
    rules: CONFIG.rules,
    supportContact: CONFIG.supportContact,
    settings: {
      totalQuestionsPerParticipant: totalQ,
      timeLimitMode: timeMode,
      timeLimitMinutes: timeMinutes,
      timeLimitSecondsPerQuestion: timeSecPerQ,
      computedTotalMinutes,
      marksPerCorrect: settings.marksPerCorrect,
      negativeMarking: settings.negativeMarking,
      passMarkPercentage: settings.passMarkPercentage,
      allowMultipleAttemptsPerDevice: Boolean(settings.allowMultipleAttemptsPerDevice),
      isQuizActive: settings.isQuizActive,
      bankSize: questions.length
    }
  });
});

// 2. Check if an unfinished attempt exists on this device with same name
app.post('/api/quiz/check-device-attempt', (req, res) => {
  const { deviceId, name } = req.body;
  if (!deviceId || !name) {
    return res.json({ hasUnfinished: false });
  }

  const existing = findActiveAttemptByDeviceAndName(deviceId, name);
  if (existing) {
    return res.json({
      hasUnfinished: true,
      attemptId: existing.id,
      name: existing.participant.name,
      startTime: existing.startTime
    });
  }
  return res.json({ hasUnfinished: false });
});

// 3. Register & Start / Resume Attempt (Name-Only Entry)
app.post('/api/quiz/register-and-start', (req, res) => {
  const { name, deviceId, forceNew, resumeAttemptId } = req.body;

  // If client explicitly requested resuming an existing attempt
  if (resumeAttemptId) {
    const existing = getAttemptById(resumeAttemptId);
    if (existing && existing.status === 'in_progress') {
      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.floor((existing.endTime - now) / 1000));
      if (remainingSeconds <= 0) {
        finalizeAttempt(existing, 'auto_submitted');
        return res.json({
          resumed: true,
          expired: true,
          attemptId: existing.id,
          message: "Your time limit expired while disconnected."
        });
      }
      return res.json({
        resumed: true,
        attemptId: existing.id,
        sessionToken: existing.sessionToken,
        participant: existing.participant,
        questions: existing.clientQuestions,
        answers: existing.answers,
        reviewed: existing.reviewed,
        serverTime: now,
        endTime: existing.endTime,
        remainingSeconds,
        tabSwitchCount: existing.tabSwitchCount || 0
      });
    }
  }

  // Name Validation: 2 to 40 characters, letters, spaces, basic punctuation
  if (!validateParticipantName(name)) {
    return res.status(400).json({
      error: "Please enter a valid name (2 to 40 characters, letters, spaces, and basic punctuation only)."
    });
  }

  const trimmedName = name.trim();
  const settings = getSettings();
  if (!settings.isQuizActive) {
    return res.status(403).json({ error: "The competition is currently closed by the administrator." });
  }

  const questions = getQuestions();
  if (questions.length === 0) {
    return res.status(500).json({ error: "No questions in the question bank. Please contact administrator." });
  }

  // Device-level attempt check
  const devId = deviceId || `dev_${crypto.randomBytes(8).toString('hex')}`;
  const allAttempts = getAttempts();

  // One attempt per device/browser session rule (admin toggle, off by default)
  if (!settings.allowMultipleAttemptsPerDevice) {
    const completedOnDevice = allAttempts.find(
      a => a.deviceId === devId && ['submitted', 'auto_submitted'].includes(a.status)
    );
    if (completedOnDevice) {
      return res.status(403).json({
        error: "This device has already completed an attempt. Multiple attempts per device are not permitted.",
        alreadyCompleted: true,
        attemptId: completedOnDevice.id
      });
    }
  }

  // Duplicate Name Notice on Same Device:
  // Check if an unfinished attempt with the same name exists on the same device
  if (!forceNew) {
    const activeOnDevice = findActiveAttemptByDeviceAndName(devId, trimmedName);
    if (activeOnDevice) {
      return res.json({
        promptResume: true,
        existingAttemptId: activeOnDevice.id,
        name: activeOnDevice.participant.name,
        startTime: activeOnDevice.startTime,
        message: `An unfinished attempt as "${activeOnDevice.participant.name}" was found on this device.`
      });
    }
  }

  // If forceNew was chosen, mark any unfinished attempt on this device as abandoned
  if (forceNew) {
    const activeOld = findActiveAttemptByDeviceAndName(devId, trimmedName);
    if (activeOld) {
      activeOld.status = 'abandoned';
      saveAttempt(activeOld);
    }
  }

  // CREATE NEW ATTEMPT WITH CURRENT SETTINGS SNAPSHOT
  const totalToPick = Math.min(settings.totalQuestionsPerParticipant || 10, questions.length);

  // Pick random subset of questions
  const shuffledBank = shuffleArray(questions);
  const selectedSubset = shuffledBank.slice(0, totalToPick);

  // Prepare client-sanitized questions AND private server answer key
  const privateAnswerKey = {}; // { qId: correctOptionKey }
  const clientQuestions = [];

  selectedSubset.forEach((q, idx) => {
    let optionsList = [
      { key: 'A', text: q.options.A },
      { key: 'B', text: q.options.B },
      { key: 'C', text: q.options.C },
      { key: 'D', text: q.options.D }
    ].filter(o => o.text && o.text.trim() !== "");

    if (settings.shuffleOptions) {
      optionsList = shuffleArray(optionsList);
    }

    const optionKeys = ['A', 'B', 'C', 'D'];
    const clientOptions = {};
    let mappedCorrectKey = '';

    optionsList.forEach((opt, oIdx) => {
      const assignedKey = optionKeys[oIdx];
      clientOptions[assignedKey] = opt.text;
      if (opt.key === q.answer) {
        mappedCorrectKey = assignedKey;
      }
    });

    privateAnswerKey[q.id] = mappedCorrectKey;

    // Client question object NEVER contains answer!
    clientQuestions.push({
      id: q.id,
      index: idx + 1,
      question: q.question,
      options: clientOptions,
      category: q.category || 'General'
    });
  });

  const now = Date.now();
  const timeMode = settings.timeLimitMode || 'total';
  const timeMinutes = Number(settings.timeLimitMinutes) || 15;
  const timeSecPerQ = Number(settings.timeLimitSecondsPerQuestion) || 60;
  const totalTimeSeconds = timeMode === 'per_question' ? (timeSecPerQ * totalToPick) : (timeMinutes * 60);
  const endTime = now + (totalTimeSeconds * 1000);

  const attemptId = `att_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const sessionToken = crypto.randomBytes(24).toString('hex');

  // Freeze settings snapshot on this attempt so subsequent admin changes do not affect it
  const attemptSettingsSnapshot = {
    totalQuestions: totalToPick,
    timeLimitMode: timeMode,
    timeLimitMinutes: timeMinutes,
    timeLimitSecondsPerQuestion: timeSecPerQ,
    totalTimeSeconds: totalTimeSeconds,
    marksPerCorrect: Number(settings.marksPerCorrect) || 4.0,
    negativeMarking: Number(settings.negativeMarking) || 0.0,
    passMarkPercentage: Number(settings.passMarkPercentage) || 40.0,
    shuffleOptions: Boolean(settings.shuffleOptions)
  };

  const newAttempt = {
    id: attemptId,
    sessionToken,
    deviceId: devId,
    participant: {
      name: trimmedName
    },
    settings: attemptSettingsSnapshot,
    assignedQuestionIds: selectedSubset.map(q => q.id),
    clientQuestions,
    privateAnswerKey, // SECURE: server-only, never sent in response
    answers: {},
    reviewed: {},
    startTime: now,
    endTime,
    status: 'in_progress',
    tabSwitchCount: 0,
    tabSwitchEvents: [],
    result: null
  };

  saveAttempt(newAttempt);

  // Set session cookie
  res.cookie('mindquest_session_token', sessionToken, {
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    path: '/'
  });

  res.json({
    resumed: false,
    attemptId,
    sessionToken,
    participant: newAttempt.participant,
    questions: clientQuestions,
    answers: {},
    reviewed: {},
    serverTime: now,
    endTime,
    remainingSeconds: totalTimeSeconds,
    tabSwitchCount: 0,
    attemptSettings: attemptSettingsSnapshot
  });
});

// 4. Restore / Sync Session (uses Attempt ID + Session Token verification)
app.get('/api/quiz/restore-session/:attemptId', (req, res) => {
  const { attemptId } = req.params;
  const attempt = getAttemptById(attemptId);

  if (!attempt) {
    return res.status(404).json({ error: "Exam session not found." });
  }

  // Token check (optional header or query)
  const token = req.headers['x-session-token'] || req.query.token;
  if (token && attempt.sessionToken && token !== attempt.sessionToken) {
    return res.status(403).json({ error: "Session token mismatch." });
  }

  const now = Date.now();
  const remainingSeconds = Math.max(0, Math.floor((attempt.endTime - now) / 1000));

  if (attempt.status === 'in_progress' && remainingSeconds <= 0) {
    finalizeAttempt(attempt, 'auto_submitted');
    return res.json({
      expired: true,
      status: attempt.status,
      result: attempt.result
    });
  }

  res.json({
    attemptId: attempt.id,
    sessionToken: attempt.sessionToken,
    status: attempt.status,
    participant: attempt.participant,
    questions: attempt.clientQuestions,
    answers: attempt.answers,
    reviewed: attempt.reviewed,
    serverTime: now,
    endTime: attempt.endTime,
    remainingSeconds,
    tabSwitchCount: attempt.tabSwitchCount || 0,
    result: attempt.result,
    attemptSettings: attempt.settings || {}
  });
});

// 5. Real-time Save Answer
app.post('/api/quiz/save-answer', (req, res) => {
  const { attemptId, questionId, selectedOption, isMarkedForReview } = req.body;
  const attempt = getAttemptById(attemptId);

  if (!attempt || attempt.status !== 'in_progress') {
    return res.status(400).json({ error: "Session is not active or already finalized." });
  }

  // Server-side timer check
  if (Date.now() > attempt.endTime + 5000) { // 5s grace for network
    finalizeAttempt(attempt, 'auto_submitted');
    return res.status(403).json({ error: "Time expired. Attempt automatically submitted.", autoSubmitted: true });
  }

  if (selectedOption === null || selectedOption === "") {
    delete attempt.answers[questionId];
  } else if (['A', 'B', 'C', 'D'].includes(selectedOption)) {
    attempt.answers[questionId] = selectedOption;
  }

  if (typeof isMarkedForReview === 'boolean') {
    attempt.reviewed[questionId] = isMarkedForReview;
  }

  saveAttempt(attempt);
  res.json({ success: true, answersCount: Object.keys(attempt.answers).length });
});

// 6. Anti-cheat Log Tab Switching / Blur
app.post('/api/quiz/log-tab-switch', (req, res) => {
  const { attemptId, reason } = req.body;
  const attempt = getAttemptById(attemptId);

  if (!attempt || attempt.status !== 'in_progress') {
    return res.status(400).json({ error: "Invalid session." });
  }

  const settings = getSettings();
  attempt.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1;
  attempt.tabSwitchEvents.push({
    timestamp: Date.now(),
    reason: reason || 'Focus lost / Tab switched'
  });

  const maxAllowed = settings.maxTabSwitchesAllowed || 3;
  let autoSubmitted = false;

  if (attempt.tabSwitchCount >= maxAllowed) {
    finalizeAttempt(attempt, 'auto_submitted');
    autoSubmitted = true;
  } else {
    saveAttempt(attempt);
  }

  res.json({
    tabSwitchCount: attempt.tabSwitchCount,
    maxAllowed,
    remainingAllowed: Math.max(0, maxAllowed - attempt.tabSwitchCount),
    autoSubmitted
  });
});

// 7. Submit Quiz & Server-Side Scoring
app.post('/api/quiz/submit', (req, res) => {
  const { attemptId, manualAnswers } = req.body;
  const attempt = getAttemptById(attemptId);

  if (!attempt) {
    return res.status(404).json({ error: "Attempt not found." });
  }

  if (['submitted', 'auto_submitted'].includes(attempt.status)) {
    return res.json({
      message: "Attempt was already submitted.",
      result: sanitizeResultForClient(attempt)
    });
  }

  if (manualAnswers && typeof manualAnswers === 'object') {
    attempt.answers = { ...attempt.answers, ...manualAnswers };
  }

  finalizeAttempt(attempt, 'submitted');
  res.json({
    success: true,
    result: sanitizeResultForClient(attempt)
  });
});

// Helper: Server-side scoring engine using Attempt's own settings snapshot
function finalizeAttempt(attempt, finalStatus = 'submitted') {
  if (['submitted', 'auto_submitted'].includes(attempt.status) && attempt.result) {
    return attempt.result;
  }

  const globalSettings = getSettings();
  // Prefer attempt's own snapshot settings if available
  const attemptSnap = attempt.settings || {};
  const marksPerCorrect = Number(attemptSnap.marksPerCorrect ?? globalSettings.marksPerCorrect) || 4.0;
  const negativeMarking = Number(attemptSnap.negativeMarking ?? globalSettings.negativeMarking) || 0.0;
  const passMarkPercentage = Number(attemptSnap.passMarkPercentage ?? globalSettings.passMarkPercentage) || 40.0;

  const assignedIds = attempt.assignedQuestionIds;
  const userAnswers = attempt.answers || {};
  const privateKey = attempt.privateAnswerKey || {};

  let correct = 0;
  let wrong = 0;
  let attended = 0;

  assignedIds.forEach(qId => {
    const chosen = userAnswers[qId];
    if (chosen && chosen.trim() !== '') {
      attended++;
      const correctChoice = privateKey[qId];
      if (chosen === correctChoice) {
        correct++;
      } else {
        wrong++;
      }
    }
  });

  const unattended = assignedIds.length - attended;
  const rawScore = (correct * marksPerCorrect) - (wrong * negativeMarking);
  const finalScore = parseFloat(rawScore.toFixed(2));
  const maxPossibleScore = assignedIds.length * marksPerCorrect;
  const percentage = maxPossibleScore > 0
    ? parseFloat(((Math.max(0, finalScore) / maxPossibleScore) * 100).toFixed(1))
    : 0;

  const passed = percentage >= passMarkPercentage;
  const now = Date.now();
  const timeTakenSeconds = Math.max(1, Math.floor((Math.min(now, attempt.endTime) - attempt.startTime) / 1000));

  attempt.status = finalStatus;
  attempt.submittedAt = now;
  attempt.result = {
    totalQuestions: assignedIds.length,
    attended,
    unattended,
    correct,
    wrong,
    marksPerCorrect,
    negativeMarking,
    finalScore,
    maxPossibleScore,
    percentage,
    passed,
    passMarkPercentage,
    timeTakenSeconds,
    rank: null
  };

  saveAttempt(attempt);
  updateRanks();
  return attempt.result;
}

// Helper: Sanitize result for client based on admin settings
function sanitizeResultForClient(attempt) {
  const settings = getSettings();
  const baseResult = {
    ...attempt.result,
    attemptId: attempt.id,
    status: attempt.status,
    participant: attempt.participant,
    tabSwitchCount: attempt.tabSwitchCount || 0
  };

  if (settings.showAnswerReviewAfterSubmit) {
    const questionReview = attempt.clientQuestions.map(cq => {
      const chosen = attempt.answers[cq.id] || null;
      const correct = attempt.privateAnswerKey[cq.id] || null;
      return {
        id: cq.id,
        question: cq.question,
        options: cq.options,
        category: cq.category,
        userAnswer: chosen,
        correctAnswer: correct,
        isCorrect: chosen === correct,
        isUnattended: !chosen
      };
    });
    baseResult.questionReview = questionReview;
  }

  return baseResult;
}

// 8. Get Result by AttemptId
app.get('/api/quiz/result/:attemptId', (req, res) => {
  const { attemptId } = req.params;
  const attempt = getAttemptById(attemptId);

  if (!attempt || !attempt.result) {
    return res.status(404).json({ error: "Result not available for this attempt." });
  }

  res.json({
    quizName: CONFIG.quizName,
    organization: CONFIG.organization,
    result: sanitizeResultForClient(attempt)
  });
});

// ==========================================
// ADMIN ENDPOINTS (Password Protected)
// ==========================================

// 1. Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const result = adminLogin(password);
  if (result.success) {
    res.json({ success: true, token: result.token });
  } else {
    res.status(401).json({ error: result.error });
  }
});

// 2. Settings Management
app.get('/api/admin/settings', requireAdmin, (req, res) => {
  res.json({
    settings: getSettings(),
    bankSize: getQuestions().length,
    activeParticipantsCount: getActiveAttemptsCount()
  });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const questions = getQuestions();
  const bankSize = questions.length;
  const newSet = req.body;

  // Validation: totalQuestionsPerParticipant
  if (newSet.totalQuestionsPerParticipant !== undefined) {
    const val = parseInt(newSet.totalQuestionsPerParticipant, 10);
    if (isNaN(val) || val < 1) {
      return res.status(400).json({ error: "Questions per participant must be at least 1." });
    }
    if (bankSize > 0 && val > bankSize) {
      return res.status(400).json({
        error: `Questions per participant (${val}) cannot exceed the question bank size (${bankSize}).`
      });
    }
  }

  const updated = updateSettings(newSet);
  res.json({
    success: true,
    settings: updated,
    activeParticipantsCount: getActiveAttemptsCount()
  });
});

// Reset settings to defaults
app.post('/api/admin/settings/reset-defaults', requireAdmin, (req, res) => {
  const restored = resetSettingsToDefault();
  res.json({
    success: true,
    settings: restored,
    message: "Settings reset to default configuration."
  });
});

// Extend time for active participants (+1, +5, +10 min)
app.post('/api/admin/extend-active-time', requireAdmin, (req, res) => {
  const { additionalMinutes } = req.body;
  const mins = parseInt(additionalMinutes, 10);
  if (isNaN(mins) || mins <= 0) {
    return res.status(400).json({ error: "Invalid additional minutes specified." });
  }

  const result = extendActiveAttemptsTime(mins);
  res.json({
    success: true,
    affectedCount: result.affectedCount,
    additionalMinutes: mins,
    message: `Extended examination time by ${mins} minute(s) for ${result.affectedCount} active participant(s).`
  });
});

app.post('/api/admin/toggle-quiz', requireAdmin, (req, res) => {
  const settings = getSettings();
  const updated = updateSettings({ isQuizActive: !settings.isQuizActive });
  res.json({ success: true, isQuizActive: updated.isQuizActive });
});

// 3. Question Bank Upload & Review
app.post('/api/admin/questions/upload-pdf', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  try {
    const parsed = await parsePdfBuffer(req.file.buffer);
    setStagingQuestions(parsed);
    res.json({
      success: true,
      count: parsed.length,
      validCount: parsed.filter(q => q.isValid).length,
      invalidCount: parsed.filter(q => !q.isValid).length,
      stagingQuestions: parsed
    });
  } catch (err) {
    console.error('[Upload PDF Error]', err);
    res.status(500).json({ error: "Failed to parse PDF file: " + err.message });
  }
});

app.post('/api/admin/questions/upload-csv', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No CSV file uploaded" });
  }

  try {
    const content = req.file.buffer.toString('utf-8');
    const parsed = parseCsvContent(content);
    setStagingQuestions(parsed);
    res.json({
      success: true,
      count: parsed.length,
      validCount: parsed.filter(q => q.isValid).length,
      invalidCount: parsed.filter(q => !q.isValid).length,
      stagingQuestions: parsed
    });
  } catch (err) {
    console.error('[Upload CSV Error]', err);
    res.status(500).json({ error: "Failed to parse CSV file: " + err.message });
  }
});

app.get('/api/admin/staging-questions', requireAdmin, (req, res) => {
  const staging = getStagingQuestions();
  res.json({
    stagingQuestions: staging,
    count: staging.length,
    validCount: staging.filter(q => q.isValid).length,
    invalidCount: staging.filter(q => !q.isValid).length
  });
});

app.put('/api/admin/staging-questions', requireAdmin, (req, res) => {
  const { stagingQuestions } = req.body;
  if (!Array.isArray(stagingQuestions)) {
    return res.status(400).json({ error: "stagingQuestions must be an array" });
  }
  setStagingQuestions(stagingQuestions);
  res.json({ success: true, count: stagingQuestions.length });
});

app.post('/api/admin/staging-questions/publish', requireAdmin, (req, res) => {
  const { replaceExisting } = req.body;
  const published = publishStagingQuestions(Boolean(replaceExisting));
  res.json({
    success: true,
    totalPublished: published.length,
    message: `Successfully published questions. Total active bank size: ${published.length}`
  });
});

// 4. Question Bank CRUD
app.get('/api/admin/questions', requireAdmin, (req, res) => {
  res.json({ questions: getQuestions() });
});

app.post('/api/admin/questions', requireAdmin, (req, res) => {
  const q = req.body;
  if (!q.question || !q.options || !q.answer) {
    return res.status(400).json({ error: "Missing required question fields" });
  }
  const created = addQuestion({
    id: `q_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...q,
    isValid: true
  });
  res.json({ success: true, question: created });
});

app.put('/api/admin/questions/:id', requireAdmin, (req, res) => {
  const updated = updateQuestion(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: "Question not found" });
  }
  res.json({ success: true, question: updated });
});

app.delete('/api/admin/questions/:id', requireAdmin, (req, res) => {
  const success = deleteQuestion(req.params.id);
  res.json({ success });
});

// 5. Participants & Results Management (Showing Name with Disambiguation, Attempt ID & Start Time)
app.get('/api/admin/results', requireAdmin, (req, res) => {
  const attempts = getAttempts();
  const summary = attempts.map(a => ({
    id: a.id,
    participant: a.participant,
    displayName: a.displayName || a.participant?.name || 'Anonymous',
    status: a.status,
    startTime: a.startTime,
    submittedAt: a.submittedAt,
    timeTakenSeconds: a.result?.timeTakenSeconds || null,
    score: a.result?.finalScore ?? null,
    percentage: a.result?.percentage ?? null,
    rank: a.result?.rank ?? null,
    passed: a.result?.passed ?? null,
    attended: a.result?.attended ?? 0,
    totalQuestions: a.assignedQuestionIds?.length || 0,
    tabSwitchCount: a.tabSwitchCount || 0
  }));

  res.json({ attempts: summary });
});

app.get('/api/admin/participant/:attemptId', requireAdmin, (req, res) => {
  const attempt = getAttemptById(req.params.attemptId);
  if (!attempt) {
    return res.status(404).json({ error: "Participant attempt not found" });
  }

  const questions = getQuestions();
  const detailQuestions = attempt.assignedQuestionIds.map(qId => {
    const q = questions.find(x => x.id === qId) || { question: "Unknown", options: {} };
    const clientQ = attempt.clientQuestions.find(x => x.id === qId);
    const chosen = attempt.answers[qId] || null;
    const correct = attempt.privateAnswerKey[qId] || q.answer;

    return {
      id: qId,
      question: q.question,
      options: clientQ?.options || q.options,
      chosenOption: chosen,
      correctOption: correct,
      isCorrect: chosen === correct,
      isUnattended: !chosen
    };
  });

  res.json({
    attempt: {
      ...attempt,
      questionDetails: detailQuestions
    }
  });
});

app.post('/api/admin/reset-attempt/:attemptId', requireAdmin, (req, res) => {
  const reset = resetAttempt(req.params.attemptId);
  if (!reset) {
    return res.status(404).json({ error: "Attempt not found" });
  }
  updateRanks();
  res.json({ success: true, message: `Reset attempt for ${reset.participant.name}` });
});

app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const stats = getDashboardStats();
  res.json(stats);
});

// Export Results as CSV (Clean name-only columns)
app.get('/api/admin/export/csv', requireAdmin, (req, res) => {
  const attempts = getAttempts();
  const csvRows = [
    ["Rank", "Candidate Name", "Attempt ID", "Start Time", "Status", "Attended", "Total Questions", "Score", "Percentage", "Result", "Time Taken (s)", "Tab Switches"]
  ];

  attempts.forEach(a => {
    const startDateStr = a.startTime ? new Date(a.startTime).toISOString() : "N/A";
    csvRows.push([
      a.result?.rank || "N/A",
      `"${(a.displayName || a.participant?.name || "").replace(/"/g, '""')}"`,
      `"${a.id}"`,
      `"${startDateStr}"`,
      a.status,
      a.result?.attended || 0,
      a.assignedQuestionIds?.length || 0,
      a.result?.finalScore ?? "N/A",
      a.result ? `${a.result.percentage}%` : "N/A",
      a.result ? (a.result.passed ? "PASS" : "FAIL") : "PENDING",
      a.result?.timeTakenSeconds || 0,
      a.tabSwitchCount || 0
    ]);
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="quiz-results.csv"');
  res.send(csvRows.map(r => r.join(",")).join("\n"));
});

// Start Express server
app.listen(PORT, () => {
  console.log(`[QUIZ SERVER] Running on port ${PORT}`);
});
