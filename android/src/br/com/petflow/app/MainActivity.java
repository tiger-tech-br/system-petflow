package br.com.petflow.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.view.ViewTreeObserver;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/** Small HTTPS shell: the bundled login uses the store's real cookie origin. */
public final class MainActivity extends Activity {
    private static final int BRAND_COLOR = Color.rgb(4, 90, 84);
    private static final long SPLASH_MIN_MS = 800;
    private static final long SPLASH_TIMEOUT_MS = 10000;
    private static final Map<String, String> BUNDLED = new HashMap<>();
    static {
        BUNDLED.put("/login", "login.html");
        BUNDLED.put("/cadastro", "login.html");
        BUNDLED.put("/css/pages/public-login.css", "css/pages/public-login.css");
        BUNDLED.put("/css/pages/android-login.css", "css/pages/android-login.css");
        BUNDLED.put("/js/pages/auth/public-auth.js", "js/pages/auth/public-auth.js");
        BUNDLED.put("/js/pages/home/catalog.js", "js/pages/home/catalog.js");
        BUNDLED.put("/js/layout/android-navigation.js", "js/layout/android-navigation.js");
        BUNDLED.put("/css/layout/android-navigation.css", "css/layout/android-navigation.css");
        BUNDLED.put("/js/legal/site-privacy.js", "js/legal/site-privacy.js");
        BUNDLED.put("/css/components/site-privacy.css", "css/components/site-privacy.css");
        BUNDLED.put("/images/logo/fred-petflow-logo-transparent.png", "images/logo/fred-petflow-logo-transparent.png");
        BUNDLED.put("/favicon.ico", "favicon.ico");
    }

    private WebView web;
    private FrameLayout root;
    private ProgressBar progress;
    private LinearLayout offline;
    private String failedUrl;
    private FrameLayout splash;
    private long splashVisibleAt = -1;
    private boolean splashContentReady;
    private boolean splashFrameRequested;
    private boolean destroyed;
    private final Runnable dismissSplash = () -> {
        if (splash == null || destroyed) return;
        root.removeCallbacks(this.splashTimeout);
        web.setBackgroundColor(BRAND_COLOR);
        root.setBackgroundColor(BRAND_COLOR);
        getWindow().getDecorView().setBackgroundColor(BRAND_COLOR);
        root.removeView(splash);
        splash = null;
        web.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_AUTO);
    };
    private final Runnable splashTimeout = () -> {
        if (splash == null || destroyed || isFinishing()) return;
        failedUrl = web.getUrl();
        progress.setVisibility(View.GONE);
        web.setVisibility(View.INVISIBLE);
        offline.setVisibility(View.VISIBLE);
        finishSplashWhenReady();
    };

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(BRAND_COLOR);
        getWindow().setNavigationBarColor(BRAND_COLOR);
        getWindow().getDecorView().setBackgroundResource(R.drawable.petflow_splash);
        if (Build.VERSION.SDK_INT >= 29) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }
        root = new FrameLayout(this);
        root.setBackgroundResource(R.drawable.petflow_splash);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
                return insets;
            });
        }
        setContentView(root);
        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(false);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString() + " PetFlowAndroid/1.0");
        if (Build.VERSION.SDK_INT >= 29) settings.setForceDark(WebSettings.FORCE_DARK_OFF);
        if (Build.VERSION.SDK_INT >= 33) settings.setAlgorithmicDarkeningAllowed(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new StoreClient());
        web.setWebChromeClient(new WebChromeClient());
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        progress = new ProgressBar(this);
        progress.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(Color.WHITE));
        FrameLayout.LayoutParams indicator = new FrameLayout.LayoutParams(dp(32), dp(32), Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        indicator.topMargin = dp(10);
        root.addView(progress, indicator);
        createOfflineView();
        createSplashView();
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::navigateBack);
        }
        if (state == null || web.restoreState(state) == null) web.loadUrl(BuildConfig.STORE_URL + "/login");
    }

    private void createSplashView() {
        splash = new FrameLayout(this);
        splash.setBackgroundColor(BRAND_COLOR);
        splash.setClickable(true);
        splash.setFocusable(true);
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.petflow_logo);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logo.setContentDescription("PetFlow. Carregando.");
        splash.addView(logo, new FrameLayout.LayoutParams(dp(200), dp(200), Gravity.CENTER));
        root.addView(splash, new FrameLayout.LayoutParams(-1, -1));
        web.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        splash.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
            @Override public boolean onPreDraw() {
                if (splash == null || destroyed) return true;
                splash.getViewTreeObserver().removeOnPreDrawListener(this);
                splashVisibleAt = SystemClock.uptimeMillis();
                root.postDelayed(splashTimeout, SPLASH_TIMEOUT_MS);
                if (splashContentReady) finishSplashWhenReady();
                return true;
            }
        });
    }

    private void finishSplashWhenReady() {
        if (splash == null || destroyed || isFinishing()) return;
        splashContentReady = true;
        if (splashVisibleAt < 0) return;
        root.removeCallbacks(dismissSplash);
        root.postDelayed(dismissSplash, Math.max(0, SPLASH_MIN_MS - (SystemClock.uptimeMillis() - splashVisibleAt)));
    }

    private void revealRenderedPage() {
        if (splash == null || destroyed || isFinishing() || splashFrameRequested) return;
        splashFrameRequested = true;
        web.postVisualStateCallback(0, new WebView.VisualStateCallback() {
            @Override public void onComplete(long requestId) { finishSplashWhenReady(); }
        });
    }

    private void installAppNavigation(String url) {
        if (destroyed || url == null || !isStoreUri(Uri.parse(url))) return;
        web.evaluateJavascript("(function(){function install(){"
            + "if(document.getElementById('petflowAndroidNavigationScript'))return;"
            + "var css=document.createElement('link');css.rel='stylesheet';"
            + "css.href='/css/layout/android-navigation.css?v=1.0.2';document.head.appendChild(css);"
            + "var script=document.createElement('script');script.id='petflowAndroidNavigationScript';"
            + "script.src='/js/layout/android-navigation.js?v=1.0.2';document.head.appendChild(script);"
            + "}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',install,{once:true});}"
            + "else install();})();", null);
    }

    private void createOfflineView() {
        offline = new LinearLayout(this);
        offline.setOrientation(LinearLayout.VERTICAL);
        offline.setGravity(Gravity.CENTER);
        offline.setPadding(dp(28), dp(28), dp(28), dp(28));
        offline.setBackgroundColor(BRAND_COLOR);
        TextView title = new TextView(this);
        title.setText("PetFlow");
        title.setTextSize(32);
        title.setTextColor(Color.WHITE);
        title.setGravity(Gravity.CENTER);
        offline.addView(title);
        TextView message = new TextView(this);
        message.setText("Não foi possível carregar esta página.\nConfira sua conexão e tente novamente.");
        message.setTextSize(17);
        message.setTextColor(Color.WHITE);
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, dp(20), 0, dp(22));
        offline.addView(message);
        Button retry = new Button(this);
        retry.setText("Tentar novamente");
        retry.setOnClickListener(view -> {
            offline.setVisibility(View.GONE);
            web.setVisibility(View.VISIBLE);
            web.loadUrl(isStoreUri(Uri.parse(failedUrl == null ? BuildConfig.STORE_URL : failedUrl))
                ? (failedUrl == null ? BuildConfig.STORE_URL + "/login" : failedUrl)
                : BuildConfig.STORE_URL + "/login");
        });
        offline.addView(retry);
        offline.setVisibility(View.GONE);
        root.addView(offline, new FrameLayout.LayoutParams(-1, -1));
    }

    private boolean isStoreUri(Uri uri) {
        Uri store = Uri.parse(BuildConfig.STORE_URL);
        return "https".equalsIgnoreCase(uri.getScheme())
            && store.getHost().equalsIgnoreCase(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443)
            && uri.getUserInfo() == null;
    }

    private boolean route(Uri uri) {
        if (isStoreUri(uri)) return false;
        String scheme = uri.getScheme();
        if (!"https".equalsIgnoreCase(scheme) && !"mailto".equalsIgnoreCase(scheme)
            && !"tel".equalsIgnoreCase(scheme) && !"geo".equalsIgnoreCase(scheme)) return true;
        try {
            Intent external = new Intent(Intent.ACTION_VIEW, uri);
            external.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(external);
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "Nenhum aplicativo disponível para abrir este link.", Toast.LENGTH_LONG).show();
        }
        return true;
    }

    private void navigateBack() {
        if (offline.getVisibility() == View.VISIBLE) {
            offline.setVisibility(View.GONE);
            web.setVisibility(View.VISIBLE);
            web.loadUrl(BuildConfig.STORE_URL + "/login");
        } else if (web.canGoBack()) web.goBack();
        else finish();
    }

    @Override public void onBackPressed() { navigateBack(); }
    @Override protected void onSaveInstanceState(Bundle state) {
        web.saveState(state);
        super.onSaveInstanceState(state);
    }
    @Override protected void onPause() {
        CookieManager.getInstance().flush();
        web.onPause();
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }
    @Override protected void onDestroy() {
        destroyed = true;
        if (root != null) {
            root.removeCallbacks(dismissSplash);
            root.removeCallbacks(splashTimeout);
        }
        splash = null;
        if (web != null) {
            root.removeView(web);
            web.destroy();
        }
        super.onDestroy();
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private final class StoreClient extends WebViewClient {
        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return request.isForMainFrame() && route(request.getUrl());
        }
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!"GET".equals(request.getMethod()) || !isStoreUri(uri)) return null;
            String asset = BUNDLED.get(uri.getPath());
            if (asset == null) return null;
            String mime = asset.endsWith(".css") ? "text/css" : asset.endsWith(".js") ? "application/javascript"
                : asset.endsWith(".png") ? "image/png" : asset.endsWith(".ico") ? "image/x-icon" : "text/html";
            try {
                return new WebResourceResponse(mime, "UTF-8", 200, "OK",
                    Collections.singletonMap("Cache-Control", "no-store"), getAssets().open("web/" + asset));
            } catch (IOException error) { return null; }
        }
        @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
            progress.setVisibility(View.VISIBLE);
        }
        @Override public void onPageCommitVisible(WebView view, String url) {
            installAppNavigation(url);
            revealRenderedPage();
        }
        @Override public void onPageFinished(WebView view, String url) {
            installAppNavigation(url);
            progress.setVisibility(View.GONE);
            CookieManager.getInstance().flush();
            revealRenderedPage();
        }
        @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (!request.isForMainFrame()) return;
            failedUrl = request.getUrl().toString();
            progress.setVisibility(View.GONE);
            web.setVisibility(View.INVISIBLE);
            offline.setVisibility(View.VISIBLE);
            finishSplashWhenReady();
        }
    }
}
