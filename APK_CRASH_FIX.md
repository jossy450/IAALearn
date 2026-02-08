# 📱 Fixed APK - Installation Instructions

## What Was Fixed

**Problem**: APK crashed because it was trying to connect to production domain `interviewassistant.app`

**Solution**: Updated `capacitor.config.ts` to use your local computer IP address for development testing:
```typescript
url: 'http://10.152.201.17:3001'  // Your local machine IP + backend port
```

## New APK Location

```
E:\projects\IAALearn-main\IAALearn-1\client\android\app\build\outputs\apk\debug\app-debug.apk
```

**Build Time**: 03/02/2026 14:27:51
**Size**: 5.39 MB

---

## ✅ Installation Steps

### Option 1: USB Transfer (Recommended)

1. **Connect Android phone via USB**
   - Enable "File Transfer" mode on phone
   - Allow permission on computer when prompted

2. **Copy APK to phone**
   ```powershell
   $apkPath = "E:\projects\IAALearn-main\IAALearn-1\client\android\app\build\outputs\apk\debug\app-debug.apk"
   # Or manually drag-drop the file to your phone storage
   ```

3. **Install on phone**
   - Open File Manager on phone
   - Navigate to Downloads folder
   - Tap `app-debug.apk`
   - Allow "Install from unknown sources" if prompted
   - Tap **Install**

### Option 2: Using ADB (Android Debug Bridge)

**Prerequisites:**
1. Enable USB Debugging on phone:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. Connect phone via USB

3. Install APK:
   ```powershell
   # Find adb first, then:
   adb install "E:\projects\IAALearn-main\IAALearn-1\client\android\app\build\outputs\apk\debug\app-debug.apk"
   ```

---

## ⚠️ Before Testing

**IMPORTANT**: Your backend server MUST be running!

1. **Start backend server**:
   ```powershell
   cd E:\projects\IAALearn-main\IAALearn-1
   npm run server:dev
   ```
   
   Look for: `✅ Server running at http://localhost:3001`

2. **Verify connectivity** (on your computer):
   - Both phone and computer must be on **same network** (WiFi)
   - Phone can reach: `http://10.152.201.17:3001`
   - Test in phone browser: Open address bar, type `http://10.152.201.17:3001`
   - Should load backend response

---

## 🚀 Testing the App

1. **Uninstall old version**:
   - Settings → Apps → Interview Assistant → Uninstall

2. **Install new APK** using steps above

3. **Launch app**:
   - Find "Interview Assistant" on home screen
   - Tap to open
   - Grant permissions (camera, microphone) when prompted

4. **Expected behavior**:
   - Splash screen shows (blue background, 2 seconds)
   - App loads main interface
   - Can login/register
   - Can access interview features
   - Floating answer component visible

---

## 🔍 Troubleshooting

### App Still Crashes

**Check logs** (requires ADB):
```powershell
adb logcat | findstr "Interview"
```

**Common issues**:
- ❌ Backend server not running → Start with `npm run server:dev`
- ❌ Phone not on same network → Connect both to same WiFi
- ❌ Firewall blocking → Allow ports 3001, 5173 in Windows Firewall
- ❌ Wrong IP address → Run `ipconfig` to verify 10.152.201.17

### Verify Network Connectivity

From phone browser test:
```
http://10.152.201.17:3001
```

Should show:
- API response or error page
- NOT "Cannot reach server" or timeout

### App Loads but Features Don't Work

- Check network in Android settings
- Verify backend logs for errors
- Check CORS settings on backend

---

## 📝 Configuration Details

**Updated File**: `client/capacitor.config.ts`

**Dev Configuration** (current):
```typescript
server: {
  androidScheme: 'http',
  url: 'http://10.152.201.17:3001',
  cleartext: true,
}
```

**Production Configuration** (when deploying):
```typescript
server: {
  androidScheme: 'https',
  hostname: 'interviewassistant.app',
}
```

---

## Next Steps

1. ✅ Install new APK on phone
2. ✅ Start backend server
3. ✅ Test all features
4. 🔄 If issues: Run `npm run android:build && npm run android:run` to rebuild

**Ready to test!** 🎉
