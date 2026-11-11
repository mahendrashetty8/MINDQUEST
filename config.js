// config.js - Central configuration for the Online Competition Quiz
export const CONFIG = {
  // Event & Quiz Identity
  quizName: "MINDQUEST 2026",
  quizSubtitle: "Annual National Science & Technology Championship",
  organization: "MindQuest Academic Council",
  logoText: "MINDQUEST",
  logoBadge: "COMPETITION EDITION",

  // Admin Credentials (default for local setup; override via environment variables in production)
  adminEmail: "admin@mindquest.org",
  adminPassword: "admin@mindquest2026", // Change in production via ADMIN_PASSWORD env var

  // Visual Theme Palette (Warm paper, ink black, deep teal, signal rust)
  colors: {
    paperBg: "#F6F1E7",
    paperCard: "#FFFDF8",
    inkBlack: "#1B1B1B",
    inkMuted: "#59554E",
    accentTeal: "#0F5C5C",
    accentTealLight: "#1D7A7A",
    accentTealMuted: "#E6EFEF",
    signalRust: "#C8431F",
    signalWarningBg: "#FDF0EC",
    borderColor: "#DCD5C9",
    borderDark: "#1B1B1B",
    markedReview: "#D97706"
  },

  // Default Quiz Engine Settings
  defaultSettings: {
    totalQuestionsPerParticipant: 10, // Admin can adjust based on bank size
    timeLimitMode: "total", // "total" (minutes) or "per_question" (seconds)
    timeLimitMinutes: 15,
    timeLimitSecondsPerQuestion: 60,
    marksPerCorrect: 4.0,
    negativeMarking: 1.0, // 0 for no negative marking
    passMarkPercentage: 40,
    shuffleOptions: true,
    showResultsImmediately: true,
    showAnswerReviewAfterSubmit: true,
    allowMultipleAttemptsPerDevice: false, // Off by default: one attempt per device/browser session
    maxTabSwitchesAllowed: 3, // Auto-submit when exceeded
    isQuizActive: true
  },

  // Contact / Help Info
  supportContact: "support@mindquest.org",
  rules: [
    "Enter your name to begin. Each participant receives an independently randomized subset of questions and options.",
    "The exam timer is synchronized with the server; closing or refreshing the tab will NOT pause or extend your time.",
    "Your answers are saved in real-time as you select them. Reconnecting or refreshing will resume your existing attempt.",
    "Anti-cheat monitor is active: leaving the quiz screen, switching tabs, or exiting fullscreen is logged. Exceeding allowed violations causes automatic submission.",
    "Use the Question Palette to navigate and mark questions for review before submitting."
  ]
};

export default CONFIG;
