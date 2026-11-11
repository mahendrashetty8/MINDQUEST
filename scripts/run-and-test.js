// scripts/run-and-test.js
import '../server/index.js';

// Wait 1 second for server to bind then run tests
setTimeout(async () => {
  try {
    const { default: runTest } = await import('./test-flow-runner.js');
    await runTest();
    process.exit(0);
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  }
}, 1000);
