import { expect, test } from "@playwright/test";

test("dashboard loads live intelligence sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /World Cup Betting Intelligence Dashboard/i })).toBeVisible();
  await expect(page.getByText("Herramienta informativa/analitica. No garantiza ganancias.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "World Cup Watchlist & Odds" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Risk Lab" })).toBeVisible();
});
