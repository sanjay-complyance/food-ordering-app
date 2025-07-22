import { describe, it, expect } from "vitest";
import {
  filterNotificationsByPreferences,
  shouldReceiveNotification,
  isImportantNotification,
} from "@/lib/notification-preferences";
import { IUser, NotificationType } from "@/types/models";

describe("Notification Preferences", () => {
  // Create a mock user with notification preferences
  const createMockUser = (preferences: any): IUser => ({
    _id: "user123" as any,
    email: "test@example.com",
    name: "Test User",
    role: "user",
    password: "password",
    notificationPreferences: {
      orderReminders: true,
      orderConfirmations: true,
      orderModifications: true,
      menuUpdates: true,
      deliveryMethod: "in_app",
      frequency: "all",
      ...preferences,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe("isImportantNotification", () => {
    it("should correctly identify important notifications", () => {
      expect(isImportantNotification("order_reminder")).toBe(true);
      expect(isImportantNotification("order_confirmed")).toBe(true);
      expect(isImportantNotification("order_modified")).toBe(true);
      expect(isImportantNotification("menu_updated")).toBe(false);
    });
  });

  describe("shouldReceiveNotification", () => {
    it("should respect notification type preferences", () => {
      const user = createMockUser({
        orderReminders: true,
        orderConfirmations: true,
        orderModifications: false,
        menuUpdates: true,
      });

      expect(shouldReceiveNotification(user, "order_reminder")).toBe(true);
      expect(shouldReceiveNotification(user, "order_confirmed")).toBe(true);
      expect(shouldReceiveNotification(user, "order_modified")).toBe(false);
      expect(shouldReceiveNotification(user, "menu_updated")).toBe(true);
    });

    it("should respect frequency settings", () => {
      const user = createMockUser({
        frequency: "important_only",
      });

      expect(shouldReceiveNotification(user, "order_reminder")).toBe(true);
      expect(shouldReceiveNotification(user, "order_confirmed")).toBe(true);
      expect(shouldReceiveNotification(user, "order_modified")).toBe(true);
      expect(shouldReceiveNotification(user, "menu_updated")).toBe(false); // Not important
    });

    it("should respect opt-out settings", () => {
      const user = createMockUser({
        frequency: "none", // Opted out of all notifications
      });

      expect(shouldReceiveNotification(user, "order_reminder")).toBe(false);
      expect(shouldReceiveNotification(user, "order_confirmed")).toBe(false);
      expect(shouldReceiveNotification(user, "order_modified")).toBe(false);
      expect(shouldReceiveNotification(user, "menu_updated")).toBe(false);
    });
  });

  describe("filterNotificationsByPreferences", () => {
    it("should filter notifications based on user preferences", () => {
      const user = createMockUser({
        orderReminders: true,
        orderConfirmations: true,
        orderModifications: false,
        menuUpdates: true,
      });

      expect(filterNotificationsByPreferences(user, "order_reminder")).toBe(
        true
      );
      expect(filterNotificationsByPreferences(user, "order_confirmed")).toBe(
        true
      );
      expect(filterNotificationsByPreferences(user, "order_modified")).toBe(
        false
      );
      expect(filterNotificationsByPreferences(user, "menu_updated")).toBe(true);
    });

    it("should filter based on importance when frequency is set to important_only", () => {
      const user = createMockUser({
        frequency: "important_only",
      });

      expect(filterNotificationsByPreferences(user, "order_reminder")).toBe(
        true
      );
      expect(filterNotificationsByPreferences(user, "order_confirmed")).toBe(
        true
      );
      expect(filterNotificationsByPreferences(user, "order_modified")).toBe(
        true
      );
      expect(filterNotificationsByPreferences(user, "menu_updated")).toBe(
        false
      );
    });
  });
});
