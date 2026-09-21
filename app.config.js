const process = require('node:process');
const { parseBuildNumber, appVersion } = require('./scripts/prepare-release.cjs');

module.exports = ({ config }) => {
  const version = process.env.APP_VERSION;
  const raw = process.env.APP_BUILD_NUMBER;
  if (!version && raw === undefined) return config;
  const result = { ...config };
  if (version) result.version = appVersion(version);
  if (raw !== undefined) {
    const number = parseBuildNumber(raw);
    result.android = { ...config.android, versionCode: number };
    result.ios = { ...config.ios, buildNumber: String(number) };
  }
  return result;
};
