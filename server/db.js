// server/db.js
// Local JSON store manager for questions, settings, attempts, and proctoring
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from '../config.js';
import { parseCsvContent } from './csvParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const storeFilePath = path.join(dataDir, 'store.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let store = {
  settings: { ...CONFIG.defaultSettings },
  questions: [], // Active published question bank
  stagingQuestions: [], // Questions currently in review before publishing
  attempts: [], // Participant attempts
  timeExtensionLogs: [] // Proctor time extension logs
};

// Seed initial sample questions from sample-questions.csv if store is empty
export function initDB() {
  if (fs.existsSync(storeFilePath)) {
    try {
      const content = fs.readFileSync(storeFilePath, 'utf-8');
      store = JSON.parse(content);
      // Ensure all settings keys are present with fallbacks
      store.settings = { ...CONFIG.defaultSettings, ...(store.settings || {}) };
      if (!Array.isArray(store.timeExtensionLogs)) {
        store.timeExtensionLogs = [];
      }
      console.log(`[DB] Loaded ${store.questions?.length || 0} questions and ${store.attempts?.length || 0} attempts from storage.`);
    } catch (err) {
      console.error('[DB] Error reading store.json, re-initializing:', err);
      seedSampleData();
    }
  } else {
    seedSampleData();
  }
}

function seedSampleData() {
  const sampleCsvPath = path.join(__dirname, '..', 'sample', 'sample-questions.csv');
  if (fs.existsSync(sampleCsvPath)) {
    const csvContent = fs.readFileSync(sampleCsvPath, 'utf-8');
    const questions = parseCsvContent(csvContent);
    store.questions = questions.filter(q => q.isValid);
    console.log(`[DB] Seeded ${store.questions.length} sample questions from sample-questions.csv`);
  } else {
    store.questions = [];
  }
  persistDB();
}

export function persistDB() {
  try {
    fs.writeFileSync(storeFilePath, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Error saving store.json:', err);
  }
}

// Settings
export function getSettings() {
  return store.settings;
}

export function updateSettings(newSettings) {
  store.settings = { ...store.settings, ...newSettings };
  persistDB();
  return store.settings;
}

export function resetSettingsToDefault() {
  store.settings = { ...CONFIG.defaultSettings };
  persistDB();
  return store.settings;
}

// Active in-progress participants count
export function getActiveAttemptsCount() {
  return store.attempts.filter(a => a.status === 'in_progress').length;
}

// Extend time for active participants
export function extendActiveAttemptsTime(additionalMinutes) {
  const mins = Number(additionalMinutes) || 1;
  const msToAdd = mins * 60 * 1000;
  const activeAttempts = store.attempts.filter(a => a.status === 'in_progress');

  activeAttempts.forEach(attempt => {
    attempt.endTime += msToAdd;
    if (!Array.isArray(attempt.timeExtensions)) {
      attempt.timeExtensions = [];
    }
    attempt.timeExtensions.push({
      addedMinutes: mins,
      timestamp: Date.now()
    });
  });

  const logEntry = {
    timestamp: Date.now(),
    addedMinutes: mins,
    affectedCount: activeAttempts.length
  };
  store.timeExtensionLogs.push(logEntry);

  persistDB();
  return {
    affectedCount: activeAttempts.length,
    addedMinutes: mins,
    log: logEntry
  };
}

// Questions
export function getQuestions() {
  return store.questions;
}

export function setQuestions(questionList) {
  store.questions = questionList;
  persistDB();
  return store.questions;
}

export function getQuestionById(id) {
  return store.questions.find(q => q.id === id);
}

export function addQuestion(q) {
  store.questions.push(q);
  persistDB();
  return q;
}

export function updateQuestion(id, updates) {
  const index = store.questions.findIndex(q => q.id === id);
  if (index !== -1) {
    store.questions[index] = { ...store.questions[index], ...updates };
    persistDB();
    return store.questions[index];
  }
  return null;
}

export function deleteQuestion(id) {
  const initialLen = store.questions.length;
  store.questions = store.questions.filter(q => q.id !== id);
  persistDB();
  return store.questions.length < initialLen;
}

// Staging (Review Step)
export function getStagingQuestions() {
  return store.stagingQuestions || [];
}

export function setStagingQuestions(questions) {
  store.stagingQuestions = questions;
  persistDB();
  return store.stagingQuestions;
}

export function publishStagingQuestions(replaceExisting = false) {
  const validOnly = (store.stagingQuestions || []).filter(q => q.isValid);
  if (replaceExisting) {
    store.questions = validOnly;
  } else {
    store.questions = [...store.questions, ...validOnly];
  }
  store.stagingQuestions = [];
  persistDB();
  return store.questions;
}

// Attempts & Participant Management
export function getAttempts() {
  updateRanks();

  // Annotate duplicate names in chronological order
  // e.g. "Alice Vance", "Alice Vance (#2)", "Alice Vance (#3)"
  const sorted = [...store.attempts].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
  const nameCounts = {};
  const displayNameMap = {};

  sorted.forEach(att => {
    const rawName = (att.participant?.name || 'Anonymous').trim();
    const key = rawName.toLowerCase();
    nameCounts[key] = (nameCounts[key] || 0) + 1;
    const count = nameCounts[key];
    displayNameMap[att.id] = count > 1 ? `${rawName} (#${count})` : rawName;
  });

  // Attach displayName to each attempt
  return store.attempts.map(att => ({
    ...att,
    displayName: displayNameMap[att.id] || att.participant?.name || 'Anonymous'
  }));
}

export function getAttemptById(attemptId) {
  return store.attempts.find(a => a.id === attemptId);
}

export function findAttemptByDeviceId(deviceId) {
  if (!deviceId) return null;
  return store.attempts.find(a => a.deviceId === deviceId);
}

export function findActiveAttemptByDeviceAndName(deviceId, name) {
  if (!deviceId || !name) return null;
  const cleanName = name.trim().toLowerCase();
  return store.attempts.find(
    a => a.deviceId === deviceId &&
         a.status === 'in_progress' &&
         a.participant?.name?.trim().toLowerCase() === cleanName
  );
}

export function saveAttempt(attempt) {
  const index = store.attempts.findIndex(a => a.id === attempt.id);
  if (index >= 0) {
    store.attempts[index] = attempt;
  } else {
    store.attempts.push(attempt);
  }
  persistDB();
  return attempt;
}

export function resetAttempt(attemptId) {
  const index = store.attempts.findIndex(a => a.id === attemptId);
  if (index !== -1) {
    const removed = store.attempts.splice(index, 1);
    persistDB();
    return removed[0];
  }
  return null;
}

// Ranks calculation
export function updateRanks() {
  const completed = store.attempts.filter(a => a.status === 'submitted' || a.status === 'auto_submitted');
  // Sort descending by score, then ascending by time taken
  completed.sort((a, b) => {
    if (b.result.finalScore !== a.result.finalScore) {
      return b.result.finalScore - a.result.finalScore;
    }
    return (a.result.timeTakenSeconds || 0) - (b.result.timeTakenSeconds || 0);
  });

  completed.forEach((attempt, idx) => {
    attempt.result.rank = idx + 1;
  });
}

// Dashboard statistics
export function getDashboardStats() {
  updateRanks();
  const attempts = store.attempts;
  const totalRegistered = attempts.length;
  const started = attempts.filter(a => a.status === 'in_progress');
  const completed = attempts.filter(a => a.status === 'submitted' || a.status === 'auto_submitted');

  let totalScore = 0;
  let passCount = 0;
  completed.forEach(a => {
    totalScore += (a.result?.finalScore || 0);
    if (a.result?.passed) passCount++;
  });

  const avgScore = completed.length > 0 ? (totalScore / completed.length).toFixed(1) : 0;
  const passRate = completed.length > 0 ? ((passCount / completed.length) * 100).toFixed(1) : 0;

  // Question-level statistics
  const qStatsMap = {};
  store.questions.forEach(q => {
    qStatsMap[q.id] = {
      id: q.id,
      question: q.question,
      category: q.category || 'General',
      timesAssigned: 0,
      timesAttended: 0,
      timesCorrect: 0,
      timesWrong: 0,
      errorRate: 0
    };
  });

  completed.forEach(att => {
    const assignedIds = att.assignedQuestionIds || [];
    const answers = att.answers || {};
    assignedIds.forEach(qId => {
      if (qStatsMap[qId]) {
        qStatsMap[qId].timesAssigned++;
        const userChoice = answers[qId];
        if (userChoice) {
          qStatsMap[qId].timesAttended++;
          const realQ = store.questions.find(x => x.id === qId);
          if (realQ && realQ.answer === userChoice) {
            qStatsMap[qId].timesCorrect++;
          } else {
            qStatsMap[qId].timesWrong++;
          }
        }
      }
    });
  });

  const questionStats = Object.values(qStatsMap).map(stat => {
    if (stat.timesAttended > 0) {
      stat.errorRate = parseFloat(((stat.timesWrong / stat.timesAttended) * 100).toFixed(1));
    }
    return stat;
  });

  // Sort by error rate descending (hardest first)
  questionStats.sort((a, b) => b.errorRate - a.errorRate);

  return {
    totalRegistered,
    totalStarted: started.length,
    totalCompleted: completed.length,
    averageScore: Number(avgScore),
    passRate: Number(passRate),
    bankSize: store.questions.length,
    activeParticipantsCount: started.length,
    questionStats
  };
}

// Initialise DB upon module load
initDB();
