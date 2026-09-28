const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prepare } = require('./prepare-ios-build.cjs');
const config = require('../eas.json');

const env = {
  BUILD_PROFILE: 'preview',
  EXPO_TOKEN: 'test-only-token',
  EXPO_PUBLIC_API_URL: 'https://3s.igentechnology.net',
  EXPO_PUBLIC_EAS_PROJECT_ID: '11111111-2222-3333-4444-555555555555',
  IOS_BUNDLE_IDENTIFIER: 'com.igen.3s',
};

test('forwards public build configuration but not the token', () => {
  const result = prepare(config, env);
  assert.equal(result.build.preview.env.EXPO_PUBLIC_API_URL, env.EXPO_PUBLIC_API_URL);
  assert.equal(result.build.preview.env.EXPO_PUBLIC_EAS_PROJECT_ID, env.EXPO_PUBLIC_EAS_PROJECT_ID);
  assert.equal(result.build.preview.env.IOS_BUNDLE_IDENTIFIER, env.IOS_BUNDLE_IDENTIFIER);
  assert.equal(JSON.stringify(result).includes(env.EXPO_TOKEN), false);
  assert.equal(config.build.preview.env, undefined);
});

test('production uses store distribution and remote credentials', () => {
  const result = prepare(config, { ...env, BUILD_PROFILE: 'production' });
  assert.equal(result.build.production.distribution, 'store');
  assert.equal(result.build.production.credentialsSource, 'remote');
  assert.equal(result.build.production.autoIncrement, true);
});

for (const key of [...Object.keys(env), 'BUILD_PROFILE']) {
  test('rejects missing ' + key, () => {
    assert.throws(() => prepare(config, { ...env, [key]: '' }));
  });
}

test('rejects unsafe API URLs', () => {
  for (const url of ['http://3s.igentechnology.net', 'https://localhost', 'https://user:password@example.com']) {
    assert.throws(() => prepare(config, { ...env, EXPO_PUBLIC_API_URL: url }));
  }
});

test('rejects wrong project, bundle ID and profile', () => {
  for (const invalid of [
    { EXPO_PUBLIC_EAS_PROJECT_ID: 'missing' },
    { IOS_BUNDLE_IDENTIFIER: 'com.luxcare.mobile' },
    { BUILD_PROFILE: 'other' },
  ]) {
    assert.throws(() => prepare(config, { ...env, ...invalid }));
  }
});
