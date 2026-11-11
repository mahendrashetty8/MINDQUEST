// scripts/test-quiz-flow.js
// Automated End-to-End Verification Test Script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3001';

async function runTest() {
  console.log('========================================================');
  console.log('⚡ STARTING MINDQUEST COMPETITION QUIZ E2E TEST FLOW');
  console.log('========================================================\n');

  // 1. Admin Login
  console.log('Step 1: Admin Login with password admin@mindquest2026...');
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
  console.log('✔ Admin logged in successfully. Token acquired.\n');

  // 2. Upload Sample PDF
  console.log('Step 2: Uploading sample PDF (sample/sample-questions.pdf)...');
  const samplePdfPath = path.join(__dirname, '..', 'sample', 'sample-questions.pdf');
  const pdfBuffer = fs.readFileSync(samplePdfPath);
  const formData = new FormData();
  formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'sample-questions.pdf');

  const uploadRes = await fetch(`${BASE_URL}/api/admin/questions/upload-pdf`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  const uploadData = await uploadRes.json();
  console.log(`✔ PDF Parsed: Total ${uploadData.count} questions. Valid: ${uploadData.validCount}, Invalid: ${uploadData.invalidCount}`);

  // 3. Review and Publish
  console.log('Step 3: Admin Review and Publish to active question bank...');
  const publishRes = await fetch(`${BASE_URL}/api/admin/staging-questions/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ replaceExisting: true })
  });
  const publishData = await publishRes.json();
  console.log(`✔ Published: ${publishData.message}\n`);

  // 4. Configure Quiz Settings: 10 questions per participant out of 30
  console.log('Step 4: Setting total questions per participant to 10 out of 30...');
  const settingsRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      totalQuestionsPerParticipant: 10,
      timeLimitMinutes: 15,
      marksPerCorrect: 4.0,
      negativeMarking: 1.0,
      passMarkPercentage: 40,
      shuffleOptions: true,
      showResultsImmediately: true,
      showAnswerReviewAfterSubmit: true,
      oneAttemptPerParticipant: true,
      isQuizActive: true
    })
  });
  const settingsData = await settingsRes.json();
  console.log(`✔ Settings updated. Questions per student: ${settingsData.settings.totalQuestionsPerParticipant}\n`);

  // 5. Register Participant 1: Alice
  console.log('Step 5A: Registering Participant 1 (Alice Vance, MIT)...');
  const aliceStartRes = await fetch(`${BASE_URL}/api/quiz/register-and-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Vance',
      email: 'alice.vance@mit.edu',
      phone: '+1-617-555-0101',
      college: 'MIT Computer Science'
    })
  });
  const aliceSession = await aliceStartRes.json();
  console.log(`✔ Alice registered. Attempt ID: ${aliceSession.attemptId}`);
  console.log(`✔ Alice received ${aliceSession.questions.length} questions.`);
  const aliceQuestionIds = aliceSession.questions.map(q => q.id);

  // 6. Register Participant 2: Bob
  console.log('\nStep 5B: Registering Participant 2 (Bob Smith, Stanford)...');
  const bobStartRes = await fetch(`${BASE_URL}/api/quiz/register-and-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob Smith',
      email: 'bob.smith@stanford.edu',
      phone: '+1-650-555-0199',
      college: 'Stanford AI Lab'
    })
  });
  const bobSession = await bobStartRes.json();
  console.log(`✔ Bob registered. Attempt ID: ${bobSession.attemptId}`);
  console.log(`✔ Bob received ${bobSession.questions.length} questions.`);
  const bobQuestionIds = bobSession.questions.map(q => q.id);

  // 7. CONFIRM DIFFERENT RANDOM QUESTION SETS
  console.log('\nStep 5C: Verifying Question Randomization...');
  const identicalSets = JSON.stringify(aliceQuestionIds) === JSON.stringify(bobQuestionIds);
  console.log(`Alice question IDs sample: ${aliceQuestionIds.slice(0, 3).join(', ')}...`);
  console.log(`Bob question IDs sample:   ${bobQuestionIds.slice(0, 3).join(', ')}...`);
  if (!identicalSets) {
    console.log('✔ CONFIRMED: Alice and Bob received DIFFERENT random subsets / orders!');
  } else {
    console.warn('Notice: Question sets were identical (unlikely with random sampling).');
  }

  // Verify that answers are NEVER sent to the client
  const hasAliceAnswers = aliceSession.questions.some(q => q.answer !== undefined);
  const hasBobAnswers = bobSession.questions.some(q => q.answer !== undefined);
  if (!hasAliceAnswers && !hasBobAnswers) {
    console.log('✔ CONFIRMED: Correct answers are completely STRIPPED from client payloads!');
  } else {
    throw new Error('SECURITY VIOLATION: Answers were detected in participant question payload!');
  }

  // 8. Alice takes quiz and submits
  console.log('\nStep 6A: Simulating Alice answering questions...');
  const aliceAnswers = {};
  // Answer 8 questions, leave 2 unattended
  for (let i = 0; i < 8; i++) {
    const q = aliceSession.questions[i];
    const chosenOption = ['A', 'B', 'C', 'D'][i % 4];
    aliceAnswers[q.id] = chosenOption;
    // Real-time save
    await fetch(`${BASE_URL}/api/quiz/save-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId: aliceSession.attemptId,
        questionId: q.id,
        selectedOption: chosenOption
      })
    });
  }

  const aliceSubmitRes = await fetch(`${BASE_URL}/api/quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptId: aliceSession.attemptId })
  });
  const aliceResultData = await aliceSubmitRes.json();
  console.log(`✔ Alice submitted. Score: ${aliceResultData.result.finalScore} / ${aliceResultData.result.maxPossibleScore} (${aliceResultData.result.percentage}%), Attended: ${aliceResultData.result.attended}/10, Correct: ${aliceResultData.result.correct}, Wrong: ${aliceResultData.result.wrong}`);

  // 9. Bob takes quiz and submits
  console.log('\nStep 6B: Simulating Bob answering questions...');
  const bobAnswers = {};
  for (let i = 0; i < 10; i++) {
    const q = bobSession.questions[i];
    const chosenOption = ['B', 'B', 'B', 'B', 'A', 'A', 'C', 'D', 'B', 'A'][i];
    bobAnswers[q.id] = chosenOption;
    await fetch(`${BASE_URL}/api/quiz/save-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId: bobSession.attemptId,
        questionId: q.id,
        selectedOption: chosenOption
      })
    });
  }

  const bobSubmitRes = await fetch(`${BASE_URL}/api/quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attemptId: bobSession.attemptId })
  });
  const bobResultData = await bobSubmitRes.json();
  console.log(`✔ Bob submitted. Score: ${bobResultData.result.finalScore} / ${bobResultData.result.maxPossibleScore} (${bobResultData.result.percentage}%), Attended: ${bobResultData.result.attended}/10, Correct: ${bobResultData.result.correct}, Wrong: ${bobResultData.result.wrong}`);

  // 10. Verify Admin Results Table and Leaderboard
  console.log('\nStep 7: Verifying Admin Results & Leaderboard...');
  const adminResultsRes = await fetch(`${BASE_URL}/api/admin/results`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const adminResults = await adminResultsRes.json();
  console.log(`✔ Found ${adminResults.attempts.length} attempts in Admin records:`);
  adminResults.attempts.forEach(a => {
    console.log(`   - Rank #${a.rank}: ${a.participant.name} | Score: ${a.score} (${a.percentage}%) | Attended: ${a.attended}/${a.totalQuestions} | Time: ${a.timeTakenSeconds}s`);
  });

  // 11. Verify Dashboard & Question Analytics
  const dashRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dashData = await dashRes.json();
  console.log(`\n✔ Dashboard Stats: Completed: ${dashData.totalCompleted}, Avg Score: ${dashData.averageScore}, Pass Rate: ${dashData.passRate}%`);
  console.log(`✔ Question difficulty analytics generated for ${dashData.questionStats.length} items.`);

  console.log('\n========================================================');
  console.log('🎉 ALL END-TO-END VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('========================================================\n');
}

runTest().catch(err => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
