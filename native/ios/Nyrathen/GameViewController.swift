// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import UIKit
import WebKit
import StoreKit

/// Only these bundled resources are exposed. No arbitrary file access. The separate export bridge only shares three named text files.
final class BundledGameHandler: NSObject, WKURLSchemeHandler {
    private let allowed: Set<String> = ["index.html", "icon-192.png", "icon-512.png"]
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url, url.scheme == "nyrathen", url.host == "app" else {
            urlSchemeTask.didFailWithError(URLError(.unsupportedURL)); return
        }
        let name = url.path == "/" ? "index.html" : String(url.path.dropFirst())
        guard allowed.contains(name), let resource = Bundle.main.url(forResource: name, withExtension: nil, subdirectory: "Web") else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        do {
            let data = try Data(contentsOf: resource)
            let response = URLResponse(url: url, mimeType: name.hasSuffix(".html") ? "text/html" : "image/png", expectedContentLength: data.count, textEncodingName: name.hasSuffix(".html") ? "utf-8" : nil)
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch { urlSchemeTask.didFailWithError(error) }
    }
    // Resources are served synchronously from a small, fixed local bundle; nothing is left in flight.
    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) { }
}

private final class WeakFileMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) { target?.userContentController(userContentController, didReceive: message) }
}


private struct StoreBridgeError: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}

final class GameViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {
    private var game: WKWebView!
    private var pendingStoreTransactions: [String: StoreKit.Transaction] = [:]
    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .allButUpsideDown }
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.063, green: 0.11, blue: 0.114, alpha: 1)
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(BundledGameHandler(), forURLScheme: "nyrathen")
        configuration.userContentController.add(WeakFileMessageHandler(self), name: "nyrathenFiles")
        configuration.userContentController.add(WeakFileMessageHandler(self), name: "nyrathenStore")
        configuration.websiteDataStore = WKWebsiteDataStore.default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = .all
        game = WKWebView(frame: .zero, configuration: configuration)
        game.isOpaque = false
        game.backgroundColor = view.backgroundColor
        game.scrollView.backgroundColor = view.backgroundColor
        game.scrollView.bounces = false
        game.scrollView.contentInsetAdjustmentBehavior = .never
        game.navigationDelegate = self
        game.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(game)
        // Safe-area bounds prevent notches/home indicator from obscuring the controls.
        NSLayoutConstraint.activate([
            game.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            game.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            game.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            game.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])
        loadGame()
    }
    // Explicit bridges. StoreKit returns signed transactions; the game server grants the entitlement.
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == "nyrathen",
              message.frameInfo.request.url?.host == "app" else { return }
        if message.name == "nyrathenStore", let body = message.body as? [String: Any] { handleStore(body); return }
        let names: Set<String> = ["Nyrathen-Solo-Sicherung.json", "Nyrathen-Fehlerbericht.json", "Nyrathen-Wiederherstellung.txt"]
        guard message.name == "nyrathenFiles",
              let body = message.body as? [String: Any],
              let name = body["name"] as? String, names.contains(name),
              let text = body["text"] as? String,
              let data = text.data(using: .utf8), data.count <= 8000000,
              presentedViewController == nil else { return }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let file = directory.appendingPathComponent(name)
            try data.write(to: file, options: [.atomic, .completeFileProtection])
            let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
            share.popoverPresentationController?.sourceView = view
            share.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            share.completionWithItemsHandler = { _, _, _, _ in try? FileManager.default.removeItem(at: directory) }
            present(share, animated: true)
        } catch {
            try? FileManager.default.removeItem(at: directory)
            let alert = UIAlertController(title: "Export fehlgeschlagen", message: "Datei konnte nicht für das Teilen vorbereitet werden.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Schließen", style: .default)); present(alert, animated: true)
        }
    }
    private func handleStore(_ body: [String: Any]) {
        let type = body["type"] as? String ?? "", requestId = body["requestId"] as? String ?? ""
        Task { @MainActor in
            do {
                switch type {
                case "products":
                    let ids = body["productIds"] as? [String] ?? []
                    let products = try await Product.products(for: ids)
                    emitStore(["ok": true, "requestId": requestId, "provider": "apple", "products": products.map { ["id": $0.id, "title": $0.displayName, "description": $0.description, "price": $0.displayPrice] }])
                case "purchase":
                    guard let id = body["productId"] as? String, let product = try await Product.products(for: [id]).first else { throw StoreBridgeError("Produkt ist im App Store nicht verfügbar.") }
                    let result = try await product.purchase()
                    switch result {
                    case .success(let verification):
                        guard case .verified(let transaction) = verification else { throw StoreBridgeError("StoreKit konnte die Transaktion nicht verifizieren.") }
                        let tid = String(transaction.id); pendingStoreTransactions[tid] = transaction
                        emitStore(["ok": true, "requestId": requestId, "provider": "apple", "productId": id, "receipt": verification.jwsRepresentation, "transactionId": tid])
                    case .pending: throw StoreBridgeError("Zahlung ist noch ausstehend.")
                    case .userCancelled: throw StoreBridgeError("Kauf abgebrochen.")
                    @unknown default: throw StoreBridgeError("Unbekannter App-Store-Status.")
                    }
                case "recover":
                    var rows: [[String: Any]] = []
                    for await verification in Transaction.unfinished {
                        guard case .verified(let transaction) = verification else { continue }
                        pendingStoreTransactions[String(transaction.id)] = transaction
                        rows.append(["provider":"apple","productId":transaction.productID,"receipt":verification.jwsRepresentation,"transactionId":String(transaction.id)])
                    }
                    emitStore(["ok": true, "requestId": requestId, "provider":"apple", "transactions": rows])
                case "restore":
                    try? await AppStore.sync()
                    var rows: [[String: Any]] = [], seen = Set<UInt64>()
                    for await verification in Transaction.currentEntitlements {
                        guard case .verified(let transaction) = verification, seen.insert(transaction.id).inserted else { continue }
                        pendingStoreTransactions[String(transaction.id)] = transaction
                        rows.append(["provider":"apple","productId":transaction.productID,"receipt":verification.jwsRepresentation,"transactionId":String(transaction.id)])
                    }
                    for await verification in Transaction.unfinished {
                        guard case .verified(let transaction) = verification, seen.insert(transaction.id).inserted else { continue }
                        pendingStoreTransactions[String(transaction.id)] = transaction
                        rows.append(["provider":"apple","productId":transaction.productID,"receipt":verification.jwsRepresentation,"transactionId":String(transaction.id)])
                    }
                    emitStore(["ok": true, "requestId": requestId, "provider":"apple", "transactions": rows])
                case "finalize":
                    let tid = body["transactionId"] as? String ?? ""
                    if let transaction = pendingStoreTransactions.removeValue(forKey: tid) { await transaction.finish(); emitStore(["ok":true,"requestId":requestId,"provider":"apple"]); return }
                    if let productId = body["productId"] as? String, let verification = await Transaction.latest(for: productId), case .verified(let transaction) = verification, String(transaction.id) == tid { await transaction.finish() }
                    emitStore(["ok": true, "requestId": requestId, "provider":"apple"])
                default: throw StoreBridgeError("Unbekannte Store-Anfrage.")
                }
            } catch { emitStore(["ok": false, "requestId": requestId, "provider":"apple", "error": error.localizedDescription]) }
        }
    }
    private func emitStore(_ value: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(value), let data = try? JSONSerialization.data(withJSONObject: value), let json = String(data: data, encoding: .utf8) else { return }
        game?.evaluateJavaScript("window.NyrathenNativeStoreResult&&window.NyrathenNativeStoreResult(\(json))", completionHandler: nil)
    }
    private func loadGame() {
        guard let url = URL(string: "nyrathen://app/index.html") else { return }
        game.load(URLRequest(url: url))
    }
    func resumeGame() { game?.evaluateJavaScript("window.NyrathenHost && window.NyrathenHost.resume()", completionHandler: nil) }
    func pauseGame() {
        game?.evaluateJavaScript("window.NyrathenHost && window.NyrathenHost.pause()", completionHandler: nil)
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "nyrathen" && url.host == "app" { decisionHandler(.allow); return }
        // Only user-activated HTTPS links (privacy, terms, support, deletion) may leave the bundled app.
        if navigationAction.navigationType == .linkActivated && url.scheme == "https" {
            decisionHandler(.cancel)
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
            return
        }
        decisionHandler(.cancel)
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { showFailure() }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { showFailure() }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { showFailure() }
    private func showFailure() {
        guard presentedViewController == nil else { return }
        let alert = UIAlertController(title: "Spiel konnte nicht geladen werden", message: "Bitte die gebündelten Web-Assets prüfen. Ein Neustart lädt den zuletzt gespeicherten Stand.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Erneut laden", style: .default) { [weak self] _ in self?.loadGame() })
        present(alert, animated: true)
    }
}
