import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PWAManager } from "@/lib/pwa";

// Mock window objects
const mockBeforeInstallPromptEvent = {
  preventDefault: vi.fn(),
  prompt: vi.fn().mockResolvedValue(undefined),
  userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
};

describe("PWAManager", () => {
  let pwaManager: PWAManager;

  beforeEach(() => {
    // Reset singleton instance
    (PWAManager as any).instance = undefined;
    pwaManager = PWAManager.getInstance();

    // Mock window and navigator
    Object.defineProperty(window, "navigator", {
      value: {
        serviceWorker: {
          register: vi.fn().mockResolvedValue({ scope: "/" }),
          controller: {
            postMessage: vi.fn(),
          },
        },
      },
      writable: true,
    });

    Object.defineProperty(window, "Notification", {
      value: {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("granted"),
      },
      writable: true,
    });

    global.Notification = window.Notification as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = PWAManager.getInstance();
      const instance2 = PWAManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("canShowInstallPrompt", () => {
    it("should return false when no deferred prompt", () => {
      expect(pwaManager.canShowInstallPrompt()).toBe(false);
    });

    it("should return true when deferred prompt is available", () => {
      // Simulate beforeinstallprompt event
      (pwaManager as any).deferredPrompt = mockBeforeInstallPromptEvent;
      expect(pwaManager.canShowInstallPrompt()).toBe(true);
    });
  });

  describe("showInstallPrompt", () => {
    it("should return false when no deferred prompt", async () => {
      const result = await pwaManager.showInstallPrompt();
      expect(result).toBe(false);
    });

    it("should show install prompt and return true on acceptance", async () => {
      (pwaManager as any).deferredPrompt = mockBeforeInstallPromptEvent;

      const result = await pwaManager.showInstallPrompt();

      expect(mockBeforeInstallPromptEvent.prompt).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe("isInstalled", () => {
    it("should return false when not installed", () => {
      Object.defineProperty(window, "matchMedia", {
        value: vi.fn().mockReturnValue({ matches: false }),
        writable: true,
      });

      expect(pwaManager.isInstalled()).toBe(false);
    });

    it("should return true when installed (standalone mode)", () => {
      Object.defineProperty(window, "matchMedia", {
        value: vi.fn().mockReturnValue({ matches: true }),
        writable: true,
      });

      expect(pwaManager.isInstalled()).toBe(true);
    });
  });

  describe("requestNotificationPermission", () => {
    it("should return granted permission when already granted", async () => {
      window.Notification.permission = "granted";

      const result = await pwaManager.requestNotificationPermission();

      expect(result).toEqual({ permission: "granted", supported: true });
    });

    it("should request permission when default", async () => {
      window.Notification.permission = "default";

      const result = await pwaManager.requestNotificationPermission();

      expect(window.Notification.requestPermission).toHaveBeenCalled();
      expect(result).toEqual({ permission: "granted", supported: true });
    });
  });

  describe("showNotification", () => {
    it("should return false when permission denied", async () => {
      window.Notification.permission = "denied";

      const result = await pwaManager.showNotification("Test Title");

      expect(result).toBe(false);
    });

    it("should use service worker when available", async () => {
      window.Notification.permission = "granted";

      const result = await pwaManager.showNotification("Test Title", {
        body: "Test Body",
      });

      expect(result).toBe(true);
      expect(
        window.navigator.serviceWorker.controller.postMessage
      ).toHaveBeenCalledWith({
        type: "SHOW_NOTIFICATION",
        payload: { title: "Test Title", options: { body: "Test Body" } },
      });
    });
  });

  describe("registerServiceWorker", () => {
    it("should register service worker successfully", async () => {
      const result = await pwaManager.registerServiceWorker();

      expect(result).toBe(true);
      expect(window.navigator.serviceWorker.register).toHaveBeenCalledWith(
        "/sw.js"
      );
    });

    it("should return false when service worker not supported", async () => {
      const originalNavigator = window.navigator;
      Object.defineProperty(window, "navigator", {
        value: {},
        writable: true,
      });

      const result = await pwaManager.registerServiceWorker();

      expect(result).toBe(false);

      // Restore
      Object.defineProperty(window, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });
  });

  describe("getNotificationPermission", () => {
    it("should return current notification permission state", () => {
      window.Notification.permission = "granted";

      const result = pwaManager.getNotificationPermission();

      expect(result).toEqual({ permission: "granted", supported: true });
    });
  });
});
