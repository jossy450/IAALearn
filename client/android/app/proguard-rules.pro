# Add project specific ProGuard rules here.
# ProGuard rules for IAALearn app

# Keep application class
-keep class com.iaalearn.app.** { *; }

# Capacitor
-keep class org.apache.cordova.** { *; }
-keep class com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**
-dontwarn org.apache.cordova.**

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Parcelable
-keepclassmembers class * implements android.os.Parcelable {
    static ** CREATOR;
}

# Keep enum classes
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep annotation classes
-keep class * extends java.lang.annotation.Annotation { *; }

# Remove logging in release
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
    public static int e(...);
}

# Remove console.log equivalent (if any make it through)
-assumenosideeffects class java.io.PrintStream {
    public void println(**);
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Retrofit
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# React Native / Metro
-keep class com.facebook.react.** { *; }
-dontwarn com.facebook.react.**

# WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Prevent stripping of annotations
-keepattributes RuntimeVisibleAnnotations
-keepattributes RuntimeInvisibleAnnotations
-keepattributes RuntimeVisibleParameterAnnotations
-keepattributes RuntimeInvisibleParameterAnnotations

# Keep R classes
-keepclassmembers class **.R$* {
    public static <fields>;
}

# Remove unused code
-allowaccessmodification
-repackageclasses ''
