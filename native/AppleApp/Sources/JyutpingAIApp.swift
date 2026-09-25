import SwiftUI
import WebKit
#if os(iOS)
import UIKit
#else
import AppKit
import UniformTypeIdentifiers
#endif

@main
struct JyutpingAIApp: App {
    var body: some Scene {
        WindowGroup {
            WebAppView()
                .ignoresSafeArea(edges: .bottom)
        }
        #if os(macOS)
        .defaultSize(width: 1180, height: 820)
        .commands {
            CommandGroup(replacing: .newItem) { }
        }
        #endif
    }
}

#if os(iOS)
struct WebAppView: UIViewRepresentable {
    func makeCoordinator() -> BridgeCoordinator { BridgeCoordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.userContentController.add(context.coordinator, name: "fileExport")
        configuration.userContentController.add(context.coordinator, name: "clipboard")
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 9 / 255, green: 16 / 255, blue: 12 / 255, alpha: 1)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        loadApp(in: webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) { }
}
#else
struct WebAppView: NSViewRepresentable {
    func makeCoordinator() -> BridgeCoordinator { BridgeCoordinator() }

    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.userContentController.add(context.coordinator, name: "fileExport")
        configuration.userContentController.add(context.coordinator, name: "clipboard")
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.setValue(false, forKey: "drawsBackground")
        loadApp(in: webView)
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) { }
}
#endif

private func loadApp(in webView: WKWebView) {
    guard let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") else {
        assertionFailure("Missing bundled web application")
        return
    }
    webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
}

final class BridgeCoordinator: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "clipboard":
            guard let text = message.body as? String else { return }
            copyToClipboard(text)
        case "fileExport":
            guard let payload = message.body as? [String: Any],
                  let filename = payload["filename"] as? String,
                  let content = payload["content"] as? String else { return }
            exportFile(named: filename, content: content)
        default:
            break
        }
    }

    private func copyToClipboard(_ text: String) {
        #if os(iOS)
        UIPasteboard.general.string = text
        #else
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        #endif
    }

    private func exportFile(named filename: String, content: String) {
        #if os(iOS)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        try? content.write(to: url, atomically: true, encoding: .utf8)
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let presenter = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else { return }
        let controller = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        controller.popoverPresentationController?.sourceView = presenter.view
        presenter.present(controller, animated: true)
        #else
        let panel = NSSavePanel()
        panel.nameFieldStringValue = filename
        panel.allowedContentTypes = [UTType(filenameExtension: "lrc") ?? .plainText]
        if panel.runModal() == .OK, let url = panel.url {
            try? content.write(to: url, atomically: true, encoding: .utf8)
        }
        #endif
    }
}
