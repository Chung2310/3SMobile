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

## App Store review corrections (October 3, 2026)

Submission `97d9f91b-89a6-4467-bfce-f82a670cd213`, version 1.0 (9), requires these two corrections before resubmission:

1. **Guideline 2.3.8 — App name:** `expo.name` in `app.json` is now `3S Wellness`. Expo uses this name for the installed app, including iOS `CFBundleDisplayName`, matching the App Store name `3s wellness`. Keep the existing iOS bundle identifier `com.igen.3s`, Android package `vn.gym3s.mobile`, EAS project ID, slug, and URL scheme. This name change requires a new native build; an over-the-air JavaScript update cannot change the installed app's display name. Build with the existing production iOS workflow, confirm the build number is greater than 9, and install the resulting build to verify the Home screen name before selecting it for review.
2. **Guideline 2.3.6 — Age rating:** In App Store Connect, open **Apps > 3s wellness > General > App Information > Age Ratings > Edit**. Set **Health or Wellness Topics** to **Yes**, complete the questionnaire, and save. This is App Store Connect metadata and cannot be corrected through Expo configuration. Review the remaining answers against the content available in the app.

After both corrections are complete, select the replacement build, reply to App Review, and resubmit. The existing production workflow uploads to App Store Connect/TestFlight; selecting the build and resubmitting for App Review are separate steps.

Reply to use only after the replacement build and age-rating update are verified:

> Hello App Review Team,
>
> We have addressed both issues. For Guideline 2.3.8, the updated build displays “3S Wellness” on the device, matching our App Store name “3s wellness”. The bundle identifier remains unchanged. For Guideline 2.3.6, we have selected “Yes” for “Health or Wellness Topics” in the age-rating questionnaire. Thank you.

References: [Apple: Update the display name](https://developer.apple.com/library/archive/qa/qa1823/), [Apple: Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating), [Expo: App configuration](https://docs.expo.dev/versions/latest/config/app/).

Reference: https://docs.expo.dev/build-reference/app-versions/
