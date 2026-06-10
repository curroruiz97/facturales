# Facturales - ProGuard Rules for Production

# ---- Capacitor ----
-keep class com.getcapacitor.** { *; }
-keep class com.facturales.app.** { *; }

# Preserve JavaScript interface methods for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ---- Cordova ----
-keep class org.apache.cordova.** { *; }

# ---- AndroidX ----
-keep class androidx.core.content.FileProvider { *; }

# ---- WebView ----
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
    public void *(android.webkit.WebView, java.lang.String);
}

# Preserve line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
