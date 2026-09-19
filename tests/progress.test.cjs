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

const { dateIso, dayKey, journeyPath, initialResult, cleanResult, sessionPayload, measurementPayload, reportPayload, metricSeries, sessionTitle, calculateNextSessionIndex } = loadTs('src/services/progress.ts');
const exercise = { exerciseId: 'e1', name: 'Squat', trackingType: 'STRENGTH', prescription: { sets: 2, reps: 10, weight: 50 } };
const plan = { _id: 'p1', version: 3, lifecycleStatus: 'ACTIVE', sessions: [{ name: 'First', exercises: [exercise] }, { name: 'Second', exercises: [{ exerciseId: 'e2', trackingType: 'CARDIO' }] }], scheduledSessions: [{ name: 'Different order' }] };
const draft = { date: '2026-09-15', time: '09:30', sessionIndex: '0', attendance: 'PRESENT', results: [{ sets: [{ reps: '8', weight: '40', completed: true }] }] };
test('local dates roundtrip and reject invalid calendar dates, times and reversed ranges', () => {
  assert.equal(dayKey(dateIso('2026-09-15', '00:00')), '2026-09-15');
  for (const [day,time] of [['2026-02-29','00:00'],['2026-04-31','00:00'],['2026-09-15','24:00'],['2026-09-15','10:60'],['15/09/2026','10:00']]) assert.throws(() => dateIso(day,time));
  assert.equal(dayKey(dateIso('2024-02-29')), '2024-02-29');
  assert.throws(() => journeyPath('c1','2026-09-16','2026-09-15'));
  const url = new URL(journeyPath('c1','2026-09-15','2026-09-15'), 'https://test.invalid');
  assert.equal(url.pathname, '/api/customers/c1/journey');
  assert.equal(new Date(url.searchParams.get('to')).getMilliseconds(), 999);
  assert.equal(journeyPath(), '/api/me/journey');
});
test('actual results never copy prescribed performance', () => {
  assert.deepEqual(initialResult(exercise), { sets: [{ completed: false }, { completed: false }] });
  assert.deepEqual(initialResult({ trackingType: 'CARDIO', prescription: { distanceKm: 5 } }), {});
});
test('session payload binds exact stored session index, version, exercise identity and retry key', () => {
  const result = sessionPayload('c1', plan, draft, 'retry-key');
  assert.equal(result.workoutPlanVersion, 3);
  assert.equal(result.sessionIndex, 0);
  assert.equal(result.idempotencyKey, 'retry-key');
  assert.deepEqual(result.exerciseResults, [{ exerciseIndex: 0, exerciseId: 'e1', result: { sets: [{ reps: 8, weight: 40, completed: true }] } }]);
  const cardio = sessionPayload('c1', plan, { ...draft, sessionIndex: '1', results: [{ distanceKm: '2' }] }, 'key');
  assert.equal(cardio.exerciseResults[0].exerciseId, 'e2');
  assert.throws(() => sessionPayload('c1', { ...plan, version: 1.5 }, draft, 'key'));
  assert.throws(() => sessionPayload('c1', { ...plan, lifecycleStatus: 'ARCHIVED' }, draft, 'key'));
  assert.throws(() => sessionPayload('c1', plan, { ...draft, sessionIndex: '-1' }, 'key'));
  assert.throws(() => sessionPayload('c1', plan, { ...draft, results: [] }, 'key'));
  assert.throws(() => sessionPayload('c1', plan, draft, ''));
});
test('absent sessions discard stale results and optional attendance-only artifacts', () => {
  const payload = sessionPayload('c1', plan, { ...draft, attendance: 'ABSENT', results: [], absenceReason: 'Sick', bodyMeasurement: { weight: 70 }, progressPhotos: [{ photoUrl: 'x' }] }, 'key');
  assert.deepEqual(payload.exerciseResults, []);
  assert.equal(payload.absenceReason, 'Sick');
  assert.equal('bodyMeasurement' in payload, false);
  assert.equal('progressPhotos' in payload, false);
});
test('tracking results validate all types and retain real zero values', () => {
  assert.deepEqual(cleanResult('BODYWEIGHT', { sets: [{ reps: '0', addedWeight: '0', completed: true, calories: 20 }] }), { sets: [{ reps: 0, addedWeight: 0, completed: true }] });
  assert.deepEqual(cleanResult('CARDIO', { distanceKm: '0', weight: 20 }), { distanceKm: 0 });
  assert.deepEqual(cleanResult('INTERVAL', { rounds: '3', workSeconds: '30' }), { rounds: 3, workSeconds: 30 });
  assert.deepEqual(cleanResult('MOBILITY', { discomfort: '0', side: 'BOTH' }), { discomfort: 0, side: 'BOTH' });
  for (const [type,value] of [['STRENGTH',{ sets:[{completed:true}] }],['CARDIO',{rpe:11}],['CARDIO',{}],['INTERVAL',{rounds:1.5}],['MOBILITY',{discomfort:-1}],['UNCLASSIFIED',{}]]) assert.throws(() => cleanResult(type,value));
});
test('measurements validate ranges and separate circumference fields from body composition', () => {
  const result = measurementPayload({ date: '2026-09-15', weight:'70', bodyFatPercentage:'0', waist:'80', muscleMass:'   ', notes:'ignored' });
  assert.equal(result.weight, 70);
  assert.equal(result.bodyFatPercentage, 0);
  assert.deepEqual(result.measurements, { waist:80 });
  assert.equal('muscleMass' in result, false);
  for (const value of [{}, {weight:'0'}, {bodyFatPercentage:'101'}, {waist:'-1'}]) assert.throws(() => measurementPayload({date:'2026-09-15',...value}));
});
test('metric series skips missing and invalid dates while preserving zero and chronological order', () => {
  assert.deepEqual(metricSeries([{ measuredAt:'2026-09-16',bodyFatPercentage:12 },{ measuredAt:'2026-09-15',bodyFatPercentage:0 },{ measuredAt:'2026-09-14',weight:70 },{ measuredAt:'bad',bodyFatPercentage:4 }],'bodyFatPercentage'),[{date:'2026-09-15',value:0},{date:'2026-09-16',value:12}]);
  assert.deepEqual(metricSeries([{measuredAt:'2026-09-15',measurements:{waist:80}}],'waist'),[{date:'2026-09-15',value:80}]);
});
test('reports accept same-day periods and reject empty or reversed reports', () => {
  assert.equal(reportPayload({from:'2026-09-15',to:'2026-09-15',summary:' Good progress '}).summary,'Good progress');
  assert.throws(() => reportPayload({from:'2026-09-16',to:'2026-09-15',summary:'x'}));
  assert.throws(() => reportPayload({from:'2026-09-15',to:'2026-09-15',summary:' '}));
});
test('historical session title uses the stored snapshot', () => {
  assert.equal(sessionTitle({planSnapshot:{title:'Old plan',session:{name:'Old session'}},name:'New session'}),'Old session');
});

test('session saves optional measurements photos and signature without changing actual results', () => {
  const extra = { bodyMeasurement: { weight: '70', waist: '80', bodyFatPercentage: '0' }, progressPhotos: [{ photoUrl: 'https://example.com/photo.jpg', angle: 'FRONT' }], customerSignature: { signatureUrl: 'data:image/png;base64,AAAA', signedAt: '2026-09-15T10:00:00.000Z', signerName: 'Test' } };
  const result = sessionPayload('c1', plan, { ...draft, ...extra }, 'retry-key');
  assert.deepEqual(result.bodyMeasurement, { weight: 70, bodyFatPercentage: 0, measurements: { waist: 80 } });
  assert.deepEqual(result.progressPhotos, extra.progressPhotos);
  assert.equal(result.customerSignature.signerName, 'Test');
  assert.equal(result.exerciseResults[0].result.sets[0].weight, 40);
  const absent = sessionPayload('c1', plan, { ...draft, ...extra, attendance: 'ABSENT' }, 'retry-key');
  for (const key of ['bodyMeasurement', 'progressPhotos', 'customerSignature']) assert.equal(absent[key], undefined);
});
test('optional session data rejects unsafe media and invalid measurements', () => {
  for (const extra of [
    { bodyMeasurement: { weight: '-1' } },
    { progressPhotos: [{ photoUrl: 'javascript:bad', angle: 'FRONT' }] },
    { progressPhotos: [{ photoUrl: 'https://example.com/p.jpg', angle: 'INVALID' }] },
    { progressPhotos: Array.from({ length: 5 }, () => ({ photoUrl: 'https://example.com/p.jpg', angle: 'FRONT' })) },
    { customerSignature: { signatureUrl: 'file:///secret' } },
  ]) assert.throws(() => sessionPayload('c1', plan, { ...draft, ...extra }, 'retry-key'));
  assert.equal(sessionPayload('c1', plan, { ...draft, bodyMeasurement: { weight: ' ' } }, 'retry-key').bodyMeasurement, undefined);
});

test('calculateNextSessionIndex advances to next session and cycles when plan completes', () => {
  assert.equal(calculateNextSessionIndex({ sessions: [] }, []), 0);
  assert.equal(calculateNextSessionIndex(plan, []), 0);

  // Completed session 0 -> next is session 1
  const session1 = { workoutPlanId: 'p1', sessionIndex: 0, performedAt: '2026-09-15T09:00:00Z', attendance: 'PRESENT' };
  assert.equal(calculateNextSessionIndex(plan, [session1]), 1);

  // Completed session 1 (last in a 2-session plan) -> cycles back to 0
  const session2 = { workoutPlanId: 'p1', sessionIndex: 1, performedAt: '2026-09-16T09:00:00Z', attendance: 'PRESENT' };
  assert.equal(calculateNextSessionIndex(plan, [session2, session1]), 0);

  // Absent session does not advance index
  const absentSession = { workoutPlanId: 'p1', sessionIndex: 1, performedAt: '2026-09-17T09:00:00Z', attendance: 'ABSENT' };
  assert.equal(calculateNextSessionIndex(plan, [absentSession, session1]), 1);

  // Matches by planSnapshot session name if sessionIndex is missing
  const snapshotSession = { workoutPlanId: 'p1', planSnapshot: { session: { name: 'First' } }, performedAt: '2026-09-15T09:00:00Z', attendance: 'PRESENT' };
  assert.equal(calculateNextSessionIndex(plan, [snapshotSession]), 1);

  // Prefers sessions matching the target plan id
  const oldPlanSession = { workoutPlanId: 'other-plan', sessionIndex: 0, performedAt: '2026-09-18T09:00:00Z', attendance: 'PRESENT' };
  assert.equal(calculateNextSessionIndex(plan, [oldPlanSession, session1]), 1);

  // 4-session plan with "Ngày 1", "Ngày 2", "Ngày 3", "Ngày 4"
  const plan4 = {
    _id: 'p4',
    sessions: [
      { name: 'Ngày 1', exercises: [exercise] },
      { name: 'Ngày 2', exercises: [exercise] },
      { name: 'Ngày 3', exercises: [exercise] },
      { name: 'Ngày 4', exercises: [exercise] },
    ],
  };
  const d1 = { workoutPlanId: 'p4', name: 'Ngày 1', performedAt: '2026-09-15T09:00:00Z', attendance: 'PRESENT' };
  const d2 = { workoutPlanId: 'p4', name: 'Ngày 2', performedAt: '2026-09-16T09:00:00Z', attendance: 'PRESENT' };
  const d3 = { workoutPlanId: 'p4', name: 'Ngày 3', performedAt: '2026-09-17T09:00:00Z', attendance: 'PRESENT' };

  // When 3 sessions are completed, next session must be index 3 ("Ngày 4")
  assert.equal(calculateNextSessionIndex(plan4, [d3, d2, d1]), 3);

  // Even if dates are unsorted or sessionIndex missing, 3 completed sessions select index 3
  assert.equal(calculateNextSessionIndex(plan4, [d1, d2, d3]), 3);

  // When 4 sessions are completed in plan4, cycles back to index 0
  const d4 = { workoutPlanId: 'p4', name: 'Ngày 4', performedAt: '2026-09-18T09:00:00Z', attendance: 'PRESENT' };
  assert.equal(calculateNextSessionIndex(plan4, [d4, d3, d2, d1]), 0);
});


test('session cache keeps the newest local edit and restores it over an older server draft', async () => {
  const data = new Map();
  const storage = {
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { await new Promise(resolve => setTimeout(resolve, value.includes('first') ? 15 : 0)); data.set(key, value); },
    removeItem: async key => { data.delete(key); },
  };
  const { writeSessionDraftCache, readSessionDraftCache, clearSessionDraftCache, restoreSessionDraft } = loadTs(
    'src/services/sessionDraftCache.ts', { '@react-native-async-storage/async-storage': storage }
  );
  const base = { plan, idempotencyKey: 'same-key', revision: 1, updatedAt: '2026-09-15T10:00:00.000Z' };
  await Promise.all([
    writeSessionDraftCache('pt1', 'customer1', { ...base, form: { notes: 'first' } }),
    writeSessionDraftCache('pt1', 'customer1', { ...base, form: { notes: 'last' }, updatedAt: '2026-09-15T10:01:00.000Z' }),
  ]);
  const cached = await readSessionDraftCache('pt1', 'customer1');
  assert.equal(cached.form.notes, 'last');
  assert.equal(await readSessionDraftCache('pt2', 'customer1'), null);
  const server = { ...base, form: { notes: 'server' }, pendingPayload: null };
  assert.equal(restoreSessionDraft(server, cached).draft.form.notes, 'last');
  assert.equal(restoreSessionDraft({ ...server, updatedAt: '2026-09-15T10:02:00.000Z' }, cached).draft.form.notes, 'server');
  assert.equal(restoreSessionDraft({ ...server, idempotencyKey: 'new-session' }, cached).draft.form.notes, 'server');
  await clearSessionDraftCache('pt1', 'customer1');
  assert.equal(await readSessionDraftCache('pt1', 'customer1'), null);
});
