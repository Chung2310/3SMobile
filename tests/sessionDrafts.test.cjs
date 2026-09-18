/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const filename = path.resolve(__dirname, '../src/services/sessionDrafts.ts');
const mod = new Module(filename, module);
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { sessionDraftBody, sessionDraftPath, matchesDraftPlan } = mod.exports;
const plan = { _id: 'plan', version: 3, lifecycleStatus: 'ACTIVE', sessions: [{ name: 'A' }, { name: 'B' }] };
test('draft serialization preserves unfinished inputs, attachments and retry identity', () => {
  const form = { results: [{ sets: [{ weight: '0', reps: '' }] }], notes: 'partial', progressPhotos: ['https://example.com/photo'], customerSignature: 'signature' };
  const pending = { customerId: 'customer', idempotencyKey: 'stable-key' };
  const restored = JSON.parse(JSON.stringify(sessionDraftBody(form, plan, 'stable-key', 2, pending)));
  assert.deepEqual(restored.form, form);
  assert.deepEqual(restored.pendingPayload, pending);
  assert.equal(restored.idempotencyKey, 'stable-key');
  assert.equal(restored.revision, 2);
});
test('restoring a draft detects changed plans, versions, exercise order and inactive plans', () => {
  assert.equal(matchesDraftPlan(plan, JSON.parse(JSON.stringify(plan))), true);
  for (const changed of [{ ...plan, _id: 'other' }, { ...plan, version: 4 }, { ...plan, sessions: [...plan.sessions].reverse() }, { ...plan, lifecycleStatus: 'ARCHIVED' }]) assert.equal(matchesDraftPlan(plan, changed), false);
});
test('draft endpoint scopes and encodes the customer and revision', () => {
  assert.equal(sessionDraftPath('a/b', 2), '/api/workout-session-drafts/a%2Fb?revision=2');
  assert.throws(() => sessionDraftPath(''));
});