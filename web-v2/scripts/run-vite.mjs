import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const command = process.argv[2] || 'dev';
const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(scriptDir, '..');
const viteBin = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const bundledNode = join(
  process.env.USERPROFILE || '',
  '.cache',
  'codex-runtimes',
  'codex-primary-runtime',
  'dependencies',
  'node',
  'bin',
  'node.exe'
);

function nodeVersionIsTooOld() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  return major < 20 || (major === 20 && minor < 19);
}

const nodeBin =
  process.platform === 'win32' && nodeVersionIsTooOld() && existsSync(bundledNode)
    ? bundledNode
    : process.execPath;

const argsByCommand = {
  build: [viteBin, 'build'],
  preview: [viteBin, 'preview', '--host', '127.0.0.1', '--port', '3000', '--strictPort'],
  dev: [viteBin, '--host', '127.0.0.1', '--port', process.env.PORT || '3000', '--strictPort'],
};

const args = argsByCommand[command] || argsByCommand.dev;
const result = spawnSync(nodeBin, args, { stdio: 'inherit', shell: false });
process.exit(result.status ?? 1);
