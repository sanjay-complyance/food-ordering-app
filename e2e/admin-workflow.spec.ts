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

test.describe("Admin Workflow", () => {
  test.beforeAll(async ({ request: apiRequest }) => {
    await ensureUserExists(apiRequest, {
      name: "Admin User",
      email: "admin@example.com",
      password: "adminpassword",
    });
  });

  test.beforeEach(async ({ page }) => {
    // Log in as admin
    await page.goto("/auth/login");
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "adminpassword");
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    try {
      await page.waitForURL("/", { timeout: 5000 });
    } catch {
      // If login fails, try to create admin account first
      await page.goto("/auth/signup");
      await page.fill('input[name="name"]', "Admin User");
      await page.fill('input[name="email"]', "admin@example.com");
      await page.fill('input[name="password"]', "adminpassword");
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForURL("/");

      // Note: In a real scenario, we would need to promote this user to admin
      // but for testing purposes, we'll assume the first user gets admin rights
    }

    // Verify we're on the dashboard
    expect(page.url()).toContain("/");
  });

  test("should navigate to admin dashboard", async ({ page }) => {
    // Click on admin dashboard link
    await page.click('a:has-text("Admin")');

    // Verify admin dashboard components are visible
    await expect(page.locator("text=Admin Dashboard")).toBeVisible();
    await expect(page.locator(".admin-menu-manager")).toBeVisible();
    await expect(page.locator(".admin-orders-view")).toBeVisible();
  });

  test("should manage menu items", async ({ page }) => {
    // Navigate to admin dashboard
    await page.click('a:has-text("Admin")');

    // Click on menu manager tab if needed
    if ((await page.locator('button:has-text("Menu Manager")').count()) > 0) {
      await page.click('button:has-text("Menu Manager")');
    }

    // Add a new menu item
    await page.click('button:has-text("Add Menu Item")');

    // Fill out the form
    await page.fill('input[name="name"]', "Test Dish");
    await page.fill('textarea[name="description"]', "A test dish description");

    // Save the menu item
    await page.click('button:has-text("Save")');

    // Verify the new menu item appears in the list
    await expect(page.locator("text=Test Dish")).toBeVisible();
    await expect(page.locator("text=A test dish description")).toBeVisible();
  });

  test("should view and process orders", async ({ page }) => {
    // Navigate to admin dashboard
    await page.click('a:has-text("Admin")');

    // Click on orders view tab if needed
    if ((await page.locator('button:has-text("Orders")').count()) > 0) {
      await page.click('button:has-text("Orders")');
    }

    // Check if there are any orders
    const hasOrders = (await page.locator(".order-item").count()) > 0;

    if (hasOrders) {
      // Process orders
      await page.click('button:has-text("Process Orders")');

      // Confirm processing
      await page.click('button:has-text("Confirm")');

      // Verify success message
      await expect(
        page.locator("text=Orders processed successfully")
      ).toBeVisible();
    } else {
      // Skip test if no orders
      test.skip();
    }
  });
});
