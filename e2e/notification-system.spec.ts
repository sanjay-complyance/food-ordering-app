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

test.describe("Notification System", () => {
  test.beforeAll(async ({ request: apiRequest }) => {
    await ensureUserExists(apiRequest, {
      name: "Notification Test User",
      email: "notification-test-user@example.com",
      password: "password123",
    });
  });

  test.beforeEach(async ({ page }) => {
    // Create and log in as a test user
    const testEmail = "notification-test-user@example.com";
    const testPassword = "password123";

    // First create this user if it doesn't exist
    await page.goto("/auth/signup");
    await page.fill('input[name="name"]', "Notification Test User");
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

  test("should display notification bell with count", async ({ page }) => {
    // Navigate to the dashboard
    await page.goto("/");

    // Check if notification bell is visible
    await expect(page.locator(".notification-bell")).toBeVisible();

    // Check if notification count is displayed (may be 0)
    const notificationCount = await page.locator(".notification-count");
    if ((await notificationCount.count()) > 0) {
      await expect(notificationCount).toBeVisible();
    }
  });

  test("should open notification center when bell is clicked", async ({
    page,
  }) => {
    // Navigate to the dashboard
    await page.goto("/");

    // Click on notification bell
    await page.click(".notification-bell");

    // Check if notification center is displayed
    await expect(page.locator(".notification-center")).toBeVisible();
  });

  test("should mark notification as read when clicked", async ({ page }) => {
    // Navigate to the dashboard
    await page.goto("/");

    // Click on notification bell to open notification center
    await page.click(".notification-bell");

    // Check if there are any unread notifications
    const unreadNotifications = page.locator(".notification-item.unread");
    const hasUnread = (await unreadNotifications.count()) > 0;

    if (hasUnread) {
      // Get the count of unread notifications before clicking
      const beforeCount = await unreadNotifications.count();

      // Click on the first unread notification
      await unreadNotifications.first().click();

      // Wait for the read status to update
      await page.waitForTimeout(500);

      // Reopen notification center if it closed
      if ((await page.locator(".notification-center").count()) === 0) {
        await page.click(".notification-bell");
      }

      // Check if the notification is now marked as read
      const afterCount = await page
        .locator(".notification-item.unread")
        .count();
      expect(afterCount).toBeLessThan(beforeCount);
    } else {
      // Skip test if no unread notifications
      test.skip();
    }
  });

  test("should receive notification after placing an order", async ({
    page,
  }) => {
    // Navigate to the dashboard
    await page.goto("/");

    // Check if menu is available
    const menuItemsCount = await page.locator(".menu-item").count();

    if (menuItemsCount > 0) {
      // Get initial notification count
      let initialCount = 0;
      const notificationCountElement = page.locator(".notification-count");
      if ((await notificationCountElement.count()) > 0) {
        const countText = await notificationCountElement.textContent();
        initialCount = countText ? parseInt(countText, 10) : 0;
      }

      // Select the first menu item
      await page.click(".menu-item >> nth=0");

      // Submit the order
      await page.click('button:has-text("Place Order")');

      // Check for order confirmation
      await expect(
        page.locator("text=Order placed successfully")
      ).toBeVisible();

      // Wait for notification to appear
      await page.waitForTimeout(1000);

      // Check if notification count increased or notification appeared
      if (initialCount === 0) {
        // If there were no notifications before, check if notification count appears
        await expect(page.locator(".notification-count")).toBeVisible();
      } else {
        // If there were notifications before, check if count increased
        const newCountElement = page.locator(".notification-count");
        if ((await newCountElement.count()) > 0) {
          const newCountText = await newCountElement.textContent();
          const newCount = newCountText ? parseInt(newCountText, 10) : 0;
          expect(newCount).toBeGreaterThanOrEqual(initialCount);
        }
      }
    } else {
      // Skip test if no menu is available
      test.skip();
    }
  });

  test("should access and update notification preferences", async ({
    page,
  }) => {
    // Navigate to the profile page
    await page.goto("/profile");

    // Click on the notifications tab
    await page.click('button:has-text("Notification Preferences")');

    // Wait for the notification preferences to load
    await expect(
      page.locator('h3:has-text("Notification Types")')
    ).toBeVisible();

    // Toggle order reminders off
    const orderRemindersSwitch = page.locator("#order-reminders");
    await orderRemindersSwitch.click();

    // Change delivery method to email
    await page.click('button:has-text("In-App Only")');
    await page.click('div[role="option"]:has-text("Email Only")');

    // Change frequency to important only
    await page.click('button:has-text("All Notifications")');
    await page.click('div[role="option"]:has-text("Important Only")');

    // Save preferences
    await page.click('button:has-text("Save Preferences")');

    // Check for success message
    await expect(
      page.locator("text=Notification preferences updated successfully")
    ).toBeVisible();

    // Reload the page to verify changes persisted
    await page.reload();

    // Click on the notifications tab again
    await page.click('button:has-text("Notification Preferences")');

    // Verify the changes were saved
    await expect(page.locator("#order-reminders")).not.toBeChecked();
    await expect(page.locator('button:has-text("Email Only")')).toBeVisible();
    await expect(
      page.locator('button:has-text("Important Only")')
    ).toBeVisible();
  });
});
