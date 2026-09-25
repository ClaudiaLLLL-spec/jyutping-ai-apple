import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname),
  base: "./",
  plugins: [{
    name: "standalone-offline-page",
    enforce: "post",
    generateBundle(_options, bundle) {
      const html = bundle["index.html"];
      if (!html || html.type !== "asset") throw new Error("Missing application HTML");
      let page = String(html.source);
      // WKWebView file URLs do not provide an HTTP origin for CORS fetches.
      // Embed both assets so the installed app needs no cross-origin requests.
      page = page.replace(/<script\b[^>]*src="\.\/([^" ]+)"[^>]*><\/script>/g, (_tag, path) => {
        const script = bundle[path];
        if (!script || script.type !== "chunk") throw new Error(`Missing script: ${path}`);
        return `<script type="module">${script.code.replace(/<\/script/gi, "<\\/script")}</script>`;
      });
      page = page.replace(/<link\b[^>]*href="\.\/([^" ]+\.css)"[^>]*>/g, (_tag, path) => {
        const css = bundle[path];
        if (!css || css.type !== "asset") throw new Error(`Missing stylesheet: ${path}`);
        return `<style>${css.source}</style>`;
      });
      if (/<(?:script|link)\b[^>]*(?:src|href)="\.\//.test(page)) {
        throw new Error("Offline page still contains external assets");
      }
      html.source = page;
    },
  }],
  build: {
    outDir: resolve(__dirname, "../AppleApp/Resources/www"),
    emptyOutDir: true,
    target: "safari16",
  },
});
