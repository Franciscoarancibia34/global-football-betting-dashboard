import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3003";
const outputDir = path.resolve("videos");
const outputFile = path.join(outputDir, "txline-dashboard-demo.webm");

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: outputDir, size: { width: 1440, height: 1000 } }
});

const page = await context.newPage();
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

await page.mouse.wheel(0, 600);
await page.waitForTimeout(1800);

await page.mouse.wheel(0, 700);
await page.waitForTimeout(1800);

const stakeInput = page.getByLabel(/stake/i).first();
if (await stakeInput.count().catch(() => 0)) {
  await stakeInput.fill("40");
  await page.waitForTimeout(1200);
}

const quoteInput = page.getByLabel(/bookmaker quote|manual quote|quote/i).first();
if (await quoteInput.count().catch(() => 0)) {
  await quoteInput.fill("2.15");
  await page.waitForTimeout(1200);
}

await page.mouse.wheel(0, -1400);
await page.waitForTimeout(2000);

await page.goto(`${baseUrl}/txline-setup`, { waitUntil: "networkidle" });
await page.waitForTimeout(1800);

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const video = page.video();
await context.close();
await browser.close();

const tempVideoPath = await video.path();
await fs.copyFile(tempVideoPath, outputFile);
console.log(outputFile);
