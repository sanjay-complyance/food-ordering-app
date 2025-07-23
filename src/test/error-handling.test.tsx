/* eslint-disable @typescript-eslint/no-require-imports */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ErrorBoundary } from "@/components/error-boundary";
import { ToastProvider } from "@/lib/toast";

// Mock NextAuth
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Test component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
}

describe("Error Boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for these tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("No error")).toBeTruthy();
  });

  it("renders error fallback when there is an error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Test error")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeTruthy();
  });
});

describe("Toast System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup is handled in setup.ts
  });

  it("renders toast notifications", async () => {
    const toastModule = await import("@/lib/toast");
    const { ToastProvider, useToast } = toastModule;
    const TestComponent = () => {
      const { toast } = useToast();
      return (
        <button
          onClick={() =>
            toast({
              title: "Test Toast",
              description: "This is a test message",
              variant: "success",
            })
          }
        >
          Show Toast
        </button>
      );
    };
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: /show toast/i }));
    await waitFor(() => {
      expect(screen.getByText("Test Toast")).toBeTruthy();
      expect(screen.getByText("This is a test message")).toBeTruthy();
    });
  });
});

describe("Validation Schemas", () => {
  it("validates login form data correctly", async () => {
    const { loginSchema } = await import("@/lib/validations");

    // Valid data
    const validData = {
      email: "test@example.com",
      password: "password123",
    };

    expect(() => loginSchema.parse(validData)).not.toThrow();

    // Invalid email
    const invalidEmail = {
      email: "invalid-email",
      password: "password123",
    };

    expect(() => loginSchema.parse(invalidEmail)).toThrow();
  });

  it("validates signup form data correctly", async () => {
    const { signupSchema } = await import("@/lib/validations");

    // Valid data
    const validData = {
      name: "John Doe",
      email: "test@example.com",
      password: "password123",
    };

    expect(() => signupSchema.parse(validData)).not.toThrow();

    // Invalid name (too short)
    const invalidName = {
      name: "J",
      email: "test@example.com",
      password: "password123",
    };

    expect(() => signupSchema.parse(invalidName)).toThrow();
  });
});

describe("Loading Components", () => {
  it("renders loading spinner", async () => {
    const loadingModule = await import("@/components/ui/loading");
    const { LoadingSpinner } = loadingModule;
    render(<LoadingSpinner />);
    // Check for loading spinner element
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("renders menu display skeleton", async () => {
    const loadingModule = await import("@/components/ui/loading");
    const { MenuDisplaySkeleton } = loadingModule;
    render(<MenuDisplaySkeleton />);
    // Check for skeleton elements
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
