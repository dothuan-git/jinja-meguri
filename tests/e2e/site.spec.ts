import { test, expect } from "@playwright/test";

test("landing CTA enters the listing", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /shrines/i }).first().click();
  await expect(page).toHaveURL(/\/shrines/);
});

test("listing filters narrow results and update the URL", async ({ page }) => {
  await page.goto("/shrines");
  const before = await page.locator('[data-testid="shrine-card"]').count();
  await page.getByRole("button", { name: /^Kinki$/ }).click();
  await expect(page).toHaveURL(/region=/);
  const after = await page.locator('[data-testid="shrine-card"]').count();
  expect(after).toBeLessThan(before);
});

test("cards show a pin hint and no map iframe", async ({ page }) => {
  await page.goto("/shrines");
  const card = page.locator('[data-testid="shrine-card"]').first();
  await expect(card.locator('[data-testid="pin-hint"]')).toBeVisible();
  await expect(card.locator("iframe")).toHaveCount(0);
});

test("detail opens as a modal from the list and closes back to the list", async ({ page }) => {
  await page.goto("/shrines");
  await page.locator('[data-testid="shrine-card"]').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/shrines(\?|$)/);
});

test("direct shrine URL renders a full page with sources footnotes", async ({ page }) => {
  await page.goto("/shrines/yasaka-jinja");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Yasaka Shrine/i })).toBeVisible();
  await expect(page.locator('[data-testid="sources"] a').first()).toBeVisible();
});

test("calendar shows Gion in July and a TBC fallback entry", async ({ page }) => {
  await page.goto("/calendar");
  await expect(page.getByText(/Gion/i).first()).toBeVisible();
  await expect(page.getByText(/dates TBC/i)).toBeVisible();
});

test("search returns ranked results for English, Japanese, and typos", async ({ page }) => {
  await page.goto("/search?q=Yasaka");
  await expect(page.locator('[data-testid="shrine-card"]').first()).toContainText(/Yasaka/i);

  await page.goto("/search?q=祇園");
  await expect(page.locator('[data-testid="shrine-card"]')).not.toHaveCount(0);

  await page.goto("/search?q=Yasakaa");
  await expect(page.locator('[data-testid="shrine-card"]')).not.toHaveCount(0);
});
