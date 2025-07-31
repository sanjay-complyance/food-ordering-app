import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { INotification } from "@/types/models";
import ScheduledJobsPanel from "@/components/admin/ScheduledJobsPanel";

// Mock fetch
global.fetch = vi.fn() as unknown as typeof fetch;

const mockNotifications: INotification[] = [
  {
    _id: "1" as unknown as INotification["_id"],
    userId: "user1" as unknown as INotification["userId"],
    type: "order_reminder",
    message: "Don't forget to place your lunch order!",
    read: false,
    createdAt: new Date("2024-01-15T10:30:00Z"),
  } as INotification,
  {
    _id: "2" as unknown as INotification["_id"],
    userId: "user1" as unknown as INotification["userId"],
    type: "order_confirmed",
    message: "Your lunch order has been confirmed.",
    read: true,
    createdAt: new Date("2024-01-14T12:00:00Z"),
  } as INotification,
];

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock EventSource
    (global as any).EventSource = class {
      onmessage: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      close = vi.fn();
      constructor() {
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage({ data: JSON.stringify({ message: "SSE notification!", time: Date.now() }) });
          }
        }, 10);
      }
    };
  });

  it("should render notification bell with unread count", async () => {
    (fetch as unknown as { mockResolvedValueOnce: (...args: any[]) => any }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ notifications: mockNotifications }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeTruthy();
    });

    // Should show unread count badge
    await waitFor(() => {
      expect(screen.getByText("1")).toBeTruthy();
    });
  });

  it("should fetch notifications when bell is clicked", async () => {
    (fetch as unknown as { mockResolvedValueOnce: (...args: any[]) => any }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ notifications: mockNotifications }),
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getAllByRole("button")[0]).toBeTruthy();
    });

    // Click all bell buttons, expect at least one to trigger fetch
    const bellButtons = screen.getAllByRole("button");
    bellButtons.forEach(btn => fireEvent.click(btn));
    expect(fetch).toHaveBeenCalledWith("/api/notifications?limit=20");
  });

  it("should update notifications and unread count on SSE event", async () => {
    (fetch as unknown as { mockResolvedValueOnce: (...args: any[]) => any }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ notifications: mockNotifications }),
    });
    render(<NotificationBell />);
    // Wait for SSE event to be processed
    await waitFor(() => {
      expect(screen.getByText("SSE notification!")).toBeTruthy();
    });
    // Should increment unread count (check that at least one badge shows '2')
    await waitFor(() => {
      const badges = screen.getAllByText("2");
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it("should mark notification as read when clicked", async () => {
    (fetch as unknown as { mockResolvedValueOnce: (...args: any[]) => any })
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

    // Find and click all mark as read buttons for unread notification
    const markAsReadButtons = screen.getAllByTestId("mark-as-read-button-1");
    markAsReadButtons.forEach(btn => fireEvent.click(btn));
    expect(mockMarkAsRead).toHaveBeenCalledWith("1");
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

    // Use data-testid for heading
    expect(screen.getAllByTestId("notification-heading")[0]).toBeTruthy();
    expect(screen.getAllByText("1 new")[0]).toBeTruthy();
    expect(screen.getAllByTestId("notification-message-1")[0].textContent).toBe("Don't forget to place your lunch order!");
    expect(screen.getAllByTestId("notification-message-2")[0].textContent).toBe("Your lunch order has been confirmed.");
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

    expect(screen.getByText("No notifications yet")).toBeTruthy();
    expect(
      screen.getByText("You'll see order reminders and updates here")
    ).toBeTruthy();
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

    // Use skeleton loader test id
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
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

    // Click all mark all read buttons, expect at least one to trigger the spy
    const markAllReadButtons = screen.getAllByTestId("mark-all-read-button");
    markAllReadButtons.forEach(btn => fireEvent.click(btn));
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

    // Click all refresh buttons, expect at least one to trigger the spy
    const refreshButtons = screen.getAllByTestId("refresh-button");
    refreshButtons.forEach(btn => fireEvent.click(btn));
    expect(mockRefresh).toHaveBeenCalled();
  });
});

describe("ScheduledJobsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).fetch = vi.fn((url, opts) => {
      if (url === "/api/settings" && (!opts || opts.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ settings: { menuUpdateReminderTime: "11:00", orderReminderTime: "10:30" } }),
        });
      }
      if (url === "/api/cron") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ results: { menuUpdateReminder: "Sent to 2 admins", orderReminder: "Order reminder sent" } }),
        });
      }
      if (url === "/api/settings" && opts && opts.method === "PUT") {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: false });
    });
  });

  it("renders and fetches settings", async () => {
    render(<ScheduledJobsPanel />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("11:00")).toBeTruthy();
      expect(screen.getByDisplayValue("10:30")).toBeTruthy();
    });
  });

  it("runs scheduled jobs and displays result", async () => {
    render(<ScheduledJobsPanel />);
    const btns = screen.getAllByText("Run Scheduled Jobs Now");
    fireEvent.click(btns[0]);
    await waitFor(() => {
      expect(screen.getByText(/Sent to 2 admins/)).toBeTruthy();
      expect(screen.getByText(/Order reminder sent/)).toBeTruthy();
    });
  });

  it("saves settings and shows confirmation", async () => {
    render(<ScheduledJobsPanel />);
    const menuInput = screen.getByLabelText("Menu Update Reminder Time");
    fireEvent.change(menuInput, { target: { value: "12:00" } });
    const orderInput = screen.getByLabelText("Order Reminder Time");
    fireEvent.change(orderInput, { target: { value: "09:30" } });
    const saveBtns = screen.getAllByText("Save Reminder Times");
    fireEvent.click(saveBtns[0]);
    await waitFor(() => {
      expect(screen.getByText("Settings saved!")).toBeTruthy();
    });
  });
});
