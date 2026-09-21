# Shared iOS and Android release configuration

Both jobs in .github/workflows/build.yml run scripts/prepare-release.cjs before Expo prebuild. app.config.js maps one set of release metadata to both platforms.

| Variable | Source | Android | iOS |
| --- | --- | --- | --- |
| APP_VERSION | GitHub Actions repository Variable; optional, defaults to expo.version in app.json | versionName | CFBundleShortVersionString |
| APP_BUILD_NUMBER | Generated as 1000 + GITHUB_RUN_NUMBER; do not configure a fixed repository value | versionCode (number) | CFBundleVersion / buildNumber (string) |
| EXPO_PUBLIC_API_URL | GitHub Actions repository Variable; existing staging fallback | API URL | Same API URL |

Set APP_VERSION to a three-part version such as 1.0.1 under Settings > Secrets and variables > Actions > Variables. It is not a secret. Increase it when publishing a new user-facing release. APP_BUILD_NUMBER changes automatically for each new workflow run; reruns retain the same number. Both jobs receive the same number even when they finish at different times. When replacing the workflow, preserve the version sequence above every distributed build.

For a local release test, set APP_VERSION and APP_BUILD_NUMBER before running Expo prebuild. With neither set, local development uses app.json unchanged. Existing Android package vn.gym3s.mobile and iOS bundle identifier vn.3sgym.mobile are preserved; these identifiers must not change to make updates.

## Signing remains platform-specific

Android still requires ANDROID_KEYSTORE_BASE64 and ANDROID_KEYSTORE_PASSWORD, with optional ANDROID_KEY_ALIAS and ANDROID_KEY_PASSWORD. See [Android updates and key setup](android-updates.md). A shared variable cannot replace the existing Android signing key.

The current iOS job exports an UNSIGNED IPA. Shared version metadata does not make it a signed, installable update. Signing and distribution still happen outside this workflow. To update an existing iOS installation, retain its application identity and use the appropriate signing/provisioning and distribution method. A signed TestFlight/App Store or Ad Hoc workflow needs its own Apple credentials and provisioning configuration; Android keystore credentials cannot be reused for it. Do not add unused IOS_* secrets to this unsigned workflow.

The Android job checks package name and versionCode in the signed APK. The iOS packaging script checks bundle identifier, visible version, and build number in the compiled app before exporting its unsigned IPA.

Validation on real devices is still required: install a previous signed build, update without uninstalling, and confirm login/local data remain on each platform.

Reference: https://docs.expo.dev/build-reference/app-versions/
