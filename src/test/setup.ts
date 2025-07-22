import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Set test environment
process.env.MONGODB_URI = "mongodb://localhost:27017/test-db";

// Extend vitest's expect with jest-dom matchers
// @ts-ignore - the matchers exist but TypeScript doesn't know about them
expect.extend(matchers);

// Clean up after each test
afterEach(() => {
  cleanup();
});
