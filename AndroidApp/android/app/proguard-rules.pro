# Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin { *; }

# Capacitor Plugins
-keep class com.capacitorjs.** { *; }

# Our custom Capacitor plugin and foreground service — must not be renamed or stripped
-keep class com.aetherradio.app.MediaControlPlugin { *; }
-keep class com.aetherradio.app.RadioPlaybackService { *; }
-keep class com.aetherradio.app.MainActivity { *; }

# AndroidX Media (MediaSessionCompat, MediaStyle, etc.)
-keep class androidx.media.** { *; }
-keep class android.support.v4.media.** { *; }
-dontwarn android.support.v4.media.**

# WebView JavaScript interface
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# AndroidX
-keep class androidx.** { *; }
-dontwarn androidx.**
