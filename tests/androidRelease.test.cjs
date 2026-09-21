const process = require('node:process');
const { Buffer } = require('node:buffer');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepare } = require('../scripts/prepare-android-release.cjs');
const { buildNumber: versionCode, prepare: prepareRelease } = require('../scripts/prepare-release.cjs');
const appConfig = require('../app.config');
const base = require('../app.json').expo;
function restoreVersionEnv(t) {
  const originalVersion = process.env.APP_VERSION;
  delete process.env.APP_VERSION;
  t.after(() => {
    if (originalVersion === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = originalVersion;
  });
  const original = process.env.APP_BUILD_NUMBER;
  t.after(() => {
    if (original === undefined) delete process.env.APP_BUILD_NUMBER;
    else process.env.APP_BUILD_NUMBER = original;
  });
}

test('release version increases with workflow runs and rejects invalid or overflowing values', () => {
  assert.equal(versionCode('1'), 1001);
  assert.equal(versionCode('2'), 1002);
  assert.equal(versionCode('2099999000'), 2100000000);
  for (const value of [undefined, '', '0', '-1', '1.5', 'abc', '2099999001']) {
    assert.throws(() => versionCode(value));
  }
});

test('Expo config consumes the CI version without changing app identity or other settings', (t) => {
  restoreVersionEnv(t);
  process.env.APP_BUILD_NUMBER = '1042';
  process.env.APP_VERSION = '1.2.3';
  const result = appConfig({ config: base });
  assert.equal(result.android.versionCode, 1042);
  assert.equal(result.ios.buildNumber, '1042');
  assert.equal(result.version, '1.2.3');
  assert.equal(result.ios.bundleIdentifier, base.ios.bundleIdentifier);
  assert.deepEqual(result.ios.infoPlist, base.ios.infoPlist);
  assert.equal(result.android.package, 'vn.gym3s.mobile');
  assert.deepEqual(result.plugins, base.plugins);
  assert.deepEqual(result.android.adaptiveIcon, base.android.adaptiveIcon);
  assert.equal(base.android.versionCode, undefined);
});

test('local config stays unchanged and malformed release versions fail', (t) => {
  restoreVersionEnv(t);
  delete process.env.APP_BUILD_NUMBER;
  assert.equal(appConfig({ config: base }), base);
  for (const value of ['', '0', '-1', '1.2', '1e3', '2100000001']) {
    process.env.APP_BUILD_NUMBER = value;
    assert.throws(() => appConfig({ config: base }));
  }
});

test('release signing requires a persistent key and never generates a fallback key', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), '3s-signing-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const env = { RUNNER_TEMP: dir, GITHUB_RUN_NUMBER: '42' };
  assert.throws(() => prepare(env), /existing release key/);
  assert.throws(() => prepare({ ...env, ANDROID_KEYSTORE_PASSWORD: 'test' }), /existing release key/);
  assert.throws(() => prepare({ ...env, ANDROID_KEYSTORE_PASSWORD: 'test', ANDROID_KEYSTORE_BASE64: 'invalid' }), /base64/);
  assert.equal(fs.existsSync(path.join(dir, '3s-gym-release.keystore')), false);
});

test('restores the exact supplied key on successive runs without exporting passwords', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), '3s-signing-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  // Fixture tests byte preservation only; apksigner validates real keystores in CI.
  const key = Buffer.alloc(128, 42);
  const envFile = path.join(dir, 'github-env');
  const env = { RUNNER_TEMP: dir, GITHUB_ENV: envFile, GITHUB_RUN_NUMBER: '42',
    ANDROID_KEYSTORE_BASE64: key.toString('base64'), ANDROID_KEYSTORE_PASSWORD: ' test password ' };
  prepare(env);
  assert.deepEqual(fs.readFileSync(path.join(dir, '3s-gym-release.keystore')), key);
  assert.equal(fs.readFileSync(envFile, 'utf8').includes('APP_BUILD_NUMBER'), false);
  prepare({ ...env, GITHUB_RUN_NUMBER: '43' });
  assert.deepEqual(fs.readFileSync(path.join(dir, '3s-gym-release.keystore')), key);
  const exported = fs.readFileSync(envFile, 'utf8');
  assert.equal(exported.includes('APP_BUILD_NUMBER'), false);
  assert.equal(exported.includes('PASSWORD'), false);
  assert.equal(exported.includes(env.ANDROID_KEYSTORE_PASSWORD), false);
});

test('both platform jobs export identical release metadata without signing credentials', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), '3s-release-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const iosEnv = path.join(dir, 'ios-env');
  const androidEnv = path.join(dir, 'android-env');
  const env = { GITHUB_RUN_NUMBER: '42', APP_VERSION: '1.2.3' };
  assert.deepEqual(prepareRelease({ ...env, GITHUB_ENV: iosEnv }), { version: '1.2.3', buildNumber: 1042 });
  prepareRelease({ ...env, GITHUB_ENV: androidEnv });
  assert.equal(fs.readFileSync(iosEnv, 'utf8'), 'APP_VERSION=1.2.3\nAPP_BUILD_NUMBER=1042\n');
  assert.equal(fs.readFileSync(iosEnv, 'utf8'), fs.readFileSync(androidEnv, 'utf8'));
  assert.equal(prepareRelease({ GITHUB_RUN_NUMBER: '43', GITHUB_ENV: iosEnv }).version, base.version);
  assert.throws(() => prepareRelease({ ...env, APP_VERSION: '1.2.3-beta', GITHUB_ENV: iosEnv }), /APP_VERSION/);
});

test('shared app version can be changed without overriding local native build numbers', (t) => {
  restoreVersionEnv(t);
  delete process.env.APP_BUILD_NUMBER;
  process.env.APP_VERSION = '2.0.1';
  const result = appConfig({ config: base });
  assert.equal(result.version, '2.0.1');
  assert.deepEqual(result.ios, base.ios);
  assert.deepEqual(result.android, base.android);
  process.env.APP_VERSION = 'bad';
  assert.throws(() => appConfig({ config: base }), /APP_VERSION/);
});
