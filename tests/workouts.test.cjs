/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
// Compile only the pure data helpers in memory; no mobile runtime or generated files.
function loadTs(filename) {
  const target = path.resolve(__dirname, '..', filename);
  const mod = new Module(target, module);
  mod.filename = target;
  mod.paths = module.paths;
  mod.require = (id) => id === './journey' ? loadTs('src/services/journey.ts') : require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(target, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, target);
  return mod.exports;
}
const { workoutDays, customerPlans, exerciseMetrics, planPayload, prepareDraft } = loadTs('src/services/workouts.ts');

test('AI draft retains generated exercise definitions and schedule when saved', () => {
  const generatedExercises = [{ name: 'AI squat', muscleGroup: 'Legs', level: 'BEGINNER', defaultTrackingType: 'STRENGTH' }];
  const scheduledExercises = [{ name: 'AI squat', trackingType: 'STRENGTH', prescription: { sets: 3, reps: '10' }, weekNumber: 2, dayNumber: 1, startMinute: 480, durationMinutes: 30 }];
  const draft = prepareDraft({ title: 'AI plan', goal: 'Strength', level: 'BEGINNER', durationDays: 14, generatedExercises, scheduledExercises });
  const payload = planPayload(draft);
  assert.deepEqual(payload.generatedExercises, generatedExercises);
  assert.equal(payload.scheduledExercises[0].weekNumber, 2);
  assert.equal(payload.scheduledExercises[0].startMinute, 480);
  assert.equal(payload.scheduledExercises[0].prescription.sets, 3);
});
const exercise = { name: 'Squat', trackingType: 'STRENGTH', prescription: { sets: 3, reps: '8–10', targetWeight: 0, restSeconds: 60 } };
const plan = { title: 'Cơ bản', goal: 'Thể lực', level: 'BEGINNER', durationDays: 28, sessions: [{ name: 'Buổi 1', exercises: [exercise] }] };
test('Studio groups weeks separately and orders exercises by start time', () => {
  const scheduledExercises = [{ ...exercise, weekNumber: 2, dayNumber: 1, startMinute: 600 }, { ...exercise, dayNumber: 1, startMinute: 615 }, { ...exercise, dayNumber: 1, startMinute: 540 }];
  const days = workoutDays({ sessions: plan.sessions, scheduledExercises });
  assert.equal(days.length, 2);
  assert.deepEqual(days.map((d) => d.key), ['1:1', '2:1']);
  assert.equal(days[0].exercises[0].startMinute, 540);
  assert.equal(scheduledExercises[0].weekNumber, 2);
});
test('customer sees only published plans; deduplicates active and history', () => {
  const published = { ...plan, _id: 'p1', status: 'PUBLISHED' };
  const history = { ...published, _id: 'p2', lifecycleStatus: 'ARCHIVED' };
  assert.deepEqual(customerPlans({ active: { ...published, _id: 'draft', status: 'DRAFT' }, published: [published, history], history: [history, { _id: 'private' }] }).map((p) => p._id), ['p1', 'p2']);
  assert.deepEqual(customerPlans(null), []);
});
test('renders cardio and zero-weight prescriptions without strength-only fields', () => {
  assert.ok(exerciseMetrics(exercise).some(([label, value]) => label === 'Weight' && value === '0 kg'));
  assert.deepEqual(exerciseMetrics({ trackingType: 'CARDIO', prescription: { durationMinutes: 20, distanceKm: 3 } }), [['Duration', '20 min'], ['Distance', '3 km']]);
});
test('payload excludes server fields, synchronizes legacy values, keeps snapshots untouched', () => {
  const original = { ...plan, _id: 'id', status: 'PUBLISHED', sessions: [{ name: 'Buổi', exercises: [{ ...exercise, sets: 9, weight: '80', _id: 'nested' }] }] };
  const payload = planPayload(original);
  assert.equal(payload._id, undefined);
  assert.equal(payload.status, undefined);
  assert.equal(payload.sessions[0].exercises[0]._id, undefined);
  assert.equal(payload.sessions[0].exercises[0].sets, 3);
  assert.equal(payload.sessions[0].exercises[0].weight, '0');
  assert.equal(original.sessions[0].exercises[0].sets, 9);
});
test('prepares legacy prescription without overwriting canonical zero values', () => {
  const prepared = prepareDraft({ ...plan, sessions: [{ name: 'Buổi', exercises: [{ ...exercise, sets: 9, prescription: { targetWeight: 0 }, weight: '80' }] }] });
  assert.equal(prepared.sessions[0].exercises[0].prescription.sets, 9);
  assert.equal(prepared.sessions[0].exercises[0].prescription.targetWeight, 0);
});
test('schedule payload retains week/time and unscheduled exercises', () => {
  const scheduledExercises = [{ ...exercise, weekNumber: 2, dayNumber: 3, startMinute: 600, durationMinutes: 30 }];
  const payload = planPayload({ ...plan, scheduledExercises, unscheduledExercises: [{ ...exercise, durationMinutes: 15 }] });
  assert.equal(payload.sessions, undefined);
  assert.equal(payload.scheduledExercises[0].weekNumber, 2);
  assert.equal(payload.scheduledExercises[0].startMinute, 600);
  assert.equal(payload.unscheduledExercises[0].durationMinutes, 15);
  assert.throws(() => planPayload({ ...plan, scheduledExercises, durationDays: 7 }), /lịch bài tập/);
});
test('rejects missing fields, unclassified exercises and invalid numeric prescriptions', () => {
  for (const patch of [{ title: '' }, { goal: ' ' }, { level: '' }, { sessions: [] }, { durationDays: 0 }]) assert.throws(() => planPayload({ ...plan, ...patch }));
  for (const invalid of [{ trackingType: 'UNCLASSIFIED' }, { prescription: { sets: -1 } }, { prescription: { sets: 1.5 } }, { prescription: { targetRpe: 11 } }, { prescription: { targetWeight: 'abc' } }]) assert.throws(() => planPayload({ ...plan, sessions: [{ name: 'Buổi', exercises: [{ ...exercise, ...invalid }] }] }));
});
test('accepts the five tracking schemas including interval and mobility', () => {
  const prescriptions = { STRENGTH: { sets: '3', reps: '8-10' }, BODYWEIGHT: { sets: 2, addedWeight: 0 }, CARDIO: { durationMinutes: '20', distanceKm: 3.5 }, INTERVAL: { rounds: 4, workSeconds: 30, restSeconds: 0 }, MOBILITY: { reps: '5', side: 'both', targetDiscomfort: 0 } };
  for (const [trackingType, prescription] of Object.entries(prescriptions)) {
    const result = planPayload({ ...plan, sessions: [{ name: 'Buổi', exercises: [{ name: 'Bài', trackingType, prescription }] }] });
    assert.equal(result.sessions[0].exercises[0].trackingType, trackingType);
  }
});


test('Studio schedule rejects overlaps, invalid slots and out-of-day times', () => {
  const slot = { ...exercise, weekNumber: 1, dayNumber: 1, startMinute: 480, durationMinutes: 60 };
  const build = (items) => planPayload({ ...plan, durationDays: 14, scheduledExercises: items });
  assert.throws(() => build([slot, { ...slot, startMinute: 510 }]), /trùng/);
  for (const patch of [{ startMinute: NaN }, { startMinute: 481 }, { durationMinutes: 0 }, { durationMinutes: 16 }, { startMinute: 1425 }, { dayNumber: 8 }, { weekNumber: 0 }]) assert.throws(() => build([{ ...slot, ...patch }]));
  assert.equal(build([slot, { ...slot, startMinute: 540 }]).scheduledExercises.length, 2);
  assert.equal(build([slot, { ...slot, weekNumber: 2 }]).scheduledExercises.length, 2);
});
