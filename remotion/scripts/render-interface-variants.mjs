import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const targets = [
  { id: "interface-v2", out: "/mnt/documents/korex-interface-trailer-v2.mp4" },
  { id: "interface-v3", out: "/mnt/documents/korex-interface-trailer-v3.mp4" },
  { id: "interface-v4", out: "/mnt/documents/korex-interface-trailer-v4.mp4" },
];

for (const t of targets) {
  const composition = await selectComposition({ serveUrl: bundled, id: t.id, puppeteerInstance: browser });
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: t.out,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 1,
  });
  console.log("Rendered:", t.out);
}

await browser.close({ silent: false });
