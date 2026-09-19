/* global __dirname */
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
      const rel = id.replace('@/', 'src/') + (id.endsWith('.ts') ? '' : '.ts');
      return loadTs(rel, mocks);
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

const mockApi = {
  getPage: async (url) => {
    if (url.includes('/api/users')) {
      return {
        data: [
          {
            _id: '679f2b38a7e04b017834bc01',
            fullName: 'Nguyễn Văn A',
            username: 'nguyenvana',
            phone: '0901234567',
            email: 'vana@gmail.com',
            role: 'CUSTOMER',
          },
          {
            _id: '679f2b38a7e04b017834bc02',
            fullName: 'Trần Thị B',
            username: 'tranthib',
            phone: '0912345678',
            role: 'PT',
          },
        ],
        meta: { total: 2, totalPages: 1 },
      };
    }
    return { data: [], meta: { total: 0, totalPages: 1 } };
  },
};

const {
  formatUserDisplay,
  formatUserSubtext,
  getUserInitials,
  resolveAdminUsers,
  isMongoObjectId,
} = loadTs('src/services/adminUsers.ts', {
  '@/services/api/client': { api: mockApi },
});

test('isMongoObjectId detects 24-character hexadecimal ObjectIds', () => {
  assert.equal(isMongoObjectId('679f2b38a7e04b017834bc01'), true);
  assert.equal(isMongoObjectId('507f1f77bcf86cd799439011'), true);
  assert.equal(isMongoObjectId('not-a-mongo-id'), false);
  assert.equal(isMongoObjectId('12345'), false);
  assert.equal(isMongoObjectId(''), false);
  assert.equal(isMongoObjectId(null), false);
});

test('getUserInitials extracts initials correctly', () => {
  assert.equal(getUserInitials('Nguyễn Văn A'), 'NA');
  assert.equal(getUserInitials('Admin'), 'AD');
  assert.equal(getUserInitials(''), 'U');
  assert.equal(getUserInitials(null), 'U');
});

test('formatUserDisplay formats user with full name, username, and never exposes raw ObjectIds', () => {
  assert.equal(
    formatUserDisplay({ fullName: 'Nguyễn Văn A', username: 'nguyenvana' }),
    'Nguyễn Văn A (@nguyenvana)'
  );
  assert.equal(
    formatUserDisplay({ fullName: 'Nguyễn Văn A' }),
    'Nguyễn Văn A'
  );
  assert.equal(
    formatUserDisplay({ username: 'nguyenvana' }),
    '@nguyenvana'
  );
  assert.equal(
    formatUserDisplay({ phone: '0901234567' }),
    '0901234567'
  );
  // Raw 24-char ObjectId should NEVER be displayed as name
  const rawId = '679f2b38a7e04b017834bc99';
  const result = formatUserDisplay(rawId);
  assert.equal(result.includes('679f2b38a7e04b017834bc99'), false);
  assert.equal(result.includes('#bc99'), true);
});

test('formatUserSubtext extracts phone, username, and role labels', () => {
  const subtext = formatUserSubtext({
    fullName: 'Nguyễn Văn A',
    username: 'nguyenvana',
    phone: '0901234567',
    role: 'CUSTOMER',
  });
  assert.equal(subtext, '0901234567 · @nguyenvana · Học viên');
});

test('resolveAdminUsers resolves unpopulated user references across credit records', async () => {
  const records = [
    {
      _id: 'ledger1',
      userId: '679f2b38a7e04b017834bc01',
      type: 'TOPUP',
      availableDelta: 100,
    },
    {
      _id: 'ledger2',
      userId: '679f2b38a7e04b017834bc02',
      actorUserId: '679f2b38a7e04b017834bc01',
      type: 'ADJUSTMENT',
      availableDelta: -50,
    },
  ];

  const resolved = await resolveAdminUsers(records, ['userId', 'actorUserId']);

  assert.equal(typeof resolved[0].userId, 'object');
  assert.equal(resolved[0].userId.fullName, 'Nguyễn Văn A');
  assert.equal(resolved[0].userId.username, 'nguyenvana');
  assert.equal(resolved[0].userId.phone, '0901234567');

  assert.equal(typeof resolved[1].userId, 'object');
  assert.equal(resolved[1].userId.fullName, 'Trần Thị B');
  assert.equal(resolved[1].actorUserId.fullName, 'Nguyễn Văn A');
});
