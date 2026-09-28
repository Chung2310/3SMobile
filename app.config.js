const process = require('node:process');
const { parseBuildNumber, appVersion } = require('./scripts/prepare-release.cjs');

module.exports = ({ config }) => {
  const version = process.env.APP_VERSION;
  const raw = process.env.APP_BUILD_NUMBER;
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const bundleIdentifier =
    process.env.IOS_BUNDLE_IDENTIFIER || config.ios?.bundleIdentifier || 'com.igen.3s';

  if (!version && raw === undefined && !projectId && !process.env.IOS_BUNDLE_IDENTIFIER) {
    return config;
  }

  const result = {
    ...config,
    extra: {
      ...config.extra,
      ...(projectId
        ? {
            eas: {
              ...config.extra?.eas,
              projectId,
            },
          }
        : {}),
    },
    ios: {
      ...config.ios,
      bundleIdentifier,
    },
    android: {
      ...config.android,
    },
  };

  if (version) result.version = appVersion(version);
  if (raw !== undefined) {
    const number = parseBuildNumber(raw);
    result.android.versionCode = number;
    result.ios.buildNumber = String(number);
  }

  return result;
};
