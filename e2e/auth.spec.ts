import { test, expect, APIRequestContext, Page, TestInfo } from "@playwright/test";

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

test.describe("Authentication Flow", () => {
  test.beforeAll(async ({ request: apiRequest }) => {
    // Ensure test users exist
    await ensureUserExists(apiRequest, {
      name: "Existing User",
      email: "test-user-existing@example.com",
      password: "password123",
    });
    await ensureUserExists(apiRequest, {
      name: "Login Test User",
      email: "login-test-user@example.com",
      password: "password123",
    });
  });

  async function debugOnFailure(page: Page, testInfo: TestInfo) {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({ path: `e2e-failure-${testInfo.title.replace(/\s+/g, '-')}.png`, fullPage: true });
      // Optionally, log the current URL and HTML
      console.log('Current URL:', page.url());
      console.log('Page content:', await page.content());
    }
  }

  test("should allow user to sign up", async ({ page }, testInfo: TestInfo) => {
    const uniqueEmail = `test-user-${Date.now()}@example.com`;
    await page.goto("/auth/signup");
    await page.waitForSelector('input[name="name"]');
    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL("/");
    } catch (e) {
      // Print page content for debugging
      console.log('Signup failed, page content:', await page.content());
      throw e;
    }
    expect(page.url()).toContain("/");
    try {
      await expect(page.locator("text=Test User")).toBeVisible({ timeout: 7000 });
    } catch (e) {
      console.log('Test User not visible, page content:', await page.content());
      throw e;
    }
    await debugOnFailure(page, testInfo);
  });

  test("should show error for existing user signup", async ({ page }) => {
    // Use a consistent email that should already exist after running the first test
    const existingEmail = "test-user-existing@example.com";

    // First create this user if it doesn't exist
    await page.goto("/auth/signup");
    await page.fill('input[name="name"]', "Existing User");
    await page.fill('input[name="email"]', existingEmail);
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Either we'll be redirected to dashboard or get an error if user exists
    try {
      await page.waitForURL("/", { timeout: 5000 });
      // Now log out
      await page.goto("/api/auth/signout");
      await page.waitForURL("/auth/login");
    } catch {
      // User might already exist, continue with test
    }

    // Try to sign up with the same email
    await page.goto("/auth/signup");
    await page.fill('input[name="name"]', "Existing User");
    await page.fill('input[name="email"]', existingEmail);
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Check for error message in alert
    try {
      await expect(page.getByRole('alert').getByText('User already exists')).toBeVisible();
    } catch (e) {
      console.log('User already exists error not visible, page content:', await page.content());
      throw e;
    }
  });

  test("should allow user to log in (desktop only)", async ({ page, browserName }) => {
    // Only run on desktop browsers
    const desktopBrowsers = ["chromium", "firefox", "webkit"];
    if (!desktopBrowsers.includes(String(browserName))) {
      // Greeting is hidden on mobile
      return;
    }

    const testEmail = "login-test-user@example.com";
    const testPassword = "password123";

    // First create this user if it doesn't exist
    await page.goto("/auth/signup");
    await page.fill('input[name="name"]', "Login Test User");
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Either we'll be redirected to dashboard or get an error if user exists
    try {
      await page.waitForURL("/", { timeout: 5000 });
      // Now log out
      await page.goto("/api/auth/signout");
      await page.waitForURL("/auth/login");
    } catch {
      // User might already exist, continue with test
    }

    // Now test the login flow
    await page.goto("/auth/login");
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard after successful login
    await page.waitForURL("/");

    // Verify we're on the dashboard
    expect(page.url()).toContain("/");

    // Verify user is logged in (greeting is visible on desktop only)
    try {
      await expect(page.locator('.text-sm.text-gray-600:has-text("Welcome, Login Test User")')).toBeVisible({ timeout: 7000 });
    } catch (e) {
      console.log('Login Test User greeting not visible, page content:', await page.content());
      throw e;
    }
  });

  test("should show error for invalid login", async ({ page }) => {
    await page.goto("/auth/login");

    // Fill with invalid credentials
    await page.fill('input[name="email"]', "nonexistent@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Check for error message in alert (use .first() to avoid strict mode violation)
    await expect(page.getByRole('alert').getByText('Invalid email or password').first()).toBeVisible();
  });
});
