import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.resolve(process.argv[2] || '../Forge-Claude-Code-2026-09-02-latest.zip');
if (fs.existsSync(output)) throw new Error('Choose a new archive filename; existing archives are never overwritten.');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-claude-handoff-'));
const packageName = 'forge-ia-refresh';
const staged = path.join(temporary, packageName);
fs.mkdirSync(staged);
const files = [];
const excluded = /(?:^|\/)(?:\.env(?:\..*)?|node_modules|\.git|dist|\.next|\.wrangler|\.vinext|\.DS_Store|[^/]+\.(?:pem|key|p12|log|zip|tar|gz))$/i;
function include(relative) {
  if (excluded.test(relative)) return;
  const source = path.join(root, relative);
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) throw new Error('Refusing symlink in source archive: ' + relative);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(source).sort()) include(path.join(relative, name));
  } else if (stat.isFile()) {
    const dest = path.join(staged, relative);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(source, dest); files.push(relative);
  }
}
// Explicit scope, including uncommitted source but never editor history,
// environment credentials, browser captures, caches or dependency installs.
for (const name of ['app', 'public', 'scripts', 'assets', 'README.md', 'CLAUDE.md', 'CLAUDE_CODE_HANDOFF.md', 'VALIDATION.md', 'MODEL_STATUS_BRIEF.md', 'package.json', 'package-lock.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts', 'vite.config.ts', 'eslint.config.mjs', '.gitignore', '.openai/hosting.json']) include(name);
for (const name of fs.readdirSync(path.join(root, '.impeccable')).sort()) {
  if (/-design\.(md|json)$/.test(name)) include(path.join('.impeccable', name));
}
include('.impeccable/surfaces');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = files.sort().map(file => digest(fs.readFileSync(path.join(staged, file))) + '  ' + file).join('\n') + '\n';
fs.writeFileSync(path.join(staged, 'SOURCE_MANIFEST.sha256'), manifest);
const zip = spawnSync('zip', ['-q', '-r', output, packageName], { cwd: temporary, encoding: 'utf8' });
if (zip.status !== 0) throw new Error(zip.stderr || 'Source archive creation failed');
const check = spawnSync('unzip', ['-tq', output], { encoding: 'utf8' });
if (check.status !== 0) throw new Error(check.stderr || check.stdout || 'Archive check failed');
console.log(JSON.stringify({ archive: output, files: files.length + 1, bytes: fs.statSync(output).size, sha256: digest(fs.readFileSync(output)), check: check.stdout.trim() }, null, 2));
// Only remove the generated, validated mkdtemp staging copy, never the project.
if (path.dirname(temporary) === path.resolve(os.tmpdir()) && path.basename(temporary).startsWith('forge-claude-handoff-')) fs.rmSync(temporary, { recursive: true });
