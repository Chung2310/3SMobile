/* global __dirname */
const process = require('node:process');
const { Buffer } = require('node:buffer');
const fs = require('node:fs');
const path = require('node:path');

function prepare(env) {
  const runnerTemp = env.RUNNER_TEMP || path.join(__dirname, '..', '.tmp');
  fs.mkdirSync(runnerTemp, { recursive: true });

  const encoded = env.ANDROID_KEYSTORE_BASE64?.trim();
  const password = env.ANDROID_KEYSTORE_PASSWORD;
  const targetKeystore = path.join(runnerTemp, '3s-gym-release.keystore');

  if (!encoded || !password) {
    throw new Error('Set ANDROID_KEYSTORE_BASE64 and ANDROID_KEYSTORE_PASSWORD to the existing release key. Refusing to generate a new key that would prevent app updates.');
  }
  const normalized = encoded.replace(/\s/g, '');
  const bytes = Buffer.from(normalized, 'base64');
  if (bytes.length < 100 || bytes.toString('base64') !== normalized) throw new Error('Invalid keystore base64 encoding');
  fs.writeFileSync(targetKeystore, bytes, { mode: 0o600 });
  console.log('Persistent Android signing keystore restored.');

  if (env.GITHUB_ENV) {
    fs.appendFileSync(
      env.GITHUB_ENV,
      `APP_ANDROID_KEYSTORE=${targetKeystore}\n` +
      `APP_IS_PRODUCTION_KEY=true\n`
    );
  }
}

if (require.main === module) {
  try {
    prepare(process.env);
    console.log('Android signing preparation complete.');
  } catch (err) {
    console.error('Failed to prepare Android release:', err.message);
    process.exit(1);
  }
}

module.exports = { prepare };
