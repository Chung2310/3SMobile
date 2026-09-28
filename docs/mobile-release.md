# Shared iOS and Android release configuration

The iOS and Android jobs in `.github/workflows/build-ios.yml` and `.github/workflows/build-android.yml` run the release checks before building. `app.config.js` maps one set of release metadata to both platforms.

| Variable | Source | Android | iOS |
| --- | --- | --- | --- |
| APP_VERSION | GitHub Actions repository Variable; optional, defaults to expo.version in app.json | versionName | CFBundleShortVersionString |
| APP_BUILD_NUMBER | Generated as 1000 + GITHUB_RUN_NUMBER for the Android job | versionCode (number) | EAS remote autoIncrement for production; preview uses the EAS profile value |
| EXPO_PUBLIC_API_URL | GitHub Actions repository Variable; required HTTPS API URL | API URL | Same API URL |

Set APP_VERSION to a three-part version such as 1.0.1 under Settings > Secrets and variables > Actions > Variables. It is not a secret. Increase it when publishing a new user-facing release. APP_BUILD_NUMBER changes automatically for each Android workflow run; reruns retain the same number. Production iOS build numbers are auto-incremented by EAS remote versioning. When replacing either workflow, preserve the version sequence above every distributed build.

For a local release test, set APP_VERSION and APP_BUILD_NUMBER before running Expo prebuild. With neither set, local development uses app.json unchanged. The Android package remains `vn.gym3s.mobile`. The iOS bundle identifier is now `com.igen.3s`; this is a new iOS application identity, so the App Store Connect app must be registered with this bundle ID before the first signed build. Existing installs using `vn.3sgym.mobile` cannot be updated in place by a `com.igen.3s` build.

## Signing remains platform-specific

Android still requires ANDROID_KEYSTORE_BASE64 and ANDROID_KEYSTORE_PASSWORD, with optional ANDROID_KEY_ALIAS and ANDROID_KEY_PASSWORD. See [Android updates and key setup](android-updates.md). A shared variable cannot replace the existing Android signing key.

The iOS job uses EAS remote credentials and produces a signed IPA. Preview builds are internal distribution builds and are not submitted. Production builds use the App Store distribution profile and submit to App Store Connect/TestFlight. Configure `EXPO_TOKEN`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_EAS_PROJECT_ID`, `APP_STORE_CONNECT_API_KEY_BASE64`, `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APPLE_TEAM_ID`, and `APP_STORE_CONNECT_APP_ID` in GitHub Actions as documented by the workflow. Do not reuse LuxCare's EAS project or Apple identifiers.

The Android job checks package name and versionCode in the signed APK. The iOS EAS job checks the downloaded IPA contains `Info.plist` and the JavaScript bundle. The manual native fallback script also checks bundle identifier, visible version, and build number before exporting an unsigned IPA.

Validation on real devices is still required: install a previous signed build, update without uninstalling, and confirm login/local data remain on each platform.

Reference: https://docs.expo.dev/build-reference/app-versions/
