import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const envLocalPath = path.resolve(process.cwd(), '.env.local');

if (!fs.existsSync(envLocalPath)) {
  console.error('.env.local not found!');
  process.exit(1);
}

const content = fs.readFileSync(envLocalPath, 'utf8');
const lines = content.split('\n');

const envVars = {};

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;

  const equalIndex = line.indexOf('=');
  if (equalIndex === -1) continue;

  const key = line.slice(0, equalIndex).trim();
  let value = line.slice(equalIndex + 1).trim();

  // Strip wrapping quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  // Skip empty or vercel meta or placeholder
  if (!value || key === 'VERCEL_PROJECT_ID' || key === 'VERCEL_ORG_ID' || value.includes('<project-ref>')) {
    continue;
  }

  envVars[key] = value;
}

const environments = ['production', 'preview', 'development'];
const tasks = [];

for (const [key, val] of Object.entries(envVars)) {
  for (const env of environments) {
    tasks.push({ key, env, val });
  }
}

console.log(`Prepared ${tasks.length} env tasks across ${Object.keys(envVars).length} variables.\n`);

function setVercelEnv({ key, env, val }) {
  return new Promise((resolve) => {
    const child = spawn('npx', ['vercel', 'env', 'add', key, env, '--force', '--yes'], {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    let stdout = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.stdin.write(val);
    child.stdin.end();

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ [${key}] -> ${env}`);
        resolve({ success: true, key, env });
      } else {
        console.error(`✗ [${key}] -> ${env}: ${(stderr || stdout).trim()}`);
        resolve({ success: false, key, env, error: stderr || stdout });
      }
    });

    child.on('error', (err) => {
      console.error(`✗ [${key}] -> ${env} (spawn error): ${err.message}`);
      resolve({ success: false, key, env, error: err.message });
    });
  });
}

// Concurrency runner (concurrency = 5 to be gentle on Vercel rate limits while fast)
async function runWithConcurrency(taskList, limit = 5) {
  let index = 0;
  const results = [];

  async function worker() {
    while (index < taskList.length) {
      const taskIndex = index++;
      const task = taskList[taskIndex];
      const res = await setVercelEnv(task);
      results.push(res);
    }
  }

  const workers = Array.from({ length: Math.min(limit, taskList.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

const startTime = Date.now();
const results = await runWithConcurrency(tasks, 5);
const duration = ((Date.now() - startTime) / 1000).toFixed(1);

const success = results.filter((r) => r.success).length;
const failures = results.filter((r) => !r.success).length;

console.log(`\n══════════════════════════════════════════════════`);
console.log(`🎉 Sync Completed in ${duration}s!`);
console.log(`   Success: ${success} / ${tasks.length}`);
console.log(`   Failures: ${failures}`);
console.log(`══════════════════════════════════════════════════\n`);
