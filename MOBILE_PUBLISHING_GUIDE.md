# Mobile Publishing Guide — Shane's Model

This guide walks you through publishing the app to **Google Play** (Android) and the **iOS App Store**.

---

## OVERVIEW

| Step | What | Who does it | Time |
|------|------|-------------|------|
| 1 | Install dev tools | You | ~30 min |
| 2 | Generate native projects | You (1 command) | ~5 min |
| 3 | Generate app icons | You (1 command) | ~2 min |
| 4 | Build signed APK | You in Android Studio | ~15 min |
| 5 | Create Google Play account | You | ~10 min + $25 |
| 6 | Submit to Google Play | You | ~30 min |
| 7 | iOS (needs a Mac) | You on Mac | ~2 hrs + $99/yr |

---

## PART 1: INSTALL DEV TOOLS (Windows)

### 1.1 — Install Node.js
1. Go to https://nodejs.org
2. Download the **LTS** version (20.x or 22.x)
3. Run the installer, accept defaults
4. Verify: open PowerShell and run `node --version`

### 1.2 — Install Java JDK 17
Capacitor 6 requires JDK 17+. You currently have JDK 11.

1. Go to https://adoptium.net/temurin/releases/?version=17
2. Download **JDK 17** — Windows x64 `.msi`
3. Run the installer
4. Set JAVA_HOME: open PowerShell as Administrator and run:
   ```powershell
   [System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot", "Machine")
   ```
   (replace the path with where it actually installed)
5. Verify: `java -version` should show 17

### 1.3 — Install Android Studio
1. Go to https://developer.android.com/studio
2. Download Android Studio and run the installer
3. On first launch, go through the Setup Wizard — accept all defaults
4. Let it download the Android SDK (this takes a while on first run)
5. After setup, from the Welcome screen click **More Actions → SDK Manager**
6. Under **SDK Platforms**, check **Android 14 (API 34)**
7. Under **SDK Tools**, make sure these are checked:
   - Android SDK Build-Tools 34.0.0
   - Android SDK Command-line Tools
   - Android Emulator
   - Android SDK Platform-Tools
8. Click Apply and let it download

### 1.4 — Set Android SDK environment variable
After Android Studio installs:
```powershell
# In PowerShell as Administrator:
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "Machine")
[System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", "$env:LOCALAPPDATA\Android\Sdk", "Machine")
```

---

## PART 2: GENERATE NATIVE PROJECTS

Open PowerShell in the project folder and run these commands **in order**:

```powershell
# 1. Install npm packages
npm install

# 2. Build the www/ folder (copies your web assets)
npm run build

# 3. Add Android platform (creates the android/ folder)
npx cap add android

# 4. Add iOS platform (creates the ios/ folder — skip on Windows, do on Mac)
# npx cap add ios

# 5. Sync web assets into the native projects
npm run sync
```

You now have an `android/` folder. That's your Android Studio project.

---

## PART 3: GENERATE APP ICONS

Your source icon is at `resources/icon.png`. It should be 1024×1024 px.

> **Action needed:** Check `resources/icon.png` — it was copied from `assets/ac_logo.png`.
> If the logo is not square or is lower than 1024×1024 px, replace it with a 1024×1024 version.
> Same for `resources/splash.png` (used for the splash screen — 2732×2732 px is ideal).

Once your icon files are ready:
```powershell
npm run gen-icons
```

This generates all required sizes for both Android and iOS automatically.

---

## PART 4: BUILD THE ANDROID APK / AAB

### 4.1 — Open in Android Studio
```powershell
npm run open:android
```
This launches Android Studio with the project open.

### 4.2 — Update the app version
In Android Studio, open `android/app/build.gradle` and set:
```gradle
android {
    defaultConfig {
        versionCode 1        // increment this for each upload
        versionName "2.0.0"  // user-facing version string
    }
}
```

### 4.3 — Create a signing keystore (first time only)
In Android Studio: **Build → Generate Signed Bundle/APK**

1. Choose **Android App Bundle (AAB)** — Google Play requires this
2. Click **Create new...** next to Key store path
3. Save the keystore file somewhere safe (e.g., `android/keystore/release.jks`)
4. Fill in:
   - Key store password: (something strong — WRITE THIS DOWN, you can never recover it)
   - Key alias: `shanes-model-key`
   - Key password: (can be same as keystore password)
   - First and Last Name: your name
   - Organization Unit, Organization, City, State, Country: fill in (doesn't matter much)
5. Validity: 25+ years
6. Click OK

> **CRITICAL:** Back up the `.jks` file and both passwords. If you lose them, you can never update the app on Google Play.

### 4.4 — Build release AAB
1. **Build → Generate Signed Bundle/APK**
2. Choose **Android App Bundle**
3. Select your keystore, enter passwords
4. Choose **release** build variant
5. Click Finish
6. The `.aab` file will be in `android/app/release/app-release.aab`

---

## PART 5: PUBLISH TO GOOGLE PLAY

### 5.1 — Create a Google Play Developer account
1. Go to https://play.google.com/console
2. Sign in with a Google account
3. Pay the one-time $25 registration fee
4. Fill in your developer profile

### 5.2 — Create the app listing
1. Click **Create app**
2. App name: **Shane's Model**
3. Default language: English
4. App or Game: **App**
5. Free or Paid: **Free** (or Paid — you choose)
6. Check the required declarations

### 5.3 — Fill in the Store Listing
Navigate to **Store presence → Main store listing**:

**Short description** (80 chars max):
> Ptolemaic epicycle model — track the sun, moon & planets in real time.

**Full description** (4000 chars max — see below):
```
Shane's Model is an interactive 3D astronomy simulator built on Ptolemy's
geocentric epicycle system. Watch the celestial vault rotate overhead as
the Sun, Moon, Mercury, Venus, Mars, Jupiter, and Saturn trace their
ancient epicyclic paths across a flat disc.

Features:
• Real-time simulation of all visible planets via classic epicycles
• Interactive observer — pan your viewpoint across any latitude/longitude
• Eclipse demos with historically accurate timing from AstroPixels data
• Day/night terminator, declination circles, starfield, and constellation overlays
• Multiple geocentric map projections (azimuthal equidistant AE, equirectangular, orthographic)
• Jupiter's Galilean moons with full ephemeris
• Multi-language support: English, Czech, Spanish
• Dark theme optimized for night-sky viewing
• No account required, no ads, works offline

This is a conceptual/educational model, not a scientifically predictive tool.
It is designed to help you understand how ancient astronomers modeled the
heavens before modern heliocentric theory.
```

**Screenshots** — you need at least 2, up to 8:
- Take screenshots from the Android emulator or a real device
- Required size: 320px–3840px on longest side, 16:9 or 9:16 aspect ratio

**Feature graphic** — 1024×500 px banner image (required)

### 5.4 — Set up content rating
- Go to **Policy → App content → Content rating**
- Answer the questionnaire — this app has no violence, no sexual content, etc.
- It will likely rate as **Everyone**

### 5.5 — Set up pricing & distribution
- **Monetization → Pricing** — Free or set a price
- **Monetization → Availability** — choose countries

### 5.6 — Upload the AAB
1. Go to **Release → Production → Create new release**
2. Upload `android/app/release/app-release.aab`
3. Add release notes: "Initial release of Shane's Model 2.0"
4. Click Save, then Review release, then Start rollout to Production

**Review time:** Google typically reviews new apps in 2–7 days.

---

## PART 6: iOS APP STORE (requires a Mac)

> You are on Windows. iOS builds require Xcode which only runs on macOS.
> Options:
> - Use a Mac (your own, a friend's, or rent one from MacStadium)
> - Use a cloud build service like Codemagic (codemagic.io) or AppCircle — they can build iOS for you from Windows

### 6.1 — Apple Developer Program
1. Go to https://developer.apple.com/programs/
2. Enroll — costs **$99/year**
3. Apple may take 24–48 hours to approve

### 6.2 — On the Mac (after enrollment)
```bash
# Install Node.js, then in the project folder:
npm install
npm run build
npx cap add ios
npm run sync
npm run open:ios   # opens Xcode
```

### 6.3 — In Xcode
1. Set your Team (your Apple Developer account) in Signing & Capabilities
2. Set Bundle Identifier to `com.shanesmodel.flatearth`
3. Set Version to `2.0.0` and Build to `1`
4. Product → Archive
5. In the Organizer, click Distribute App → App Store Connect → Upload

### 6.4 — In App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Create a new app with Bundle ID `com.shanesmodel.flatearth`
3. Fill in metadata (same description as Android, plus screenshots at required iOS sizes)
4. Submit for review
5. Apple review takes 1–3 days

---

## UPDATES (future releases)

Every time you update the app:
```powershell
npm run build      # rebuild www/
npm run sync       # sync into android/ and ios/
```
Then open Android Studio / Xcode, increment `versionCode`, and build a new signed AAB.

---

## APP DETAILS SUMMARY

| Field | Value |
|-------|-------|
| App ID / Bundle ID | `com.shanesmodel.flatearth` |
| App Name | Shane's Model |
| Version | 2.0.0 |
| Capacitor Version | 6.x |
| Min Android API | 22 (Android 5.0+) |
| Min iOS | 13.0+ |
| Category | Education / Utilities |
| Content Rating | Everyone |
