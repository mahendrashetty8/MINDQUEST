// scripts/run-test-changes.js
import '../server/index.js';

setTimeout(async () => {
  try {
    const { default: runChangesTest } = await import('./test-changes.js');
    await runChangesTest();
    process.exit(0);
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  }
}, 1000);
