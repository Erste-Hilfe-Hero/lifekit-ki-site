/* SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary */
package game.nyrathen.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.widget.Toast;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedDispatcher;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Set;
import java.util.HashSet;
import java.util.Arrays;

/** Native shell: bundles the whole playable client, and does not require a server for solo play. */
public final class MainActivity extends Activity {
    private WebView game;
    private ValueCallback<Uri[]> fileChoice;
    private byte[] pendingExport;
    private StoreBridge storeBridge;
    private static final int PICK_JSON = 71, SAVE_DOCUMENT = 72;
    private static final Set<String> EXPORTS = new HashSet<>(Arrays.asList("Nyrathen-Solo-Sicherung.json", "Nyrathen-Fehlerbericht.json", "Nyrathen-Wiederherstellung.txt"));
    private static final String ORIGIN = "https://app.nyrathen.local";
    private static final Set<String> FILES = new HashSet<>(Arrays.asList("/index.html", "/icon-192.png", "/icon-512.png"));

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        game = new WebView(this);
        game.setBackgroundColor(Color.rgb(16, 28, 29));
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Only user-granted document URIs; no storage-wide permission.
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        game.setOverScrollMode(View.OVER_SCROLL_NEVER);
        game.addJavascriptInterface(new ExportBridge(), "NyrathenFiles");
        storeBridge = new StoreBridge(this, game);
        game.addJavascriptInterface(storeBridge, "NyrathenStore");
        game.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileChoice != null) fileChoice.onReceiveValue(null);
                fileChoice = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");
                try { startActivityForResult(intent, PICK_JSON); }
                catch (RuntimeException error) { fileChoice.onReceiveValue(null); fileChoice = null; reportFileError(); }
                return true;
            }
        });
        game.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!"https".equals(request.getUrl().getScheme()) || !"app.nyrathen.local".equals(request.getUrl().getHost())) return null;
                String path = request.getUrl().getPath();
                if ("/".equals(path)) path = "/index.html";
                if (!FILES.contains(path)) return missing();
                try {
                    return new WebResourceResponse(path.endsWith(".html") ? "text/html" : "image/png", path.endsWith(".html") ? "UTF-8" : null, getAssets().open("game" + path));
                } catch (IOException error) { return missing(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if ("https".equals(url.getScheme()) && "app.nyrathen.local".equals(url.getHost())) return false;
                // Only explicit user taps may leave the bundled game, and only through HTTPS in the system browser.
                if (request.isForMainFrame() && request.hasGesture() && "https".equals(url.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, url)); }
                    catch (RuntimeException error) { Toast.makeText(MainActivity.this, "Link konnte nicht geöffnet werden.", Toast.LENGTH_LONG).show(); }
                }
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) runOnUiThread(() -> new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Nyrathen konnte nicht starten")
                    .setMessage("Die lokalen Spieldateien konnten nicht geladen werden. Bitte den Build und die Web-Assets prüfen.")
                    .setPositiveButton("Erneut laden", (dialog, which) -> game.loadUrl(ORIGIN + "/index.html"))
                    .setNegativeButton("Schließen", (dialog, which) -> finish()).show());
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                view.destroy(); game = null;
                runOnUiThread(() -> new AlertDialog.Builder(MainActivity.this).setTitle("Grafikprozess beendet")
                    .setMessage("Der letzte gespeicherte Stand bleibt erhalten.")
                    .setPositiveButton("Neu starten", (d, w) -> recreate()).setNegativeButton("Schließen", (d, w) -> finish()).show());
                return true;
            }
        });
        setContentView(game);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(true);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.systemBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            game.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        game.loadUrl(ORIGIN + "/index.html");
    }
    public final class ExportBridge {
        @JavascriptInterface public void saveFile(String name, String text, String mime) {
            if (!EXPORTS.contains(name) || text == null || text.length() > 8000000 || !("application/json".equals(mime) || "text/plain".equals(mime))) return;
            final byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
            if (bytes.length > 8000000) return;
            runOnUiThread(() -> {
                if (game == null || game.getUrl() == null || !game.getUrl().startsWith(ORIGIN + "/") || pendingExport != null) return;
                pendingExport = bytes;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime).putExtra(Intent.EXTRA_TITLE, name);
                try { startActivityForResult(intent, SAVE_DOCUMENT); }
                catch (RuntimeException error) { pendingExport = null; reportFileError(); }
            });
        }
    }
    @SuppressWarnings("deprecation") @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_JSON && fileChoice != null) {
            fileChoice.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null ? new Uri[]{data.getData()} : null);
            fileChoice = null;
        }
        if (request == SAVE_DOCUMENT) {
            final byte[] bytes = pendingExport; pendingExport = null;
            final Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
            if (uri == null || bytes == null) return;
            new Thread(() -> {
                try (OutputStream output = getContentResolver().openOutputStream(uri, "w")) {
                    if (output == null) throw new IOException("Document could not be opened");
                    output.write(bytes);
                    runOnUiThread(() -> Toast.makeText(this, "Datei gespeichert", Toast.LENGTH_SHORT).show());
                } catch (IOException | SecurityException error) { runOnUiThread(this::reportFileError); }
            }, "nyrathen-export").start();
        }
    }
    private void reportFileError() { Toast.makeText(this, "Datei konnte nicht geöffnet oder gespeichert werden.", Toast.LENGTH_LONG).show(); }
    private WebResourceResponse missing() {
        WebResourceResponse response = new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream("Not found".getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        response.setStatusCodeAndReasonPhrase(404, "Not Found");
        return response;
    }
    private void handleBack() {
        if (game == null) { finish(); return; }
        game.evaluateJavascript("Boolean(window.NyrathenHost && window.NyrathenHost.back())", handled -> { if (!"true".equals(handled)) finish(); });
    }
    @SuppressWarnings("deprecation") @Override public void onBackPressed() { handleBack(); }
    @Override protected void onPause() {
        if (game != null) { game.evaluateJavascript("window.NyrathenHost && window.NyrathenHost.pause()", null); game.onPause(); }
        super.onPause();
    }
    @Override protected void onResume() { super.onResume(); if (game != null) { game.onResume(); game.evaluateJavascript("window.NyrathenHost && window.NyrathenHost.resume()", null); } }
    @Override protected void onDestroy() { if (fileChoice != null) { fileChoice.onReceiveValue(null); fileChoice = null; } pendingExport = null; if (storeBridge != null) { storeBridge.destroy(); storeBridge = null; } if (game != null) { game.stopLoading(); game.destroy(); game = null; } super.onDestroy(); }
}
