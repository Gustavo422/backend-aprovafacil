// Script to run the concurso preference API tests
import { execSync } from 'child_process';

try {
  console.log('Running concurso preference API tests...');
  execSync('npx vitest run src/api/user/concurso-preference/route.test.ts', { 
    stdio: 'inherit',
    cwd: './backend'
  });
  console.log('Tests completed successfully!');
} catch (error) {
  console.error('Tests failed:', error.message);
  process.exit(1);
}