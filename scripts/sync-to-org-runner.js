#!/usr/bin/env node

'use strict';

const { execFileSync } = require('node:child_process');

function parseArgs(argv) {
  const out = {
    dryRun: false,
    allowDirty: false,
    branch: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      out.dryRun = true;
    } else if (arg === '--allow-dirty') {
      out.allowDirty = true;
    } else if (arg === '--branch') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('Missing value for --branch');
      }
      out.branch = next;
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return out;
}

function git(args, { allowFailure = false } = {}) {
  try {
    const stdout = execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, stdout: stdout.trim() };
  } catch (error) {
    const stderr = (error && error.stderr ? String(error.stderr) : '').trim();
    const stdout = (error && error.stdout ? String(error.stdout) : '').trim();
    if (allowFailure) {
      return {
        ok: false,
        code: typeof error.status === 'number' ? error.status : 1,
        stdout,
        stderr,
      };
    }
    throw error;
  }
}

function fail({ startedAt, input, step, message, hint, details }) {
  const finishedAt = new Date();
  const payload = {
    ok: false,
    status: 'failed',
    failedStep: step,
    message,
    hint: hint || null,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    input,
    details: details || null,
  };

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(1);
}

function main() {
  const startedAt = new Date();
  let input;

  try {
    input = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail({
      startedAt,
      input: { dryRun: false, allowDirty: false, branch: null },
      step: 'parse-args',
      message: error.message,
      hint: 'Allowed flags: --dry-run --allow-dirty --branch <name>',
    });
  }

  const steps = [];
  const markStep = (id, status, message) => {
    steps.push({ id, status, message: message || null });
  };

  const inRepo = git(['rev-parse', '--is-inside-work-tree'], { allowFailure: true });
  if (!inRepo.ok || inRepo.stdout !== 'true') {
    fail({
      startedAt,
      input,
      step: 'verify-repo',
      message: 'Current directory is not a git repository.',
      hint: 'Run this script from inside the target repository.',
      details: inRepo,
    });
  }
  markStep('verify-repo', 'passed');

  let branch = input.branch;
  if (!branch) {
    const currentBranch = git(['symbolic-ref', '--quiet', '--short', 'HEAD'], { allowFailure: true });
    if (!currentBranch.ok || !currentBranch.stdout) {
      fail({
        startedAt,
        input,
        step: 'resolve-branch',
        message: 'Cannot sync because repository is in detached HEAD state.',
        hint: 'Checkout a named branch (example: git checkout main) and retry.',
        details: currentBranch,
      });
    }
    branch = currentBranch.stdout;
  }

  const branchExists = git(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], {
    allowFailure: true,
  });
  if (!branchExists.ok) {
    fail({
      startedAt,
      input,
      step: 'resolve-branch',
      message: `Branch '${branch}' does not exist locally.`,
      hint: 'Use an existing local branch or create it before syncing.',
      details: branchExists,
    });
  }
  markStep('resolve-branch', 'passed', `Using branch '${branch}'`);

  const requiredRemotes = ['origin', 'org'];
  for (const remote of requiredRemotes) {
    const hasRemote = git(['remote', 'get-url', remote], { allowFailure: true });
    if (!hasRemote.ok) {
      fail({
        startedAt,
        input,
        step: 'verify-remotes',
        message: `Missing required remote '${remote}'.`,
        hint: `Add it with: git remote add ${remote} <url>`,
        details: hasRemote,
      });
    }

    const reachable = git(['ls-remote', '--exit-code', remote, 'HEAD'], { allowFailure: true });
    if (!reachable.ok) {
      fail({
        startedAt,
        input,
        step: 'verify-remote-reachability',
        message: `Remote '${remote}' is configured but not reachable.`,
        hint: 'Check network/auth access to remotes and retry.',
        details: reachable,
      });
    }
  }
  markStep('verify-remotes', 'passed', 'origin and org are configured');
  markStep('verify-remote-reachability', 'passed', 'origin and org are reachable');

  if (!input.allowDirty) {
    const dirty = git(['status', '--porcelain'], { allowFailure: true });
    if (!dirty.ok) {
      fail({
        startedAt,
        input,
        step: 'verify-clean-tree',
        message: 'Unable to inspect working tree status.',
        hint: 'Run git status manually, resolve any repo issues, then retry.',
        details: dirty,
      });
    }
    if (dirty.stdout) {
      fail({
        startedAt,
        input,
        step: 'verify-clean-tree',
        message: 'Working tree has uncommitted changes; sync blocked for safety.',
        hint: 'Commit/stash changes, or re-run with --allow-dirty if intended.',
        details: { changed: true },
      });
    }
  }
  markStep('verify-clean-tree', 'passed', input.allowDirty ? 'Skipped by --allow-dirty' : 'Working tree is clean');

  const pushArgs = ['push'];
  if (input.dryRun) {
    pushArgs.push('--dry-run');
  }
  pushArgs.push('org', `${branch}:${branch}`);

  const pushResult = git(pushArgs, { allowFailure: true });
  if (!pushResult.ok) {
    fail({
      startedAt,
      input,
      step: 'push-org',
      message: 'Push to org failed.',
      hint: 'Review remote permissions/branch protections and retry.',
      details: pushResult,
    });
  }
  markStep('push-org', 'passed', input.dryRun ? 'Dry-run push succeeded' : 'Push succeeded');

  const finishedAt = new Date();
  const payload = {
    ok: true,
    status: 'passed',
    mode: input.dryRun ? 'dry-run' : 'live',
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    input,
    result: {
      branch,
      remote: 'org',
      refspec: `${branch}:${branch}`,
      allowDirty: input.allowDirty,
      dryRun: input.dryRun,
      command: `git ${pushArgs.join(' ')}`,
    },
    steps,
  };

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main();
