import { test, expect, APIRequestContext } from "@playwright/test";

// Helper to create a user via the signup API
async function ensureUserExists(apiRequest: APIRequestContext, { name, email, password }: { name: string; email: string; password: string }) {
  const response = await apiRequest.post("/api/auth/signup", {
    data: { name, email, password },
  });
  // 201 = created, 409 = already exists
  if (![201, 409].includes(response.status())) {
    throw new Error(`Failed to create user: ${email} (${response.status()})`);
  }
}

test.describe("Menu and Ordering Flow", () => {
  test.beforeAll(async ({ request: apiRequest }) => {
    await ensureUserExists(apiRequest, {
      name: "Menu Test User",
      email: "menu-test-user@example.com",
      password: "password123",
    });
  });

  test.beforeEach(async ({ page }) => {
    // Create and log in as a test user
    const testEmail = "menu-test-user@example.com";
    const testPassword = "password123";

    // First create this user if it doesn't exist
    await page.goto("/auth/signup");
    await page.fill('input[name="name"]', "Menu Test User");
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Either we'll be redirected to dashboard or get an error if user exists
    try {
      await page.waitForURL("/", { timeout: 5000 });
    } catch {
      // User might already exist, log in instead
      await page.goto("/auth/login");
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL("/");
    }
  });

  test("should display daily menu when available", async ({ page }) => {
    // Navigate to the dashboard
    await page.goto("/");

    // Check if menu is displayed
    const menuElement = page.locator(".menu-display");

    if ((await menuElement.count()) > 0) {
      // Menu exists, verify its structure
      await expect(page.locator(".menu-display")).toBeVisible();
      await expect(page.locator(".menu-item")).toBeVisible();
    } else {
      // No menu available, check for the "no menu" message
      await expect(page.locator("text=No menu available")).toBeVisible();
    }
  });

  test("should allow placing an order when menu is available", async ({
    page,
  }) => {
    // Navigate to the dashboard
    await page.goto("/");

    // Check if menu is available
    const menuItemsCount = await page.locator(".menu-item").count();

    if (menuItemsCount > 0) {
      // Select the first menu item
      await page.click(".menu-item >> nth=0");

      // Submit the order
      await page.click('button:has-text("Place Order")');

      // Check for order confirmation
      await expect(
        page.locator("text=Order placed successfully")
      ).toBeVisible();

      // Verify order appears in order history
      await expect(page.locator(".order-history-item")).toBeVisible();
    } else {
      // Skip test if no menu is available
      test.skip();
    }
  });

  test("should allow modifying an order before processing", async ({
    page,
  }) => {
    // Navigate to the dashboard
    await page.goto("/");

    // Check if menu is available
    const menuItemsCount = await page.locator(".menu-item").count();

    if (menuItemsCount > 1) {
      // Place an initial order with the first menu item
      await page.click(".menu-item >> nth=0");
      await page.click('button:has-text("Place Order")');

      // Wait for order confirmation
      await expect(
        page.locator("text=Order placed successfully")
      ).toBeVisible();

      // Modify the order to select a different menu item
      await page.click('.order-history-item >> button:has-text("Modify")');
      await page.click(".menu-item >> nth=1");
      await page.click('button:has-text("Update Order")');

      // Check for order update confirmation
      await expect(
        page.locator("text=Order updated successfully")
      ).toBeVisible();
    } else {
      // Skip test if insufficient menu items are available
      test.skip();
    }
  });
});
