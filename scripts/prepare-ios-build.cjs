const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_PUBLIC_KEYS = [
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_EAS_PROJECT_ID',
  'IOS_BUNDLE_IDENTIFIER',
];

function prepare(config, env) {
  const token = env.EXPO_TOKEN || env.EAS_TOKEN || env.EXPO_ACCESS_TOKEN;
  if (!token?.trim()) throw new Error('Missing GitHub secret: EXPO_TOKEN');
  if (!['preview', 'production'].includes(env.BUILD_PROFILE)) {
    throw new Error('BUILD_PROFILE must be preview or production');
  }

  for (const key of REQUIRED_PUBLIC_KEYS) {
    if (!env[key]?.trim()) throw new Error('Missing GitHub variable: ' + key);
  }

  const api = new URL(env.EXPO_PUBLIC_API_URL);
  if (
    api.protocol !== 'https:' ||
    api.username ||
    api.password ||
    ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)
  ) {
    throw new Error('EXPO_PUBLIC_API_URL must be HTTPS and reachable from the iPhone');
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      env.EXPO_PUBLIC_EAS_PROJECT_ID,
    )
  ) {
    throw new Error('EXPO_PUBLIC_EAS_PROJECT_ID must be an existing EAS project UUID');
  }

  if (env.IOS_BUNDLE_IDENTIFIER !== 'com.igen.3s') {
    throw new Error('IOS_BUNDLE_IDENTIFIER must be com.igen.3s');
  }

  const next = JSON.parse(JSON.stringify(config));
  const profile = next.build?.[env.BUILD_PROFILE];
  if (!profile) throw new Error('Build profile missing from eas.json');

  profile.env = {
    ...profile.env,
    ...Object.fromEntries(
      REQUIRED_PUBLIC_KEYS.map((key) => [key, env[key]]),
    ),
  };

  return next;
}

if (require.main === module) {
  const file = path.resolve(__dirname, '../eas.json');
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify(prepare(config, process.env), null, 2) + '\n');
}

module.exports = { prepare };
