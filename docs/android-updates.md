# Android APK updates

Release APKs must retain package name vn.gym3s.mobile and the signing key of the installed app. The build now refuses to create a replacement signing key when secrets are missing.

## One-time GitHub setup

In repository Settings > Secrets and variables > Actions, configure:

- ANDROID_KEYSTORE_BASE64: Base64 of the EXISTING release keystore.
- ANDROID_KEYSTORE_PASSWORD: its keystore password.
- ANDROID_KEY_ALIAS: alias of its private-key entry (optional for a single-entry keystore).
- ANDROID_KEY_PASSWORD: private-key password if different from the keystore password; otherwise omit it.

Do not paste keys/passwords into chat, source control, issues, or build logs. Keep a secure backup of the keystore and passwords. Do not replace these secrets for each release.

If no app has yet been distributed with a persistent key, create one ONCE using a JDK, outside this repository:

~~~sh
keytool -genkeypair -v -storetype PKCS12 -keystore 3s-gym-release.p12 -alias 3sgym -keyalg RSA -keysize 2048 -validity 10000
~~~

Keytool prompts for the password and certificate details. Use the same password for the private key and the store for this PKCS12 file. Set ANDROID_KEY_ALIAS to 3sgym.

On Windows, copy its Base64 to the clipboard without printing it:

~~~powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\secure\3s-gym-release.p12')) | Set-Clipboard
~~~

Paste into ANDROID_KEYSTORE_BASE64 in GitHub, then clear the clipboard. Never generate a new key if an existing distributed app already has a usable signing key.

## Every release

The shared release script computes APP_BUILD_NUMBER = 1000 + GITHUB_RUN_NUMBER for both platform jobs. app.config.js uses it as Android versionCode and iOS buildNumber. APP_VERSION sets the visible version for both platforms, defaulting to app.json. See [Shared release variables](mobile-release.md). The signing step checks the package and embedded versionCode before uploading the APK and prints the public signing certificate fingerprint for comparison.

Start a NEW workflow run for each new release. Re-running the same run keeps the same versionCode. Keep this workflow's run counter; if moving to a new workflow, migrate the version sequence above the highest distributed versionCode before publishing. Install releases in increasing versionCode order.

Download the new APK and open it on the device to update, or use:

~~~sh
adb install -r 3SGym.apk
~~~

This preserves application data during a normal update; it does not add automatic background updates or bypass Android's installation confirmation.

## Previously distributed APKs

The old workflow generated a random temporary key on each run if signing secrets were absent. An APK contains the public certificate, not the private key. If that old private key was not saved, a new signing key cannot update that installation in place. Recover the old keystore if possible; otherwise a one-time reinstall is required before future releases can share the new persistent key. A reinstall removes local data, so plan account/data recovery before doing it.

If the old build already used the secrets, retain exactly those values. Compare the certificate SHA-256 digest using apksigner verify --print-certs on the old and new APKs. Do not uninstall the existing app to test compatibility: test adb install -r and verify login and locally saved data remain.

See https://developer.android.com/studio/publish/app-signing and https://developer.android.com/studio/publish/versioning.
