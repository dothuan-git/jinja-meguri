import { test, expect } from "@playwright/test";

// The LocaleSwitcher renders "EN" / "日本語" toggle buttons (desktop header, mobile
// banner, and the landing page's season-controls row) — see components/LocaleSwitcher.tsx.

test("defaults to English with no locale cookie", async ({ page }) => {
  await page.goto("/shrines");
  await expect(page.getByRole("link", { name: "Shrines" }).first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("switching to 日本語 translates nav labels and persists across navigation", async ({ page }) => {
  await page.goto("/shrines");
  await page.getByRole("button", { name: "日本語", exact: true }).first().click();

  // Nav labels flip to Japanese (messages/ja.json Nav namespace).
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("link", { name: "神社" }).first()).toBeVisible();

  // The locale cookie persists across a hard navigation to another page.
  await page.goto("/calendar");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("link", { name: "神社" }).first()).toBeVisible();
});

test("switching back to EN restores English nav labels", async ({ page }) => {
  await page.goto("/shrines");
  await page.getByRole("button", { name: "日本語", exact: true }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");

  await page.getByRole("button", { name: "EN", exact: true }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "Shrines" }).first()).toBeVisible();
});
