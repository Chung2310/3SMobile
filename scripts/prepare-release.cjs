const fs = require('node:fs');
const process = require('node:process');

function parseBuildNumber(raw) {
  const number = Number(raw);
  if (!/^[1-9]\d*$/.test(String(raw ?? '')) || !Number.isSafeInteger(number) || number > 2100000000) {
    throw new Error('APP_BUILD_NUMBER must be an integer between 1 and 2100000000');
  }
  return number;
}

function buildNumber(runNumber) {
  if (!/^[1-9]\d*$/.test(String(runNumber || ''))) throw new Error('GITHUB_RUN_NUMBER must be a positive integer');
  return parseBuildNumber(1000 + Number(runNumber));
}

function appVersion(raw) {
  if (typeof raw !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(raw)) {
    throw new Error('APP_VERSION must use major.minor.patch, for example 1.0.1');
  }
  return raw;
}

function prepare(env) {
  const version = appVersion(env.APP_VERSION || require('../app.json').expo.version);
  const number = buildNumber(env.GITHUB_RUN_NUMBER);
  if (!env.GITHUB_ENV) throw new Error('GITHUB_ENV is required to export release metadata');
  fs.appendFileSync(env.GITHUB_ENV, 'APP_VERSION=' + version + '\nAPP_BUILD_NUMBER=' + number + '\n');
  return { version, buildNumber: number };
}

if (require.main === module) {
  try {
    console.log('Shared iOS/Android release:', prepare(process.env));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
module.exports = { parseBuildNumber, buildNumber, appVersion, prepare };
