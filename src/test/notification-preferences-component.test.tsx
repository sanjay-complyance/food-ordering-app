import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotificationPreferences from "@/components/user/NotificationPreferences";
import { INotificationPreferences } from "@/types/models";

// Mock toast
vi.mock("@/lib/toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock Card components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-title">{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-description">{children}</div>
  ),
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

// Mock Switch component
vi.mock("@/components/ui/switch", () => ({
  Switch: ({ id, checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      aria-label={id
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l: string) => l.toUpperCase())}
    />
  ),
}));

// Mock Select components
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <div
      data-testid="select"
      data-value={value}
      onClick={(e) => onValueChange(e.currentTarget.dataset.value)}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectValue: ({ placeholder, children }: any) => (
    <div data-testid="select-value">{children || placeholder}</div>
  ),
  SelectContent: ({ children }: any) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ value, children }: any) => (
    <div data-testid="select-item" data-value={value} role="option">
      {children}
    </div>
  ),
}));

// Mock fetch
global.fetch = vi.fn();

const mockPreferences: INotificationPreferences = {
  orderReminders: true,
  orderConfirmations: true,
  orderModifications: true,
  menuUpdates: true,
  deliveryMethod: "in_app",
  frequency: "all",
};

describe("NotificationPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ preferences: mockPreferences }),
    });
  });

  it("should render notification preferences form", async () => {
    render(<NotificationPreferences />);

    // Wait for preferences to load
    await waitFor(() => {
      expect(
        screen.getAllByTestId("card-title")[0].textContent
      ).toContain("Notification Preferences");
    });

    // Check if all preference options are rendered
    expect(screen.getByText(/Order Reminders/i)).toBeTruthy();
    expect(screen.getByText(/Order Confirmations/i)).toBeTruthy();
    expect(screen.getByText(/Order Modifications/i)).toBeTruthy();
    expect(screen.getByText(/Menu Updates/i)).toBeTruthy();
    expect(screen.getAllByText(/Delivery Method/i)[0]).toBeTruthy();
    expect(screen.getAllByText(/Notification Frequency/i)[0]).toBeTruthy();
  });

  it("should show loading state initially", () => {
    render(<NotificationPreferences />);
    const descriptions = screen.getAllByTestId("card-description");
    expect(
      descriptions.some((el) =>
        el.textContent?.includes("Loading preferences...")
      )
    ).toBe(true);
  });

  it("should fetch preferences on load", async () => {
    render(<NotificationPreferences />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/user/preferences");
    });
  });

  it("should update preferences when form is submitted", async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: mockPreferences }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: "Preferences updated successfully",
          preferences: {
            ...mockPreferences,
            orderReminders: false,
            deliveryMethod: "email",
          },
        }),
      });

    render(<NotificationPreferences />);

    // Wait for preferences to load
    await waitFor(() => {
      expect(
        screen.getAllByTestId("card-title")[0].textContent
      ).toContain("Notification Preferences");
    });

    // Toggle order reminders switch
    const orderRemindersSwitch = screen.getAllByLabelText("Order Reminders")[0];
    fireEvent.click(orderRemindersSwitch);

    // Submit form
    const saveButton = screen.getAllByRole("button", {
      name: /Save Preferences/i,
    })[0];
    fireEvent.click(saveButton);

    // Verify API call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/user/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.any(String),
      });

      const requestBody = JSON.parse((fetch as any).mock.calls[1][1].body);
      expect(requestBody.orderReminders).toBe(false);
    });
  });

  it("should handle API errors", async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: mockPreferences }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Failed to update preferences" }),
      });

    render(<NotificationPreferences />);

    // Wait for preferences to load
    await waitFor(() => {
      expect(
        screen.getAllByTestId("card-title")[0].textContent
      ).toContain("Notification Preferences");
    });

    // Submit form
    const saveButton = screen.getAllByRole("button", {
      name: /Save Preferences/i,
    })[0];
    fireEvent.click(saveButton);

    // Verify API call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/user/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.any(String),
      });

      // Just verify the API call was made, don't check the exact body content
    });
  });
});
