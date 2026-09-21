/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function loadTs(filename) {
  const target = path.resolve(__dirname, '..', filename);
  const mod = new Module(target, module);
  mod.filename = target;
  mod.paths = module.paths;
  mod.require = (id) => id.startsWith('.') ? loadTs(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(target), id + '.ts'))) : require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(target, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, target);
  return mod.exports;
}
const { isAdminRole, homeForRole, canEditAccount, canDeleteAccount } = loadTs('src/services/adminAccess.ts');
const { resources, listPath, formPayload } = loadTs('src/services/adminResources.ts');
test('admin and superadmin route to administration without changing member/PT home', () => {
  for (const role of ['ADMIN','SUPER_ADMIN']) { assert.ok(isAdminRole(role)); assert.equal(homeForRole(role),'/(app)/admin'); }
  for (const role of ['PT','CUSTOMER',undefined,'admin']) { assert.equal(isAdminRole(role),false); assert.equal(homeForRole(role),'/(app)/(tabs)'); }
});
test('account permissions match web: admins cannot manage admins, superadmins cannot delete superadmins', () => {
  const admin = {id:'a',role:'ADMIN'}, superadmin = {id:'s',role:'SUPER_ADMIN'};
  for (const role of ['PT','CUSTOMER']) { assert.ok(canEditAccount(admin,{id:'x',role})); assert.ok(canDeleteAccount(admin,{id:'x',role})); }
  assert.equal(canEditAccount(admin,admin),false);
  assert.equal(canDeleteAccount(admin,superadmin),false);
  assert.ok(canEditAccount(superadmin,admin)); assert.ok(canDeleteAccount(superadmin,admin));
  assert.ok(canEditAccount(superadmin,superadmin)); assert.equal(canDeleteAccount(superadmin,superadmin),false);
  assert.equal(canEditAccount(superadmin,{id:'other',role:'SUPER_ADMIN'}),false);
  assert.equal(canEditAccount({role:'CUSTOMER'},admin),false);
});
test('pagination preserves role, Unicode search and status', () => {
  const url = new URL(listPath(resources.pts,3,'Huấn & luyện','LOCKED'),'https://test.invalid');
  assert.equal(url.searchParams.get('keyword'),'Huấn & luyện'); assert.equal(url.searchParams.get('role'),'PT');
  assert.equal(url.searchParams.get('page'),'3'); assert.equal(url.searchParams.get('status'),'LOCKED');
  assert.equal(resources.accounts.superOnly,true);
});
test('editing accounts excludes role, username and blank password; creation accepts flexible passwords', () => {
  const input = {username:'trainer',password:'Trainer@2026',fullName:'Trainer',phone:'0901234567',status:'ACTIVE'};
  const created = formPayload(resources.pts.fields,input,false); assert.equal(created.password,'Trainer@2026');
  const edited = formPayload(resources.pts.fields,{...input,password:''},true);
  assert.equal('username' in edited,false); assert.equal('password' in edited,false); assert.equal('role' in edited,false);
  assert.throws(() => formPayload(resources.pts.fields,{...input,password:'abcdef'},false));
});
test('customer edits never mutate PT assignment through the profile endpoint', () => {
  const input = {fullName:'Khách hàng',phone:'0901234567',assignedPtId:'pt1',status:'ACTIVE'};
  assert.equal(formPayload(resources.customers.fields,input,false).assignedPtId,'pt1');
  assert.equal('assignedPtId' in formPayload(resources.customers.fields,input,true),false);
});
test('reject invalid quantities and credit package price; retain zero and false', () => {
  const input = {name:'Gói tập',totalSessions:'12',durationDays:'30',price:'0'};
  assert.equal(formPayload(resources.packages.fields,input,false).price,0);
  for (const invalid of ['0','-1','1.5','NaN','Infinity']) assert.throws(() => formPayload(resources.packages.fields,{...input,totalSessions:invalid},false));
  const credit = {name:'Credit',amountVnd:'10000',active:'false',bonusCredits:'0'};
  assert.equal(formPayload(resources.creditPackages.fields,credit,false).active,false);
  assert.throws(() => formPayload(resources.creditPackages.fields,{...credit,amountVnd:'10500'},false));
});

test('passwords support Unicode and symbols without trimming or bcrypt truncation', () => {
  const { isValidPassword } = loadTs('src/services/passwordValidation.ts');
  for (const value of ['abcdefgh', '12345678', 'Password@2026', 'Mật khẩu mới 2026!', ' password ']) assert.equal(isValidPassword(value),true);
  for (const value of ['123456','       ','a'.repeat(73),'😀'.repeat(19)]) assert.equal(isValidPassword(value),false);
  assert.equal(isValidPassword('😀'.repeat(18)),true);
  const input={username:'trainer',password:' password ',fullName:'Trainer',phone:'0901234567',status:'ACTIVE'};
  assert.equal(formPayload(resources.pts.fields,input,false).password,' password ');
});
const { resolveTransferTrainers } = loadTs('src/services/transferTrainers.ts');
test('transfer trainer IDs resolve across pages, including locked trainers', async () => {
  const rows = [{ fromPtId: 'old', toPtId: { _id: 'new' }, customerId: 'customer' }];
  const calls = [];
  const result = await resolveTransferTrainers(rows, async page => {
    calls.push(page);
    return { data: page === 1 ? [{ id: 'new', fullName: 'HLV mới' }] : [{ _id: 'old', fullName: 'HLV cũ', status: 'LOCKED' }], meta: { totalPages: 2 } };
  });
  assert.deepEqual(calls, [1, 2]);
  assert.equal(result[0].fromPtId.fullName, 'HLV cũ');
  assert.equal(result[0].toPtId.fullName, 'HLV mới');
  assert.equal(result[0].customerId, 'customer');
  assert.equal(rows[0].fromPtId, 'old');
});
test('populated trainer names are reused without directory requests', async () => {
  const rows = [{ fromPtId: { _id: 'pt', fullName: 'Nguyễn Văn An' }, toPtId: 'pt' }];
  const result = await resolveTransferTrainers(rows, async () => { throw Error('unexpected request'); });
  assert.equal(result[0].toPtId.fullName, 'Nguyễn Văn An');
});
test('missing or unavailable trainer records never render raw IDs', async () => {
  for (const fetch of [async () => ({ data: [], meta: { totalPages: 1 } }), async () => { throw Error('offline'); }]) {
    const result = await resolveTransferTrainers([{ fromPtId: '6a9aaf3c00000000000000000', toPtId: null }], fetch);
    assert.equal(result[0].fromPtId.fullName, 'Chưa có thông tin HLV');
    assert.equal(result[0].toPtId, null);
  }
});
