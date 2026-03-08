const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function run(args) {
  const out = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
  return { code: out.status ?? 1, stdout: out.stdout || '', stderr: out.stderr || '' };
}

test('verify-integration-wizards supports --json output', () => {
  const out = run(['scripts/verify-integration-wizards.js', '--json']);
  assert.equal(out.code, 0, out.stderr || out.stdout);
  const parsed = JSON.parse(out.stdout);
  assert.equal(typeof parsed.ok, 'boolean');
  assert.ok(parsed.totals && typeof parsed.totals.packages === 'number');
});

test('verify-integration-wizards normalize dry-run works', () => {
  const out = run(['scripts/verify-integration-wizards.js', '--normalize']);
  assert.equal(out.code, 0, out.stderr || out.stdout);
  assert.ok(out.stdout.includes('dry-run normalize'));
});

test('backfill-integration-wizard-paths dry-run works', () => {
  const out = run(['scripts/backfill-integration-wizard-paths.js', '--dry-run']);
  assert.equal(out.code, 0, out.stderr || out.stdout);
  assert.ok(out.stdout.includes('[backfill-integration-wizard-paths]'));
});
