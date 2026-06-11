import { test, expect, type Page } from "@playwright/test";

// The shrine dataset is ingested separately (see CLAUDE.md). On an empty DB the
// listing renders zero cards; data-dependent tests skip instead of failing.
async function datasetAvailable(page: Page): Promise<boolean> {
  await page.goto("/shrines");
  return (await page.locator('[data-testid="shrine-card"]').count()) > 0;
}

test("landing CTA enters the listing", async ({ page }) => {
  await page.goto("/");
  // The ema plaque sways in an infinite animation; skip Playwright's stability wait.
  await page.getByText("ENTER PRECINCTS").click({ force: true });
  await expect(page).toHaveURL(/\/shrines/);
});

test("listing filters narrow results and update the URL", async ({ page }) => {
  test.skip(!(await datasetAvailable(page)), "requires ingested shrine dataset");
  const before = await page.locator('[data-testid="shrine-card"]').count();
  await page.getByRole("button", { name: /^Region$/ }).click();
  await page.getByLabel("Kinki").check();
  await expect(page).toHaveURL(/region=/);
  const after = await page.locator('[data-testid="shrine-card"]').count();
  expect(after).toBeLessThan(before);
});

test("cards render without map iframes", async ({ page }) => {
  test.skip(!(await datasetAvailable(page)), "requires ingested shrine dataset");
  const card = page.locator('[data-testid="shrine-card"]').first();
  await expect(card).toBeVisible();
  await expect(card.locator("iframe")).toHaveCount(0);
});

test("detail opens as a modal from the list and closes back to the list", async ({ page }) => {
  test.skip(!(await datasetAvailable(page)), "requires ingested shrine dataset");
  await page.locator('[data-testid="shrine-card"]').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/shrines(\?|$)/);
});

test("direct shrine URL renders a full page with historical references", async ({ page }) => {
  test.skip(!(await datasetAvailable(page)), "requires ingested shrine dataset");
  await page.goto("/shrines/yasaka-jinja");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Yasaka Shrine/i })).toBeVisible();
  await expect(page.getByText("HISTORICAL REFERENCES")).toBeVisible();
});

test("calendar timeline shows Gion under the festival liturgy", async ({ page }) => {
  test.skip(!(await datasetAvailable(page)), "requires ingested shrine dataset");
  await page.goto("/calendar");
  await expect(page.getByText("Festival Liturgy")).toBeVisible();
  await expect(page.getByText(/Gion/i).first()).toBeVisible();
});

test("search returns ranked results for English, Japanese, and typos", async ({ page }) => {
  test.skip(!(await datasetAvailable(page)), "requires ingested shrine dataset");
  await page.goto("/search?q=Yasaka");
  await expect(page.locator('[data-testid="shrine-card"]').first()).toContainText(/Yasaka/i);

  await page.goto("/search?q=祇園");
  await expect(page.locator('[data-testid="shrine-card"]')).not.toHaveCount(0);

  await page.goto("/search?q=Yasakaa");
  await expect(page.locator('[data-testid="shrine-card"]')).not.toHaveCount(0);
});
