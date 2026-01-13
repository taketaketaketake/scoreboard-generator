/**
 * Setup script - run after cloning repo
 * Installs git hooks and other local configuration
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const HOOKS_DIR = join(ROOT_DIR, '.git', 'hooks');

const preCommitHook = `#!/bin/sh
# Clean up Claude Code temp files before commit
rm -f tmpclaude-* 2>/dev/null
exit 0
`;

function setup() {
  console.log('Setting up project...\n');

  // Install pre-commit hook
  if (existsSync(join(ROOT_DIR, '.git'))) {
    mkdirSync(HOOKS_DIR, { recursive: true });
    const hookPath = join(HOOKS_DIR, 'pre-commit');
    writeFileSync(hookPath, preCommitHook);
    console.log('✓ Installed pre-commit hook');
  } else {
    console.log('⚠ No .git directory found - skipping hooks');
  }

  console.log('\nSetup complete!');
}

setup();
