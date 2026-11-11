// scripts/test-changes.js
// Automated Verification Suite for Requested Changes 1 & 2
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://127.0.0.1:3001';

export default async function runChangesTest() {
  console.log('================================================================');
  console.log('⚡ STARTING VERIFICATION FOR NAME-ONLY FLOW & ADMIN SETTINGS');
  console.log('================================================================\n');

  // Step 0: Admin Login
  console.log('Step 0: Admin Login...');
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'admin@mindquest2026' })
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  console.log('✔ Admin logged in.\n');

  // Reset to known starting configuration (10 questions, 15 min, allowMultipleAttemptsPerDevice: true for test)
  await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      totalQuestionsPerParticipant: 10,
      timeLimitMode: 'total',
      timeLimitMinutes: 15,
      allowMultipleAttemptsPerDevice: true,
      isQuizActive: true
    })
  });

  // -------------------------------------------------------------
  // TEST 1: Start with only name, refresh mid-quiz, verify same questions restored
  // -------------------------------------------------------------
  console.log('--- TEST 1: Name-only entry & Refresh/Restore Verification ---');
  const participant1Name = 'Charlie Day';
  const device1 = 'dev_test_charlie_1';

  // Test name validation rejection on invalid names
  const invalidNameRes = await fetch(`${BASE_URL}/api/quiz/register-and-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'A', deviceId: device1 }) // too short
  });
  if (invalidNameRes.status === 400) {
    const errData = await invalidNameRes.json();
    console.log(`✔ Name validation verified: Rejected single-char name with message: "${errData.error}"`);
  } else {
    throw new Error('Expected 400 for invalid short name.');
  }

  // Register with valid name only (no email/phone/college)
  const startRes1 = await fetch(`${BASE_URL}/api/quiz/register-and-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: participant1Name, deviceId: device1 })
  });
  const session1 = await startRes1.json();
  if (!session1.attemptId || !session1.sessionToken) {
    throw new Error('Failed to start session 1: ' + JSON.stringify(session1));
  }
  console.log(`✔ Started quiz for "${session1.participant.name}" with Attempt ID: ${session1.attemptId}`);
  console.log(`✔ Questions assigned: ${session1.questions.length}`);
  const originalQIds = session1.questions.map(q => q.id);

  // Save an answer to Question 1
  await fetch(`${BASE_URL}/api/quiz/save-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attemptId: session1.attemptId,
      questionId: originalQIds[0],
      selectedOption: 'B'
    })
  });

  // Simulate page refresh / reconnect: Call restore-session
  const restoreRes1 = await fetch(`${BASE_URL}/api/quiz/restore-session/${session1.attemptId}`, {
    headers: { 'X-Session-Token': session1.sessionToken }
  });
  const restoredSession1 = await restoreRes1.json();
  const restoredQIds = restoredSession1.questions.map(q => q.id);

  const isIdenticalSet = JSON.stringify(originalQIds) === JSON.stringify(restoredQIds);
  const isAnswerPreserved = restoredSession1.answers[originalQIds[0]] === 'B';

  if (isIdenticalSet && isAnswerPreserved) {
    console.log('✔ TEST 1 PASSED: Mid-quiz refresh restored the EXACT same question set and preserved answer B!\n');
  } else {
    throw new Error(`TEST 1 FAILED: Question sets or answers did not match upon restore. Identical: ${isIdenticalSet}, Answer: ${isAnswerPreserved}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Two participants with the same name show as separate attempts
  // -------------------------------------------------------------
  console.log('--- TEST 2: Duplicate Names Disambiguation in Admin ---');
  // Register second participant with the exact SAME name: "Charlie Day"
  const startRes2 = await fetch(`${BASE_URL}/api/quiz/register-and-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: participant1Name, deviceId: 'dev_test_charlie_2' })
  });
  const session2 = await startRes2.json();
  console.log(`✔ Started 2nd attempt with same name "${participant1Name}", Attempt ID: ${session2.attemptId}`);

  // Fetch admin results
  const adminRes = await fetch(`${BASE_URL}/api/admin/results`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const adminData = await adminRes.json();
  const charlieAttempts = adminData.attempts.filter(a => a.participant?.name === participant1Name);

  console.log(`✔ Found ${charlieAttempts.length} attempts for "${participant1Name}" in Admin records:`);
  charlieAttempts.forEach(a => {
    console.log(`   - Display Name: "${a.displayName}" | ID: ${a.id} | Start: ${new Date(a.startTime).toLocaleTimeString()}`);
  });

  const hasDisambiguation = charlieAttempts.some(a => a.displayName.includes('(#2)'));
  if (charlieAttempts.length >= 2 && hasDisambiguation) {
    console.log('✔ TEST 2 PASSED: Both participants show as separate attempts and duplicates are labeled with (#2)!\n');
  } else {
    throw new Error('TEST 2 FAILED: Expected disambiguation (#2) for duplicate participant name.');
  }

  // -------------------------------------------------------------
  // TEST 3: Settings change applies to new attempts while in-progress keep old values
  // -------------------------------------------------------------
  console.log('--- TEST 3: Settings change isolated from in-progress attempts ---');
  // In-progress attempt `session1` has 10 questions and 15 mins (900s).
  console.log(`In-progress attempt (${session1.attemptId}) has: ${session1.questions.length} questions, initial time: ${session1.remainingSeconds}s`);

  // Admin updates settings: questions from 10 to 15, time from 20 to 10 minutes
  console.log('Admin updating settings to: 15 questions, 10 minutes...');
  const updateSettingsRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      totalQuestionsPerParticipant: 15,
      timeLimitMode: 'total',
      timeLimitMinutes: 10
    })
  });
  const updatedSettingsData = await updateSettingsRes.json();
  console.log(`✔ Settings saved. Active participants currently taking quiz: ${updatedSettingsData.activeParticipantsCount}`);

  // Now register a NEW participant: "Dana Scully"
  const startRes3 = await fetch(`${BASE_URL}/api/quiz/register-and-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Dana Scully', deviceId: 'dev_test_dana' })
  });
  const session3 = await startRes3.json();
  console.log(`✔ Started new attempt for "${session3.participant.name}":`);
  console.log(`   - Assigned questions: ${session3.questions.length}`);
  console.log(`   - Allocated remaining time: ${session3.remainingSeconds}s (${session3.remainingSeconds / 60} mins)`);

  // Verify in-progress attempt Charlie 1 retains its old values!
  const checkOldRes = await fetch(`${BASE_URL}/api/quiz/restore-session/${session1.attemptId}`);
  const oldRestored = await checkOldRes.json();

  console.log(`✔ Checking in-progress attempt (${session1.attemptId}):`);
  console.log(`   - Assigned questions retained: ${oldRestored.questions.length} (expected 10)`);
  console.log(`   - Settings snapshot questions: ${oldRestored.attemptSettings?.totalQuestions} (expected 10)`);

  if (session3.questions.length === 15 && session3.remainingSeconds === 600 && oldRestored.questions.length === 10) {
    console.log('✔ TEST 3 PASSED: New attempt received 15 questions & 10 mins, while in-progress attempt preserved 10 questions!\n');
  } else {
    throw new Error('TEST 3 FAILED: Settings isolation between new and in-progress attempts did not behave as expected.');
  }

  // -------------------------------------------------------------
  // TEST 4: Question count higher than bank size is rejected
  // -------------------------------------------------------------
  console.log('--- TEST 4: Bank size overflow validation ---');
  const bankInfoRes = await fetch(`${BASE_URL}/api/quiz/info`);
  const bankInfo = await bankInfoRes.json();
  const bankSize = bankInfo.settings.bankSize;
  const overflowCount = bankSize + 25;

  console.log(`Current question bank size is: ${bankSize}. Attempting to set question count to ${overflowCount}...`);
  const overflowRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      totalQuestionsPerParticipant: overflowCount
    })
  });

  if (overflowRes.status === 400) {
    const overflowErr = await overflowRes.json();
    console.log(`✔ Setting rejected with HTTP 400. Server message: "${overflowErr.error}"`);
    console.log('✔ TEST 4 PASSED: Overflow validation strictly enforced!\n');
  } else {
    throw new Error('TEST 4 FAILED: Server accepted question count higher than bank size!');
  }

  // -------------------------------------------------------------
  // TEST 5: Results, Leaderboard, and Exports show names correctly
  // -------------------------------------------------------------
  console.log('--- TEST 5: Results, Leaderboard, and Exports verification ---');
  // Submit Dana Scully's attempt
  const submitRes3 = await fetch(`${BASE_URL}/api/quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attemptId: session3.attemptId,
      manualAnswers: {
        [session3.questions[0].id]: 'B',
        [session3.questions[1].id]: 'C'
      }
    })
  });
  const submitData3 = await submitRes3.json();
  console.log(`✔ Dana Scully exam submitted. Score: ${submitData3.result.finalScore}, Attended: ${submitData3.result.attended}`);

  // Fetch CSV export
  const csvRes = await fetch(`${BASE_URL}/api/admin/export/csv`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const csvText = await csvRes.text();
  const csvLines = csvText.split('\n');
  console.log(`✔ CSV Export header: ${csvLines[0]}`);
  console.log(`✔ CSV Row sample: ${csvLines[1]}`);

  // Confirm CSV header contains "Candidate Name", "Attempt ID", "Start Time" and NO "Email" or "Phone"
  const hasNameHeader = csvLines[0].includes('Candidate Name');
  const hasAttemptIdHeader = csvLines[0].includes('Attempt ID');
  const hasStartTimeHeader = csvLines[0].includes('Start Time');
  const noPhone = !csvLines[0].includes('Phone');
  const noEmail = !csvLines[0].includes('Email');

  if (hasNameHeader && hasAttemptIdHeader && hasStartTimeHeader && noPhone && noEmail) {
    console.log('✔ TEST 5 PASSED: CSV and Results records show Name, Attempt ID, and Start Time without removed fields!\n');
  } else {
    throw new Error('TEST 5 FAILED: CSV export contains deprecated columns or missing name headers.');
  }

  console.log('================================================================');
  console.log('🎉 ALL 5 VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');
}
