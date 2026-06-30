import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3003";
const outputDir = path.resolve("videos");
const viewport = { width: 1440, height: 1000 };

const demos = [
  {
    route: "/pulse",
    fileName: "world-cup-live-pulse-demo.webm",
    waitFor: "World Cup Live Pulse",
    scrollStops: [620, 1180, 0]
  },
  {
    route: "/settlement",
    fileName: "prediction-market-settlement-demo.webm",
    waitFor: "Prediction Market Settlement Watch",
    scrollStops: [620, 1180, 0]
  }
];

async function recordDemo(browser, demo) {
  console.log(`Recording ${demo.route}`);
  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: outputDir, size: viewport }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  await page.goto(`${baseUrl}${demo.route}`, { waitUntil: "commit", timeout: 15_000 });
  await page.waitForTimeout(5000);

  for (const y of demo.scrollStops) {
    await page.evaluate((scrollY) => window.scrollTo({ top: scrollY, behavior: "smooth" }), y);
    await page.waitForTimeout(3500);
  }

  await context.close();
  const video = await page.video()?.path();
  if (!video) throw new Error(`No video produced for ${demo.route}`);
  const target = path.join(outputDir, demo.fileName);
  await fs.rm(target, { force: true });
  await fs.rename(video, target);
  return target;
}

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ args: ["--no-sandbox"] });
try {
  for (const demo of demos) {
    const target = await recordDemo(browser, demo);
    console.log(`Recorded ${target}`);
  }
} finally {
  await browser.close();
}
