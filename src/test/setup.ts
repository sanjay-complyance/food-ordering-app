import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

// Set test environment
process.env.MONGODB_URI = "mongodb://localhost:27017/test-db";

// Extend vitest's expect with jest-dom matchers
expect.extend(matchers);
