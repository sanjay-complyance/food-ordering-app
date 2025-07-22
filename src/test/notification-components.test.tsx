import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { INotification } from "@/types/models";

// Mock fetch
global.fetch = vi.fn();

const mockNotifications: INotification[] = [
  {
    _id: "1" as any,
    userId: "user1" as any,
    type: "order_reminder",
    message: "Don't forget to place your lunch order!",
    read: false,
    createdAt: new Date("2024-01-15T10:30:00Z"),
  } as INotification,
  {
    _id: "2" as any,
    userId: "user1" as any,
    type: "order_confirmed",
    message: "Your lunch order has been confirmed.",
    read: true,
    createdAt: new Date("2024-01-14T12:00:00Z"),
  } as INotification,
];

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render notification bell with unread count", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ notifications: mockNotifications }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    // Should show unread count badge
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("should fetch notifications when bell is clicked", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ notifications: mockNotifications }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button"));

    expect(fetch).toHaveBeenCalledWith("/api/notifications?limit=20");
  });

  it("should mark notification as read when clicked", async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: mockNotifications }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const mockMarkAsRead = vi.fn();

    render(
      <NotificationCenter
        notifications={mockNotifications}
        onMarkAsRead={mockMarkAsRead}
        onMarkAllAsRead={vi.fn()}
        onRefresh={vi.fn()}
        isLoading={false}
      />
    );

    // Find and click the mark as read button for unread notification
    const markAsReadButtons = screen.getAllByRole("button");
    const markAsReadButton = markAsReadButtons.find(
      (button) => button.querySelector("svg") // Looking for the Check icon
    );

    if (markAsReadButton) {
      fireEvent.click(markAsReadButton);
      expect(mockMarkAsRead).toHaveBeenCalledWith("1");
    }
  });
});

describe("NotificationCenter", () => {
  it("should render notifications correctly", () => {
    render(
      <NotificationCenter
        notifications={mockNotifications}
        onMarkAsRead={vi.fn()}
        onMarkAllAsRead={vi.fn()}
        onRefresh={vi.fn()}
        isLoading={false}
      />
    );

    // Use more specific selectors to avoid duplicate matches
    expect(
      screen.getByRole("heading", { name: /notifications/i })
    ).toBeInTheDocument();
    expect(screen.getByText("1 new")).toBeInTheDocument();
    expect(
      screen.getByText("Don't forget to place your lunch order!")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your lunch order has been confirmed.")
    ).toBeInTheDocument();
  });

  it("should show empty state when no notifications", () => {
    render(
      <NotificationCenter
        notifications={[]}
        onMarkAsRead={vi.fn()}
        onMarkAllAsRead={vi.fn()}
        onRefresh={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    expect(
      screen.getByText("You'll see order reminders and updates here")
    ).toBeInTheDocument();
  });

  it("should show loading state", () => {
    render(
      <NotificationCenter
        notifications={[]}
        onMarkAsRead={vi.fn()}
        onMarkAllAsRead={vi.fn()}
        onRefresh={vi.fn()}
        isLoading={true}
      />
    );

    // Use more specific selector for the heading
    expect(
      screen.getByRole("heading", { name: /notifications/i })
    ).toBeInTheDocument();
    // Should show skeleton loaders
    expect(screen.getAllByTestId("skeleton")).toBeTruthy();
  });

  it("should call onMarkAllAsRead when mark all read button is clicked", () => {
    const mockMarkAllAsRead = vi.fn();

    render(
      <NotificationCenter
        notifications={mockNotifications}
        onMarkAsRead={vi.fn()}
        onMarkAllAsRead={mockMarkAllAsRead}
        onRefresh={vi.fn()}
        isLoading={false}
      />
    );

    // Use a more specific selector with role and name
    const markAllReadButton = screen.getByRole("button", {
      name: /mark all read/i,
    });
    fireEvent.click(markAllReadButton);

    expect(mockMarkAllAsRead).toHaveBeenCalled();
  });

  it("should call onRefresh when refresh button is clicked", () => {
    const mockRefresh = vi.fn();

    render(
      <NotificationCenter
        notifications={mockNotifications}
        onMarkAsRead={vi.fn()}
        onMarkAllAsRead={vi.fn()}
        onRefresh={mockRefresh}
        isLoading={false}
      />
    );

    // Add a test-id to the refresh button in the component and use it here
    const refreshButton = screen.getByTestId("refresh-button");
    fireEvent.click(refreshButton);
    expect(mockRefresh).toHaveBeenCalled();
  });
});
