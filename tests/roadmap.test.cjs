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
  mod.require = (id) => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/')) {
      const relPath = id.replace(/^@\//, 'src/') + '.ts';
      return loadTs(relPath, mocks);
    }
    if (id.startsWith('.')) {
      return loadTs(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(target), `${id}.ts`)), mocks);
    }
    return require(id);
  };
  mod._compile(
    ts.transpileModule(fs.readFileSync(target, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    target
  );
  return mod.exports;
}

const {
  getActiveRoadmap,
  formatMacroBreakdown,
  cleanPhaseName,
  formatPhaseDuration,
  parseRoadmapSessionBudget,
  getRoadmapCheckpoints,
} = loadTs('src/services/roadmap.ts');

test('getActiveRoadmap handles null, empty, published and draft roadmaps', () => {
  assert.equal(getActiveRoadmap(null), null);
  assert.equal(getActiveRoadmap({}), null);
  assert.equal(getActiveRoadmap({ roadmaps: [] }), null);

  const draftRoadmap = { _id: 'r-draft', status: 'DRAFT', title: 'Bản nháp' };
  const publishedRoadmap = { _id: 'r-pub', status: 'PUBLISHED', title: 'Lộ trình chính thức' };

  // Prioritizes PUBLISHED roadmap
  assert.equal(getActiveRoadmap({ roadmaps: [draftRoadmap, publishedRoadmap] })._id, 'r-pub');

  // Fallback to first roadmap if no published
  assert.equal(getActiveRoadmap({ roadmaps: [draftRoadmap] })._id, 'r-draft');
});

test('formatMacroBreakdown formats protein, carbs, and fat correctly', () => {
  assert.equal(formatMacroBreakdown(null), '');
  assert.equal(formatMacroBreakdown(undefined), '');

  const complete = { proteinGrams: 150, carbsGrams: 220, fatGrams: 55 };
  assert.equal(formatMacroBreakdown(complete), 'P: 150g • C: 220g • F: 55g');

  const partial = { proteinGrams: 120 };
  assert.equal(formatMacroBreakdown(partial), 'P: 120g • C: — • F: —');
});

test('cleanPhaseName removes redundant "Phase X:" prefix cleanly', () => {
  assert.equal(cleanPhaseName('Phase 1: Thích nghi & Nền tảng', 1), 'Thích nghi & Nền tảng');
  assert.equal(cleanPhaseName('Phase 2 - Tăng tiến cường độ', 2), 'Tăng tiến cường độ');
  assert.equal(cleanPhaseName('Phase 3: Siết cơ', 3), 'Siết cơ');
  assert.equal(cleanPhaseName('Duy trì phong độ', 4), 'Duy trì phong độ');
  assert.equal(cleanPhaseName('', 1), 'Giai đoạn 1');
});

test('formatPhaseDuration formats weeks and detailed weeks count', () => {
  assert.equal(formatPhaseDuration(4, 4), '4 tuần • 4 tuần chi tiết');
  assert.equal(formatPhaseDuration(0, 3), '3 tuần • 3 tuần chi tiết');
});

test('parseRoadmapSessionBudget formats session minutes budget', () => {
  assert.equal(parseRoadmapSessionBudget(null), null);
  assert.equal(parseRoadmapSessionBudget({ warmupMinutes: 0, strengthMinutes: 0, cardioMinutes: 0, cooldownMinutes: 0 }), null);

  const budget = { warmupMinutes: 10, strengthMinutes: 40, cardioMinutes: 15, cooldownMinutes: 5 };
  assert.equal(
    parseRoadmapSessionBudget(budget),
    'Phân bổ mỗi buổi: Khởi động 10p · Kháng lực 40p · Cardio 15p · Hồi phục 5p'
  );
});

test('getRoadmapCheckpoints returns checkpoints sorted by week', () => {
  assert.deepEqual(getRoadmapCheckpoints(null), []);
  assert.deepEqual(getRoadmapCheckpoints({}), []);

  const roadmap = {
    _id: 'r1',
    strategy: {
      checkpoints: [
        { week: 8, title: 'Đánh giá giữa kỳ', description: 'Đo lại InBody' },
        { week: 4, title: 'Check-in mốc 1', description: 'Kiểm tra kỹ thuật' },
        { week: 12, title: 'Tổng kết lộ trình', description: 'Đo chỉ số cuối' },
      ],
    },
  };

  const sorted = getRoadmapCheckpoints(roadmap);
  assert.equal(sorted.length, 3);
  assert.equal(sorted[0].week, 4);
  assert.equal(sorted[1].week, 8);
  assert.equal(sorted[2].week, 12);
});
