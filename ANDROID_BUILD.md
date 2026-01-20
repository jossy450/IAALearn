# Building Android APK - Complete Guide

## Prerequisites

1. **Node.js & npm** - Already installed
2. **Android Studio** - Download from https://developer.android.com/studio
3. **Java Development Kit (JDK)** - JDK 11 or higher
4. **Android SDK** - Installed via Android Studio

## Step 1: Install Android Studio

### Windows/Mac/Linux

1. Download Android Studio from https://developer.android.com/studio
2. Install Android Studio
3. During installation, ensure these components are selected:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device
   - Performance (Intel HAXM on Windows/Mac)

### Configure Android SDK

1. Open Android Studio
2. Go to **Settings/Preferences** → **Appearance & Behavior** → **System Settings** → **Android SDK**
3. Install the following:
   - Android SDK Platform 33 (or latest)
   - Android SDK Build-Tools
   - Android SDK Command-line Tools
   - Android SDK Platform-Tools

4. Note your Android SDK location (e.g., `/Users/username/Library/Android/sdk`)

### Set Environment Variables

#### Linux/Mac

Add to `~/.bashrc` or `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then run: `source ~/.bashrc` or `source ~/.zshrc`

#### Windows

1. Open System Properties → Advanced → Environment Variables
2. Add new System Variable:
   - Name: `ANDROID_HOME`
   - Value: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
3. Edit Path variable and add:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

### Verify Installation

```bash
java -version
# Should show Java 11+

echo $ANDROID_HOME
# Should show SDK path

adb --version
# Should show Android Debug Bridge version
```

## Step 2: Install Capacitor Dependencies

```bash
cd client
npm install
```

This installs:
- @capacitor/core
- @capacitor/cli
- @capacitor/android
- @capacitor/app
- @capacitor/haptics
- @capacitor/keyboard
- @capacitor/status-bar
- @capacitor/splash-screen
- @capacitor/network

## Step 3: Initialize Android Platform

```bash
# Build the web app first
npm run build

# Initialize Capacitor Android
npm run android:init

# This creates the android folder with native Android project
```

## Step 4: Configure Android Project

### Update Build Configuration

Edit `client/android/app/build.gradle`:

```gradle
android {
    namespace "com.interviewassistant.app"
    compileSdkVersion 33
    
    defaultConfig {
        applicationId "com.interviewassistant.app"
        minSdkVersion 22
        targetSdkVersion 33
        versionCode 1
        versionName "2.0.0"
    }
    
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Update AndroidManifest.xml

Edit `client/android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">
        
        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:windowSoftInputMode="adjustResize">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

## Step 5: Create App Icons

### Using Android Studio

1. Open Android Studio
2. Open the android project: `File → Open` → Select `client/android`
3. Right-click on `app` → `New` → `Image Asset`
4. Configure:
   - Icon Type: Launcher Icons
   - Name: ic_launcher
   - Asset Type: Image (upload your logo)
   - Generate all icon sizes

### Manual Icon Sizes

Place icons in `client/android/app/src/main/res/`:

- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

## Step 6: Generate Signing Key (for Release)

```bash
cd client/android/app

# Generate keystore
keytool -genkey -v -keystore release.keystore -alias interview-assistant-key -keyalg RSA -keysize 2048 -validity 10000

# You'll be prompted for:
# - Keystore password (remember this!)
# - Name, Organization, etc.
# - Key password
```

**IMPORTANT:** Save the keystore file and passwords securely!

### Configure Signing

Create `client/android/gradle.properties`:

```properties
android.useAndroidX=true
android.enableJetifier=true

# Signing Config (for release builds)
RELEASE_STORE_FILE=release.keystore
RELEASE_STORE_PASSWORD=your_keystore_password
RELEASE_KEY_ALIAS=interview-assistant-key
RELEASE_KEY_PASSWORD=your_key_password
```

Update `client/android/app/build.gradle`:

```gradle
android {
    // ... other config

    signingConfigs {
        release {
            storeFile file(RELEASE_STORE_FILE)
            storePassword RELEASE_STORE_PASSWORD
            keyAlias RELEASE_KEY_ALIAS
            keyPassword RELEASE_KEY_PASSWORD
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

## Step 7: Build APK

### Development Build (Debug)

```bash
cd client

# Sync files
npm run android:sync

# Open in Android Studio
npm run android:open

# In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
```

Or via command line:

```bash
cd client/android
./gradlew assembleDebug

# APK will be at: app/build/outputs/apk/debug/app-debug.apk
```

### Production Build (Release)

```bash
cd client

# Build web app
npm run build

# Sync with Android
npm run android:sync

# Build release APK
cd android
./gradlew assembleRelease

# APK will be at: app/build/outputs/apk/release/app-release.apk
```

### Build AAB (for Google Play)

```bash
cd client/android
./gradlew bundleRelease

# AAB will be at: app/build/outputs/bundle/release/app-release.aab
```

## Step 8: Test APK

### Using Emulator

```bash
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_4_API_33 &

# Install APK
adb install client/android/app/build/outputs/apk/debug/app-debug.apk
```

### Using Physical Device

1. Enable Developer Options on your Android device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings → Developer Options → USB Debugging
3. Connect device via USB
4. Install APK:

```bash
adb devices
# Should show your device

adb install client/android/app/build/outputs/apk/release/app-release.apk
```

## Step 9: Optimize APK Size

### Enable ProGuard

Already configured in build.gradle:

```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### Split APKs by ABI

In `build.gradle`:

```gradle
android {
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
            universalApk true
        }
    }
}
```

## Step 10: Configure API URL for Production

Update `client/capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  // ... other config
  server: {
    androidScheme: 'https',
    // Point to your production API
    url: 'https://your-api-domain.com',
    cleartext: false
  }
};
```

Or use environment variables in your build:

```javascript
// client/src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 
                      (window.location.protocol === 'capacitor:' 
                        ? 'https://your-api-domain.com/api'
                        : 'http://localhost:3001/api');
```

## Step 11: Publish to Google Play Store

### Prepare for Upload

1. Build release AAB:
   ```bash
   cd client/android
   ./gradlew bundleRelease
   ```

2. Create Google Play Developer account ($25 one-time fee)
   - Visit: https://play.google.com/console

3. Create new app in Google Play Console

4. Fill in Store Listing:
   - App name: Interview Answer Assistant
   - Short description
   - Full description
   - Screenshots (phone & tablet)
   - App icon
   - Feature graphic
   - Category: Productivity / Education
   - Privacy policy URL

5. Upload AAB file

6. Complete Content Rating questionnaire

7. Set pricing & distribution

8. Submit for review

## Quick Reference Commands

```bash
# Setup (one-time)
cd client
npm install
npm run build
npm run android:init

# Daily development
npm run build              # Build web app
npm run android:sync       # Sync to Android
npm run android:open       # Open in Android Studio

# Building
cd android
./gradlew assembleDebug    # Debug APK
./gradlew assembleRelease  # Release APK
./gradlew bundleRelease    # Release AAB (Play Store)

# Testing
adb devices                # List connected devices
adb install app-debug.apk  # Install on device
adb logcat                 # View device logs
```

## Troubleshooting

### Gradle build fails

```bash
cd client/android
./gradlew clean
./gradlew build --stacktrace
```

### SDK not found

```bash
# Verify ANDROID_HOME
echo $ANDROID_HOME

# Install missing components
sdkmanager "platforms;android-33"
sdkmanager "build-tools;33.0.0"
```

### APK not installing

```bash
# Uninstall old version first
adb uninstall com.interviewassistant.app

# Then install new
adb install app-release.apk
```

### App crashes on launch

```bash
# View crash logs
adb logcat | grep -i "interview"
```

## APK File Locations

- **Debug APK:** `client/android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK:** `client/android/app/build/outputs/apk/release/app-release.apk`
- **Release AAB:** `client/android/app/build/outputs/bundle/release/app-release.aab`

## Next Steps After Building

1. Test thoroughly on multiple devices
2. Set up CI/CD for automated builds (GitHub Actions, GitLab CI)
3. Implement crash reporting (Firebase Crashlytics)
4. Add analytics (Firebase Analytics)
5. Set up staged rollouts on Play Store
6. Monitor user reviews and crash reports

---

**Security Reminder:** Never commit your keystore file or passwords to version control!

Add to `.gitignore`:
```
*.keystore
*.jks
gradle.properties
local.properties
```
