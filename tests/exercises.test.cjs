const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function loadTs(filename, mocks = {}) {
  const target = path.resolve(__dirname, '..', filename);
  const mod = new Module(target, module);
  mod.filename = target;
  mod.paths = module.paths;
  mod.require = (id) => id in mocks ? mocks[id] : id.startsWith('.') ? loadTs(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(target), `${id}.ts`)), mocks) : require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(target, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, target);
  return mod.exports;
}
const { exerciseQuery, EMPTY_EXERCISE_FILTERS, exerciseForPlan, exercisePayload, exerciseVideos, videoLink } = loadTs('src/services/exercises.ts');
const { planPayload } = loadTs('src/services/workouts.ts');
const base = { name: 'Squat', muscleGroups: ['Chân', 'Mông'], level: 'BEGINNER', defaultTrackingType: 'STRENGTH', videos: [] };
test('filters preserve Vietnamese and special characters across pagination', () => {
  const url = new URL(exerciseQuery({ ...EMPTY_EXERCISE_FILTERS, keyword: 'Chân & vai', muscleGroup: 'Bụng / Core', defaultTrackingType: 'BODYWEIGHT' }, 3), 'https://test.invalid');
  assert.equal(url.searchParams.get('keyword'), 'Chân & vai');
  assert.equal(url.searchParams.get('muscleGroup'), 'Bụng / Core');
  assert.equal(url.searchParams.get('page'), '3');
  assert.equal(url.searchParams.get('limit'), '12');
  assert.equal(url.searchParams.has('level'), false);
});
test('library selection retains identity and uses defaults matching web for every tracking type', () => {
  for (const kind of ['STRENGTH', 'BODYWEIGHT', 'CARDIO', 'INTERVAL', 'MOBILITY']) {
    const selected = exerciseForPlan({ ...base, _id: 'exercise1', defaultTrackingType: kind });
    assert.equal(selected.exerciseId, 'exercise1');
    assert.equal(selected.trackingType, kind);
    const plan = planPayload({ title: 'Plan', goal: 'Fitness', level: 'BEGINNER', sessions: [{ name: 'Buổi 1', exercises: [selected] }] });
    assert.equal(plan.sessions[0].exercises[0].exerciseId, 'exercise1');
    assert.ok(Object.keys(selected.prescription).length > 0);
  }
  assert.equal(exerciseForPlan({ ...base, _id: 'x', defaultTrackingType: 'CARDIO' }).prescription.durationMinutes, 20);
});
test('unclassified and missing-id exercises cannot be added to plans', () => {
  assert.throws(() => exerciseForPlan({ ...base, _id: 'x', defaultTrackingType: 'UNCLASSIFIED' }));
  assert.throws(() => exerciseForPlan(base));
});
test('prescriptions are independent between selections and do not copy library permissions', () => {
  const first = exerciseForPlan({ ...base, _id: 'x', canManage: true });
  first.prescription.sets = 99;
  assert.equal(exerciseForPlan({ ...base, _id: 'x' }).prescription.sets, 3);
  assert.equal(first.canManage, undefined);
});
test('exercise payload whitelists writable fields and retains descriptive lists', () => {
  const payload = exercisePayload({ ...base, _id: 'x', canManage: true, scope: 'PRIVATE', ownerPtId: 'owner', equipment: ['Barbell'], technique: 'Giữ lưng thẳng', commonMistakes: ['Cong lưng'], contraindications: ['Lưu ý'], variants: ['Front Squat'] });
  for (const key of ['_id', 'canManage', 'scope', 'ownerPtId']) assert.equal(payload[key], undefined);
  assert.deepEqual(payload.muscleGroups, ['Chân', 'Mông']);
  assert.equal(payload.muscleGroup, 'Chân, Mông');
  assert.deepEqual(payload.commonMistakes, ['Cong lưng']);
});
test('video editor preserves uploaded sources and can remove the final video', () => {
  const video = { title: 'Demo', url: 'https://example.com/demo.mp4', source: 'UPLOAD', _id: 'server' };
  assert.equal(exercisePayload({ ...base, videos: [video] }).videos[0].source, 'UPLOAD');
  assert.equal(exercisePayload({ ...base, videos: [video] }).videos[0]._id, undefined);
  const removed = exercisePayload({ ...base, videos: [], videoUrl: '' });
  assert.deepEqual(removed.videos, []);
  assert.equal(removed.videoUrl, '');
  assert.equal(exerciseVideos({ videoUrl: video.url })[0].url, video.url);
});
test('rejects incomplete exercise records and unsafe video links', () => {
  for (const patch of [{ name: ' ' }, { muscleGroups: [] }, { level: 'INVALID' }, { defaultTrackingType: 'UNCLASSIFIED' }, { videos: [{ title: 'Demo', url: 'javascript:alert(1)' }] }]) assert.throws(() => exercisePayload({ ...base, ...patch }));
  for (const link of ['javascript:alert(1)', 'file:///tmp/video', 'intent://video', 'https://user:pass@example.com/video', 'bad-url']) assert.equal(videoLink(link), null);
  assert.equal(videoLink('https://example.com/video'), 'https://example.com/video');
});
test('API pagination keeps envelope meta while existing get continues unwrapping data', async () => {
  const originalFetch = global.fetch;
  const envelope = { success: true, data: [base], meta: { page: 2, limit: 12, total: 20, totalPages: 2 } };
  const { api } = loadTs('src/services/api/client.ts', { '@/services/config': { API_BASE_URL: 'https://test.invalid' }, '@/services/sessionStore': { getStoredSession: async () => ({ token: 'test-token' }) } });
  global.fetch = async (url, options) => {
    assert.equal(options.headers.get('Authorization'), 'Bearer test-token');
    assert.ok(url.startsWith('https://test.invalid/api/exercises'));
    return new Response(JSON.stringify(envelope), { status: 200 });
  };
  try { assert.deepEqual(await api.getPage('/api/exercises'), envelope); assert.deepEqual(await api.get('/api/exercises'), envelope.data); }
  finally { global.fetch = originalFetch; }
});
test('API reports permission errors instead of rendering an empty successful page', async () => {
  const originalFetch = global.fetch;
  const { api } = loadTs('src/services/api/client.ts', { '@/services/config': { API_BASE_URL: 'https://test.invalid' }, '@/services/sessionStore': { getStoredSession: async () => null } });
  global.fetch = async () => new Response(JSON.stringify({ message: 'Không có quyền' }), { status: 403 });
  try { await assert.rejects(() => api.getPage('/api/exercises'), (error) => error.status === 403 && error.message === 'Không có quyền'); }
  finally { global.fetch = originalFetch; }
});
