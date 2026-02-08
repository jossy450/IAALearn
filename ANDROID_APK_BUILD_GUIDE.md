# 📱 Complete Android APK Build Guide - Interview Assistant

## ✅ Current Status
- ✅ React app built successfully
- ✅ Android project created with Capacitor
- ✅ 8 Capacitor plugins configured
- ⚠️ **Java JDK needed for building APKs**

---

## Step 1: Install Java JDK 17 (Required)

### Download & Install JDK

**Option A: Adoptium Temurin (Recommended - Free & Open Source)**
1. Visit: https://adoptium.net/temurin/releases/?version=17
2. Select:
   - **Operating System**: Windows
   - **Architecture**: x64
   - **Package Type**: JDK
   - **Version**: 17 (LTS)
3. Download the **MSI installer**
4. Run installer:
   - ✅ Check "Set JAVA_HOME variable"
   - ✅ Check "Add to PATH"
   - ✅ Check "JavaSoft (Oracle) registry keys"
5. Click Install (no restart needed)

**Option B: Microsoft OpenJDK**
```powershell
# Using winget (Windows Package Manager)
winget install Microsoft.OpenJDK.17
```

**Option C: Oracle JDK**
- Download from: https://www.oracle.com/java/technologies/downloads/#java17
- Run installer with default options

### Verify Installation

After installing, **close and reopen PowerShell**, then run:

```powershell
java -version
# Should show: openjdk version "17.x.x"

javac -version
# Should show: javac 17.x.x

echo $env:JAVA_HOME
# Should show: C:\Program Files\Java\jdk-17... or similar
```

### Manual Setup (If Auto-Setup Failed)

If Java installed but `JAVA_HOME` not set:

1. **Find Java Installation**:
   ```powershell
   Get-ChildItem "C:\Program Files\Java" -Directory
   # Or: C:\Program Files\Eclipse Adoptium
   # Or: C:\Program Files\Microsoft\jdk-17*
   ```

2. **Set Environment Variables** (requires admin):
   - Press **Win + X** → **System** → **Advanced system settings**
   - Click **Environment Variables**
   - Under **System Variables**, click **New**:
     - Variable name: `JAVA_HOME`
     - Variable value: `C:\Program Files\Java\jdk-17.x.x` (your actual path)
   - Find **Path** variable, click **Edit**, add:
     - `%JAVA_HOME%\bin`
   - Click OK on all dialogs

3. **Restart PowerShell** and verify with `java -version`

---

## Step 2: Configure Android SDK (In Android Studio)

### Open Android Studio
Your project should already be open at: `E:\projects\IAALearn-main\IAALearn-1\client\android`

### Install SDK Components

1. **Go to SDK Manager**:
   - **File** → **Settings** → **Appearance & Behavior** → **System Settings** → **Android SDK**
   - OR click SDK Manager icon in toolbar

2. **SDK Platforms Tab** - Install:
   - ✅ **Android 13.0 (Tiramisu) - API Level 33** ← YOUR TARGET
   - ✅ Android 14.0 (API 34) - recommended
   - Click "Show Package Details" for each:
     - Android SDK Platform 33
     - Google APIs Intel x86_64 System Image (for emulator)

3. **SDK Tools Tab** - Install:
   - ✅ Android SDK Build-Tools 33.x.x (latest)
   - ✅ Android SDK Command-line Tools (latest)
   - ✅ Android SDK Platform-Tools
   - ✅ Android Emulator
   - ✅ Intel x86 Emulator Accelerator (HAXM) - Windows
   - ✅ Google Play services

4. Click **Apply** → **OK** (will download ~2-3 GB)

5. **Wait for Gradle Sync**:
   - Check bottom status bar: "Gradle sync in progress..."
   - First sync takes 3-10 minutes (downloads dependencies)
   - ✅ When complete, you'll see "Sync successful"

---

## Step 3: Build Debug APK (For Testing)

### Method 1: Android Studio UI (Easiest)

1. ✅ Ensure Gradle sync completed
2. Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Wait 2-5 minutes for first build
4. When done, click notification "**locate**" or "**analyze**"
5. **APK Location**: `client\android\app\build\outputs\apk\debug\app-debug.apk`

### Method 2: Command Line (Faster)

```powershell
# From project root
cd client\android
.\gradlew assembleDebug

# APK will be at: app\build\outputs\apk\debug\app-debug.apk
```

### Method 3: VS Code Terminal (Current Location)

```powershell
cd client\android
.\gradlew assembleDebug
```

---

## Step 4: Test the APK

### Install on Connected Device

1. **Enable USB Debugging** on Android phone:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"
   - Connect via USB

2. **Install APK**:
   ```powershell
   # Check device connected
   adb devices
   
   # Install APK
   adb install app\build\outputs\apk\debug\app-debug.apk
   
   # Or drag-drop APK to device file manager
   ```

### Test on Emulator

1. **Create Emulator** in Android Studio:
   - **Tools** → **Device Manager** → **Create Device**
   - Select: Pixel 6 (or any device)
   - System Image: API 33 (download if needed)
   - Finish

2. **Launch Emulator**:
   - Click ▶ green play button next to device
   - Wait for boot (~1 minute)

3. **Install APK**:
   - Drag `app-debug.apk` onto emulator window
   - OR: `adb install app-debug.apk`

---

## Step 5: Build Signed Release APK (For Distribution)

### Generate Signing Key

```powershell
cd client\android\app

# Generate keystore (run once)
keytool -genkey -v -keystore release.keystore -alias interview-assistant-key -keyalg RSA -keysize 2048 -validity 10000

# You'll be asked:
# - Keystore password (remember this!)
# - Re-enter password
# - Your name, organization, city, etc.
# - Key password (can be same as keystore password)
```

**IMPORTANT**: Save this information securely!
- Keystore file: `release.keystore`
- Keystore password: [your password]
- Key alias: `interview-assistant-key`
- Key password: [your password]

### Configure Signing in Gradle

Create `client\android\keystore.properties`:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=interview-assistant-key
storeFile=release.keystore
```

**⚠️ Add to .gitignore** (don't commit passwords!)

### Update build.gradle

Edit `client\android\app\build.gradle`:

```groovy
android {
    // ... existing config ...
    
    signingConfigs {
        release {
            // Load keystore properties
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            def keystoreProperties = new Properties()
            keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
            
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release  // ← Add this line
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Build Signed APK

```powershell
cd client\android
.\gradlew assembleRelease

# Signed APK at: app\build\outputs\apk\release\app-release.apk
```

---

## Step 6: Build Android App Bundle (AAB) for Play Store

```powershell
cd client\android
.\gradlew bundleRelease

# AAB at: app\build\outputs\bundle\release\app-release.aab
```

**Play Store requires AAB format, not APK!**

---

## Quick Reference Commands

```powershell
# Build web app
cd client
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android

# Build debug APK
cd android
.\gradlew assembleDebug

# Build release APK (signed)
.\gradlew assembleRelease

# Build AAB for Play Store
.\gradlew bundleRelease

# Install on device
adb install app\build\outputs\apk\debug\app-debug.apk

# View logs
adb logcat | Select-String "Capacitor"
```

---

## Troubleshooting

### "JAVA_HOME not set"
- Install JDK 17 (see Step 1)
- Set environment variable
- Restart PowerShell

### "SDK location not found"
- Open Android Studio
- File → Project Structure → SDK Location
- Set Android SDK path (usually `C:\Users\YourName\AppData\Local\Android\Sdk`)

### "Build failed: compileSdkVersion"
- Install Android SDK Platform 33 in SDK Manager
- File → Sync Project with Gradle Files

### "Unsigned APK"
- Debug APKs are automatically signed with debug key
- For distribution, follow Step 5 (signed release)

### "App won't connect to server"
- Debug builds use `localhost:3001` (won't work on device)
- Update `server.url` in `capacitor.config.ts` to your computer's IP:
  ```typescript
  server: {
    url: 'http://192.168.1.XXX:3001',  // Your local IP
    cleartext: true
  }
  ```
- OR deploy backend to production server

---

## Next Steps After Building

1. ✅ Test debug APK on device/emulator
2. 🔄 Make changes → `npm run build` → `npx cap sync android` → rebuild
3. 🎨 Customize app icon/splash: `client\android\app\src\main\res\`
4. 📱 Build signed release APK for distribution
5. 🚀 Upload AAB to Google Play Console

---

## File Locations

```
client/
├── android/                          # Native Android project
│   ├── app/
│   │   ├── build/
│   │   │   └── outputs/
│   │   │       ├── apk/
│   │   │       │   ├── debug/       # app-debug.apk
│   │   │       │   └── release/     # app-release.apk
│   │   │       └── bundle/
│   │   │           └── release/     # app-release.aab
│   │   ├── src/main/
│   │   │   ├── assets/public/       # Your React app (synced)
│   │   │   └── res/                 # Icons, splash screens
│   │   ├── build.gradle             # App configuration
│   │   └── release.keystore         # Signing key (keep secret!)
│   ├── build.gradle                 # Project configuration
│   └── keystore.properties          # Signing config (git ignore!)
├── dist/                             # Built React app
└── capacitor.config.ts               # Capacitor settings
```

---

## Need Help?

Once you have Java installed:
1. Run: `cd client\android && .\gradlew assembleDebug`
2. If errors occur, share the error message
3. For release builds, I'll help set up signing keys

**Current Blocker**: Install JDK 17 from https://adoptium.net/temurin/releases/?version=17
