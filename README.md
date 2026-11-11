# MINDQUEST 2026 — Competition Quiz Platform

A high-performance, resilient online competition quiz platform engineered for high-stakes academic and corporate competitions. Features server-side question randomization, secure server-side scoring (answer key is never sent to the browser), robust PDF/CSV question bank ingestion with a mandatory review workflow, real-time proctoring/anti-cheat surveillance, and instant merit leaderboards.

---

## 🏛 Visual Direction: Exam-Hall-Meets-Editorial

The UI intentionally avoids generic gradients, neon glows, and glassmorphism in favor of a calm, authoritative, high-contrast editorial look:
- **Warm Paper Canvas**: `#F6F1E7`
- **Ink Black**: `#1B1B1B`
- **Deep Academic Teal**: `#0F5C5C`
- **Signal Warning Rust**: `#C8431F`
- **Parchment Surface**: `#FFFDF8`
- **Typography**: `Fraunces` / `Bricolage Grotesque` for display headings, `DM Sans` for body, and `JetBrains Mono` for countdown timers, scores, and candidate badges.
- **Micro-Interactions**: Subtle physical press states, visible editorial gridlines, and high-contrast tap targets (>= 48px).

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js 18+ (tested on Node 20 & 24)
- npm or pnpm

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Sample Questions (PDF & CSV)
```bash
npm run generate-sample
```
This generates:
- `sample/sample-questions.pdf` (30 standardized questions in the exact supported format)
- `sample/sample-questions.csv`

### 3. Run Locally for Preview
To run both backend API server and Vite client concurrently:
```bash
npm run dev
```
- **Candidate Portal & Quiz**: [http://localhost:5173](http://localhost:5173)
- **Admin Portal**: [http://localhost:5173#admin](http://localhost:5173#admin) or click **Admin Portal** in top navigation
- **Backend API Server**: `http://localhost:3001`

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🔒 Security & Server-Side Scoring Architecture

To maintain competitive integrity and prevent inspect-element / browser network snooping:

1. **Private Answer Keys**:
   - The question bank stores questions with their respective correct answers on the server only.
   - When a candidate registers, the server randomly samples $N$ questions from the active bank (e.g. 10 out of 30) and shuffles their options.
   - **All answer fields are completely stripped** before the payload leaves the server. The participant browser receives only `{ id, question, options: { A, B, C, D }, category }`.
2. **Server-Side Timer Enforcement**:
   - The timer is anchored to the server start time and `endTime`.
   - Refreshing the browser, pausing execution, or editing system clock cannot extend time. When `now >= endTime`, the server automatically finalizes the attempt.
3. **Session Restoration**:
   - Real-time auto-saving saves each selected answer to the server as it is clicked.
   - If a participant experiences a network disconnection or page reload, `/api/quiz/restore-session/:id` seamlessly restores their exact assigned subset, selected answers, and remaining time.
4. **Anti-Cheat Surveillance**:
   - Detects `visibilitychange`, `blur` (window focus loss), and fullscreen departure.
   - Every infraction is recorded in the candidate's audit log.
   - If the candidate exceeds the admin-configured limit (default: 3 violations), the exam is immediately auto-submitted.
   - Text selection and right-click context menu are disabled across the question container.

---

## 📄 PDF Question Bank Format Specification

The parser accepts text-based PDFs conforming to this standardized format:

```text
Q1. What is the primary function of the CPU in a computer system?
A) Memory storage   B) Instruction execution
C) Digital-to-analog audio conversion   D) Power regulation
Answer: B

Q2. Which data structure uses the First In, First Out (FIFO) principle?
A) Stack   B) Binary Search Tree   C) Queue   D) Max Heap
Answer: C
```

### Formatting Rules:
1. **Question Identifier**: Starts with `Q1.` or `1.` or `Q1)` followed by the question text.
2. **Options**: Tagged with `A)`, `B)`, `C)`, `D)` (or `A.`, `B.`, etc.). They can appear on a single line, two per line, or each on its own line.
3. **Answer Line**: Follows options with `Answer: B` (or `Ans: B`, `Correct: B`).
4. **Mandatory Review Step**:
   - Uploaded PDFs or CSVs are first loaded into an **in-memory staging review table**.
   - Any questions with missing options, invalid answer keys, or unparsed text are highlighted with a `Needs Fix` warning badge.
   - The administrator can inline-edit, resolve, or remove broken questions before clicking **Publish to Active Bank**. Unreviewed questions are never published.

---

## ⚙ Configuration (`config.js`) & What to Replace

All branding, marking defaults, and administrative credentials reside in `/config.js`:

```javascript
export const CONFIG = {
  // 1. EVENT BRANDING
  quizName: "MINDQUEST 2026",                           // <-- Your Quiz / Event Name
  quizSubtitle: "Annual National Science & Technology Championship",
  organization: "MindQuest Academic Council",           // <-- Your Organization
  logoText: "MINDQUEST",                                // <-- Your Logo Text
  logoBadge: "COMPETITION EDITION",

  // 2. ADMIN CREDENTIALS
  adminEmail: "admin@mindquest.org",                    // <-- Admin Email
  adminPassword: "admin@mindquest2026",                 // <-- Admin Password

  // 3. ENGINE DEFAULTS
  defaultSettings: {
    totalQuestionsPerParticipant: 10,                   // <-- Number of questions each participant receives
    timeLimitMinutes: 15,                               // <-- Time limit in minutes
    marksPerCorrect: 4.0,                               // <-- Marks for correct answer
    negativeMarking: 1.0,                               // <-- Penalty for wrong answer (0 for none)
    passMarkPercentage: 40,                             // <-- Passing percentage
    shuffleOptions: true,                               // <-- Randomize option keys A-D
    showResultsImmediately: true,
    showAnswerReviewAfterSubmit: true,
    oneAttemptPerParticipant: true,
    maxTabSwitchesAllowed: 3,
    isQuizActive: true
  }
};
```

---

## ☁ Cloud Backend Setup: Supabase or Firebase

The project includes an in-memory/JSON store for zero-config local execution and a full SQL schema for production Supabase deployments.

### Connecting Supabase (Recommended Free Tier)
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in the Supabase dashboard and run the provided SQL script:
   ```bash
   supabase/schema.sql
   ```
3. Set your environment variables in `.env`:
   ```env
   PORT=3001
   ADMIN_PASSWORD=your_secure_password_here
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
4. The schema includes:
   - Row-Level Security (RLS) policies preventing public reads of the `answer` column.
   - `submit_attempt_rpc` stored procedure for transactional server-side scoring.

---

## 🚢 Production Deployment

### Option A: Render / Railway / Fly.io (Full Stack)
Since the app includes an Express API server:
1. Build Command: `npm run build`
2. Start Command: `npm start`
3. Environment Variables:
   - `ADMIN_PASSWORD`: Your secret admin password
   - `PORT`: Automatically assigned by provider (defaults to 3001)

### Option B: Netlify / Vercel (Frontend + Serverless Functions)
1. Deploy the Vite React frontend (`dist/` directory) to Netlify or Vercel.
2. Route `/api/*` endpoints to Netlify Edge Functions or Vercel Serverless Functions using the logic in `server/index.js`.

---

## 👤 Participant Registration: Name-Only Flow

Participants enter **only their name** (2 to 40 characters, letters, spaces, and basic punctuation). Phone numbers, emails, colleges, and other extraneous registration fields are removed for a frictionless start.

- **Non-Unique Names**: Names are not treated as identity keys. Multiple candidates can have the same name.
- **Device & Session Tokens**: When an attempt begins, the server creates a unique `attemptId` and cryptographically signs a `sessionToken` stored in both `localStorage` and a browser cookie. If the participant refreshes or reconnects, their exact question set, timer, and saved answers are seamlessly restored.
- **Duplicate Name Disambiguation**: If an unfinished attempt with the same name exists on the same device, an inline **"Is this you?"** dialog presents choices to **"Resume Existing Attempt"** or **"Start New Attempt"**. In the proctor's admin table, duplicate names are clearly distinguished chronologically as `"Name"`, `"Name (#2)"`, `"Name (#3)"`, alongside their unique Attempt IDs and start timestamps.
- **Device Attempt Policy**: By default, only one attempt is permitted per device/browser session. Administrators can toggle **"Allow Multiple Attempts Per Device"** in Quiz Settings.

> [!NOTE]
> **Name-Only Security Notice**: While device tokens prevent repeated attempts on the same browser, name-only entry cannot fully prevent an individual from starting a separate attempt on an alternate physical device or private browser window. For strictly gated proctored competitions requiring absolute single-entry guarantees, verify candidate identity in person or via institutional login.

---

## ⚙ Admin Controls: Question Count, Time Limit & Active Proctors

The **Quiz Settings** tab provides direct controls:

1. **Number of Questions per Participant**:
   - Numeric input with `+` and `-` stepping buttons.
   - Strictly validated to be between 1 and the active published question bank size.
   - Shows live indicator: `Bank has X questions`.
2. **Flexible Time Limit Modes**:
   - **Total Quiz Time (Minutes)**: Configurable duration with one-click presets (5, 10, 15, 30, 60 min).
   - **Time Per Question (Seconds)**: Configurable seconds per item with presets (30s, 45s, 60s, 90s, 120s), automatically computing the total exam duration.
3. **Settings Isolation & Active Exam Protection**:
   - When settings are saved, they apply **only to attempts that start after saving**.
   - In-progress attempts preserve their original settings snapshot (question count, duration, scoring weights) without disruption.
   - If candidates are actively in session when settings are modified, a warning banner displays the count of active participants.
4. **Emergency Time Extensions**:
   - The proctor can grant emergency time (`+1 min`, `+5 min`, `+10 min`) to all currently active participants simultaneously via a single confirmed command.

---

## 🛡 Anti-Cheat System & Honest Limitations

While client-side hardening makes casual cheating difficult, browser sandboxing has fundamental boundaries that must be recognized:

| Measure | Implementation | Known Limit |
| :--- | :--- | :--- |
| **Randomized Question Sets** | Server picks random subset $N$ from $M$ bank questions. | Participants may still occasionally receive overlapping questions if bank size is small. |
| **Shuffled Options** | Option order (A, B, C, D) is randomized per participant. | Questions with "Both A and B" or "All of the above" should be phrased as text options rather than letter references. |
| **Focus / Tab Loss Detection** | `visibilitychange` & `blur` events log departures and auto-submit after $X$ violations. | Does not detect a secondary physical device (e.g. mobile phone next to laptop). |
| **Disabled Copy / Context Menu** | `user-select: none` and `contextmenu` listener. | Advanced technical users can inspect DOM or disable JavaScript (though API scoring remains secure). |
| **Timer Protection** | Calculated purely from server clock differences (`endTime - now`). | Client clock manipulation has zero effect. |

---

## 📊 Summary of What to Replace Before Going Live
1. **Quiz / Event Name**: in `/config.js` (`quizName`, `organization`, `logoText`).
2. **Admin Password**: in `/config.js` or via `ADMIN_PASSWORD` environment variable.
3. **Question Bank**: Upload your official PDF or CSV in `/admin` and click **Publish**.
4. **Subset Size**: In Admin &rarr; Quiz Settings, set how many questions each participant should receive out of the bank.
admin pass:admin@mindquest2026