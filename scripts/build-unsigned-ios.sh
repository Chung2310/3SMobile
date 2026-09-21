#!/usr/bin/env bash
set -euo pipefail

# Invoke from project root after Expo prebuild and pod install.
: "${RUNNER_TEMP:?RUNNER_TEMP must point to the CI temporary directory}"
shopt -s nullglob
workspaces=(ios/*.xcworkspace)
if [[ ${#workspaces[@]} -ne 1 ]]; then
  echo "Expected exactly one app workspace in ios" >&2
  exit 1
fi
workspace="${workspaces[0]}"
scheme="$(basename "$workspace" .xcworkspace)"
derived="$RUNNER_TEMP/3s-unsigned-derived"

echo "Building Xcode workspace: $workspace, scheme: $scheme"

xcodebuild \
  -workspace "$workspace" \
  -scheme "$scheme" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$derived" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  build 2>&1 | tee "$RUNNER_TEMP/3s-xcodebuild.log"

apps=("$derived"/Build/Products/Release-iphoneos/*.app)
if [[ ${#apps[@]} -ne 1 ]]; then
  echo "Expected exactly one compiled device app" >&2
  exit 1
fi
app="${apps[0]}"
plist="$app/Info.plist"
: "${APP_VERSION:?APP_VERSION must be set by prepare-release.cjs}"
: "${APP_BUILD_NUMBER:?APP_BUILD_NUMBER must be set by prepare-release.cjs}"
[[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$plist")" == "vn.3sgym.mobile" ]]
[[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$plist")" == "$APP_VERSION" ]]
[[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$plist")" == "$APP_BUILD_NUMBER" ]]
platform="$(/usr/libexec/PlistBuddy -c 'Print :DTPlatformName' "$plist")"
[[ "$platform" == "iphoneos" ]]
executable="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$plist")"
xcrun lipo "$app/$executable" -verify_arch arm64

# Standalone Release IPA must contain its JS/Hermes bundle
if [[ ! -s "$app/main.jsbundle" ]]; then
  echo "Error: main.jsbundle missing in $app" >&2
  exit 1
fi

staging="$(mktemp -d "$RUNNER_TEMP/3s-ipa.XXXXXX")"
mkdir -p "$staging/Payload" "$RUNNER_TEMP/3s-unsigned-artifacts"
ditto "$app" "$staging/Payload/$(basename "$app")"
(
  cd "$staging"
  /usr/bin/zip -qry "$RUNNER_TEMP/3s-unsigned-artifacts/3SGym-unsigned.ipa" Payload
)
/usr/bin/unzip -tq "$RUNNER_TEMP/3s-unsigned-artifacts/3SGym-unsigned.ipa"
echo "Successfully created and validated $RUNNER_TEMP/3s-unsigned-artifacts/3SGym-unsigned.ipa"
