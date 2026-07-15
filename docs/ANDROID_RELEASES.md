# Android releases and in-app updates

Record's Android client is a Capacitor application in `frontend/android`. It is distributed as a signed APK through GitHub Releases and updated from inside the app.

## Customer update flow

1. Open **You → Updates** in the Android app.
2. Select **Check update**.
3. Select **Install** when a newer release is offered.
4. If Android requests permission, allow Record to install unknown apps for this source and retry.
5. Confirm the Android package installer prompt.

The update installs over the existing package and preserves app data. Do not uninstall the app as a normal update step.

## Release pipeline

Every push to `main` triggers `.github/workflows/android-release.yml`. The workflow:

1. validates the public HTTPS API configuration;
2. runs Android, update, permission, cache, and native UI tests;
3. builds the web bundle and synchronizes Capacitor;
4. builds and signs the release APK with an increasing GitHub-run `versionCode`;
5. verifies the signature with `apksigner`;
6. creates a versioned `android-v...` GitHub Release;
7. uploads `personal-server.apk` and `personal-server-release.json`;
8. synchronizes release metadata to the backend update-policy endpoint; and
9. moves the `android-latest` Git tag to the released commit.

The versioned release asset URL stored by the backend is authoritative for in-app updates. The `android-latest` tag is a source pointer; its historical GitHub Release page is not the update feed.

## Launcher icon contract

The Android launcher icon is Bookplate R.

- Manifest resources: `@mipmap/record_bookplate_r` and `@mipmap/record_bookplate_r_round`
- Adaptive foreground: `res/drawable/ps_launcher_foreground.xml`
- Adaptive definitions: `res/mipmap-anydpi-v26/record_bookplate_r*.xml`
- Legacy fallback bitmaps: `record_bookplate_r*.png` in every density directory from `mdpi` through `xxxhdpi`
- Background: `#090D15`

The dedicated `record_bookplate_r` resource identity is intentional. Some Android launchers cache an icon by package and resource identifier; keeping the old `ic_launcher` identifier can leave retired artwork visible even after an APK update.

When changing the launcher identity again, update the adaptive, round, and every legacy density asset together, update the manifest to a new descriptive resource name, and extend `frontend/src/designSystem.test.mjs`.

## Local verification

From `frontend`:

```powershell
npm install
node --test src/designSystem.test.mjs src/androidReleaseWorkflow.test.mjs src/appUpdate.test.mjs
npm run android:prepare
.\android\gradlew.bat -p android assembleDebug
```

The debug APK is written to `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. A debug APK proves compilation but is not the signed customer release.

## Required CI secrets

- `VITE_API_BASE`
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `APP_RELEASE_SYNC_SECRET`

Never publish an unsigned APK as an update. Do not reuse a different signing key: Android will reject it as an update to the installed package.
