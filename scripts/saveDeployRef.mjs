#!/usr/bin/env node
// Saves current git HEAD to .deploy-last-good after a successful cpanel:install.
// Used by cpanel:rollback to find the last known-good commit.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const hash = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
  fs.writeFileSync(path.join(ROOT, '.deploy-last-good'), hash, 'utf8');
  console.log(`  ✓  Deploy ref saved: ${hash.slice(0, 7)}`);
} catch {
  // Not fatal — rollback can still use ORIG_HEAD or HEAD~1
  console.log('  ○  Could not save deploy ref (git not available or no commits).');
}
