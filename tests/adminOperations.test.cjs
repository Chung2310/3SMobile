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
  mod.require = id => id in mocks ? mocks[id] : require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(target, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, target);
  return mod.exports;
}
const { featurePayload, batchTransferPayload, foodImagePayload, foodImagePath, validateFoodImageFile, MAX_FOOD_IMAGE_BYTES } = loadTs('src/services/adminOperations.ts');

test('feature saves preserve stored roles and pilots, including empty permissions', () => {
  const pilot = '507f1f77bcf86cd799439011';
  const original = { key:'CARE', enabled:false, roles:['CUSTOMER'], pilotUserIds:[pilot] };
  assert.deepEqual(featurePayload({...original,enabled:true}), {enabled:true,roles:['CUSTOMER'],pilotUserIds:[pilot]});
  assert.deepEqual(featurePayload({key:'CARE',enabled:false,roles:[],pilotUserIds:[]}), {enabled:false,roles:[],pilotUserIds:[]});
  assert.deepEqual(original.roles,['CUSTOMER']);
  assert.throws(() => featurePayload({...original,roles:['SUPER_ADMIN']}));
  assert.throws(() => featurePayload({...original,pilotUserIds:['bad-id']}));
});
test('batch transfers retain explicit customer selection, deduplicate ids, and reject same-PT transfers', () => {
  const selected = [{_id:'customer1',assignedPtId:{_id:'pt1'}},{id:'customer2',assignedPtId:'pt1'},{_id:'customer1'}];
  assert.deepEqual(batchTransferPayload(selected,'pt2','  Đổi ca  '),{customerIds:['customer1','customer2'],toPtId:'pt2',reason:'Đổi ca'});
  assert.throws(() => batchTransferPayload(selected,'pt1','Đổi ca'));
  assert.throws(() => batchTransferPayload([],'pt2','Đổi ca'));
  assert.throws(() => batchTransferPayload(selected,'','Đổi ca'));
  assert.throws(() => batchTransferPayload(selected,'pt2','  '));
});
test('food search preserves Unicode, pagination, source and category', () => {
  const url = new URL(foodImagePath(3,'Bò & rau','AI','PROTEIN'),'https://test.invalid');
  assert.equal(url.searchParams.get('search'),'Bò & rau');
  assert.equal(url.searchParams.get('page'),'3');
  assert.equal(url.searchParams.get('source'),'AI');
  assert.equal(url.searchParams.get('category'),'PROTEIN');
});
test('food edits whitelist fields and preserve real zero nutrition values', () => {
  const value = foodImagePayload({_id:'hidden',name:'  Bò xào  ',calories:0,protein:12.5,usageCount:0,keywords:'bò; rau\n sạch',imageUrl:'/uploads/food-images/test.jpg'});
  assert.equal(value._id,undefined); assert.equal(value.name,'Bò xào'); assert.equal(value.calories,0); assert.equal(value.usageCount,0);
  assert.equal(value.keywords,'bò,rau,sạch');
  for (const patch of [{name:''},{protein:-1},{fat:Infinity},{usageCount:1.2},{imageUrl:'javascript:alert(1)'}]) assert.throws(() => foodImagePayload({name:'Món ăn',...patch}));
});
test('food upload rejects unsupported formats, empty and oversized files', () => {
  assert.equal(validateFoodImageFile('image/jpg',MAX_FOOD_IMAGE_BYTES),'image/jpeg');
  assert.equal(validateFoodImageFile('image/webp',1),'image/webp');
  assert.throws(() => validateFoodImageFile('image/svg+xml',10));
  assert.throws(() => validateFoodImageFile('image/png',0));
  assert.throws(() => validateFoodImageFile('image/png',MAX_FOOD_IMAGE_BYTES+1));
});
test('multipart image replacement uses PATCH with authorization and preserves file boundary', async () => {
  const originalFetch = global.fetch;
  const {api} = loadTs('src/services/api/client.ts',{'@/services/config':{API_BASE_URL:'https://test.invalid'},'@/services/sessionStore':{getStoredSession:async () => ({token:'test-token'})}});
  const form = new FormData(); form.append('name','Món ăn'); form.append('image',new Blob(['image'],{type:'image/png'}),'food.png');
  global.fetch = async (url,options) => {
    assert.equal(url,'https://test.invalid/api/food-images/id');
    assert.equal(options.method,'PATCH'); assert.equal(options.body,form);
    assert.equal(options.headers.get('Authorization'),'Bearer test-token');
    assert.equal(options.headers.has('Content-Type'),false);
    return new Response(JSON.stringify({data:{_id:'id',name:'Món ăn'}}),{status:200});
  };
  try {assert.equal((await api.uploadPatch('/api/food-images/id',form))._id,'id');} finally {global.fetch = originalFetch;}
});
test('food pagination retains server summary without deriving activity totals', async () => {
  const originalFetch = global.fetch;
  const {api} = loadTs('src/services/api/client.ts',{'@/services/config':{API_BASE_URL:'https://test.invalid'},'@/services/sessionStore':{getStoredSession:async () => null}});
  const result = {data:[],meta:{page:1,totalPages:0,total:0,limit:12},summary:{totalImages:42,totalUsage:120}};
  global.fetch = async () => new Response(JSON.stringify(result),{status:200});
  try {assert.deepEqual(await api.getPage('/api/food-images'),result);} finally {global.fetch = originalFetch;}
});
