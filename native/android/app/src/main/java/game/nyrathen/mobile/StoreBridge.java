package game.nyrathen.mobile;

import android.app.Activity;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.ProductDetailsResponseListener;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/** Google Play Billing bridge. Entitlements are never granted locally. */
public final class StoreBridge implements PurchasesUpdatedListener {
    private final Activity activity;
    private final WebView web;
    private final BillingClient billing;
    private final Map<String, ProductDetails> products = new HashMap<>();
    private JSONObject pendingPurchase;
    private boolean connecting;

    public StoreBridge(Activity activity, WebView web) {
        this.activity = activity;
        this.web = web;
        this.billing = BillingClient.newBuilder(activity)
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();
        connect(null);
    }

    @JavascriptInterface public void request(String raw) {
        activity.runOnUiThread(() -> {
            try {
                JSONObject request = new JSONObject(raw == null ? "{}" : raw);
                connect(() -> dispatch(request));
            } catch (Exception error) { emitError(null, error.getMessage()); }
        });
    }

    private void connect(Runnable ready) {
        if (billing.isReady()) { if (ready != null) ready.run(); return; }
        if (connecting) {
            web.postDelayed(() -> connect(ready), 120);
            return;
        }
        connecting = true;
        billing.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                connecting = false;
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    queryOutstanding();
                    if (ready != null) ready.run();
                } else emitError(null, "Google Play ist nicht verfügbar (" + result.getResponseCode() + ").");
            }
            @Override public void onBillingServiceDisconnected() { connecting = false; }
        });
    }

    private void dispatch(JSONObject request) {
        String type = request.optString("type", ""), requestId = request.optString("requestId", "");
        switch (type) {
            case "products" -> queryProducts(request, false);
            case "purchase" -> queryProducts(request, true);
            case "restore" -> restore(requestId, false);
            case "recover" -> restore(requestId, true);
            case "finalize" -> finalizePurchase(request);
            default -> emitError(requestId, "Unbekannte Store-Anfrage.");
        }
    }

    private List<String> requestedIds(JSONObject request) {
        List<String> ids = new ArrayList<>();
        JSONArray array = request.optJSONArray("productIds");
        if (array != null) for (int i=0;i<array.length();i++) if (!array.optString(i).isBlank()) ids.add(array.optString(i));
        String single = request.optString("productId", ""); if (!single.isBlank() && !ids.contains(single)) ids.add(single);
        return ids;
    }

    private void queryProducts(JSONObject request, boolean launch) {
        String requestId = request.optString("requestId", "");
        List<QueryProductDetailsParams.Product> list = new ArrayList<>();
        for (String id : requestedIds(request)) list.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());
        if (list.isEmpty()) { emitError(requestId, "Keine Store-Produkte angegeben."); return; }
        billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build(), new ProductDetailsResponseListener() {
            @Override public void onProductDetailsResponse(BillingResult result, com.android.billingclient.api.QueryProductDetailsResult detailsResult) {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { emitError(requestId, "Produktdaten konnten nicht geladen werden."); return; }
                for (ProductDetails d : detailsResult.getProductDetailsList()) products.put(d.getProductId(), d);
                if (launch) launchPurchase(request); else emitProducts(requestId, detailsResult.getProductDetailsList());
            }
        });
    }

    private ProductDetails.OneTimePurchaseOfferDetails firstOffer(ProductDetails details) {
        List<ProductDetails.OneTimePurchaseOfferDetails> offers = details.getOneTimePurchaseOfferDetailsList();
        return offers == null || offers.isEmpty() ? null : offers.get(0);
    }

    private void emitProducts(String requestId, List<ProductDetails> list) {
        try {
            JSONArray rows = new JSONArray();
            for (ProductDetails d : list) {
                ProductDetails.OneTimePurchaseOfferDetails offer = firstOffer(d);
                JSONObject row = new JSONObject().put("id", d.getProductId()).put("title", d.getTitle()).put("description", d.getDescription());
                if (offer != null) row.put("price", offer.getFormattedPrice());
                rows.put(row);
            }
            emit(new JSONObject().put("ok", true).put("requestId", requestId).put("provider", "google").put("products", rows));
        } catch (Exception error) { emitError(requestId, error.getMessage()); }
    }

    private void launchPurchase(JSONObject request) {
        String requestId = request.optString("requestId", ""), productId = request.optString("productId", "");
        ProductDetails details = products.get(productId); ProductDetails.OneTimePurchaseOfferDetails offer = details == null ? null : firstOffer(details);
        if (details == null || offer == null) { emitError(requestId, "Produkt ist für dieses Google-Play-Konto nicht verfügbar."); return; }
        pendingPurchase = request;
        BillingFlowParams.ProductDetailsParams pd = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details).setOfferToken(offer.getOfferToken()).build();
        BillingFlowParams.Builder flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(java.util.Collections.singletonList(pd));
        String accountId = request.optString("accountId", ""); if (!accountId.isBlank()) flow.setObfuscatedAccountId(hash(accountId));
        BillingResult result = billing.launchBillingFlow(activity, flow.build());
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { pendingPurchase = null; emitError(requestId, "Google Play konnte den Kauf nicht starten."); }
    }

    @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        JSONObject request = pendingPurchase; pendingPurchase = null;
        String requestId = request == null ? "" : request.optString("requestId", "");
        if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) { emitError(requestId, "Kauf abgebrochen."); return; }
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) { emitError(requestId, "Google Play hat den Kauf nicht bestätigt."); return; }
        String expected = request == null ? "" : request.optString("productId", "");
        for (Purchase purchase : purchases) if (purchase.getProducts().contains(expected)) { emitPurchase(requestId, purchase, expected); return; }
        emitError(requestId, "Bestätigtes Produkt stimmt nicht überein.");
    }

    private void emitPurchase(String requestId, Purchase purchase, String productId) {
        try {
            if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) { emitError(requestId, "Zahlung ist noch ausstehend."); return; }
            if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) { emitError(requestId, "Kauf wurde nicht abgeschlossen."); return; }
            emit(new JSONObject().put("ok", true).put("requestId", requestId).put("provider", "google").put("productId", productId).put("receipt", purchase.getPurchaseToken()).put("transactionId", purchase.getOrderId() == null ? "" : purchase.getOrderId()));
        } catch (Exception error) { emitError(requestId, error.getMessage()); }
    }

    private void restore(String requestId, boolean outstandingOnly) {
        billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(), (result, purchases) -> {
            try {
                JSONArray rows = new JSONArray();
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) for (Purchase p : purchases) {
                    if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
                    if (outstandingOnly && p.isAcknowledged()) continue;
                    for (String productId : p.getProducts()) rows.put(new JSONObject().put("provider", "google").put("productId", productId).put("receipt", p.getPurchaseToken()).put("transactionId", p.getOrderId() == null ? "" : p.getOrderId()));
                }
                emit(new JSONObject().put("ok", true).put("requestId", requestId).put("provider", "google").put("transactions", rows));
            } catch (Exception error) { emitError(requestId, error.getMessage()); }
        });
    }

    private void queryOutstanding() {
        billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(), (result, purchases) -> { /* JS restore handles grants; connection query ensures Play state is fresh. */ });
    }

    private void finalizePurchase(JSONObject request) {
        String requestId=request.optString("requestId", ""), token=request.optString("receipt", "");
        if (token.isBlank()) { emitError(requestId, "Kaufbeleg fehlt."); return; }
        if (request.optBoolean("consumable", false)) billing.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(token).build(), (result, purchaseToken) -> {
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) emitOk(requestId); else emitError(requestId, "Google Play konnte den Verbrauch nicht bestätigen.");
        });
        else billing.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(token).build(), result -> {
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK || result.getResponseCode() == BillingClient.BillingResponseCode.ITEM_NOT_OWNED) emitOk(requestId); else emitError(requestId, "Google Play konnte den Kauf nicht abschließen.");
        });
    }

    private String hash(String value) {
        try { byte[] d=MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));StringBuilder b=new StringBuilder();for(byte x:d)b.append(String.format("%02x",x));return b.toString(); }
        catch (Exception error) { return value; }
    }
    private void emitOk(String requestId) { try { emit(new JSONObject().put("ok", true).put("requestId", requestId).put("provider", "google")); } catch (Exception ignored) {} }
    private void emitError(String requestId, String message) { try { emit(new JSONObject().put("ok", false).put("requestId", requestId == null ? "" : requestId).put("provider", "google").put("error", message == null ? "Store-Fehler" : message)); } catch (Exception ignored) {} }
    private void emit(JSONObject value) { String js="window.NyrathenNativeStoreResult&&window.NyrathenNativeStoreResult("+value.toString()+")";activity.runOnUiThread(() -> { if (web != null) web.evaluateJavascript(js, null); }); }
    public void destroy() { billing.endConnection(); }
}
