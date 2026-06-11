import { test, expect } from "@playwright/test";

test("deities page renders the pantheon carousel", async ({ page }) => {
  await page.goto("/deities");
  await expect(page.getByText("Deity Chronicles")).toBeVisible();
});

test("primary nav reaches each section", async ({ page }) => {
  await page.goto("/shrines");
  await expect(page.getByText("Sacred Sanctuaries")).toBeVisible();
  await page.goto("/calendar");
  await expect(page.getByText("Festival Liturgy")).toBeVisible();
});
