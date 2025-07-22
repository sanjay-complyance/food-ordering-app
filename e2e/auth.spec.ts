import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should allow user to sign up", async ({ page }) => {
    // Generate a unique email to avoid conflicts with existing users
    const uniqueEmail = `test-user-${Date.now()}@example.com`;

    // Navigate to signup page
    await page.goto("/auth/signup");

    // Fill out the signup form
    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "password123");

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard after successful signup
    await page.waitForURL("/");

    // Verify we're on the dashboard
    expect(page.url()).toContain("/");

    // Verify user is logged in (check for user-specific element)
    await expect(page.locator("text=Test User")).toBeVisible();
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
    } catch (e) {
      // User might already exist, continue with test
    }

    // Try to sign up with the same email
    await page.goto("/auth/signup");
    await page.fill('input[name="name"]', "Existing User");
    await page.fill('input[name="email"]', existingEmail);
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Check for error message
    await expect(page.locator("text=User already exists")).toBeVisible();
  });

  test("should allow user to log in", async ({ page }) => {
    // Create a test user first
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
    } catch (e) {
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

    // Verify user is logged in
    await expect(page.locator("text=Login Test User")).toBeVisible();
  });

  test("should show error for invalid login", async ({ page }) => {
    await page.goto("/auth/login");

    // Fill with invalid credentials
    await page.fill('input[name="email"]', "nonexistent@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Check for error message
    await expect(page.locator("text=Invalid email or password")).toBeVisible();
  });
});
