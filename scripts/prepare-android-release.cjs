const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

function versionCode(runNumber) {
  if (!/^[1-9]\d*$/.test(String(runNumber || ''))) return 1001;
  const code = 1000 + Number(runNumber);
  if (!Number.isSafeInteger(code) || code > 2100000000) throw new Error('Android versionCode exceeds limit');
  return code;
}

function prepare(env) {
  const code = versionCode(env.GITHUB_RUN_NUMBER);
  const runnerTemp = env.RUNNER_TEMP || path.join(__dirname, '..', '.tmp');
  fs.mkdirSync(runnerTemp, { recursive: true });

  const encoded = env.ANDROID_KEYSTORE_BASE64?.trim();
  const password = env.ANDROID_KEYSTORE_PASSWORD?.trim();
  const targetKeystore = path.join(runnerTemp, '3s-gym-release.keystore');

  let activePassword = password;
  let isProductionKey = false;

  if (encoded && password) {
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length < 100) throw new Error('Invalid keystore encoding (too small)');
    fs.writeFileSync(targetKeystore, bytes, { mode: 0o600 });
    isProductionKey = true;
    console.log('Production Android keystore extracted successfully.');
  } else {
    // Generate fallback self-signed keystore for CI builds
    console.log('No ANDROID_KEYSTORE_BASE64 found in secrets. Generating self-signed key for testing APK...');
    activePassword = 'androiddebugkey';
    const keytoolCmd = `keytool -genkey -v -keystore "${targetKeystore}" -storepass "${activePassword}" -alias "3sgym" -keypass "${activePassword}" -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=3S Gym,O=3SGym,C=VN"`;
    execSync(keytoolCmd, { stdio: 'inherit' });
  }

  if (env.GITHUB_ENV) {
    fs.appendFileSync(
      env.GITHUB_ENV,
      `APP_ANDROID_KEYSTORE=${targetKeystore}\n` +
      `APP_ANDROID_KEYSTORE_PASSWORD=${activePassword}\n` +
      `APP_ANDROID_VERSION_CODE=${code}\n` +
      `APP_IS_PRODUCTION_KEY=${isProductionKey}\n`
    );
  }
}

if (require.main === module) {
  try {
    prepare(process.env);
    console.log('Android release preparation complete. VersionCode:', versionCode(process.env.GITHUB_RUN_NUMBER));
  } catch (err) {
    console.error('Failed to prepare Android release:', err.message);
    process.exit(1);
  }
}

module.exports = { versionCode, prepare };
