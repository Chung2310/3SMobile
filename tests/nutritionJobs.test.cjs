/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function client(api) {
  const values = new Map();
  const storage = { getItem: async k => values.get(k) || null, setItem: async (k,v) => values.set(k,v), removeItem: async k => values.delete(k) };
  const exports = {};
  const mocks = { '@react-native-async-storage/async-storage': { __esModule: true, default: storage }, './sessionStore': { getStoredSession: async () => ({ user: { id: 'pt' } }) }, './api/client': { api } };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/nutritionJobs.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: id => mocks[id], setTimeout: fn => { fn(); }, Date, Math, Promise });
  return { run: exports.generateNutritionJob, values };
}
const input = { customerId: 'customer', request: 'Thực đơn 14 ngày', durationDays: 14 };
test('nutrition polls to completion and retains requested duration', async () => {
  let sent;
  const { run, values } = client({ post: async (_p, body) => { sent = body; return { id:'job', status:'PENDING' }; }, get: async () => ({ id:'job', status:'SUCCEEDED', result:{ durationDays:14 } }) });
  assert.equal((await run(input)).durationDays,14);
  assert.equal(sent.durationDays,14);
  assert.equal(values.size,0);
});
test('lost POST response reuses the same idempotency key', async () => {
  const keys=[];
  const { run } = client({ post: async (_p,body) => { keys.push(body.idempotencyKey); if(keys.length===1) throw new Error('offline'); return { id:'job', status:'SUCCEEDED', result:{} }; } });
  await assert.rejects(run(input), /offline/);
  await run(input);
  assert.equal(keys[0],keys[1]);
});
test('polling network failures preserve the pending key and failed jobs surface errors', async () => {
  const keys=[]; let failPoll=true;
  const { run, values } = client({ post: async (_p,body) => { keys.push(body.idempotencyKey); return { id:'job',status:'PROCESSING' }; }, get: async () => { if(failPoll) throw new Error('offline'); return { id:'job', status:'FAILED', error:{message:'AI unavailable'} }; } });
  await assert.rejects(run(input), /offline/);
  assert.equal(values.size,1);
  failPoll=false;
  await assert.rejects(run(input), /AI unavailable/);
  assert.equal(keys[0],keys[1]);
  assert.equal(values.size,0);
});
test('concurrent submissions of the same input share one job', async () => {
  let posts=0;
  const { run } = client({ post: async () => { posts++; return { id:'job',status:'SUCCEEDED',result:{durationDays:14} }; } });
  const result=await Promise.all([run(input),run(input)]);
  assert.equal(posts,1);
  assert.equal(result[0].durationDays,14);
});