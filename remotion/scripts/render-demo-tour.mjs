import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("Bundling…");
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: "demo-tour",
  puppeteerInstance: browser,
});

console.log(`Rendering ${composition.durationInFrames} frames @ ${composition.fps}fps (${composition.width}x${composition.height})…`);

const silentPath = "/tmp/demo-tour-silent.mp4";
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: silentPath,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 2,
  onProgress: ({ progress }) => {
    if (Math.floor(progress * 100) % 5 === 0) {
      process.stdout.write(`\r  ${Math.floor(progress * 100)}%    `);
    }
  },
});

await browser.close({ silent: false });
console.log("\nMuxing audio…");

const voPath = path.resolve(__dirname, "../public/voiceover.mp3");
const finalPath = "/mnt/documents/korex-demo-tour.mp4";
execSync(
  `ffmpeg -y -i ${silentPath} -i ${voPath} -c:v copy -c:a aac -b:a 192k -shortest ${finalPath}`,
  { stdio: "inherit" },
);

const size = execSync(`ls -la ${finalPath}`).toString();
console.log("\nDone:\n" + size);
