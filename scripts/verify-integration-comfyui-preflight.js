#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function check() {
  const root = path.resolve(__dirname, '..');
  const base = path.join(root, 'package-system', 'repo-split-packages', 'integration-comfyui', 'files', 'integrations', 'comfyui');

  const flowNodePaths = [
    path.join(base, 'flow-nodes', 'comfyui.txt2img.flow-node.json'),
    path.join(base, 'flow-nodes', 'comfyui.img2vid.flow-node.json'),
  ];
  const profilePath = path.join(base, 'manual-controls', 'comfyui.manual-controls.profiles.json');
  const checklistPath = path.join(base, 'preflight', 'comfyui.preflight.checklist.json');
  const wizardPath = path.join(base, 'integration.wizard.json');
  const overlayPaths = [
    path.join(base, 'examples', 'comfyui.txt2img.overlay.example.json'),
    path.join(base, 'examples', 'comfyui.img2vid.overlay.example.json'),
  ];
  const preflightExamplePath = path.join(base, 'examples', 'comfyui.preflight.report.example.json');

  const flowNodes = flowNodePaths.map((p) => readJson(p));
  const profilesDoc = readJson(profilePath);
  const checklist = readJson(checklistPath);
  const wizard = readJson(wizardPath);
  const overlays = overlayPaths.map((p) => readJson(p));
  const preflightExample = readJson(preflightExamplePath);

  const flowNodeById = new Map(flowNodes.map((n) => [String(n.id), n]));
  const checks = [];

  for (const profile of profilesDoc.profiles || []) {
    const profileId = String(profile.id || '');
    const flowNodeId = String(profile.flowNodeId || '');
    const node = flowNodeById.get(flowNodeId);

    if (!node) {
      checks.push({
        id: `manual-profile.${profileId}.flow-node`,
        severity: 'error',
        status: 'fail',
        message: `Profile references missing flow node: ${flowNodeId}`,
        details: { profileId, flowNodeId },
      });
      continue;
    }

    const inputKeys = new Set((Array.isArray(node.inputs) ? node.inputs : []).map((x) => String(x.key || '')));
    const missingFields = [];
    for (const control of profile.controls || []) {
      const field = String(control.field || '');
      if (!inputKeys.has(field)) missingFields.push(field);
    }

    if (missingFields.length > 0) {
      checks.push({
        id: `manual-profile.${profileId}.bindings`,
        severity: 'warn',
        status: 'warn',
        message: `${missingFields.length} manual control fields are missing in flow-node inputs`,
        details: { profileId, flowNodeId, missingFields },
      });
    } else {
      checks.push({
        id: `manual-profile.${profileId}.bindings`,
        severity: 'info',
        status: 'pass',
        message: 'All manual control fields map to flow-node inputs',
        details: { profileId, flowNodeId },
      });
    }
  }

  const checklistIds = new Set((Array.isArray(checklist.checks) ? checklist.checks : []).map((c) => String(c.id || '')));
  for (const requiredChecklistId of ['connection.system_stats', 'manual-controls.bindings', 'overlay.required-mappings']) {
    const present = checklistIds.has(requiredChecklistId);
    checks.push({
      id: `checklist.${requiredChecklistId}`,
      severity: present ? 'info' : 'error',
      status: present ? 'pass' : 'fail',
      message: present
        ? `Checklist includes ${requiredChecklistId}`
        : `Checklist missing required item: ${requiredChecklistId}`,
    });
  }

  const wizardSteps = Array.isArray(wizard.steps) ? wizard.steps : [];
  const wizardPreflightChecklistStep = wizardSteps.find((s) => String(s && s.id || '') === 'preflight-checklist');
  const wizardChecklistDescription = String((wizardPreflightChecklistStep && wizardPreflightChecklistStep.description) || '');
  const wizardReferencesStrictCommand = wizardChecklistDescription.includes('ops:comfyui:preflight:strict');
  checks.push({
    id: 'wizard.preflight-checklist.strict-command',
    severity: wizardReferencesStrictCommand ? 'info' : 'warn',
    status: wizardReferencesStrictCommand ? 'pass' : 'warn',
    message: wizardReferencesStrictCommand
      ? 'Wizard preflight checklist step references ops:comfyui:preflight:strict'
      : 'Wizard preflight checklist step should reference ops:comfyui:preflight:strict for fail-on-warn guidance',
  });

  for (const overlay of overlays) {
    const overlayName = String((overlay.workflow && overlay.workflow.entryNodeId) || 'unknown');
    const normalized = overlay && overlay.normalized && Array.isArray(overlay.normalized.inputs)
      ? overlay.normalized.inputs
      : [];

    const missingMappings = normalized
      .filter((inp) => inp && inp.required === true)
      .filter((inp) => !String(inp.nodeId || '').trim() || !String(inp.field || '').trim())
      .map((inp) => String(inp.id || 'unknown'));

    if (missingMappings.length > 0) {
      checks.push({
        id: `overlay.${overlayName}.required-mappings`,
        severity: 'error',
        status: 'fail',
        message: `${missingMappings.length} required normalized inputs are missing nodeId/field mappings`,
        details: { overlayEntryNodeId: overlayName, missingInputIds: missingMappings },
      });
    } else {
      checks.push({
        id: `overlay.${overlayName}.required-mappings`,
        severity: 'info',
        status: 'pass',
        message: 'Required normalized inputs include nodeId/field mappings',
        details: { overlayEntryNodeId: overlayName },
      });
    }
  }

  const preflightHasChecks = Array.isArray(preflightExample.checks) && preflightExample.checks.length > 0;
  checks.push({
    id: 'preflight-example.checks',
    severity: preflightHasChecks ? 'info' : 'error',
    status: preflightHasChecks ? 'pass' : 'fail',
    message: preflightHasChecks
      ? 'Preflight example includes at least one check entry'
      : 'Preflight example is missing checks entries',
  });

  const preflightHasConnectionCheck = (preflightExample.checks || []).some((c) => String(c.id || '').includes('connection'));
  checks.push({
    id: 'preflight-example.connection-check',
    severity: preflightHasConnectionCheck ? 'info' : 'warn',
    status: preflightHasConnectionCheck ? 'pass' : 'warn',
    message: preflightHasConnectionCheck
      ? 'Preflight example includes connection check coverage'
      : 'Preflight example does not include connection check coverage',
  });

  const status = checks.some((c) => c.status === 'fail')
    ? 'fail'
    : checks.some((c) => c.status === 'warn')
    ? 'warn'
    : 'pass';

  return {
    schemaVersion: '1.0',
    kind: 'comfyui-preflight-report',
    status,
    checks,
  };
}

function main() {
  const report = check();
  const outArgIndex = process.argv.indexOf('--out');
  if (outArgIndex >= 0 && process.argv[outArgIndex + 1]) {
    const outPath = path.resolve(process.cwd(), process.argv[outArgIndex + 1]);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  }
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');

  if (report.status === 'fail' || (process.argv.includes('--fail-on-warn') && report.status === 'warn')) {
    process.exit(1);
  }
}

main();
